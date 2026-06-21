'use client'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'
import { fmtM, fmtK, fmtFull, symbol } from '@/lib/currency'

const pct = (a: number, b: number) => (((a - b) / Math.abs(b)) * 100).toFixed(1)

async function exportPDF(quarters: Quarter[], currency: Currency) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const latest = quarters[quarters.length - 1]
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const f = (n: number) => fmtFull(n, currency)

  // Header block
  doc.setFillColor(10, 14, 26)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Portfolio Financial Summary', 14, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 195, 220)
  doc.text(`Period: ${latest.period}  ·  Prepared ${today}  ·  Clavio Capital  ·  Confidential  ·  ${currency}`, 14, 30)

  // KPI row
  const margin = (latest.gross / latest.turnover * 100).toFixed(1)
  const opMargin = (latest.op / latest.turnover * 100).toFixed(1)
  doc.setTextColor(10, 14, 26)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const kpis = [
    ['Revenue', f(latest.turnover)],
    ['Gross Profit', `${f(latest.gross)} (${margin}%)`],
    ['Op. Profit', `${f(latest.op)} (${opMargin}%)`],
    ['Net Assets', f(latest.net_assets)],
  ]
  kpis.forEach(([label, value], i) => {
    const x = 14 + i * 47
    doc.setTextColor(100, 100, 120)
    doc.text(label.toUpperCase(), x, 50)
    doc.setTextColor(10, 14, 26)
    doc.setFontSize(11)
    doc.text(value, x, 57)
    doc.setFontSize(9)
  })

  // Narrative
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  const narrative = `The portfolio company reported turnover of ${f(latest.turnover)} for ${latest.period}, generating a gross profit of ${f(latest.gross)} (${margin}% gross margin) and operating profit of ${f(latest.op)} (${opMargin}% operating margin). Profit before tax stood at ${f(latest.pbt)}, with retained profit of ${f(latest.retained)}. Net assets are ${f(latest.net_assets)}, supported by cash of ${f(latest.cash)}.`
  const lines = doc.splitTextToSize(narrative, 182)
  doc.text(lines, 14, 68)

  // Table
  const tableRows = [...quarters].reverse().map(q => [
    q.period,
    f(q.turnover),
    `${(q.gross / q.turnover * 100).toFixed(1)}%`,
    `${(q.op / q.turnover * 100).toFixed(1)}%`,
    f(q.pbt),
    f(q.net_assets),
  ])

  autoTable(doc, {
    startY: 68 + lines.length * 5 + 6,
    head: [['Period', 'Revenue', 'Gross Margin', 'Op. Margin', 'PBT', 'Net Assets']],
    body: tableRows,
    headStyles: { fillColor: [10, 14, 26], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 40] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  })

  // Footer
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`This document is confidential · Clavio Capital · ${today} · Page ${i} of ${pageCount}`, 14, 290)
  }

  doc.save(`clavio-investor-report-${latest.period.replace(/\s/g, '-')}.pdf`)
}

