'use client'
import type { Quarter } from '@/lib/supabase'
import { cfoSignals, THRESHOLDS } from '@/lib/cfoSignals'
import { cfoSignalCopy } from '@/lib/cfoSignalText'
import { useLang, loc } from '@/lib/i18n'

// The CFO-facing early-warning surface.
//
// Presentation rules that are not cosmetic:
//   * No red. No amber. No badge on the company. The visual weight sits on the
//     movement, not on a judgement, because a CFO who feels rated disengages
//     and the feature stops working.
//   * Every card shows the numbers it fired on. A signal a CFO cannot check is
//     a signal they have to take on faith, and this surface has to survive
//     being argued with.
//   * Silence is a first-class state, and says which rules are still short of
//     history rather than implying nothing is wrong.

export default function EarlyWarning({
  quarters,
  simultaneous,
}: {
  quarters: Quarter[]
  simultaneous: boolean
}) {
  const { t, lang } = useLang()
  const signals = cfoSignals(quarters)

  // The per-company simultaneity setting. When a GP has turned it off, this
  // surface withholds the signals rather than showing them late and pretending
  // they are current — and says plainly that it is doing so. The GP feed is
  // unaffected either way; nothing here changes what the partner sees.
  if (!simultaneous) {
    return (
      <div style={styles.card}>
        <h3 style={styles.title}>{t('cfo.signals.title')}</h3>
        <p style={styles.muted}>{t('cfo.signals.withheld')}</p>
      </div>
    )
  }

  // Which rules cannot run yet, so silence is explained rather than ambiguous.
  const short: string[] = []
  if (quarters.length < THRESHOLDS.marginWindow + 1) {
    short.push(t('cfo.signals.needMargin', { n: THRESHOLDS.marginWindow + 1 }))
  }
  if (quarters.length < THRESHOLDS.collectionWindow + 1) {
    short.push(t('cfo.signals.needCollection', { n: THRESHOLDS.collectionWindow + 1 }))
  }

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={styles.title}>{t('cfo.signals.title')}</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {t('cfo.signals.period', { period: quarters[quarters.length - 1]?.period ?? '—' })}
        </span>
      </div>
      {/* marginTop matters at the mobile breakpoint: the "as filed for" line
          wraps beneath the heading there, and without it the two run together. */}
      <p style={{ ...styles.muted, marginTop: 8, marginBottom: signals.length ? 18 : 12 }}>
        {t('cfo.signals.intro')}
      </p>

      {signals.length === 0 ? (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 10,
          padding: '16px 18px', background: 'var(--bg)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {t('cfo.signals.none')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {t('cfo.signals.noneBody')}
            {short.length > 0 && ` ${short.join(' ')}`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {signals.map(s => {
            const copy = cfoSignalCopy(s)
            return (
              <div key={s.id} style={{
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--accent)',
                borderRadius: 10,
                padding: '14px 16px',
                background: 'var(--bg)',
              }}>
                <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--text)', marginBottom: 6, lineHeight: 1.35 }}>
                  {loc(copy.heading, lang)}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {loc(copy.body, lang)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Said on the surface itself, not only in the design doc. The thresholds
          have never been calibrated against real submissions, and a CFO reading
          this is entitled to know that before acting on it. */}
      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.5, opacity: 0.85 }}>
        {t('cfo.signals.calibration')}
      </p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--white)', borderRadius: 12, padding: '20px',
    marginBottom: 16, border: '1px solid var(--border)',
    boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)',
  },
  title: {
    fontSize: 13, fontWeight: 600, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
  },
  muted: { fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 12 },
}
