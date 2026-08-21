'use client'
import { useEffect, useState } from 'react'
import PortfolioView from '@/components/PortfolioView'
import HistoryView from '@/components/HistoryView'
import BottomTabBar from '@/components/BottomTabBar'
import { DesktopLangToggle, MobileLangToggle } from '@/components/TopControls'
import AccountMenu from '@/components/AccountMenu'
import { useQuarters } from '@/lib/useQuarters'
import { useOwnCompany } from '@/lib/useOwnCompany'
import { useLang } from '@/lib/i18n'

type Tab = 'submit' | 'history'

export default function PortfolioPage() {
  const { t } = useLang()
  const [isMobile, setIsMobile] = useState(false)
  const [tab, setTab] = useState<Tab>('submit')
  // Both tabs read the same series through the same hook, so the History table
  // reflects a submission the moment it lands rather than after a reload.
  const { quarters, loading, onSubmit } = useQuarters()
  const { company } = useOwnCompany()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const body = tab === 'history' ? (
    <HistoryView
      quarters={quarters}
      loading={loading}
      companyName={company?.name ?? null}
      // Defaults to showing signals while the company row is still loading
      // would be wrong in the other direction: a GP who turned simultaneity
      // off would see a flash of withheld content. Defaults to withheld until
      // the flag is known, then follows it.
      simultaneous={company?.cfoSignalsSimultaneous ?? false}
      isMobile={isMobile}
    />
  ) : (
    <PortfolioView onSubmit={onSubmit} />
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
        {/* Top bar */}
        {isMobile ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingLeft: 16, paddingRight: 16,
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(52px + env(safe-area-inset-top))',
            background: 'var(--navy)',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 22, letterSpacing: '1px' }}>
              CLA<span style={{ color: '#1652A0', marginLeft: '-5px', marginRight: '-3px', display: 'inline-block' }}>V</span>IO
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>{t('page.submit.role')}</span>
              <MobileLangToggle />
              {/* This view has no settings section at either breakpoint, so the
                  account menu is the only way to sign out. */}
              <AccountMenu dark />
            </div>
          </div>
        ) : (
          <div style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--white)',
            padding: '18px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ color: 'var(--navy)', fontWeight: 800, fontSize: 24, letterSpacing: '1px' }}>
                CLA<span style={{ color: '#1652A0', marginLeft: '-5px', marginRight: '-3px', display: 'inline-block' }}>V</span>IO
              </span>
              <span style={{ width: 1, height: 18, background: 'var(--border)', display: 'inline-block' }} />
              <div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('page.submit.title')}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{t('page.submit.subtitle')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <DesktopLangToggle />
              <AccountMenu />
            </div>
          </div>
        )}

        {/* Desktop tab strip. The mobile equivalent is the bottom bar below —
            same two tabs, same state, per the standing parity rule. */}
        {!isMobile && (
          <div style={{
            borderBottom: '1px solid var(--border)', background: 'var(--white)',
            padding: '0 32px', display: 'flex', gap: 4, flexShrink: 0,
          }}>
            {(['submit', 'history'] as Tab[]).map(id => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  padding: '12px 14px', fontSize: 14,
                  fontWeight: tab === id ? 650 : 500,
                  color: tab === id ? 'var(--text)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  transition: 'color 0.15s',
                }}
              >
                {t(`cfo.tab.${id}`)}
              </button>
            ))}
          </div>
        )}

        <main style={{
          flex: 1,
          padding: isMobile ? '20px 16px' : '28px 32px',
          paddingBottom: isMobile ? 90 : undefined,
          maxWidth: 960, width: '100%', margin: '0 auto',
        }}>
          {body}
        </main>

        {isMobile && (
          <BottomTabBar
            activeTab={tab}
            onTabChange={id => setTab(id as Tab)}
            tabs={[
              { id: 'submit', label: t('cfo.tab.submit'), icon: <UploadIcon /> },
              { id: 'history', label: t('cfo.tab.history'), icon: <HistoryIcon /> },
            ]}
          />
        )}
      </div>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
