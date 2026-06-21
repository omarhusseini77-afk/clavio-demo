'use client'
import { useEffect, useState } from 'react'
import PortfolioView from '@/components/PortfolioView'
import GPView from '@/components/GPView'
import LPView from '@/components/LPView'
import { supabase } from '@/lib/supabase'
import type { Quarter } from '@/lib/supabase'

type Role = 'portfolio' | 'gp' | 'lp'

const ROLES: { id: Role; label: string }[] = [
  { id: 'portfolio', label: 'Portfolio Co.' },
  { id: 'gp', label: 'GP / Partner' },
  { id: 'lp', label: 'LP / Investor' },
]

export default function Home() {
  const [role, setRole] = useState<Role>('gp')
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQuarters = async () => {
    const res = await fetch('/api/quarters')
    const data = await res.json()
    setQuarters(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      await fetch('/api/seed', { method: 'POST' })
      await fetchQuarters()
    }
    init()

    // Live auto-refresh via Supabase realtime
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: 'var(--navy)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 'calc(56px + env(safe-area-inset-top))',
        flexShrink: 0,
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px', marginRight: 16, flexShrink: 0 }}>
          Clavio
        </span>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as never }}>
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                background: role === r.id ? 'var(--accent)' : 'transparent',
                color: role === r.id ? 'white' : 'rgba(255,255,255,0.65)',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ flex: 1, padding: '24px 20px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', gap: 10 }}>
            <Spinner /> Loading data…
          </div>
        ) : (
          <>
            {role === 'portfolio' && <PortfolioView onSubmit={onSubmit} />}
            {role === 'gp' && <GPView quarters={quarters} onDelete={onDelete} onUpdate={onUpdate} />}
            {role === 'lp' && <LPView quarters={quarters} />}
          </>
        )}
      </main>
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
