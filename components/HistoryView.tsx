'use client'
import type { Quarter } from '@/lib/supabase'
import {
  ebitda, grossMarginPct, ebitdaMarginPct,
  debtorDays, creditorDays, cashConversionCycle,
} from '@/lib/cfoSignals'
import { useLang } from '@/lib/i18n'
import EarlyWarning from './EarlyWarning'

// What this company has filed, and what it implies — the other half of the
// submission form. Until now a CFO filed figures into a void and the only
// party who ever saw them assembled was the investor.
//
// Every derived column is computed here from the stored row by the SAME helpers
// the warning rules use. That is the point: if the table and a signal ever
// disagreed about debtor days, the surface would be worthless.

const fmt0 = (v: number) => Math.round(v).toLocaleString('en-GB')
const pct1 = (v: number) => `${v.toFixed(1)}%`
const day1 = (v: number) => `${v.toFixed(1)}`

interface Col {
  key: string
  tKey: string
  value: (q: Quarter) => string
  /** Higher is better for the delta tint; undefined = no direction implied. */
  goodUp?: boolean
  raw: (q: Quarter) => number
  /** How the quarter-on-quarter movement reads. A margin moving from 12% to
   *  13% is +1pp, not +8.3%, and a debtor-day count moves in days. Showing a
   *  percentage of a percentage is the kind of number a CFO has to stop and
   *  decode, which is the opposite of the point. */
  delta: 'pct' | 'pp' | 'days'
}

const COLS: Col[] = [
  { key: 'turnover', tKey: 'field.turnover', value: q => fmt0(q.turnover), raw: q => q.turnover, goodUp: true, delta: 'pct' },
  { key: 'gm', tKey: 'cfo.col.grossMargin', value: q => pct1(grossMarginPct(q)), raw: grossMarginPct, goodUp: true, delta: 'pp' },
  { key: 'ebitda', tKey: 'cfo.col.ebitda', value: q => fmt0(ebitda(q)), raw: ebitda, goodUp: true, delta: 'pct' },
  { key: 'em', tKey: 'cfo.col.ebitdaMargin', value: q => pct1(ebitdaMarginPct(q)), raw: ebitdaMarginPct, goodUp: true, delta: 'pp' },
  { key: 'cash', tKey: 'field.cash', value: q => fmt0(q.cash), raw: q => q.cash, goodUp: true, delta: 'pct' },
  { key: 'debtors', tKey: 'field.debtors', value: q => fmt0(q.debtors), raw: q => q.debtors, delta: 'pct' },
  { key: 'creditors', tKey: 'field.creditors', value: q => fmt0(q.creditors), raw: q => q.creditors, delta: 'pct' },
  { key: 'netAssets', tKey: 'field.net_assets', value: q => fmt0(q.net_assets), raw: q => q.net_assets, goodUp: true, delta: 'pct' },
  // The three derived measures. Labelled "collection speed", never "ageing" —
  // the schema holds a debtors total and no 30/60/90 buckets, so an ageing
  // label would be describing data that does not exist.
  { key: 'dd', tKey: 'cfo.col.debtorDays', value: q => day1(debtorDays(q)), raw: debtorDays, delta: 'days' },
  { key: 'cd', tKey: 'cfo.col.creditorDays', value: q => day1(creditorDays(q)), raw: creditorDays, delta: 'days' },
  { key: 'ccc', tKey: 'cfo.col.ccc', value: q => day1(cashConversionCycle(q)), raw: cashConversionCycle, delta: 'days' },
]

