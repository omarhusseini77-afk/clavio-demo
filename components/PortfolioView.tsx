'use client'
import { useRef, useState } from 'react'
import type { Quarter } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'

const FIELDS: { key: keyof Omit<Quarter, 'id' | 'period' | 'created_at'>; section: 'pl' | 'bs'; group?: string }[] = [
  { key: 'turnover', section: 'pl', group: 'Revenue' },
  { key: 'cos', section: 'pl', group: 'Costs' },
  { key: 'gross', section: 'pl', group: 'Costs' },
  { key: 'admin', section: 'pl', group: 'Costs' },
  { key: 'op', section: 'pl', group: 'Profit' },
  { key: 'interest', section: 'pl', group: 'Profit' },
  { key: 'pbt', section: 'pl', group: 'Profit' },
  { key: 'tax', section: 'pl', group: 'Profit' },
  { key: 'retained', section: 'pl', group: 'Profit' },
  { key: 'fixed', section: 'bs', group: 'Assets' },
  { key: 'stock', section: 'bs', group: 'Assets' },
  { key: 'debtors', section: 'bs', group: 'Assets' },
  { key: 'cash', section: 'bs', group: 'Assets' },
  { key: 'creditors', section: 'bs', group: 'Liabilities' },
  { key: 'net_assets', section: 'bs', group: 'Liabilities' },
  { key: 'funds', section: 'bs', group: 'Liabilities' },
]

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, ''])) as Record<string, string>

export default function PortfolioView({ onSubmit }: { onSubmit: (q: Omit<Quarter, 'id' | 'created_at'>) => Promise<boolean> }) {
  const { t } = useLang()
  const [period, setPeriod] = useState('')
  const [values, setValues] = useState(EMPTY)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [currency, setCurrency] = useState<'GBP' | 'EUR' | 'USD'>('GBP')
  const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'
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
      {/* Gradient hero banner */}
      <div style={{
        borderRadius: 14, marginBottom: 16, padding: '22px 24px',
        background: 'linear-gradient(135deg, #0A0E1A 0%, #16233E 55%, #1E3A5F 100%)',
        color: 'white', position: 'relative', overflow: 'hidden',
        boxShadow: '0 14px 34px -16px rgba(10,14,26,0.6)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,130,189,0.35), transparent 70%)' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, position: 'relative' }}>{t('submit.hero.kicker')}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 6, position: 'relative' }}>{t('submit.hero.title')}</h1>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, position: 'relative', maxWidth: 520 }}>
          {t('submit.hero.body')}
        </p>
      </div>

      {/* AI Upload zone */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={{ marginRight: 8 }}>✦</span>
          {t('submit.extract')}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          {t('submit.extractBody')}
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
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
            {t('submit.drop')} <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{t('submit.browse')}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('submit.fileTypes')}</div>
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
            <Spinner /> {t('submit.reading')}
          </div>
        )}
        {extractSuccess && !extracting && (
          <div style={{ ...styles.alert, background: '#ECFDF5', borderColor: '#10B981', color: '#065F46', marginTop: 14, marginBottom: 0 }}>
            {t('submit.autofilled')}
          </div>
        )}
        {extractError && (
          <div style={{ ...styles.alert, background: '#FEF2F2', borderColor: '#EF4444', color: '#991B1B', marginTop: 14, marginBottom: 0 }}>
            {extractError}
          </div>
        )}
      </div>

      {status === 'success' && (
        <div style={{ ...styles.card, textAlign: 'center', padding: '36px 24px', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Submission received</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            Your financials have been submitted to Clavio. The GP dashboard has been updated and your fund manager has been notified.
          </div>
          <button onClick={() => setStatus('idle')} style={{ ...styles.submitBtn, marginBottom: 0, background: 'var(--navy)', padding: '10px 28px', width: 'auto', display: 'inline-block' }}>
            Submit another quarter
          </button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ ...styles.alert, background: '#FEF2F2', borderColor: '#EF4444', color: '#991B1B' }}>
          {t('submit.error')}
        </div>
      )}

      {status !== 'success' && (
      <form onSubmit={handleSubmit}>
        <div style={styles.card}>
          <label style={styles.label}>{t('chrome.currency')}</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
            {(['GBP', 'EUR', 'USD'] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                style={{
                  padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: currency === c ? 'var(--navy)' : 'transparent',
                  color: currency === c ? 'white' : 'var(--text-muted)',
                  borderColor: currency === c ? 'var(--navy)' : 'var(--border)',
                  transition: 'all 0.15s',
                }}
              >{c}</button>
            ))}
          </div>
        </div>
        <div style={styles.card}>
          <label style={styles.label}>{t('submit.period')}</label>
          <input
            style={styles.input}
            value={period}
            onChange={e => setPeriod(e.target.value)}
            placeholder={t('submit.periodPlaceholder')}
            required
          />
        </div>

        {sections.map(section => {
          const sectionFields = FIELDS.filter(f => f.section === section)
          const groups = Array.from(new Set(sectionFields.map(f => f.group).filter(Boolean))) as string[]
          return (
            <div key={section} style={styles.card}>
              <h3 style={styles.sectionTitle}>{t(`submit.${section}`)}</h3>
              {groups.map((group, gi) => (
                <div key={group}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: gi > 0 ? 20 : 0, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                    {group}
                  </div>
                  <div style={styles.grid}>
                    {sectionFields.filter(f => f.group === group).map(f => (
                      <div key={f.key}>
                        <label style={styles.label}>{t(`field.${f.key}`)}</label>
                        <div style={styles.inputWrap}>
                          <span style={styles.prefix}>{sym}</span>
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
            </div>
          )
        })}

        <button
          type="submit"
          disabled={status === 'submitting'}
          style={styles.submitBtn}
        >
          {status === 'submitting' ? t('submit.submitting') : t('submit.submit')}
        </button>
      </form>
      )}
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
  card: { background: 'var(--white)', borderRadius: 12, padding: '20px 20px', marginBottom: 16, border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)' },
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
