'use client'
import { useEffect, useState } from 'react'
import LPView from '@/components/LPView'
import { DesktopControls, MobileLangToggle } from '@/components/TopControls'
import type { Currency } from '@/lib/currency'
import { useLang } from '@/lib/i18n'

export default function LPPage() {
  const { t } = useLang()
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [isMobile, setIsMobile] = useState(false)

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
              CLA<span style={{ color: '#5B82BD', marginLeft: '-5px', marginRight: '-3px', display: 'inline-block' }}>V</span>IO
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>{t('page.lp.role')}</span>
              <MobileLangToggle />
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
                CLA<span style={{ color: '#5B82BD', marginLeft: '-5px', marginRight: '-3px', display: 'inline-block' }}>V</span>IO
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
    </div>
  )
}
