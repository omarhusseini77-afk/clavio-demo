'use client'
import { useState } from 'react'
import type { Quarter } from '@/lib/supabase'

const FIELDS: { key: keyof Omit<Quarter, 'id' | 'period' | 'created_at'>; label: string; section: string }[] = [
  { key: 'turnover', label: 'Turnover', section: 'Profit & Loss' },
  { key: 'cos', label: 'Cost of Sales', section: 'Profit & Loss' },
  { key: 'gross', label: 'Gross Profit', section: 'Profit & Loss' },
  { key: 'admin', label: 'Admin Expenses', section: 'Profit & Loss' },
  { key: 'op', label: 'Operating Profit', section: 'Profit & Loss' },
  { key: 'interest', label: 'Interest Received', section: 'Profit & Loss' },
  { key: 'pbt', label: 'Profit Before Tax', section: 'Profit & Loss' },
  { key: 'tax', label: 'Tax', section: 'Profit & Loss' },
  { key: 'retained', label: 'Retained Profit', section: 'Profit & Loss' },
  { key: 'fixed', label: 'Fixed Assets', section: 'Balance Sheet' },
  { key: 'stock', label: 'Stock & WIP', section: 'Balance Sheet' },
  { key: 'debtors', label: 'Debtors', section: 'Balance Sheet' },
  { key: 'cash', label: 'Cash at Bank', section: 'Balance Sheet' },
  { key: 'creditors', label: 'Creditors Due Within 1 Year', section: 'Balance Sheet' },
  { key: 'net_assets', label: 'Net Assets', section: 'Balance Sheet' },
  { key: 'funds', label: "Shareholders' Funds", section: 'Balance Sheet' },
]

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, ''])) as Record<string, string>

export default function PortfolioView({ onSubmit }: { onSubmit: (q: Omit<Quarter, 'id' | 'created_at'>) => Promise<boolean> }) {
  const [period, setPeriod] = useState('')
  const [values, setValues] = useState(EMPTY)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const sections = Array.from(new Set(FIELDS.map(f => f.section)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    const payload = {
      period,
      ...Object.fromEntries(FIELDS.map(f => [f.key, parseFloat(values[f.key]) || 0])),
    } as Omit<Quarter, 'id' | 'created_at'>
    const ok = await onSubmit(payload)
    setStatus(ok ? 'success' : 'error')
    if (ok) {
      setPeriod('')
      setValues(EMPTY)
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <div>
      <h1 style={styles.pageTitle}>Submit Quarterly Financials</h1>
      <p style={styles.pageSubtitle}>Enter figures in GBP. All values will be visible to the GP and LP once submitted.</p>

      {status === 'success' && (
        <div style={{ ...styles.alert, background: '#ECFDF5', borderColor: '#10B981', color: '#065F46' }}>
          Quarter submitted successfully. The GP and LP views have been updated.
        </div>
      )}
      {status === 'error' && (
        <div style={{ ...styles.alert, background: '#FEF2F2', borderColor: '#EF4444', color: '#991B1B' }}>
          Something went wrong. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={styles.card}>
          <label style={styles.label}>Period</label>
          <input
            style={styles.input}
            value={period}
            onChange={e => setPeriod(e.target.value)}
            placeholder="e.g. Q1 FY22"
            required
          />
        </div>

        {sections.map(section => (
          <div key={section} style={styles.card}>
            <h3 style={styles.sectionTitle}>{section}</h3>
            <div style={styles.grid}>
              {FIELDS.filter(f => f.section === section).map(f => (
                <div key={f.key}>
                  <label style={styles.label}>{f.label}</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.prefix}>£</span>
                    <input
                      style={{ ...styles.input, paddingLeft: 28 }}
                      type="number"
                      value={values[f.key]}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={status === 'submitting'}
          style={styles.submitBtn}
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit Quarter'}
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  pageSubtitle: { color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 },
  alert: { padding: '12px 16px', borderRadius: 8, border: '1px solid', marginBottom: 20, fontSize: 14 },
  card: { background: 'var(--white)', borderRadius: 12, padding: '20px 20px', marginBottom: 16, border: '1px solid var(--border)' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px 20px' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5 },
  inputWrap: { position: 'relative' },
  prefix: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 },
  input: {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--bg)',
    transition: 'border-color 0.15s',
  },
  submitBtn: {
    background: 'var(--accent)', color: 'white', border: 'none',
    borderRadius: 10, padding: '13px 32px', fontSize: 15, fontWeight: 600,
    width: '100%', marginBottom: 40,
    opacity: 1,
  },
}
