'use client'
import { useEffect, useState } from 'react'
import GPView from '@/components/GPView'
import ErrorBanner from '@/components/ErrorBanner'
import GPSettingsTab from '@/components/GPSettingsTab'
import BottomTabBar from '@/components/BottomTabBar'
import AccountMenu from '@/components/AccountMenu'
import { FundDataProvider } from '@/lib/useFundData'
import { DesktopControls, MobileCurrencyToggle } from '@/components/TopControls'
import NotificationsPanel from '@/components/NotificationsPanel'
import { gpNotificationsFrom } from '@/lib/notifications'
import { useFundData } from '@/lib/useFundData'
import type { Currency } from '@/lib/currency'
import { useQuarters } from '@/lib/useQuarters'
import { useLang } from '@/lib/i18n'


type GpSection = 'overview' | 'ask' | 'data' | 'settings'

const GP_TABS = [
  {
    id: 'overview', label: 'Overview',
    icon:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    activeIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    id: 'ask', label: 'Ask Clavio',
    icon:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>,
    activeIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.2 5.4 5.8 2.1-5.8 2.1L12 17l-2.2-5.4L4 9.5l5.8-2.1L12 2zm7 12l1 2.4 2.4 1-2.4 1L19 21l-1-2.6-2.4-1 2.4-1L19 14z"/></svg>,
  },
  {
    id: 'data', label: 'Data',
    icon:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    activeIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    id: 'settings', label: 'Settings',
    icon:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    activeIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
]

// The provider has to sit ABOVE the component that reads it, and the
// notification bells are now derived from fund data — so the page is split
// rather than wrapping its own return value.
export default function GPPage() {
  return (
    <FundDataProvider>
      <GPPageInner />
    </FundDataProvider>
  )
}

function GPPageInner() {
  const { t, lang } = useLang()
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [isMobile, setIsMobile] = useState(false)
  const [gpSection, setGpSection] = useState<GpSection>('overview')
  const [showNotifs, setShowNotifs] = useState(false)
  const { quarters, loading, error, onDelete, onUpdate } = useQuarters()
  const { data: fundData } = useFundData()

  // Derived from real filings and from the signals lib/cfoSignals.ts actually
  // computed — not an authored list. Read state is held locally because
  // "have I looked at this" is per-session and there is no table for it; the
  // initial value comes from the event's own recency.
  const derived = gpNotificationsFrom(quarters, fundData, lang)
  const [readIds, setReadIds] = useState<string[]>([])
  const notifications = derived.map(n => readIds.includes(n.id) ? { ...n, read: true } : n)

  const unreadCount = notifications.filter(n => !n.read).length
  const markRead = (id: string) => setReadIds(ids => ids.includes(id) ? ids : [...ids, id])

  // Keyed on the notification's kind rather than a hardcoded id list. The old
  // map named three specific ids that no longer exist, and a derived feed has
  // as many entries as the data does.
  const handleNavigate = (id: string) => {
    const n = notifications.find(x => x.id === id)
    if (!n) return
    const route: { gpSection: GpSection; section?: string; highlight?: string } | undefined =
      n.type === 'submission'
        ? { gpSection: 'data' }
        : n.type === 'anomaly'
        ? {
            gpSection: 'overview',
            section: 'gp-anomalies',
            // The company name is in the title; the anomaly rows carry an id
            // built the same way, so the highlight still lands on the right one.
            highlight: `gp-anomaly-${(n.title.split('—')[1] ?? '').trim().toLowerCase().replace(/\s+/g, '-')}`,
          }
        : undefined
    if (!route) return
    setGpSection(route.gpSection)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    if (route.section) {
      window.dispatchEvent(new CustomEvent('clavio:gp-navigate', { detail: { section: route.section, highlight: route.highlight } }))
    }
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
              <MobileCurrencyToggle currency={currency} setCurrency={setCurrency} />
              <div onClick={() => setShowNotifs(true)} style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <div style={{
                    position: 'absolute', top: -3, right: -5,
                    width: 15, height: 15, borderRadius: '50%',
                    background: '#EF4444', border: '1.5px solid var(--navy)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: 'white', lineHeight: 1,
                  }}>{unreadCount}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--white)',
            padding: '18px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ color: 'var(--navy)', fontWeight: 800, fontSize: 24, letterSpacing: '1px' }}>
                CLA<span style={{ color: '#1652A0', marginLeft: '-5px', marginRight: '-3px', display: 'inline-block' }}>V</span>IO
              </span>
              <span style={{ width: 1, height: 18, background: 'var(--border)', display: 'inline-block' }} />
              <div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('gp.dashboard')}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{t('gp.liveData')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <DesktopControls currency={currency} setCurrency={setCurrency} />
              {/* The bell existed only on the mobile bar, so a partner on a
                  desktop never saw a notification at all. Same state, same
                  panel, per the standing parity rule. */}
              <button
                onClick={() => setShowNotifs(true)}
                aria-label="Notifications"
                style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 0, right: 0, minWidth: 15, height: 15,
                    borderRadius: 8, background: '#DC2626', color: 'white',
                    fontSize: 9.5, fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>{unreadCount}</span>
                )}
              </button>
              {/* Desktop has no bottom tab bar, so this is the only route to
                  settings and sign-out at this breakpoint. */}
              <AccountMenu onOpenSettings={() => setGpSection('settings')} />
            </div>
          </div>
        )}

        <main style={{
          flex: 1,
          padding: isMobile ? '20px 16px' : '28px 32px',
          maxWidth: 960, width: '100%', margin: '0 auto',
          paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : undefined,
        }}>
          {gpSection === 'settings' ? (
            <>
              {/* Mobile leaves settings via the tab bar; desktop needs its own
                  way back or the section is a dead end. */}
              {!isMobile && (
                <button
                  onClick={() => setGpSection('overview')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 500,
                    padding: 0, marginBottom: 18,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  {t('account.backToDashboard')}
                </button>
              )}
              <GPSettingsTab />
            </>
          ) : loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', gap: 10 }}>
              <Spinner /> {t('chrome.loading')}
            </div>
          ) : (
            <>
            {/* Rendered above the dashboard rather than instead of it: the
                figures already loaded are still the last ones filed, and a
                partner mid-review should not lose them to a failed refresh.
                But with NOTHING loaded, the dashboard's own empty state says
                "No data yet", which is a false statement when the truth is
                that the request failed — so in that case the banner stands
                alone. */}
            {error && <ErrorBanner message={error} onRetry={() => window.location.reload()} />}
            {!(error && quarters.length === 0) && <GPView
              quarters={quarters}
              onDelete={onDelete}
              onUpdate={onUpdate}
              currency={currency}
              mobileSection={isMobile ? gpSection : undefined}
            />}
            </>
          )}
        </main>
      </div>

      {isMobile && (
        <BottomTabBar
          tabs={GP_TABS}
          activeTab={gpSection}
          onTabChange={id => setGpSection(id as GpSection)}
        />
      )}

      {showNotifs && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifs(false)}
          onMarkRead={markRead}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}
