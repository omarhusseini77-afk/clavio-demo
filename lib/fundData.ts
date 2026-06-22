import type { Loc, Lang } from './loc'

// ── Synthetic fund data ──────────────────────────────────────────────────────
// Shared between the LP view UI and the /api/ask AI assistant so the model
// answers from exactly the figures the investor sees on screen.
// Translatable prose is stored as { en, fr }.

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
  sector: Loc
  country: Loc
  moic: number
  revenue: number
  sym: string
  status: 'green' | 'amber'
  trend: number[]
  data: CompanyYear[]
  commentary: Loc
  investmentDate: string
  ownership: number   // % of portfolio company equity
  cost: number        // total invested (£/€)
  irr: number         // gross IRR since entry
  evEbitda: number    // current EV/EBITDA multiple
  netDebt: number     // latest net debt
}

export const FUND = {
  name: 'Fund II', period: 'Q1 2026',
  date: { en: '31 March 2026', fr: '31 mars 2026' } as Loc,
  nav: 5220000, tvpi: 1.68, dpi: 0.32, rvpi: 1.36,
  irr: 18.4, grossIrr: 24.1,
  commitment: 5000000, called: 3850000, unfunded: 1150000,
  distributed: 1240000, shareOfFund: 14.8,
  vintageYear: 2022,
  totalInvested: 16900000, currentGrossValue: 23500000,
}

export const COMPANIES: Company[] = [
  {
    id: 'mrj', name: 'Marlow & Reed Joinery',
    sector: { en: 'Manufacturing', fr: 'Industrie' },
    country: { en: 'UK', fr: 'R.-U.' },
    moic: 1.69, revenue: 3980000, sym: '£', status: 'green',
    trend: [3280000, 3450000, 3610000, 3780000, 3980000],
    data: [
      { fy: 'FY23', revenue: 3280000, grossMargin: 41, ebitda: 749000, netProfit: 562000, cash: 1270000, receivables: 572000, payables: 163000 },
      { fy: 'FY24', revenue: 3610000, grossMargin: 42, ebitda: 889000, netProfit: 702000, cash: 2490000, receivables: 639000, payables: 337000 },
      { fy: 'FY25', revenue: 3980000, grossMargin: 43, ebitda: 1040000, netProfit: 824000, cash: 2980000, receivables: 692000, payables: 412000 },
    ],
    commentary: {
      en: 'Revenue grew 21.3% over three years with gross margin expanding from 41% to 43%, a structural gain rather than a one-off. EBITDA rose from £749k to £1.04M and cash more than doubled, with no debt drawn. The balance sheet now supports an add-on.',
      fr: 'Le chiffre d’affaires a progressé de 21,3 % sur trois ans, la marge brute passant de 41 % à 43 %, un gain structurel plutôt que ponctuel. L’EBITDA est passé de 749 k£ à 1,04 M£ et la trésorerie a plus que doublé, sans dette tirée. Le bilan permet désormais une acquisition de croissance externe.',
    },
    investmentDate: 'Jun 2022', ownership: 68, cost: 4200000, irr: 32.4, evEbitda: 9.2, netDebt: 420000,
  },
  {
    id: 'df', name: 'Delacourt Frères',
    sector: { en: 'F&B Distribution', fr: 'Distribution agroalimentaire' },
    country: { en: 'France', fr: 'France' },
    moic: 1.35, revenue: 13680000, sym: '€', status: 'amber',
    trend: [11200000, 11800000, 12400000, 13000000, 13680000],
    data: [
      { fy: 'FY23', revenue: 11200000, grossMargin: 28, ebitda: 980000, netProfit: 620000, cash: 1840000, receivables: 2100000, payables: 890000 },
      { fy: 'FY24', revenue: 12400000, grossMargin: 27, ebitda: 1050000, netProfit: 680000, cash: 1650000, receivables: 2380000, payables: 1020000 },
      { fy: 'FY25', revenue: 13680000, grossMargin: 26, ebitda: 1120000, netProfit: 710000, cash: 1420000, receivables: 2640000, payables: 1180000 },
    ],
    commentary: {
      en: 'Revenue is growing but gross margin has compressed from 28% to 26% as input costs remain elevated. Working capital has tightened — receivables up 26% while cash declined. Management is executing a price-led recovery for H2.',
      fr: 'Le chiffre d’affaires croît mais la marge brute s’est contractée de 28 % à 26 %, les coûts des intrants restant élevés. Le besoin en fonds de roulement s’est tendu — créances en hausse de 26 % tandis que la trésorerie a reculé. La direction met en œuvre un redressement par les prix au S2.',
    },
    investmentDate: 'Nov 2022', ownership: 55, cost: 5100000, irr: 18.7, evEbitda: 7.8, netDebt: 1840000,
  },
  {
    id: 'ats', name: 'Abington Technical Services',
    sector: { en: 'B2B Services', fr: 'Services B2B' },
    country: { en: 'UK', fr: 'R.-U.' },
    moic: 1.34, revenue: 8240000, sym: '£', status: 'green',
    trend: [5980000, 6400000, 7100000, 7600000, 8240000],
    data: [
      { fy: 'FY23', revenue: 5980000, grossMargin: 52, ebitda: 1240000, netProfit: 890000, cash: 2100000, receivables: 980000, payables: 310000 },
      { fy: 'FY24', revenue: 7100000, grossMargin: 53, ebitda: 1580000, netProfit: 1120000, cash: 2840000, receivables: 1240000, payables: 380000 },
      { fy: 'FY25', revenue: 8240000, grossMargin: 54, ebitda: 1920000, netProfit: 1380000, cash: 3620000, receivables: 1490000, payables: 440000 },
    ],
    commentary: {
      en: 'Strong performance across all metrics. Revenue up 37.8% over three years with consistent margin expansion. The B2B services model generates high cash conversion — cash has grown to £3.6M. Pipeline supports continued growth into FY26.',
      fr: 'Performance solide sur tous les indicateurs. Chiffre d’affaires en hausse de 37,8 % sur trois ans avec une expansion régulière des marges. Le modèle de services B2B génère une forte conversion en trésorerie — celle-ci a atteint 3,6 M£. Le carnet de commandes soutient la croissance jusqu’en EX26.',
    },
    investmentDate: 'Apr 2023', ownership: 72, cost: 4400000, irr: 22.1, evEbitda: 8.9, netDebt: 310000,
  },
  {
    id: 'asp', name: 'Atelier Saint-Pierre',
    sector: { en: 'Specialty Mfg', fr: 'Fabrication spécialisée' },
    country: { en: 'France', fr: 'France' },
    moic: 1.09, revenue: 4210000, sym: '€', status: 'amber',
    trend: [3840000, 3900000, 3980000, 4100000, 4210000],
    data: [
      { fy: 'FY23', revenue: 3840000, grossMargin: 38, ebitda: 580000, netProfit: 320000, cash: 920000, receivables: 710000, payables: 290000 },
      { fy: 'FY24', revenue: 3980000, grossMargin: 37, ebitda: 540000, netProfit: 290000, cash: 780000, receivables: 820000, payables: 340000 },
      { fy: 'FY25', revenue: 4210000, grossMargin: 36, ebitda: 510000, netProfit: 270000, cash: 640000, receivables: 890000, payables: 390000 },
    ],
    commentary: {
      en: 'Revenue is growing modestly but profitability is declining as gross margins compress. Cash has fallen from €920k to €640k while receivables have grown. Working capital management is a priority and the team is reviewing pricing and operational costs.',
      fr: 'Le chiffre d’affaires croît modestement mais la rentabilité décline à mesure que les marges brutes se contractent. La trésorerie est passée de 920 k€ à 640 k€ tandis que les créances ont augmenté. La gestion du besoin en fonds de roulement est une priorité et l’équipe revoit la tarification et les coûts opérationnels.',
    },
    investmentDate: 'Sep 2023', ownership: 61, cost: 3200000, irr: 4.8, evEbitda: 6.4, netDebt: 890000,
  },
]

