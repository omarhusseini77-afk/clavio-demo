// Shape of /api/fund-data. Server-safe (no React), so the route, the client
// hook and the AI context builder all agree on one definition.
//
// Deliberately mirrors the old lib/fundData.ts constants so the components that
// render it did not have to be rewritten when the data moved into Postgres.
import type { Loc } from './loc'

export interface CompanyYear {
  fy: string
  revenue: number
  grossMargin: number
  ebitda: number
  netProfit: number
  // Working capital. Optional because RLS withholds company_year_internals from
  // LPs entirely — for an investor these keys are absent, not zeroed.
  cash?: number
  receivables?: number
  payables?: number
}

export interface Company {
  id: string
  name: string
  sector: Loc
  country: Loc
  sym: string
  status: 'green' | 'amber' | 'red'
  moic: number
  // Latest financial year's revenue, denormalised for the portfolio list.
  revenue: number
  trend: number[]
  investmentDate: string
  ownership: number
  cost: number
  irr: number
  evEbitda: number
  commentary: Loc
  data: CompanyYear[]
  netDebt?: number
}

export interface Fund {
  name: string
  periodLabel: string
  date: Loc
  vintageYear: number
  totalInvested: number
  currentGrossValue: number
  grossIrr: number
}

export interface LpPosition {
  commitment: number
  called: number
  unfunded: number
  distributed: number
  nav: number
  shareOfFund: number
  tvpi: number
  dpi: number
  rvpi: number
  irr: number
}

export interface CapitalEvent {
  date: Loc
  type: 'call' | 'distribution'
  label: Loc
  amount: number
}

export interface Forecast {
  nextCall: { period: Loc; amount: number; note: Loc }
  nextDistribution: { period: Loc; amount: number; note: Loc }
  projectedDistributions18m: number
  through: Loc
}

export interface DocItem {
  title: Loc
  type: Loc
  typeKey: 'Report' | 'Notice' | 'Tax'
  date: string
  isNew: boolean
}

export interface Anomaly {
  company: string
  level: 'red' | 'amber'
  isSignal: boolean
  title: Loc
  detail: Loc
  actions: Loc[]
}

export interface FundDataPayload {
  fund: Fund | null
  position: LpPosition | null
  companies: Company[]
  capitalEvents: CapitalEvent[]
  forecast: Forecast | null
  documents: DocItem[]
  anomalies: Anomaly[]
}
