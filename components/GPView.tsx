'use client'
import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'
import { fmtShort, fmtFull, symbol } from '@/lib/currency'

const COLS: { key: keyof Quarter; label: string }[] = [
  { key: 'turnover', label: 'Turnover' },
  { key: 'gross', label: 'Gross Profit' },
  { key: 'op', label: 'Op. Profit' },
  { key: 'pbt', label: 'PBT' },
  { key: 'retained', label: 'Retained' },
  { key: 'net_assets', label: 'Net Assets' },
]

const ALL_FIELDS: { key: keyof Quarter; label: string }[] = [
  { key: 'period', label: 'Period' },
  { key: 'turnover', label: 'Turnover' },
  { key: 'cos', label: 'Cost of Sales' },
  { key: 'gross', label: 'Gross Profit' },
  { key: 'admin', label: 'Admin Expenses' },
  { key: 'op', label: 'Operating Profit' },
  { key: 'interest', label: 'Interest Received' },
  { key: 'pbt', label: 'Profit Before Tax' },
  { key: 'tax', label: 'Tax' },
  { key: 'retained', label: 'Retained Profit' },
  { key: 'fixed', label: 'Fixed Assets' },
  { key: 'stock', label: 'Stock & WIP' },
  { key: 'debtors', label: 'Debtors' },
  { key: 'cash', label: 'Cash at Bank' },
  { key: 'creditors', label: 'Creditors Due Within 1 Year' },
  { key: 'net_assets', label: 'Net Assets' },
  { key: 'funds', label: "Shareholders' Funds" },
]

const SIGNALS = [
  { company: 'Halcyon Textiles', detail: 'Lost client >5% · Bank discussions · Miss next target', level: 'red' },
  { company: 'Sentinel Security NW', detail: 'Miss next target', level: 'amber' },
]

const ANOMALIES = [
  { company: 'HALCYON TEXTILES', title: 'EBITDA margin contracted 4.2pp month-over-month', detail: 'Outside the 95% confidence band of the trailing 6 months. Bad debt also up 14% on receivables.', level: 'red' },
  { company: 'SENTINEL SECURITY NW', title: 'Reported EBITDA inconsistent with prior pattern', detail: 'Variance from 6-month trailing average exceeds 2σ. Flagged for partner review.', level: 'amber' },
  { company: 'HALCYON TEXTILES', title: 'Receivables aging — 18% in 30+ day bucket', detail: 'Up from 9% three months ago. Trend warrants follow-up with management.', level: 'amber' },
]

type Props = {
  quarters: Quarter[]
  onDelete: (id: number) => Promise<void>
  onUpdate: (id: number, q: Omit<Quarter, 'id' | 'created_at'>) => Promise<boolean>
  currency: Currency
  mobileSection?: 'overview' | 'data'
}

