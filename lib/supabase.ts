import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