export default function HistoryView({
  quarters,
  loading,
  companyName,
  simultaneous,
  isMobile,
}: {
  quarters: Quarter[]
  loading: boolean
  companyName: string | null
  simultaneous: boolean
  isMobile: boolean
}) {
  const { t } = useLang()

  if (loading) {
    return <div style={{ ...card, color: 'var(--text-muted)', fontSize: 14 }}>{t('chrome.loadingData')}</div>
  }

  if (quarters.length === 0) {
    return (
      <div style={card}>
        <h3 style={sectionTitle}>{t('cfo.history.title')}</h3>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
          {t('cfo.history.empty')}
        </p>
      </div>
    )
  }

  // Newest first: a CFO opening this wants the quarter they just filed.
  const rows = [...quarters].reverse()
  const latest = quarters[quarters.length - 1]

  return (
    <div>
      <div style={{
        borderRadius: 14, marginBottom: 16, padding: '20px 22px',
        background: 'linear-gradient(135deg, #0A0E1A 0%, #16233E 55%, #1E3A5F 100%)',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,130,189,0.35), transparent 70%)' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, position: 'relative' }}>
          {companyName ?? t('cfo.history.kicker')}
        </div>
        <h1 style={{ fontSize: isMobile ? 21 : 24, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 6, position: 'relative' }}>
          {t('cfo.history.title')}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, position: 'relative', maxWidth: 520 }}>
          {t('cfo.history.body', { n: quarters.length, latest: latest.period })}
        </p>
      </div>

      <EarlyWarning quarters={quarters} simultaneous={simultaneous} />

      {isMobile ? (
        // Same rows, same derived values — one card per quarter, because an
        // 11-column table on a phone is a table nobody reads.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((q, i) => {
            const prior = rows[i + 1]
            return (
              <div key={q.id ?? q.period} style={card}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>{q.period}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                  {COLS.map(c => (
                    <div key={c.key}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{t(c.tKey)}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {c.value(q)}
                        <Delta col={c} q={q} prior={prior} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...th, position: 'sticky', left: 0, background: 'var(--white)', zIndex: 1 }}>{t('submit.period')}</th>
                  {COLS.map(c => <th key={c.key} style={{ ...th, textAlign: 'right' }}>{t(c.tKey)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((q, i) => {
                  const prior = rows[i + 1]
                  return (
                    <tr key={q.id ?? q.period}>
                      <td style={{ ...td, fontWeight: 600, position: 'sticky', left: 0, background: 'var(--white)' }}>{q.period}</td>
                      {COLS.map(c => (
                        <td key={c.key} style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {c.value(q)}
                          <Delta col={c} q={q} prior={prior} />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55, margin: '4px 2px 40px' }}>
        {t('cfo.history.footnote')}
      </p>
    </div>
  )
}

// Quarter-on-quarter movement. Shown for every column that has a prior
// quarter, and left off the oldest row rather than compared against zero.
function Delta({ col, q, prior }: { col: Col; q: Quarter; prior?: Quarter }) {
  if (!prior) return null
  const now = col.raw(q)
  const then = col.raw(prior)
  const diff = now - then
  if (Math.abs(diff) < 0.05) return null
  const up = diff > 0
  // Only tinted where a direction genuinely means better or worse. Debtor days
  // and the cash cycle get no colour: longer is not automatically bad, and
  // colouring them would be exactly the judgement this surface avoids.
  const colour = col.goodUp === undefined
    ? 'var(--text-muted)'
    : (up === col.goodUp ? '#0F766E' : '#B45309')
  const sign = up ? '+' : '−'
  const mag = Math.abs(diff)
  const shown =
    col.delta === 'pp'   ? `${sign}${mag.toFixed(1)}pp` :
    col.delta === 'days' ? `${sign}${mag.toFixed(1)}d`  :
    then === 0           ? ''  // no baseline to be a percentage of
                         : `${sign}${((mag / Math.abs(then)) * 100).toFixed(1)}%`
  if (!shown) return null
  return (
    <span style={{ fontSize: 11, color: colour, marginLeft: 6, fontWeight: 500 }}>{shown}</span>
  )
}

const card: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 12, padding: '20px',
  marginBottom: 16, border: '1px solid var(--border)',
  boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)',
}
const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--accent)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
}
const th: React.CSSProperties = {
  textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 600,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '11px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)',
}
