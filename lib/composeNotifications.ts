import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lang } from './loc'
import {
  submissionConfirmation, gpSubmissionConfirmation, submissionReminder,
} from './emailTemplates'

// Composes notifications into email_outbox. Nothing here transmits.
//
// TENANCY BY CONSTRUCTION. `composeSubmitConfirmation` is handed a company id
// and reads only that company's own row. It never receives a fund object, a
// peer list, or a portfolio aggregate — so there is nothing in scope for a
// careless edit to leak. The template it calls has a fixed four-field
// vocabulary (see lib/emailTemplates.ts) and is never shared with the GP
// variant.
//
// Failures are swallowed for the same reason logUsage swallows them: a
// notification that could not be composed must not turn a successful filing
// into a failed request. The absence shows up in the outbox as a missing row,
// which the admin panel makes visible.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clavio-demo.vercel.app'

interface CompanyRow {
  id: string
  name: string
  fund_id: string
  reporting_deadline_days: number
}

/**
 * Confirmation to the company that just filed, and — as a SEPARATE row from a
 * SEPARATE template — one to the fund's partners.
 */
export function composeSubmissionNotifications(
  supabase: SupabaseClient,
  opts: { companyId: string; submitterProfileId: string; period: string; lang: Lang },
): void {
  void (async () => {
    try {
      // Only this company's row. Note what is not selected and not joined.
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, fund_id, reporting_deadline_days')
        .eq('id', opts.companyId)
        .single()
      if (!company) return
      const c = company as CompanyRow

      const deadline = deadlineLabel(c.reporting_deadline_days, opts.lang)

      // ── to the company ──
      const own = submissionConfirmation({
        companyName: c.name,
        period: opts.period,
        deadline,
        link: `${APP_URL}/`,
      }, opts.lang)

      await supabase.from('email_outbox').insert({
        fund_id: c.fund_id,
        company_id: c.id,
        recipient_profile_id: opts.submitterProfileId,
        audience: 'submit',
        kind: 'submission_confirmation',
        subject: own.subject,
        body: own.body,
      })

      // ── to the fund's partners ──
      // A different template with no shared body. The GP version names the fund
      // and the company; the company version names neither the fund nor any
      // peer. Keeping them apart is what stops a later edit from crossing them.
      const { data: fund } = await supabase
        .from('funds').select('name').eq('id', c.fund_id).single()
      const { data: partners } = await supabase
        .from('profiles').select('id').eq('role', 'gp').eq('fund_id', c.fund_id)

      // A submit user cannot read funds or other profiles under RLS, so these
      // come back empty when a company files — and the GP copy is simply not
      // composed. That is the correct outcome for now: composing it would
      // require this application to hold a key that bypasses RLS, which it
      // deliberately does not. Recorded rather than worked around.
      if (!fund || !partners?.length) return

      const forGp = gpSubmissionConfirmation({
        companyName: c.name,
        period: opts.period,
        fundName: (fund as { name: string }).name,
        filedAt: new Date().toLocaleDateString(opts.lang === 'fr' ? 'fr-FR' : 'en-GB'),
        link: `${APP_URL}/gp`,
      }, opts.lang)

      await supabase.from('email_outbox').insert(
        (partners as Array<{ id: string }>).map(p => ({
          fund_id: c.fund_id,
          company_id: c.id,
          recipient_profile_id: p.id,
          audience: 'gp',
          kind: 'submission_confirmation',
          subject: forGp.subject,
          body: forGp.body,
        })),
      )
    } catch {
      // See above.
    }
  })()
}

/**
 * A reminder for one company. Composed by a GP from the admin panel, so the
 * fund's own session is what reaches the database — but the TEXT still only
 * knows the four submit-audience fields.
 */
export async function composeReminder(
  supabase: SupabaseClient,
  opts: { companyId: string; period: string; lang: Lang },
): Promise<{ ok: boolean; error?: string }> {
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, fund_id, reporting_deadline_days')
    .eq('id', opts.companyId)
    .single()
  if (!company) return { ok: false, error: 'Company not found.' }
  const c = company as CompanyRow

  const { data: recipient } = await supabase
    .from('profiles').select('id').eq('company_id', c.id).eq('role', 'submit').limit(1).maybeSingle()
  if (!recipient) return { ok: false, error: 'That company has no submitting user.' }

  const composed = submissionReminder({
    companyName: c.name,
    period: opts.period,
    deadline: deadlineLabel(c.reporting_deadline_days, opts.lang),
    link: `${APP_URL}/`,
  }, opts.lang)

  const { error } = await supabase.from('email_outbox').insert({
    fund_id: c.fund_id,
    company_id: c.id,
    recipient_profile_id: (recipient as { id: string }).id,
    audience: 'submit',
    kind: 'submission_reminder',
    subject: composed.subject,
    body: composed.body,
  })
  return error ? { ok: false, error: 'Could not queue that reminder.' } : { ok: true }
}

function deadlineLabel(days: number, lang: Lang): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
