import type { SupabaseClient } from '@supabase/supabase-js'

// Usage logging.
//
// The rule the whole design is built around: a log row answers *what was
// called, by which tenant, how fast, did it work* — and nothing about what was
// in it.
//
// Deliberately NOT recorded, and there is nowhere to put them even by mistake:
//
//   * question text and answer text. A question is free text and will contain
//     figures — "why did cash fall from £2.7m" is a financial figure in a log.
//     This is the biggest temptation in the whole feature and the answer is no.
//   * request or response bodies, truncated, hashed or sampled
//   * anything from `quarters`
//   * file names and storage paths — a filename carries company and period
//   * email addresses. user_id identifies a person; the address only makes the
//     table PII in a new way.
//   * IP addresses and user agents
//
// The enforcement is the type below plus the absence of a `metadata jsonb`
// column in the table. Every excluded item above would eventually end up in
// such a column, so not having one is a stronger guarantee than a rule saying
// not to use it. `UsageEntry` is a closed record for the same reason: adding a
// field means editing this file and the migration, which is exactly the amount
// of friction that decision deserves.

export interface UsageEntry {
  route: string
  method: string
  status: number
  durationMs: number
  role: string | null
  userId: string | null
  companyId: string | null
  fundId: string | null
  /** /api/ask only. Counts, never content. */
  tokens?: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
  }
  lang?: 'en' | 'fr'
}

/**
 * Write one row. Never throws and never blocks the caller's response: a
 * telemetry failure must not turn a working request into a failed one, and a
 * user waiting on a log write is a user waiting for nothing.
 */
export function logUsage(supabase: SupabaseClient, entry: UsageEntry): void {
  void (async () => {
    try {
      // A submit user's profile carries company_id but not fund_id, and the
      // read policy on usage_log is fund-scoped — so without this the GP would
      // not see their own portfolio companies' usage. Resolved rather than
      // left null, and only when it has to be.
      let fundId = entry.fundId
      if (!fundId && entry.companyId) {
        const { data } = await supabase
          .from('companies').select('fund_id').eq('id', entry.companyId).single()
        fundId = (data?.fund_id as string | undefined) ?? null
      }

      // Named field by field. Never spread from a wider object: that is how a
      // request body ends up in a log.
      await supabase.from('usage_log').insert({
        route: entry.route,
        method: entry.method,
        status: entry.status,
        duration_ms: Math.round(entry.durationMs),
        role: entry.role,
        user_id: entry.userId,
        company_id: entry.companyId,
        fund_id: fundId,
        input_tokens: entry.tokens?.input ?? null,
        output_tokens: entry.tokens?.output ?? null,
        cache_read_tokens: entry.tokens?.cacheRead ?? null,
        cache_write_tokens: entry.tokens?.cacheWrite ?? null,
        lang: entry.lang ?? null,
      })
    } catch {
      // Swallowed on purpose. See above.
    }
  })()
}