export interface DocItem { title: Loc; type: Loc; typeKey: 'Report' | 'Notice' | 'Tax'; date: string; isNew: boolean }

export const DOCUMENTS: DocItem[] = [
  { title: { en: 'Q1 2026 Quarterly Report', fr: 'Rapport trimestriel T1 2026' }, type: { en: 'Report', fr: 'Rapport' }, typeKey: 'Report', date: '16 Apr 2026', isNew: true },
  { title: { en: 'Capital Call Notice · Call 7', fr: 'Avis d’appel de fonds · Appel 7' }, type: { en: 'Notice', fr: 'Avis' }, typeKey: 'Notice', date: '02 Apr 2026', isNew: true },
  { title: { en: 'Q4 2025 Quarterly Report', fr: 'Rapport trimestriel T4 2025' }, type: { en: 'Report', fr: 'Rapport' }, typeKey: 'Report', date: '18 Jan 2026', isNew: false },
  { title: { en: '2025 Annual Report & Audited Accounts', fr: 'Rapport annuel 2025 & comptes audités' }, type: { en: 'Report', fr: 'Rapport' }, typeKey: 'Report', date: '12 Jan 2026', isNew: false },
  { title: { en: 'Distribution Notice · Dist 3', fr: 'Avis de distribution · Distribution 3' }, type: { en: 'Notice', fr: 'Avis' }, typeKey: 'Notice', date: '20 Nov 2025', isNew: false },
  { title: { en: 'Q3 2025 Quarterly Report', fr: 'Rapport trimestriel T3 2025' }, type: { en: 'Report', fr: 'Rapport' }, typeKey: 'Report', date: '15 Oct 2025', isNew: false },
  { title: { en: '2024 Tax Statement', fr: 'Relevé fiscal 2024' }, type: { en: 'Tax', fr: 'Fiscal' }, typeKey: 'Tax', date: '30 Mar 2025', isNew: false },
]

