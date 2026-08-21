// Shared row type only.
//
// This module used to export a bare anon-key client with no session attached.
// Everything that used it reached Postgres as an anonymous caller, which is why
// the quarters table was readable without logging in. It is deliberately gone:
// use lib/supabase/client.ts in the browser or lib/supabase/server.ts on the
// server, both of which carry the user's session so RLS applies.

export type Quarter = {
  id?: number
  period: string
  turnover: number
  cos: number
  gross: number
  admin: number
  op: number
  interest: number
  pbt: number
  tax: number
  retained: number
  fixed: number
  stock: number
  debtors: number
  cash: number
  creditors: number
  net_assets: number
  funds: number
  created_at?: string
  // Present in the table but not on every submission path: the quarterly
  // generator writes them, the manual form does not. Optional so a row from
  // either source type-checks, and so `ebitda` can add D&A without a cast.
  depreciation_amortisation?: number
  long_term_liabilities?: number
  company_id?: string
}
