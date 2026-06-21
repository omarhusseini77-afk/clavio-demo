'use client'
import { useEffect, useState } from 'react'
import LPView from '@/components/LPView'
import type { Currency } from '@/lib/currency'

export default function LPPage() {
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
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>Investor</span>
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
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Investor Portal</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>Confidential</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Currency</span>
              {(['GBP', 'USD', 'EUR'] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: currency === c ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: currency === c ? 'var(--accent)' : 'transparent',
                  color: currency === c ? 'white' : 'var(--text-muted)', cursor: 'pointer',
                }}>{c}</button>
              ))}
            </div>
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '28px 32px', maxWidth: 960, width: '100%', margin: '0 auto' }}>
          <LPView quarters={[]} currency={currency} isMobile={isMobile} />
        </main>
      </div>
    </div>
  )
}
