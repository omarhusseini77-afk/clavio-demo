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
  id: string
  title: Loc
  type: Loc
  typeKey: 'Report' | 'Notice' | 'Tax'
  date: string
  isNew: boolean
  // The path itself is never sent to the client — only whether a file exists,
  // so the UI can disable Download rather than offer a link that 404s.
  hasFile: boolean
}

export interface Anomaly {
  company: string
  /** Severity is a human judgement, so only authored observations carry one.
   *  A computed signal is null: the rule fired or it did not, and deriving a
   *  red/amber from how far past a threshold a value sits would be inventing a
   *  model and rendering it as measurement. */
  level: 'red' | 'amber' | null
  /** true = a partner wrote it down. These are observational by nature —
   *  a lost client, bank discussions — and none of it is in the schema. */
  isSignal: boolean
  /** true = derived from the company's own quarters by lib/cfoSignals.ts.
   *  Mutually exclusive with isSignal. */
  computed: boolean
  /** Period the rule fired on. Computed items only. */
  period?: string
  title: Loc
  detail: Loc
  /** Suggested next steps. For computed items these follow from the rule
   *  rather than from the company, and are labelled that way. */
  actions: Loc[]
}

export interface QuartersCompany {
  id: string
  name: string
  quartersFiled: number
  latestPeriod: string | null
}

export interface FundDataPayload {
  /** Company whose quarters /api/quarters returns by DEFAULT; the dashboard
   *  header falls back to this before a selection is made. */
  quartersCompany: string | null
  /** Every company the caller can see quarters for — the selector's options.
   *  Empty for an LP, whose session reads no quarters at all. */
  quartersCompanies: QuartersCompany[]
  fund: Fund | null
  position: LpPosition | null
  companies: Company[]
  capitalEvents: CapitalEvent[]
  forecast: Forecast | null
  documents: DocItem[]
  anomalies: Anomaly[]
}