export default function LPView({ quarters, currency }: { quarters: Quarter[]; currency: Currency }) {
  const latest = quarters[quarters.length - 1]
  const prev = quarters[quarters.length - 2]
  const first = quarters[0]

  if (!latest) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No data available.</div>
  }

  const margin = latest.gross / latest.turnover * 100
  const opMargin = latest.op / latest.turnover * 100
  const revenueGrowth = prev ? pct(latest.turnover, prev.turnover) : null
  const totalRevenueGrowth = first ? pct(latest.turnover, first.turnover) : null
  const sym = symbol(currency)

  const chartData = quarters.map(q => ({
    period: q.period,
    'Net Assets': q.net_assets,
    Turnover: q.turnover,
    'Gross Profit': q.gross,
  }))

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div style={styles.reportHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={styles.reportBadge}>Investor Report</div>
            <h1 style={styles.reportTitle}>Portfolio Financial Summary</h1>
            <p style={styles.reportPeriod}>Period: {latest.period} · Prepared {today}</p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>CLAVIO CAPITAL</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>Confidential · {currency}</div>
            </div>
            <button
              onClick={() => exportPDF(quarters, currency)}
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              ↓ Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Headline KPIs */}
      <div style={styles.kpiStrip}>
        {[
          { label: 'Revenue', value: fmtM(latest.turnover, currency), sub: revenueGrowth ? `${Number(revenueGrowth) >= 0 ? '+' : ''}${revenueGrowth}% QoQ` : '' },
          { label: 'Gross Profit', value: fmtK(latest.gross, currency), sub: `${margin.toFixed(1)}% margin` },
          { label: 'Operating Profit', value: fmtK(latest.op, currency), sub: `${opMargin.toFixed(1)}% op. margin` },
          { label: 'Net Assets', value: fmtM(latest.net_assets, currency), sub: totalRevenueGrowth ? `Revenue +${totalRevenueGrowth}% since inception` : '' },
        ].map(k => (
          <div key={k.label} style={styles.kpiBox}>
            <div style={styles.kpiBoxLabel}>{k.label}</div>
            <div style={styles.kpiBoxValue}>{k.value}</div>
            {k.sub && <div style={styles.kpiBoxSub}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Period narrative */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Period Summary — {latest.period}</h3>
        <p style={styles.narrative}>
          The portfolio company reported turnover of <strong>{fmtFull(latest.turnover, currency)}</strong> for {latest.period},
          generating a gross profit of <strong>{fmtFull(latest.gross, currency)}</strong> ({margin.toFixed(1)}% gross margin)
          and operating profit of <strong>{fmtFull(latest.op, currency)}</strong> ({opMargin.toFixed(1)}% operating margin).
          Profit before tax stood at <strong>{fmtFull(latest.pbt, currency)}</strong>, with retained profit of <strong>{fmtFull(latest.retained, currency)}</strong>.
        </p>
        <p style={{ ...styles.narrative, marginTop: 12 }}>
          The balance sheet shows net assets of <strong>{fmtFull(latest.net_assets, currency)}</strong>,
          supported by cash of <strong>{fmtFull(latest.cash, currency)}</strong> and a debtors balance of <strong>{fmtFull(latest.debtors, currency)}</strong>.
          Creditors due within one year total <strong>{fmtFull(latest.creditors, currency)}</strong>.
          Shareholders&apos; funds are <strong>{fmtFull(latest.funds, currency)}</strong>.
        </p>
      </div>

      {/* Net asset trend */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Net Asset Growth</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B82BD" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#5B82BD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tickFormatter={v => `${sym}${(v / 1_000_000).toFixed(1)}m`} tick={{ fontSize: 11, fill: '#6B7280' }} width={64} />
              <Tooltip formatter={(v: number) => fmtFull(v, currency)} contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }} />
              <Area type="monotone" dataKey="Net Assets" stroke="#5B82BD" strokeWidth={2.5} fill="url(#netGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue & profit trend */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Revenue & Profitability Trend</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B82BD" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#5B82BD" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tickFormatter={v => `${sym}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6B7280' }} width={64} />
              <Tooltip formatter={(v: number) => fmtFull(v, currency)} contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }} />
              <Area type="monotone" dataKey="Turnover" stroke="#5B82BD" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="Gross Profit" stroke="#10B981" strokeWidth={2} fill="url(#gpGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key metrics table */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Key Financial Metrics — All Periods</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: 'var(--navy)' }}>
                {['Period', 'Revenue', 'Gross Margin', 'Op. Margin', 'PBT', 'Net Assets'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...quarters].reverse().map((q, i) => (
                <tr key={q.id ?? i} style={{ background: i % 2 === 0 ? 'transparent' : '#F9FAFB' }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{q.period}</td>
                  <td style={styles.td}>{fmtFull(q.turnover, currency)}</td>
                  <td style={styles.td}>{(q.gross / q.turnover * 100).toFixed(1)}%</td>
                  <td style={styles.td}>{(q.op / q.turnover * 100).toFixed(1)}%</td>
                  <td style={styles.td}>{fmtFull(q.pbt, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.net_assets, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0 40px' }}>
        This document is confidential and intended solely for the named recipient. · Clavio Capital · {today}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  reportHeader: {
    background: 'var(--navy)', borderRadius: 14, padding: '28px 28px 24px',
    marginBottom: 20, color: 'white',
  },
  reportBadge: {
    display: 'inline-block', background: 'var(--accent)', color: 'white',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
    padding: '4px 10px', borderRadius: 20, marginBottom: 10,
  },
  reportTitle: { fontSize: 26, fontWeight: 700, marginBottom: 6 },
  reportPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  kpiStrip: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12, marginBottom: 20,
  },
  kpiBox: {
    background: 'var(--white)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '18px 18px',
    borderTop: '3px solid var(--accent)',
  },
  kpiBoxLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  kpiBoxValue: { fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  kpiBoxSub: { fontSize: 12, color: 'var(--accent)', fontWeight: 500 },
  card: { background: 'var(--white)', borderRadius: 12, padding: '20px', marginBottom: 16, border: '1px solid var(--border)' },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 },
  narrative: { fontSize: 14, lineHeight: 1.7, color: '#374151' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em' },
  td: { padding: '9px 14px', borderBottom: '1px solid #F3F4F6', color: 'var(--text)' },
}
