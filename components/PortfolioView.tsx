'use client'
import { useRef, useState } from 'react'
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
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sections = Array.from(new Set(FIELDS.map(f => f.section)))

  const handleExtract = async (file: File) => {
    setExtracting(true)
    setExtractError('')
    setExtractSuccess(false)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/extract', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      if (data.period) setPeriod(data.period)
      const newValues = { ...EMPTY }
      for (const f of FIELDS) {
        if (data[f.key] !== undefined) newValues[f.key] = String(data[f.key])
      }
      setValues(newValues)
      setExtractSuccess(true)
    } catch (e: unknown) {
      setExtractError(e instanceof Error ? e.message : 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleExtract(file)
  }

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
      setExtractSuccess(false)
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <div>
      <h1 style={styles.pageTitle}>Submit Quarterly Financials</h1>
      <p style={styles.pageSubtitle}>Upload your accounts or enter figures manually. All values are stored in GBP.</p>

      {/* AI Upload zone */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={{ marginRight: 8 }}>✦</span>
          Extract with AI
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Attach your management accounts (PDF or Excel) and Claude will read and fill the form automatically.
        </p>
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(91,130,189,0.05)' : 'var(--bg)',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
          <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
            Drop a file here or <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>browse</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PDF, XLSX, XLS, or CSV</div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleExtract(f); e.target.value = '' }}
          />
        </div>

        {extracting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 14, color: 'var(--accent)' }}>
            <Spinner /> Reading document with AI…
          </div>
        )}
        {extractSuccess && !extracting && (
          <div style={{ ...styles.alert, background: '#ECFDF5', borderColor: '#10B981', color: '#065F46', marginTop: 14, marginBottom: 0 }}>
            Fields auto-filled from your document. Review and submit below.
          </div>
        )}
        {extractError && (
          <div style={{ ...styles.alert, background: '#FEF2F2', borderColor: '#EF4444', color: '#991B1B', marginTop: 14, marginBottom: 0 }}>
            {extractError}
          </div>
        )}
      </div>

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

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
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
    width: '100%', marginBottom: 40, cursor: 'pointer',
  },
}
