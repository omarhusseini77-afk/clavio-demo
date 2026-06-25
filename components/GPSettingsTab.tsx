'use client'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/lib/i18n'

type View = 'main' | 'change-password' | 'two-factor' | 'privacy' | 'terms' | 'download' | 'signout'

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useLang()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        {t('settings.section')}
      </button>
      <span style={{ color: 'var(--border)', fontSize: 16 }}>·</span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: 14,
  padding: '16px 18px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid var(--border)',
}

export default function GPSettingsTab() {
  const { t, lang, setLang } = useLang()
  const [view, setView] = useState<View>('main')
  const savedScroll = useRef(0)
  const goTo = (v: View) => { savedScroll.current = window.scrollY; setView(v); requestAnimationFrame(() => window.scrollTo(0, 0)) }
  const goBack = (fn?: () => void) => { if (fn) fn(); setView('main'); requestAnimationFrame(() => window.scrollTo(0, savedScroll.current)) }
  const [notifs, setNotifs] = useState({ submissions: true, anomalies: true, reports: true, late: true, watchlist: true })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaved, setPwSaved] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [signoutConfirm, setSignoutConfirm] = useState(false)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [view])

  if (view === 'change-password') return (
    <div>
      <BackBar title={t('settings.changePwTitle')} onBack={() => goBack(() => setPwSaved(false))} />
      <div style={{ ...card, marginBottom: 16 }}>
        {pwSaved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#10B981' }}>{t('settings.pwUpdated')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{t('settings.pwUpdatedSub')}</div>
          </div>
        ) : (
          <>
            {[
              { label: t('settings.currentPw'), key: 'current' as const },
              { label: t('settings.newPw'), key: 'next' as const },
              { label: t('settings.confirmPw'), key: 'confirm' as const },
            ].map((f, i) => (
              <div key={f.key} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</div>
                <input type="password" value={pwForm[f.key]} onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'white' }} />
              </div>
            ))}
          </>
        )}
      </div>
      {!pwSaved && (
        <button onClick={() => { if (pwForm.next && pwForm.next === pwForm.confirm) setPwSaved(true) }} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', marginBottom: 40 }}>
          {t('settings.updatePw')}
        </button>
      )}
    </div>
  )

  if (view === 'two-factor') return (
    <div>
      <BackBar title={t('settings.twoFaTitle')} onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>{t('settings.twoFaDesc')}</div>
        {twoFAEnabled ? (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '10px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>{t('settings.twoFaIsActive')}</span>
            </div>
            <button onClick={() => setTwoFAEnabled(false)} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1.5px solid #E5E7EB', background: 'white', color: '#EF4444', cursor: 'pointer' }}>{t('settings.twoFaDisable')}</button>
          </div>
        ) : (
          <>
            <div style={{ background: '#F3F4F6', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 120, height: 120, background: 'white', borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 1, padding: 6 }}>
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} style={{ background: [0,1,2,7,8,9,10,18,19,20,27,28,29,36,37,38,45,46,47,56,65,74,83,50,51,52,61,70,79,88].includes(i) ? '#0A0E1A' : 'transparent', borderRadius: 1 }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>{t('settings.twoFaScan')}</div>
            <button onClick={() => setTwoFAEnabled(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>{t('settings.twoFaEnable')}</button>
          </>
        )}
      </div>
    </div>
  )

  if (view === 'privacy') return (
    <div>
      <BackBar title={t('settings.gp.privacyTitle')} onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 40 }}>
        {([1,2,3,4,5,6,7] as const).map((n, i) => (
          <div key={n} style={{ marginBottom: i < 6 ? 20 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{t(`settings.gp.privacy.h${n}`)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{t(`settings.gp.privacy.b${n}`)}</div>
          </div>
        ))}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--text-muted)' }}>{t('settings.updated')}</div>
      </div>
    </div>
  )

  if (view === 'terms') return (
    <div>
      <BackBar title={t('settings.gp.termsTitle')} onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 40 }}>
        {([1,2,3,4,5,6] as const).map((n, i) => (
          <div key={n} style={{ marginBottom: i < 5 ? 20 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{t(`settings.gp.terms.h${n}`)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{t(`settings.gp.terms.b${n}`)}</div>
          </div>
        ))}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--text-muted)' }}>{t('settings.updated')}</div>
      </div>
    </div>
  )

  if (view === 'download') return (
    <div>
      <BackBar title={t('settings.downloadTitle')} onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>{t('settings.downloadDesc')}</div>
        {downloaded ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#10B981', marginBottom: 4 }}>{t('settings.downloadDone')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('settings.downloadDoneSub')}</div>
          </div>
        ) : (
          <button onClick={() => setDownloaded(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>{t('settings.downloadBtn')}</button>
        )}
      </div>
    </div>
  )

  if (view === 'signout') return (
    <div>
      <BackBar title={t('settings.signOutTitle')} onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 16, textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>{t('settings.signOutConfirm')}</div>
        <button onClick={() => setSignoutConfirm(true)} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', marginBottom: 10 }}>
          {signoutConfirm ? t('settings.signingOut') : t('settings.signOutBtn')}
        </button>
        <button onClick={() => goBack()} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1.5px solid var(--border)', background: 'white', color: 'var(--text)', cursor: 'pointer' }}>{t('settings.cancel')}</button>
      </div>
    </div>
  )

  const row = (label: string, hint: string | null, onPress: () => void, danger = false) => (
    <div key={label} onClick={onPress} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, color: danger ? '#EF4444' : 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={danger ? '#EF4444' : 'var(--text-muted)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  )

  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{t('settings.profile')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>GP</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Partner</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>partner@example.com</div>
          </div>
        </div>
        {[
          { label: t('settings.gp.firm'), value: 'Tiopoo Capital' },
          { label: t('settings.gp.role'), value: 'General Partner' },
          { label: t('settings.gp.access'), value: 'Full access' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{r.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{t('settings.notifications')}</div>
        {([
          { key: 'submissions' as const, label: t('settings.gp.notif.submissions'), hint: t('settings.gp.notif.submissionsHint') },
          { key: 'anomalies' as const, label: t('settings.gp.notif.anomalies'), hint: t('settings.gp.notif.anomaliesHint') },
          { key: 'late' as const, label: t('settings.gp.notif.late'), hint: t('settings.gp.notif.lateHint') },
          { key: 'watchlist' as const, label: t('settings.gp.notif.watchlist'), hint: t('settings.gp.notif.watchlistHint') },
          { key: 'reports' as const, label: t('settings.gp.notif.reports'), hint: t('settings.gp.notif.reportsHint') },
        ]).map((item, i) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{item.hint}</div>
            </div>
            <div onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key] }))} style={{ width: 40, height: 22, borderRadius: 11, background: notifs[item.key] ? 'var(--accent)' : '#D1D5DB', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'transform 0.2s ease', transform: notifs[item.key] ? 'translateX(18px)' : 'translateX(0)' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{t('settings.language')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['en', 'fr'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: lang === l ? '1.5px solid var(--accent)' : '1px solid var(--border)', background: lang === l ? '#EFF6FF' : 'white', color: lang === l ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
              {l === 'en' ? 'English' : 'Français'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{t('settings.security')}</div>
        {row(t('settings.changePw'), t('settings.changePwHint'), () => goTo('change-password'))}
        {row(t('settings.twoFa'), twoFAEnabled ? t('settings.twoFaActive') : t('settings.twoFaOff'), () => goTo('two-factor'))}
      </div>

      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{t('settings.dataPrivacy')}</div>
        {row(t('settings.privacy'), null, () => goTo('privacy'))}
        {row(t('settings.terms'), null, () => goTo('terms'))}
        {row(t('settings.downloadData'), t('settings.downloadDataHint'), () => goTo('download'))}
      </div>

      <div style={{ ...card, marginBottom: 40 }}>
        {row(t('settings.signOut'), null, () => goTo('signout'), true)}
      </div>
    </div>
  )
}
