import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchScopedQuarters } from '@/lib/quartersScope'
import { refused } from '@/lib/apiError'
import { logUsage } from '@/lib/usageLog'
import { composeSubmissionNotifications } from '@/lib/composeNotifications'

// Session-aware: RLS decides what this caller may see. An unauthenticated
// request returns an empty list rather than the whole table.
//
// Scoped to ONE company. The dashboard treats the result as a single series —
// `quarters[length-1]` is "latest", the chart maps every row — so returning a
// whole fund's quarters would silently splice several companies into one set of
// headline figures. RLS bounds this to the caller's fund; the scoping below is
// about coherence, not access.
//
// Default: a submitter gets its own company, and a GP gets whichever company
// has filed the MOST quarters they can see — not the most recent one. An
// earlier version did sort by recency, via `id`, and bulk inserts made it
// reassign the dashboard to whichever company happened to be backfilled last.
// See resolveQuartersCompany, which is the authority on this.
//
// `?company=` narrows to one company WITHIN what RLS already allows. It is not
// an access decision: the query underneath is .eq() under the caller's own
// session, so an id from another fund returns zero rows rather than that
// fund's data.
export async function GET(request: Request) {
  const startedAt = Date.now()
  const supabase = createClient()

  // 401, not an empty array. An empty list is what a company with no filings
  // looks like, so returning it for an auth failure made the two states
  // indistinguishable on screen — the same silence-equals-success shape
  // docs/verification-notes.md is about.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, fund_id')
    .eq('id', user.id)
    .single()

  const requested = new URL(request.url).searchParams.get('company')

  // Shared with /api/ask so the assistant and the dashboard can never answer
  // from different companies.
  const { quarters } = await fetchScopedQuarters(supabase, profile, requested)

  // Row COUNT, never rows. The number of quarters a company has filed is
  // operational, not financial.
  logUsage(supabase, {
    route: '/api/quarters', method: 'GET', status: 200,
    durationMs: Date.now() - startedAt,
    role: (profile?.role as string | null) ?? null,
    userId: user.id,
    companyId: (profile?.company_id as string | null) ?? null,
    fundId: (profile?.fund_id as string | null) ?? null,
  })

  return NextResponse.json(quarters)
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const body = await request.json()
  const supabase = createClient()

  // Stamp the filing with the submitter's own company rather than trusting the
  // body. company_id becomes NOT NULL in 006, so this has to ship first.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // fund_id is selected only so the usage log row is readable by the GP whose
  // fund it belongs to — the read policy on usage_log is fund-scoped, and a row
  // written with a null fund_id is visible to nobody at all.
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, fund_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('quarters')
    .insert([{ ...body, company_id: profile?.company_id ?? null }])
    .select()
    .single()

  // An RLS refusal surfaces here as an error rather than a silent no-op.
  if (error) {
    logUsage(supabase, {
      route: '/api/quarters', method: 'POST', status: 403,
      durationMs: Date.now() - startedAt,
      role: 'submit', userId: user.id,
      companyId: (profile?.company_id as string | null) ?? null,
      fundId: (profile?.fund_id as string | null) ?? null,
    })
    return refused('POST /api/quarters', error, 'That submission was not accepted.')
  }

  // Composed into the outbox, never transmitted here. Fire-and-forget: a
  // notification that cannot be composed must not fail a successful filing.
  if (profile?.company_id && typeof body?.period === 'string') {
    composeSubmissionNotifications(supabase, {
      companyId: profile.company_id as string,
      submitterProfileId: user.id,
      period: body.period,
      lang: 'en',
    })
  }

  // Nothing from `body` is logged. The submitted figures are the single most
  // sensitive thing this route touches.
  logUsage(supabase, {
    route: '/api/quarters', method: 'POST', status: 201,
    durationMs: Date.now() - startedAt,
    role: 'submit', userId: user.id,
    companyId: (profile?.company_id as string | null) ?? null,
      fundId: (profile?.fund_id as string | null) ?? null,
  })

  return NextResponse.json(data, { status: 201 })
}
