'use client'
import { useEffect, useState } from 'react'
import PortfolioView from '@/components/PortfolioView'
import GPView from '@/components/GPView'
import LPView from '@/components/LPView'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'

type Role = 'portfolio' | 'gp' | 'lp'

export default function Home() {
  const [role, setRole] = useState<Role>('gp')
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchQuarters = async () => {
    const res = await fetch('/api/quarters')
    const data = await res.json()
    if (Array.isArray(data)) {
      data.sort((a, b) => {
        const parse = (p: string) => {
          const m = p.match(/Q(\d+)\s+FY(\d+)/i)
          return m ? parseInt(m[2]) * 10 + parseInt(m[1]) : 0
        }
        return parse(a.period) - parse(b.period)
      })
      setQuarters(data)
    } else {
      setQuarters([])
    }
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      await fetch('/api/seed', { method: 'POST' })
      await fetchQuarters()
    }
    init()

    const channel = supabase
      .channel('quarters-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quarters' }, () => {
        fetchQuarters()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const onSubmit = async (q: Omit<Quarter, 'id' | 'created_at'>) => {
    const res = await fetch('/api/quarters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q),
    })
    if (res.ok) await fetchQuarters()
    return res.ok
  }

  const onDelete = async (id: number) => {
    await fetch(`/api/quarters/${id}`, { method: 'DELETE' })
    await fetchQuarters()
  }

  const onUpdate = async (id: number, q: Omit<Quarter, 'id' | 'created_at'>) => {
    const res = await fetch(`/api/quarters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q),
    })
    if (res.ok) await fetchQuarters()
    return res.ok
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar
        role={role}
        setRole={setRole}
        currency={currency}
        setCurrency={setCurrency}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
        {/* Mobile top bar — only shown on mobile */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            paddingLeft: 16, paddingRight: 16,
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(52px + env(safe-area-inset-top))',
            background: 'var(--navy)',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Clavio</span>
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '20px 16px' : '28px 28px', maxWidth: 960, width: '100%', margin: '0 auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', gap: 10 }}>
              <Spinner /> Loading data…
            </div>
          ) : (
            <>
              {role === 'portfolio' && <PortfolioView onSubmit={onSubmit} />}
              {role === 'gp' && <GPView quarters={quarters} onDelete={onDelete} onUpdate={onUpdate} currency={currency} />}
              {role === 'lp' && <LPView quarters={quarters} currency={currency} />}
            </>
          )}
        </main>
      </div>
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
