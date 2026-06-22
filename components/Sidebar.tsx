'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { Currency } from '@/lib/currency'

interface Props {
  currency: Currency
  setCurrency: (c: Currency) => void
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
  user?: { initial: string; name: string; title: string }
}

const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR']

export default function Sidebar({ currency, setCurrency, isOpen, onClose, isMobile, user }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const pathname = usePathname()
  const profile = user ?? { initial: 'C', name: 'Cyril', title: 'Managing Partner' }

  return (
    <>
      {isMobile && isOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} />
      )}

      <aside style={{
        width: 220,
        background: '#0A0E1A',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, bottom: 0,
        zIndex: isMobile ? 200 : 'auto',
        transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
        minHeight: '100vh',
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          paddingTop: isMobile ? 'max(24px, calc(env(safe-area-inset-top) + 16px))' : '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '1px' }}>
            CLA<span style={{ color: '#1652A0', marginLeft: '-5px', marginRight: '-3px', display: 'inline-block' }}>V</span>IO
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
            Portfolio Intelligence
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <NavGroup label="Overview">
            <NavLink
              href="/gp"
              active={pathname === '/gp'}
              icon={<IconGrid />}
              label="Dashboard"
              sub="Partner view"
              onClick={onClose}
            />
            <NavLink
              href="/lp"
              active={pathname === '/lp'}
              icon={<IconDoc />}
              label="LP Reports"
              sub="Investor view"
              onClick={onClose}
            />
          </NavGroup>

          <NavGroup label="Portfolio">
            <NavLink
              href="/"
              active={pathname === '/'}
              icon={<IconUpload />}
              label="Submit Financials"
              sub="Portfolio Co."
              onClick={onClose}
            />
          </NavGroup>

          <NavGroup label="Settings">
            <div style={{ padding: '4px 0' }}>
              <button
                onClick={() => setSettingsOpen(s => !s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 10px', borderRadius: 7,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)', textAlign: 'left',
                }}
              >
                <span style={{ flexShrink: 0, opacity: 0.6 }}><IconSettings /></span>
                <span style={{ fontSize: 13 }}>Currency</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.03em' }}>
                  {currency}
                </span>
              </button>

              {settingsOpen && (
                <div style={{ padding: '8px 10px 4px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {CURRENCIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 6,
                          fontSize: 11, fontWeight: 600,
                          border: currency === c ? '1.5px solid #1652A0' : '1px solid rgba(255,255,255,0.1)',
                          background: currency === c ? 'rgba(91,130,189,0.2)' : 'transparent',
                          color: currency === c ? '#7BA4D4' : 'rgba(255,255,255,0.35)',
                          cursor: 'pointer',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 7, lineHeight: 1.4 }}>
                    Indicative rates only
                  </div>
                </div>
              )}
            </div>
          </NavGroup>
        </nav>

        {/* User profile */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#1652A0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {profile.initial}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{profile.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{profile.title}</div>
          </div>
        </div>
      </aside>
    </>
  )
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        padding: '0 10px', marginBottom: 4,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function NavLink({ href, active, onClick, icon, label, sub }: {
  href: string; active: boolean; onClick: () => void
  icon: React.ReactNode; label: string; sub: string
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '8px 10px', borderRadius: 7,
        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: active ? 'white' : 'rgba(255,255,255,0.45)',
        textAlign: 'left',
        borderLeft: active ? '2px solid #1652A0' : '2px solid transparent',
        marginBottom: 2,
        textDecoration: 'none',
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 11, opacity: 0.45, marginTop: 1 }}>{sub}</div>
      </div>
    </a>
  )
}

function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
