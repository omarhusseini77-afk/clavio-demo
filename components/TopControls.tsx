'use client'
import type { Currency } from '@/lib/currency'
import { useLang } from '@/lib/i18n'
import type { Lang } from '@/lib/loc'

const LANGS: Lang[] = ['en', 'fr']
const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR']

// Desktop header cluster: language + currency switchers.
export function DesktopControls({ currency, setCurrency }: { currency: Currency; setCurrency: (c: Currency) => void }) {
  const { t, lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>{t('chrome.language')}</span>
        {LANGS.map(l => (
          <button key={l} onClick={() => setLang(l)} style={pill(lang === l)}>{l.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>{t('chrome.currency')}</span>
        {CURRENCIES.map(c => (
          <button key={c} onClick={() => setCurrency(c)} style={pill(currency === c)}>{c}</button>
        ))}
      </div>
    </div>
  )
}

// Desktop language-only switcher (for views without a currency control).
export function DesktopLangToggle() {
  const { t, lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>{t('chrome.language')}</span>
      {LANGS.map(l => (
        <button key={l} onClick={() => setLang(l)} style={pill(lang === l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

// Compact language pill for the mobile top bar.
export function MobileLangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 7, padding: 2 }}>
      {LANGS.map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: lang === l ? 'var(--accent)' : 'transparent',
            color: lang === l ? 'white' : 'rgba(255,255,255,0.55)',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
    cursor: 'pointer',
  }
}