// The investor's own capital account history — calls (cash in) and
// distributions (cash out to the LP). Totals tie to FUND.called / FUND.distributed.
export interface CapitalEvent {
  date: Loc
  type: 'call' | 'distribution'
  label: Loc
  amount: number
}

export const CAPITAL_EVENTS: CapitalEvent[] = [
  { date: { en: '15 Jun 2022', fr: '15 juin 2022' }, type: 'call', label: { en: 'Capital Call 1 · Initial deployment', fr: 'Appel de fonds 1 · Déploiement initial' }, amount: 750000 },
  { date: { en: '20 Nov 2022', fr: '20 nov. 2022' }, type: 'call', label: { en: 'Capital Call 2', fr: 'Appel de fonds 2' }, amount: 600000 },
  { date: { en: '18 Apr 2023', fr: '18 avr. 2023' }, type: 'call', label: { en: 'Capital Call 3', fr: 'Appel de fonds 3' }, amount: 550000 },
  { date: { en: '22 Sep 2023', fr: '22 sept. 2023' }, type: 'call', label: { en: 'Capital Call 4', fr: 'Appel de fonds 4' }, amount: 500000 },
  { date: { en: '14 Mar 2024', fr: '14 mars 2024' }, type: 'call', label: { en: 'Capital Call 5', fr: 'Appel de fonds 5' }, amount: 550000 },
  { date: { en: '12 May 2024', fr: '12 mai 2024' }, type: 'distribution', label: { en: 'Distribution 1 · Delacourt dividend recap', fr: 'Distribution 1 · Recap. dividende Delacourt' }, amount: 380000 },
  { date: { en: '19 Sep 2024', fr: '19 sept. 2024' }, type: 'call', label: { en: 'Capital Call 6 · Abington add-on', fr: 'Appel de fonds 6 · Croissance externe Abington' }, amount: 450000 },
  { date: { en: '28 Nov 2024', fr: '28 nov. 2024' }, type: 'distribution', label: { en: 'Distribution 2 · Portfolio refinancing', fr: 'Distribution 2 · Refinancement du portefeuille' }, amount: 420000 },
  { date: { en: '20 Nov 2025', fr: '20 nov. 2025' }, type: 'distribution', label: { en: 'Distribution 3', fr: 'Distribution 3' }, amount: 440000 },
  { date: { en: '02 Apr 2026', fr: '02 avr. 2026' }, type: 'call', label: { en: 'Capital Call 7', fr: 'Appel de fonds 7' }, amount: 450000 },
]

// Forward-looking projection shown to the investor.
export const FORECAST = {
  nextCall: { period: { en: 'Q3 2026', fr: 'T3 2026' } as Loc, amount: 450000, note: { en: 'Planned add-on acquisition at Abington Technical Services', fr: 'Acquisition de croissance externe prévue chez Abington Technical Services' } as Loc },
  nextDistribution: { period: { en: 'Q4 2026', fr: 'T4 2026' } as Loc, amount: 320000, note: { en: 'Expected from Marlow & Reed recapitalisation', fr: 'Attendue de la recapitalisation de Marlow & Reed' } as Loc },
  projectedDistributions18m: 1600000,
  through: { en: 'Through 2027', fr: 'Jusqu’en 2027' } as Loc,
}

// Compact JSON-ish context block the AI assistant reasons over (English source;
// the assistant is instructed to reply in the requested language).
export function fundContext(): string {
  const companies = COMPANIES.map(c => ({
    name: c.name, sector: c.sector.en, country: c.country.en,
    currency: c.sym === '£' ? 'GBP' : c.sym === '€' ? 'EUR' : 'USD',
    moic: c.moic, status: c.status === 'green' ? 'on plan' : 'on watch',
    annualAccounts: c.data,
    note: c.commentary.en,
  }))
  return JSON.stringify({
    fund: { ...FUND, date: FUND.date.en },
    portfolioCompanies: companies,
    yourCapitalAccount: {
      events: CAPITAL_EVENTS.map(e => ({ date: e.date.en, type: e.type, label: e.label.en, amount: e.amount })),
      forecast: {
        nextCall: { period: FORECAST.nextCall.period.en, amount: FORECAST.nextCall.amount, note: FORECAST.nextCall.note.en },
        nextDistribution: { period: FORECAST.nextDistribution.period.en, amount: FORECAST.nextDistribution.amount, note: FORECAST.nextDistribution.note.en },
        projectedDistributions18m: FORECAST.projectedDistributions18m,
      },
    },
  }, null, 2)
}

export type { Lang }
