'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useLang } from '@/lib/i18n'

// A always-reachable account control. Sign-out used to live only inside the
// settings section, which some views could not navigate to at all — leaving a
// signed-in user with no way out. This is the fallback that guarantees one.
export default function AccountMenu({
  onOpenSettings,
  dark = false,
}: {
  onOpenSettings?: () => void
  dark?: boolean
}) {
  const { t } = useLang()
  const { user, fullName, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const initials = (fullName || user?.email || '?')
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')

  return (
    <div ref={wrap} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('account.menu')}
        aria-expanded={open}
        style={{
          width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
          border: dark ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--border)',
          background: dark ? 'rgba(255,255,255,0.12)' : 'var(--navy)',
          color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60,
          minWidth: 210, background: 'var(--white)',
          border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 10px 30px rgba(15,23,42,0.14)', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
              {t('account.signedInAs')}
            </div>
            {fullName && (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fullName}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {user?.email}
            </div>
          </div>

          {onOpenSettings && (
            <button
              onClick={() => { setOpen(false); onOpenSettings() }}
              style={itemStyle}
            >
              {t('account.settings')}
            </button>
          )}

          <button
            onClick={() => { setSigningOut(true); signOut() }}
            disabled={signingOut}
            style={{ ...itemStyle, color: '#EF4444', fontWeight: 600 }}
          >
            {signingOut ? t('settings.signingOut') : t('settings.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

const itemStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '11px 14px', fontSize: 13, background: 'transparent',
  border: 'none', cursor: 'pointer', color: 'var(--text)',
}
