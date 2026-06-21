// ── Synthetic fund data ──────────────────────────────────────────────────────
// Shared between the LP view UI and the /api/ask AI assistant so the model
// answers from exactly the figures the investor sees on screen.

export interface CompanyYear {
  fy: string
  revenue: number
  grossMargin: number
  ebitda: number
  netProfit: number
  cash: number
  receivables: number
  payables: number
}

export interface Company {
  id: string
  name: string
  sector: string
  country: string
  moic: number
  revenue: number
  sym: string
  status: 'green' | 'amber'
  trend: number[]
  data: CompanyYear[]
  commentary: string
}

export const FUND = {
  name: 'Fund II', period: 'Q1 2026', date: '31 March 2026',
  nav: 5220000, tvpi: 1.68, dpi: 0.32,
  commitment: 5000000, called: 3850000, unfunded: 1150000,
  distributed: 1240000, shareOfFund: 14.8,
}

export const COMPANIES: Company[] = [
  {
    id: 'mrj', name: 'Marlow & Reed Joinery', sector: 'Manufacturing', country: 'UK',
    moic: 1.69, revenue: 3980000, sym: '£', status: 'green',
    trend: [3280000, 3450000, 3610000, 3780000, 3980000],
    data: [
      { fy: 'FY23', revenue: 3280000, grossMargin: 41, ebitda: 749000, netProfit: 562000, cash: 1270000, receivables: 572000, payables: 163000 },
      { fy: 'FY24', revenue: 3610000, grossMargin: 42, ebitda: 889000, netProfit: 702000, cash: 2490000, receivables: 639000, payables: 337000 },
      { fy: 'FY25', revenue: 3980000, grossMargin: 43, ebitda: 1040000, netProfit: 824000, cash: 2980000, receivables: 692000, payables: 412000 },
    ],
    commentary: 'Revenue grew 21.3% over three years with gross margin expanding from 41% to 43%, a structural gain rather than a one-off. EBITDA rose from £749k to £1.04M and cash more than doubled, with no debt drawn. The balance sheet now supports an add-on.',
  },
  {
    id: 'df', name: 'Delacourt Frères', sector: 'F&B Distribution', country: 'France',
    moic: 1.35, revenue: 13680000, sym: '€', status: 'amber',
    trend: [11200000, 11800000, 12400000, 13000000, 13680000],
    data: [
      { fy: 'FY23', revenue: 11200000, grossMargin: 28, ebitda: 980000, netProfit: 620000, cash: 1840000, receivables: 2100000, payables: 890000 },
      { fy: 'FY24', revenue: 12400000, grossMargin: 27, ebitda: 1050000, netProfit: 680000, cash: 1650000, receivables: 2380000, payables: 1020000 },
      { fy: 'FY25', revenue: 13680000, grossMargin: 26, ebitda: 1120000, netProfit: 710000, cash: 1420000, receivables: 2640000, payables: 1180000 },
    ],
    commentary: 'Revenue is growing but gross margin has compressed from 28% to 26% as input costs remain elevated. Working capital has tightened — receivables up 26% while cash declined. Management is executing a price-led recovery for H2.',
  },
  {
    id: 'ats', name: 'Abington Technical Services', sector: 'B2B Services', country: 'UK',
    moic: 1.34, revenue: 8240000, sym: '£', status: 'green',
    trend: [5980000, 6400000, 7100000, 7600000, 8240000],
    data: [
      { fy: 'FY23', revenue: 5980000, grossMargin: 52, ebitda: 1240000, netProfit: 890000, cash: 2100000, receivables: 980000, payables: 310000 },
      { fy: 'FY24', revenue: 7100000, grossMargin: 53, ebitda: 1580000, netProfit: 1120000, cash: 2840000, receivables: 1240000, payables: 380000 },
      { fy: 'FY25', revenue: 8240000, grossMargin: 54, ebitda: 1920000, netProfit: 1380000, cash: 3620000, receivables: 1490000, payables: 440000 },
    ],
    commentary: 'Strong performance across all metrics. Revenue up 37.8% over three years with consistent margin expansion. The B2B services model generates high cash conversion — cash has grown to £3.6M. Pipeline supports continued growth into FY26.',
  },
  {
    id: 'asp', name: 'Atelier Saint-Pierre', sector: 'Specialty Mfg', country: 'France',
    moic: 1.09, revenue: 4210000, sym: '€', status: 'amber',
    trend: [3840000, 3900000, 3980000, 4100000, 4210000],
    data: [
      { fy: 'FY23', revenue: 3840000, grossMargin: 38, ebitda: 580000, netProfit: 320000, cash: 920000, receivables: 710000, payables: 290000 },
      { fy: 'FY24', revenue: 3980000, grossMargin: 37, ebitda: 540000, netProfit: 290000, cash: 780000, receivables: 820000, payables: 340000 },
      { fy: 'FY25', revenue: 4210000, grossMargin: 36, ebitda: 510000, netProfit: 270000, cash: 640000, receivables: 890000, payables: 390000 },
    ],
    commentary: 'Revenue is growing modestly but profitability is declining as gross margins compress. Cash has fallen from €920k to €640k while receivables have grown. Working capital management is a priority and the team is reviewing pricing and operational costs.',
  },
]

export const DOCUMENTS = [
  { title: 'Q1 2026 Quarterly Report', type: 'Report', date: '16 Apr 2026', isNew: true },
  { title: 'Capital Call Notice · Call 7', type: 'Notice', date: '02 Apr 2026', isNew: true },
  { title: 'Q4 2025 Quarterly Report', type: 'Report', date: '18 Jan 2026', isNew: false },
  { title: '2025 Annual Report & Audited Accounts', type: 'Report', date: '12 Jan 2026', isNew: false },
  { title: 'Distribution Notice · Dist 3', type: 'Notice', date: '20 Nov 2025', isNew: false },
  { title: 'Q3 2025 Quarterly Report', type: 'Report', date: '15 Oct 2025', isNew: false },
  { title: '2024 Tax Statement', type: 'Tax', date: '30 Mar 2025', isNew: false },
]

// Compact JSON-ish context block the AI assistant reasons over.
export function fundContext(): string {
  const companies = COMPANIES.map(c => ({
    name: c.name, sector: c.sector, country: c.country,
    currency: c.sym === '£' ? 'GBP' : c.sym === '€' ? 'EUR' : 'USD',
    moic: c.moic, status: c.status === 'green' ? 'on plan' : 'on watch',
    annualAccounts: c.data,
    note: c.commentary,
  }))
  return JSON.stringify({ fund: FUND, portfolioCompanies: companies }, null, 2)
}
