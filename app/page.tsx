'use client'
import { useEffect, useState } from 'react'
import PortfolioView from '@/components/PortfolioView'
import { DesktopLangToggle, MobileLangToggle } from '@/components/TopControls'
import { useQuarters } from '@/lib/useQuarters'
import { useLang } from '@/lib/i18n'

export default function PortfolioPage() {
  const { t } = useLang()
  const [isMobile, setIsMobile] = useState(false)
  const { onSubmit } = useQuarters()

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
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>{t('page.submit.role')}</span>
              <MobileLangToggle />
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
            <DesktopLangToggle />
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '28px 32px', maxWidth: 960, width: '100%', margin: '0 auto' }}>
          <PortfolioView onSubmit={onSubmit} />
        </main>
      </div>
    </div>
  )
}
