'use client'
import { useEffect, useState } from 'react'
import LPView from '@/components/LPView'
import { DesktopControls, MobileCurrencyToggle } from '@/components/TopControls'
import NotificationsPanel, { type AppNotification } from '@/components/NotificationsPanel'
import type { Currency } from '@/lib/currency'
import { useLang } from '@/lib/i18n'

const LP_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'lp-1',
    type: 'call',
    title: 'Capital Call · Call 7',
    body: '£250,000 due by 15 April 2026. Wire instructions attached.',
    time: '2 Apr 2026',
    read: false,
  },
  {
    id: 'lp-2',
    type: 'document',
    title: 'Q1 2026 Quarterly Report',
    body: 'Your Q1 2026 investor report is now available in the portal.',
    time: '16 Apr 2026',
    read: true,
  },
  {
    id: 'lp-3',
    type: 'distribution',
    title: 'Distribution Notice · Dist 3',
    body: '£180,000 distribution processed. Expected in your account within 3–5 business days.',
    time: '20 Nov 2025',
    read: true,
  },
]

export default function LPPage() {
  const { t } = useLang()
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [isMobile, setIsMobile] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>(LP_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = (id: string) =>
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))

  const handleNavigate = (id: string) => {
    const routes: Record<string, { tab: string; section?: string }> = {
      'lp-1': { tab: 'account', section: 'lp-capital-called' },
      'lp-2': { tab: 'account', section: 'lp-documents' },
      'lp-3': { tab: 'account', section: 'lp-activity' },
    }
    const route = routes[id]
    if (route) window.dispatchEvent(new CustomEvent('clavio:lp-navigate', { detail: route }))
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
              <div
                onClick={() => setShowNotifs(true)}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
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
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('page.lp.portal')}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{t('page.lp.confidential')}</span>
              </div>
            </div>
            <DesktopControls currency={currency} setCurrency={setCurrency} />
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '28px 32px', maxWidth: 960, width: '100%', margin: '0 auto' }}>
          <LPView quarters={[]} currency={currency} isMobile={isMobile} />
        </main>
      </div>

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
