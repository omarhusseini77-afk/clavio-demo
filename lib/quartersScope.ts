import type { SupabaseClient } from '@supabase/supabase-js'
import type { Quarter } from './supabase'

// One definition of "which company's quarters am I looking at", shared by
// /api/quarters and /api/ask.
//
// These drifted once: the dashboard was scoped to a single company while the
// assistant still queried every company in the fund, so it answered from 37 rows
// across four businesses while the screen showed 13 from one. For a product
// whose whole claim is grounded answers, an answer drawn from a different
// dataset than the visible figures is the worst available failure — worse than
// no answer, because it looks authoritative.
//
// Keeping the rule in one place is the fix. Anything else that needs a quarterly
// series should call this rather than querying `quarters` directly.

export type ScopeProfile = { role?: string | null; company_id?: string | null }

/** Chronological order parsed from the period label.
 *  `id` is insertion order, and sorting the label as text puts "Q4 FY24" after
 *  "Q1 FY25". */
export function periodSeq(period: string): number {
  const m = /Q(\d)\s*FY(\d+)/i.exec(period ?? '')
  return m ? Number(m[2]) * 10 + Number(m[1]) : 0
}

/** The company a quarterly series should be scoped to.
 *  A submitter gets its own; anyone else gets whichever company has filed the
 *  most quarters they can see. Deterministic, and unaffected by insertion order
 *  — "most recent by id" silently reassigned the dashboard when another
 *  company was backfilled. */
export async function resolveQuartersCompany(
  supabase: SupabaseClient,
  profile: ScopeProfile | null,
  requested?: string | null,
): Promise<string | null> {
  if (requested) return requested
  if (profile?.role === 'submit') return profile.company_id ?? null

  const { data } = await supabase.from('quarters').select('company_id')
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const id = (row as { company_id: string | null }).company_id
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** The scoped, chronologically ordered series. Goes through the caller's own
 *  session, so RLS still decides what is visible — the scoping is about
 *  coherence, not access. */
export async function fetchScopedQuarters(
  supabase: SupabaseClient,
  profile: ScopeProfile | null,
  requested?: string | null,
): Promise<{ companyId: string | null; quarters: Quarter[] }> {
  const companyId = await resolveQuartersCompany(supabase, profile, requested)
  if (!companyId) return { companyId: null, quarters: [] }

  const { data } = await supabase
    .from('quarters')
    .select('*')
    .eq('company_id', companyId)

  const quarters = [...((data as Quarter[]) ?? [])]
    .sort((a, b) => periodSeq(a.period) - periodSeq(b.period))

  return { companyId, quarters }
}
