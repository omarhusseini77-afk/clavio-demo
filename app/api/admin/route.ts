import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fail, refused } from '@/lib/apiError'
import { composeReminder } from '@/lib/composeNotifications'
import { periodSeq } from '@/lib/quartersScope'

// The admin panel's data and its four writes.
//
// SCOPE, stated here because a reader should not have to infer it:
//
//   CAN read  — companies in the caller's fund, their filing state, the
//               outbox, the usage log, the flags.
//   CAN write — four things, all reversible: two flags, composing a reminder
//               into the outbox, and cancelling a pending outbox row.
//   CANNOT    — delete anything at all; edit financial figures; create, delete
//               or change users or passwords; touch another fund; re-seed;
//               transmit email. There is no "send now" here, so no single
//               click puts mail on the wire.
//
// None of that rests on this file alone. Every read runs under the caller's own
// session, so RLS decides what comes back, and each write names its columns —
// there is deliberately no generic patch action taking a table and a column,
// which is how an admin panel becomes an arbitrary write primitive.

async function requireGp(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('profiles').select('role, fund_id').eq('id', user.id).single()
  if (profile?.role !== 'gp') {
    // 404 rather than 403: the same answer a non-existent route would give, so
    // this cannot be used to learn that an admin surface exists.
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { user, profile: profile as { role: string; fund_id: string | null } }
}

export async function GET() {
  const supabase = createClient()
  try {
    const gate = await requireGp(supabase)
    if ('error' in gate) return gate.error

    const [companiesRes, quartersRes, outboxRes, usageRes, fundRes] = await Promise.all([
      supabase.from('companies')
        .select('id, name, slug, cfo_signals_simultaneous, reporting_deadline_days')
        .order('name'),
      supabase.from('quarters').select('id, period, company_id, created_at'),
      supabase.from('email_outbox')
        .select('id, company_id, audience, kind, subject, body, status, created_at, sent_at')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('usage_log')
        .select('route, method, status, duration_ms, role, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, created_at')
        .order('created_at', { ascending: false }).limit(500),
      supabase.from('funds').select('id, name, period_label, email_dispatch_enabled').limit(1).maybeSingle(),
    ])

    const quarters = quartersRes.data ?? []
    const companies = (companiesRes.data ?? []).map(c => {
      const own = quarters.filter(q => q.company_id === c.id)
      const latest = [...own].sort((a, b) => periodSeq(b.period) - periodSeq(a.period))[0]
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        cfoSignalsSimultaneous: c.cfo_signals_simultaneous,
        reportingDeadlineDays: c.reporting_deadline_days,
        quartersFiled: own.length,
        latestPeriod: latest?.period ?? null,
      }
    })

    // Usage comes back as aggregates, never as a request stream. A partner has
    // no reason to read one, and not shipping it keeps this from becoming the
    // place where per-request detail starts feeling useful to add.
    const usage = usageRes.data ?? []
    const byRoute = new Map<string, { calls: number; totalMs: number; errors: number }>()
    let tokensIn = 0, tokensOut = 0, cacheRead = 0, cacheWrite = 0
    for (const u of usage) {
      const k = `${u.method} ${u.route}`
      const cur = byRoute.get(k) ?? { calls: 0, totalMs: 0, errors: 0 }
      cur.calls++
      cur.totalMs += u.duration_ms ?? 0
      if ((u.status ?? 0) >= 400) cur.errors++
      byRoute.set(k, cur)
      tokensIn += u.input_tokens ?? 0
      tokensOut += u.output_tokens ?? 0
      cacheRead += u.cache_read_tokens ?? 0
      cacheWrite += u.cache_write_tokens ?? 0
    }

    return NextResponse.json({
      fund: fundRes.data ?? null,
      companies,
      outbox: outboxRes.data ?? [],
      usage: {
        window: usage.length,
        routes: Array.from(byRoute.entries())
          .map(([route, v]) => ({ route, calls: v.calls, avgMs: Math.round(v.totalMs / v.calls), errors: v.errors }))
          .sort((a, b) => b.calls - a.calls),
        tokens: { input: tokensIn, output: tokensOut, cacheRead, cacheWrite },
      },
      // Reported by the server so the panel cannot claim mail is going out when
      // it is not, or the reverse. BOTH must be true for anything to transmit.
      dispatch: {
        fundEnabled: Boolean(fundRes.data?.email_dispatch_enabled),
        providerConfigured: Boolean(process.env.RESEND_API_KEY),
      },
    })
  } catch (err) {
    return fail('GET /api/admin', err)
  }
}

type Action =
  | { action: 'set_simultaneous'; companyId: string; value: boolean }
  | { action: 'set_deadline_days'; companyId: string; value: number }
  | { action: 'set_dispatch'; value: boolean }
  | { action: 'compose_reminder'; companyId: string; period: string }
  | { action: 'cancel_outbox'; id: string; reason?: string }

export async function POST(req: Request) {
  const supabase = createClient()
  try {
    const gate = await requireGp(supabase)
    if ('error' in gate) return gate.error

    const body = (await req.json()) as Action

    switch (body.action) {
      case 'set_simultaneous': {
        const { error } = await supabase.from('companies')
          .update({ cfo_signals_simultaneous: Boolean(body.value) })
          .eq('id', body.companyId)
        if (error) return refused('POST /api/admin', error, 'That setting could not be changed.')
        return NextResponse.json({ ok: true })
      }

      case 'set_deadline_days': {
        const days = Math.round(Number(body.value))
        if (!Number.isFinite(days) || days < 1 || days > 120) {
          return NextResponse.json({ error: 'Deadline must be between 1 and 120 days.' }, { status: 400 })
        }
        const { error } = await supabase.from('companies')
          .update({ reporting_deadline_days: days })
          .eq('id', body.companyId)
        if (error) return refused('POST /api/admin', error, 'That deadline could not be changed.')
        return NextResponse.json({ ok: true })
      }

      case 'set_dispatch': {
        if (!gate.profile.fund_id) {
          return NextResponse.json({ error: 'No fund on this account.' }, { status: 400 })
        }
        const { error } = await supabase.from('funds')
          .update({ email_dispatch_enabled: Boolean(body.value) })
          .eq('id', gate.profile.fund_id)
        if (error) return refused('POST /api/admin', error, 'That setting could not be changed.')
        return NextResponse.json({ ok: true })
      }

      case 'compose_reminder': {
        // Writes an outbox row. Does NOT send — there is no send path in this
        // application at all, and no branch here that could reach one.
        const res = await composeReminder(supabase, {
          companyId: body.companyId, period: body.period, lang: 'en',
        })
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
        return NextResponse.json({ ok: true })
      }

      case 'cancel_outbox': {
        // Marks the row. Nothing here deletes it, and there is no delete policy
        // on the table for a client to reach even if this tried to.
        const { error } = await supabase.from('email_outbox')
          .update({ status: 'cancelled', cancelled_reason: body.reason ?? 'Cancelled from the admin panel' })
          .eq('id', body.id)
          .eq('status', 'pending')
        if (error) return refused('POST /api/admin', error, 'That message could not be cancelled.')
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return fail('POST /api/admin', err)
  }
}
