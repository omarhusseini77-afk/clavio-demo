'use client'
import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import type { Quarter } from '@/lib/supabase'

const fmt = (n: number) =>
  n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}m` : `£${(n / 1_000).toFixed(0)}k`

const fmtFull = (n: number) => `£${n.toLocaleString('en-GB')}`

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

type Props = {
  quarters: Quarter[]
  onDelete: (id: number) => Promise<void>
  onUpdate: (id: number, q: Omit<Quarter, 'id' | 'created_at'>) => Promise<boolean>
}

export default function GPView({ quarters, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Quarter>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Partner Dashboard</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Latest: {latest.period}</span>
        </div>
        <button onClick={exportExcel} style={styles.exportBtn}>
          ↓ Export Excel
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
        {quarters.length} quarter{quarters.length !== 1 ? 's' : ''} on record · Updates live
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
                <th style={styles.th}></th>
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
