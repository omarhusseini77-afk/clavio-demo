'use client'
import { useState } from 'react'
import type { Currency } from '@/lib/currency'

type Role = 'portfolio' | 'gp' | 'lp'

interface Props {
  role: Role
  setRole: (r: Role) => void
  currency: Currency
  setCurrency: (c: Currency) => void
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
}

const NAV: { id: Role; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: 'portfolio',
    label: 'Portfolio Co.',
    sub: 'Submit financials',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    id: 'gp',
    label: 'GP / Partner',
    sub: 'Partner dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'lp',
    label: 'LP / Investor',
    sub: 'Investor report',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR']
const CURRENCY_LABELS: Record<Currency, string> = { GBP: '£ GBP', USD: '$ USD', EUR: '€ EUR' }

export default function Sidebar({ role, setRole, currency, setCurrency, isOpen, onClose, isMobile }: Props) {
  const [showSettings, setShowSettings] = useState(false)

  const handleNav = (r: Role) => {
    setRole(r)
    onClose()
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 199,
          }}
        />
      )}

      {/* Sidebar panel */}
      <aside style={{
        width: 240,
        minHeight: '100vh',
        background: 'var(--navy)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        // On mobile: fixed overlay, slide in/out. On desktop: in-flow, always visible.
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: isMobile ? 200 : 'auto',
        transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{
          padding: '28px 24px 20px',
          paddingTop: 'max(28px, calc(28px + env(safe-area-inset-top)))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: 'white', letterSpacing: '-0.5px',
              flexShrink: 0,
            }}>
              C
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Clavio</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Portfolio Intelligence</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 10 }}>
            Views
          </div>
          {NAV.map(item => {
            const active = role === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: active ? 'white' : 'rgba(255,255,255,0.6)',
                  textAlign: 'left', transition: 'all 0.15s',
                  marginBottom: 2,
                }}
              >
                <span style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>{item.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>{item.sub}</div>
                </div>
                {active && (
                  <div style={{
                    marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0,
                  }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: Settings */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: showSettings ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.65)',
              textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 400 }}>Settings</span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ marginLeft: 'auto', transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showSettings && (
            <div style={{ padding: '12px 12px 4px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Currency
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    style={{
                      flex: 1, padding: '7px 0',
                      borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: currency === c ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.15)',
                      background: currency === c ? 'var(--accent)' : 'transparent',
                      color: currency === c ? 'white' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, lineHeight: 1.4 }}>
                Indicative rates. Data stored in GBP.
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
