'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLE_HOME, type Role } from '@/lib/auth'
import { useLang } from '@/lib/i18n'
import { DesktopLangToggle } from '@/components/TopControls'

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary or the production build fails.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError || !data.user) {
      setError(t('login.error'))
      setBusy(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role as Role | undefined
    if (!role) {
      await supabase.auth.signOut()
      setError(t('login.noRole'))
      setBusy(false)
      return
    }

    const next = searchParams.get('next')
    router.replace(next && next.startsWith('/') ? next : ROLE_HOME[role])
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ position: 'absolute', top: 20, right: 24 }}><DesktopLangToggle /></div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ color: 'var(--navy)', fontWeight: 800, fontSize: 32, letterSpacing: '1px' }}>
            CLA<span style={{ color: 'var(--accent)', marginLeft: '-7px', marginRight: '-4px', display: 'inline-block' }}>V</span>IO
          </span>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>{t('login.subtitle')}</p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            background: 'var(--white)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24,
          }}
        >
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {t('login.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            style={inputStyle}
          />

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '16px 0 6px' }}>
            {t('login.password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={inputStyle}
          />

          {error && (
            <p role="alert" style={{
              marginTop: 14, fontSize: 13, color: '#B42318',
              background: '#FEF3F2', border: '1px solid #FECDCA',
              borderRadius: 8, padding: '10px 12px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%', marginTop: 20, padding: '12px 16px',
              background: busy ? 'var(--text-muted)' : 'var(--accent)',
              color: 'white', fontSize: 15, fontWeight: 600,
              border: 'none', borderRadius: 8,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            {busy ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 18 }}>
          {t('login.invite')}
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 15, color: 'var(--text)', background: 'var(--white)',
  outline: 'none',
}
