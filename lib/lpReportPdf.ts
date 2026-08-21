import type { ReadyFundData } from './useFundData'
import type { Lang } from './loc'
import { loc } from './loc'
import type { Currency } from './currency'
import { fmtFull, symbol } from './currency'
import {
  drawHeader, drawTitle, drawNotice, drawFooters,
  NAVY, ACCENT, MUTED, TEXT, MARGIN,
} from './pdfChrome'

// The investor's own report, as a PDF.
//
// Built in the browser from the payload already on screen. That is the point:
// the data has already been through RLS and through /api/fund-data, so this
// adds no endpoint and no second place where the wrong figures could be
// assembled. Whatever an investor cannot see on the page cannot appear here,
// because it never arrived.
//
// Specifically absent, and absent by construction rather than by filtering:
// cash, receivables, payables and net debt. Those live in company_internals and
// company_year_internals, which an LP's session is refused, so `c.netDebt` and
// `year.cash` are undefined in this payload. This module never reads them —
// see the annual-accounts table below, which names its columns explicitly.

const PCT = (v: number) => `${(v * 100).toFixed(1)}%`

export async function buildLpReportPdf(
  data: ReadyFundData,
  lang: Lang,
  currency: Currency,
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = MARGIN
  const money = (v: number) => fmtFull(v, currency)

  const t = lang === 'fr'
    ? {
        title: 'Rapport investisseur',
        position: 'Votre position',
        commitment: 'Engagement', called: 'Appelé', unfunded: 'Non appelé',
        distributed: 'Distribué', nav: 'Valeur liquidative', share: 'Part du fonds',
        tvpi: 'TVPI', dpi: 'DPI', irr: 'TRI',
        fundPerf: 'Performance du fonds',
        vintage: 'Millésime', invested: 'Total investi', grossValue: 'Valeur brute actuelle',
        grossIrr: 'TRI brut',
        portfolio: 'Sociétés du portefeuille',
        company: 'Société', sector: 'Secteur', country: 'Pays', moic: 'MOIC',
        ownership: 'Détention', fy: 'Exercice', revenue: "Chiffre d'affaires",
        grossMargin: 'Marge brute', ebitda: 'EBITDA', netProfit: 'Résultat net',
        events: 'Compte de capital', date: 'Date', type: 'Type', label: 'Libellé', amount: 'Montant',
        call: 'Appel', distribution: 'Distribution',
        forecast: 'Prévisions de trésorerie',
        nextCall: 'Prochain appel', nextDist: 'Prochaine distribution',
        proj18: 'Distributions projetées, 18 mois',
        scopeNote: "Ce rapport reprend exactement les informations de votre portail investisseur. Les données d'exploitation des sociétés — trésorerie, créances, dettes, endettement net — ne font pas partie du reporting investisseur et n'y figurent pas.",
        generated: 'Généré le',
      }
    : {
        title: 'Investor Report',
        position: 'Your position',
        commitment: 'Commitment', called: 'Called', unfunded: 'Unfunded',
        distributed: 'Distributed', nav: 'NAV', share: 'Share of fund',
        tvpi: 'TVPI', dpi: 'DPI', irr: 'IRR',
        fundPerf: 'Fund performance',
        vintage: 'Vintage', invested: 'Total invested', grossValue: 'Current gross value',
        grossIrr: 'Gross IRR',
        portfolio: 'Portfolio companies',
        company: 'Company', sector: 'Sector', country: 'Country', moic: 'MOIC',
        ownership: 'Ownership', fy: 'FY', revenue: 'Revenue',
        grossMargin: 'Gross margin', ebitda: 'EBITDA', netProfit: 'Net profit',
        events: 'Capital account', date: 'Date', type: 'Type', label: 'Description', amount: 'Amount',
        call: 'Call', distribution: 'Distribution',
        forecast: 'Cash-flow forecast',
        nextCall: 'Next capital call', nextDist: 'Next distribution',
        proj18: 'Projected distributions, 18 months',
        scopeNote: 'This report contains exactly what your investor portal shows. Portfolio company operational data — cash, receivables, payables, net debt — is not part of investor reporting and does not appear here.',
        generated: 'Generated',
      }

  drawHeader(doc)
  const afterTitle = drawTitle(
    doc,
    `${data.fund.name} — ${t.title}`,
    `${loc(data.fund.date, lang)}  ·  ${t.generated} ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}  ·  ${symbol(currency)} ${currency}`,
  )
  let y = drawNotice(doc, afterTitle + 20) + 24

  // Says on the document what it does and does not contain, so a reader is not
  // left wondering whether an absent figure was withheld or simply missed.
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED)
  for (const line of doc.splitTextToSize(t.scopeNote, W - M * 2) as string[]) {
    doc.text(line, M, y); y += 11
  }
  y += 14

  const section = (label: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ACCENT)
    doc.text(label.toUpperCase(), M, y)
    y += 10
  }

  const table = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: TEXT, lineColor: [228, 232, 239] },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: M, right: M },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26
  }

  // ── Position ──
  const p = data.position
  section(t.position)
  table(
    [t.commitment, t.called, t.unfunded, t.distributed, t.nav, t.share],
    [[money(p.commitment), money(p.called), money(p.unfunded), money(p.distributed), money(p.nav), PCT(p.shareOfFund)]],
  )
  table(
    [t.tvpi, t.dpi, t.irr],
    [[`${p.tvpi.toFixed(2)}x`, `${p.dpi.toFixed(2)}x`, PCT(p.irr)]],
  )

  // ── Fund ──
  const f = data.fund
  section(t.fundPerf)
  table(
    [t.vintage, t.invested, t.grossValue, t.grossIrr],
    [[String(f.vintageYear), money(f.totalInvested), money(f.currentGrossValue), PCT(f.grossIrr)]],
  )

  // ── Portfolio ──
  section(t.portfolio)
  table(
    [t.company, t.sector, t.country, t.ownership, t.moic],
    data.companies.map(c => [
      c.name, loc(c.sector, lang), loc(c.country, lang), PCT(c.ownership), `${c.moic.toFixed(2)}x`,
    ]),
  )

  // Annual accounts. Columns are named one by one rather than spread from the
  // record: anything added to CompanyYear later is excluded by default instead
  // of appearing in an investor's PDF because a type grew.
  for (const c of data.companies) {
    if (!c.data.length) continue
    section(`${c.name} — ${c.sym}`)
    table(
      [t.fy, t.revenue, t.grossMargin, t.ebitda, t.netProfit],
      c.data.map(yr => [
        yr.fy,
        yr.revenue.toLocaleString('en-GB'),
        PCT(yr.grossMargin),
        yr.ebitda.toLocaleString('en-GB'),
        yr.netProfit.toLocaleString('en-GB'),
      ]),
    )
  }

  // ── Capital account ──
  if (data.capitalEvents.length) {
    section(t.events)
    table(
      [t.date, t.type, t.label, t.amount],
      data.capitalEvents.map(e => [
        loc(e.date, lang),
        e.type === 'call' ? t.call : t.distribution,
        loc(e.label, lang),
        money(e.amount),
      ]),
    )
  }

  // ── Forecast ──
  const fc = data.forecast
  section(t.forecast)
  table(
    [t.nextCall, t.nextDist, t.proj18],
    [[
      `${loc(fc.nextCall.period, lang)} — ${money(fc.nextCall.amount)}`,
      `${loc(fc.nextDistribution.period, lang)} — ${money(fc.nextDistribution.amount)}`,
      money(fc.projectedDistributions18m),
    ]],
  )

  // Last, so pages the tables added also carry the notice.
  drawFooters(doc, f.name)

  return doc.output('blob')
}