export default function GPView({ quarters, onDelete, onUpdate, currency, mobileSection }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Quarter>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [investigateAnomaly, setInvestigateAnomaly] = useState<typeof ANOMALIES[0] | null>(null)

  const latest = quarters[quarters.length - 1]
  const prev = quarters[quarters.length - 2]

  if (!latest) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No data yet.</div>
  }

  const delta = (key: keyof Quarter) => {
    if (!prev || typeof latest[key] !== 'number' || typeof prev[key] !== 'number') return null
    return (((latest[key] as number) - (prev[key] as number)) / Math.abs(prev[key] as number)) * 100
  }

  const chartData = quarters.map(q => ({
    period: q.period,
    Turnover: q.turnover,
    'Gross Profit': q.gross,
    'Op. Profit': q.op,
    PBT: q.pbt,
  }))

  const startEdit = (q: Quarter) => {
    setEditingId(q.id!)
    setEditValues({ ...q })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const { id, created_at, ...rest } = editValues as Quarter
    await onUpdate(editingId, rest)
    setEditingId(null)
  }

  const exportPDF = async (qs: Quarter[], cur: typeof currency) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const latest = qs[qs.length - 1]
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFillColor(10, 14, 26)
    doc.rect(0, 0, 297, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('Partner Dashboard — Quarterly Data', 14, 14)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 195, 220)
    doc.text(`${qs.length} quarters · Latest: ${latest?.period} · ${today} · ${cur}`, 14, 23)
    const rows = [...qs].reverse().map(q => [
      q.period,
      fmtFull(q.turnover, cur), fmtFull(q.gross, cur),
      `${q.turnover > 0 ? ((q.gross / q.turnover) * 100).toFixed(1) : 0}%`,
      fmtFull(q.op, cur), fmtFull(q.pbt, cur),
      fmtFull(q.retained, cur), fmtFull(q.net_assets, cur), fmtFull(q.cash, cur),
    ])
    autoTable(doc, {
      startY: 36,
      head: [['Period', 'Turnover', 'Gross Profit', 'Gross Margin', 'Op. Profit', 'PBT', 'Retained', 'Net Assets', 'Cash']],
      body: rows,
      headStyles: { fillColor: [10, 14, 26], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 40] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150)
      doc.text(`Clavio · Partner Dashboard · ${today} · Page ${i} of ${pageCount}`, 14, 205)
    }
    doc.save(`clavio-partner-dashboard.pdf`)
  }

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const rows = quarters.map(q => ({
      Period: q.period,
      Turnover: q.turnover,
      'Cost of Sales': q.cos,
      'Gross Profit': q.gross,
      'Admin Expenses': q.admin,
      'Operating Profit': q.op,
      'Interest Received': q.interest,
      'Profit Before Tax': q.pbt,
      Tax: q.tax,
      'Retained Profit': q.retained,
      'Fixed Assets': q.fixed,
      'Stock & WIP': q.stock,
      Debtors: q.debtors,
      'Cash at Bank': q.cash,
      'Creditors Due Within 1 Year': q.creditors,
      'Net Assets': q.net_assets,
      "Shareholders' Funds": q.funds,
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Quarterly Data')
    writeFile(wb, 'clavio-quarterly-data.xlsx')
  }

  const sym = symbol(currency)

  const showOverview = !mobileSection || mobileSection === 'overview'
  const showData = !mobileSection || mobileSection === 'data'

  return (
    <div>
      {showOverview && (
        <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Partner Dashboard</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Latest: {latest.period}</span>
        </div>
        {!mobileSection && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportExcel} style={styles.exportBtn}>↓ Excel</button>
            <button onClick={() => exportPDF(quarters, currency)} style={styles.exportBtn}>↓ PDF</button>
          </div>
        )}
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
        {quarters.length} quarter{quarters.length !== 1 ? 's' : ''} on record · Updates live · Displaying in {currency}
      </p>

      {/* KPI strip */}
      <div style={styles.kpiGrid}>
        {COLS.map(c => {
          const d = delta(c.key)
          return (
            <div key={c.key} style={styles.kpiCard}>
              <div style={styles.kpiLabel}>{c.label}</div>
              <div style={styles.kpiValue}>{fmtShort(latest[c.key] as number, currency)}</div>
              {d !== null && (
                <div style={{ fontSize: 12, marginTop: 4, color: d >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                  {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}% vs prev
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Signals + Trend row */}
      <div className="gp-trend-grid">
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Performance Trend</h3>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tickFormatter={v => `${sym}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6B7280' }} width={64} />
              <Tooltip formatter={(v: number) => fmtFull(v, currency)} contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Turnover" stroke="#5B82BD" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Gross Profit" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Op. Profit" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="PBT" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>

        {/* Objective Signals */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={styles.sectionTitle}>Objective Signals</h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Flagged this month</span>
          </div>
          {SIGNALS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < SIGNALS.length - 1 ? 14 : 0, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: s.level === 'red' ? '#FEF2F2' : '#FEF3C7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: s.level === 'red' ? '#EF4444' : '#D97706',
              }}>!</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.company}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Detection */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h3 style={styles.sectionTitle}>Anomaly Detection</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Statistical patterns flagged this month</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: 'white', padding: '2px 7px', borderRadius: 20 }}>V2</span>
          </div>
        </div>
        {ANOMALIES.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: a.level === 'red' ? '#FEF2F2' : '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: a.level === 'red' ? '#EF4444' : '#D97706', marginTop: 2,
            }}>!</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em', marginBottom: 3 }}>{a.company}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.detail}</div>
            </div>
            <button
              onClick={() => setInvestigateAnomaly(a)}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', color: 'var(--accent)', cursor: 'pointer', flexShrink: 0, fontWeight: 500 }}
            >
              Investigate →
            </button>
          </div>
        ))}
      </div>
        </>
      )}

      {showData && (
        <>
          {mobileSection === 'data' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={exportExcel} style={styles.exportBtn}>↓ Excel</button>
              <button onClick={() => exportPDF(quarters, currency)} style={styles.exportBtn}>↓ PDF</button>
            </div>
          )}
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
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {[...quarters].reverse().map((q, i) => (
                <tr key={q.id ?? i} style={{ background: i % 2 === 0 ? 'transparent' : '#FAFAFA' }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{q.period}</td>
                  <td style={styles.td}>{fmtFull(q.turnover, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.gross, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.op, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.pbt, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.retained, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.net_assets, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.cash, currency)}</td>
                  <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => startEdit(q)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => setConfirmDeleteId(q.id!)} style={styles.deleteBtn}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        </>
      )}

      {/* Edit modal */}
      {editingId !== null && (
        <Modal title="Edit Quarter" onClose={() => setEditingId(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 20 }}>
            {ALL_FIELDS.map(f => (
              <div key={f.key}>
                <label style={styles.label}>{f.label}</label>
                <input
                  style={styles.input}
                  value={String(editValues[f.key] ?? '')}
                  onChange={e => setEditValues(v => ({ ...v, [f.key]: f.key === 'period' ? e.target.value : parseFloat(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveEdit} style={styles.submitBtn}>Save Changes</button>
            <button onClick={() => setEditingId(null)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Investigate modal */}
      {investigateAnomaly && (
        <Modal title="Anomaly Investigation" onClose={() => setInvestigateAnomaly(null)}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: investigateAnomaly.level === 'red' ? '#FEF2F2' : '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, color: investigateAnomaly.level === 'red' ? '#EF4444' : '#D97706',
            }}>!</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em', marginBottom: 4 }}>{investigateAnomaly.company}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{investigateAnomaly.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{investigateAnomaly.detail}</div>
            </div>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Actions</div>
            <ul style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 18 }}>
              <li>Schedule a call with the portfolio company CFO</li>
              <li>Request updated management accounts for the current period</li>
              <li>Review against prior-period variance thresholds</li>
              <li>Flag for discussion at the next IC / partner meeting</li>
            </ul>
          </div>
          <button onClick={() => setInvestigateAnomaly(null)} style={styles.submitBtn}>Close</button>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId !== null && (
        <Modal title="Delete Quarter" onClose={() => setConfirmDeleteId(null)}>
          <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>
            Are you sure you want to delete this quarter? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={async () => { await onDelete(confirmDeleteId); setConfirmDeleteId(null) }}
              style={{ ...styles.submitBtn, background: 'var(--red)' }}
            >
              Yes, Delete
            </button>
            <button onClick={() => setConfirmDeleteId(null)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 14, padding: 28,
        maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 },
  kpiCard: { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  card: { background: 'var(--white)', borderRadius: 12, padding: '20px', marginBottom: 16, border: '1px solid var(--border)' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)' },
  td: { padding: '9px 12px', borderBottom: '1px solid #F3F4F6', color: 'var(--text)' },
  editBtn: { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', marginRight: 6, cursor: 'pointer' },
  deleteBtn: { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--red)', color: 'var(--red)', background: 'transparent', cursor: 'pointer' },
  exportBtn: { fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', fontWeight: 500, cursor: 'pointer' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--bg)' },
  submitBtn: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' },
}
