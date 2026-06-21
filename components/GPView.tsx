'use client'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import type { Quarter } from '@/lib/supabase'

const fmt = (n: number) =>
  n >= 1_000_000
    ? `£${(n / 1_000_000).toFixed(2)}m`
    : `£${(n / 1_000).toFixed(0)}k`

const fmtFull = (n: number) => `£${n.toLocaleString('en-GB')}`

const COLS: { key: keyof Quarter; label: string }[] = [
  { key: 'turnover', label: 'Turnover' },
  { key: 'gross', label: 'Gross Profit' },
  { key: 'op', label: 'Op. Profit' },
  { key: 'pbt', label: 'PBT' },
  { key: 'retained', label: 'Retained' },
  { key: 'net_assets', label: 'Net Assets' },
]

export default function GPView({ quarters }: { quarters: Quarter[] }) {
  const latest = quarters[quarters.length - 1]

  if (!latest) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        No data yet. Ask the portfolio company to submit a quarter.
      </div>
    )
  }

  const prev = quarters[quarters.length - 2]

  const delta = (key: keyof Quarter) => {
    if (!prev || typeof latest[key] !== 'number' || typeof prev[key] !== 'number') return null
    const pct = (((latest[key] as number) - (prev[key] as number)) / Math.abs(prev[key] as number)) * 100
    return pct
  }

  const chartData = quarters.map(q => ({
    period: q.period,
    Turnover: q.turnover,
    'Gross Profit': q.gross,
    'Op. Profit': q.op,
    PBT: q.pbt,
  }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Partner Dashboard</h1>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Latest: {latest.period}</span>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
        {quarters.length} quarter{quarters.length !== 1 ? 's' : ''} on record
      </p>

      {/* KPI strip */}
      <div style={styles.kpiGrid}>
        {COLS.map(c => {
          const d = delta(c.key)
          return (
            <div key={c.key} style={styles.kpiCard}>
              <div style={styles.kpiLabel}>{c.label}</div>
              <div style={styles.kpiValue}>{fmt(latest[c.key] as number)}</div>
              {d !== null && (
                <div style={{ fontSize: 12, marginTop: 4, color: d >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                  {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}% vs prev
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Trend chart */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Performance Trend</h3>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6B7280' }} width={60} />
              <Tooltip formatter={(v: number) => fmtFull(v)} contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Turnover" stroke="#5B82BD" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Gross Profit" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Op. Profit" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="PBT" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>All Quarters — Standardised</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Turnover</th>
                <th style={styles.th}>Gross</th>
                <th style={styles.th}>Op. Profit</th>
                <th style={styles.th}>PBT</th>
                <th style={styles.th}>Retained</th>
                <th style={styles.th}>Net Assets</th>
                <th style={styles.th}>Cash</th>
              </tr>
            </thead>
            <tbody>
              {[...quarters].reverse().map((q, i) => (
                <tr key={q.id ?? i} style={{ background: i % 2 === 0 ? 'transparent' : '#FAFAFA' }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{q.period}</td>
                  <td style={styles.td}>{fmtFull(q.turnover)}</td>
                  <td style={styles.td}>{fmtFull(q.gross)}</td>
                  <td style={styles.td}>{fmtFull(q.op)}</td>
                  <td style={styles.td}>{fmtFull(q.pbt)}</td>
                  <td style={styles.td}>{fmtFull(q.retained)}</td>
                  <td style={styles.td}>{fmtFull(q.net_assets)}</td>
                  <td style={styles.td}>{fmtFull(q.cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 },
  kpiCard: {
    background: 'var(--white)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 18px',
  },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  card: { background: 'var(--white)', borderRadius: 12, padding: '20px', marginBottom: 16, border: '1px solid var(--border)' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)' },
  td: { padding: '9px 12px', borderBottom: '1px solid #F3F4F6', color: 'var(--text)' },
}
