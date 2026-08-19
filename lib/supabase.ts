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
}
