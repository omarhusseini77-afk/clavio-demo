'use client'
import { useEffect, useState } from 'react'
import GPView from '@/components/GPView'
import GPSettingsTab from '@/components/GPSettingsTab'
import BottomTabBar from '@/components/BottomTabBar'
import { DesktopControls, MobileCurrencyToggle } from '@/components/TopControls'
import NotificationsPanel, { type AppNotification } from '@/components/NotificationsPanel'
import type { Currency } from '@/lib/currency'
import { useQuarters } from '@/lib/useQuarters'
import { useLang } from '@/lib/i18n'

const GP_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'gp-1',
    type: 'submission',
    title: 'New submission — Marlow & Reed',
    body: 'Marlow & Reed Joinery submitted Q1 FY22 financials. Review now.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: 'gp-2',
    type: 'anomaly',
    title: 'Anomaly detected — Halcyon Textiles',
    body: 'EBITDA margin contracted 4.2pp month-over-month, outside the 95% confidence band.',
    time: '1 day ago',
    read: false,
  },
  {
    id: 'gp-3',
    type: 'watchlist',
    title: 'Watch-list flag — Atelier Saint-Pierre',
    body: 'Working capital tightened for the second consecutive quarter. Flagged for partner review.',
    time: '3 days ago',
    read: true,
  },
]

type GpSection = 'overview' | 'ask' | 'data' | 'settings'

const GP_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'ask',
    label: 'Ask Clavio',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
        <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
      </svg>
    ),
  },
  {
    id: 'data',
    label: 'Data',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function GPPage() {
  const { t } = useLang()
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [isMobile, setIsMobile] = useState(false)
  const [gpSection, setGpSection] = useState<GpSection>('overview')
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>(GP_NOTIFICATIONS)
  const { quarters, loading, onDelete, onUpdate } = useQuarters()

  const unreadCount = notifications.filter(n => !n.read).length
  const markRead = (id: string) =>
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))

  const handleNavigate = (id: string) => {
    const routes: Record<string, { gpSection: GpSection; section?: string; highlight?: string }> = {
      'gp-1': { gpSection: 'data' },
      'gp-2': { gpSection: 'overview', section: 'gp-anomalies', highlight: 'gp-anomaly-halcyon-textiles' },
      'gp-3': { gpSection: 'overview', section: 'gp-anomalies', highlight: 'gp-anomaly-atelier-saint-pierre' },
    }
    const route = routes[id]
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
            <span style={{ color: 'white', fontWeight: 800, fontSize: 17, letterSpacing: '1px' }}>
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
              <span style={{ color: 'var(--navy)', fontWeight: 800, fontSize: 18, letterSpacing: '1px' }}>
                CLA<span style={{ color: '#1652A0', marginLeft: '-5px', marginRight: '-3px', display: 'inline-block' }}>V</span>IO
              </span>
              <span style={{ width: 1, height: 18, background: 'var(--border)', display: 'inline-block' }} />
              <div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('gp.dashboard')}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{t('gp.liveData')}</span>
              </div>
            </div>
            <DesktopControls currency={currency} setCurrency={setCurrency} />
          </div>
        )}

        <main style={{
          flex: 1,
          padding: isMobile ? '20px 16px' : '28px 32px',
          maxWidth: 960, width: '100%', margin: '0 auto',
          paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : undefined,
        }}>
          {gpSection === 'settings' ? (
            <GPSettingsTab />
          ) : loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', gap: 10 }}>
              <Spinner /> {t('chrome.loading')}
            </div>
          ) : (
            <GPView
              quarters={quarters}
              onDelete={onDelete}
              onUpdate={onUpdate}
              currency={currency}
              mobileSection={isMobile ? gpSection : undefined}
            />
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
