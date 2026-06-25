'use client'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/lib/i18n'

type View = 'main' | 'change-password' | 'two-factor' | 'privacy' | 'terms' | 'download' | 'signout'

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Settings
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
  const { lang, setLang } = useLang()
  const [view, setView] = useState<View>('main')
  const savedScroll = useRef(0)
  const goTo = (v: View) => { savedScroll.current = window.scrollY; setView(v); window.scrollTo(0, 0) }
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
      <BackBar title="Change Password" onBack={() => goBack(() => setPwSaved(false))} />
      <div style={{ ...card, marginBottom: 16 }}>
        {pwSaved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#10B981' }}>Password updated</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>You can now sign in with your new password.</div>
          </div>
        ) : (
          <>
            {[
              { label: 'Current password', key: 'current' as const },
              { label: 'New password', key: 'next' as const },
              { label: 'Confirm new password', key: 'confirm' as const },
            ].map((f, i) => (
              <div key={f.key} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</div>
                <input
                  type="password"
                  value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'white' }}
                />
              </div>
            ))}
          </>
        )}
      </div>
      {!pwSaved && (
        <button
          onClick={() => { if (pwForm.next && pwForm.next === pwForm.confirm) setPwSaved(true) }}
          style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', marginBottom: 40 }}
        >
          Update password
        </button>
      )}
    </div>
  )

  if (view === 'two-factor') return (
    <div>
      <BackBar title="Two-Factor Authentication" onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Two-factor authentication adds an extra layer of security. Each time you sign in, you will need your password and a code from your authenticator app.
        </div>
        {twoFAEnabled ? (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '10px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>Two-factor authentication is active</span>
            </div>
            <button onClick={() => setTwoFAEnabled(false)} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1.5px solid #E5E7EB', background: 'white', color: '#EF4444', cursor: 'pointer' }}>
              Disable 2FA
            </button>
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
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</div>
            <button onClick={() => setTwoFAEnabled(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>
              I have scanned the code — Enable 2FA
            </button>
          </>
        )}
      </div>
    </div>
  )

  if (view === 'privacy') return (
    <div>
      <BackBar title="Privacy Policy" onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 40 }}>
        {[
          { heading: 'What data we collect', body: 'We collect the information your firm provides when your account is set up: your name, email address, and partner role. We also collect usage data such as pages visited and features used, to improve the product.' },
          { heading: 'How we use your data', body: 'Your data is used solely to provide you with access to portfolio company reporting and fund management tools. We do not sell, share, or disclose your personal data to any third party except where required by law or where you have given explicit consent.' },
          { heading: 'Data storage and security', body: 'All data is stored in encrypted form in our EU-based infrastructure (London region). Portfolio company financial data is isolated per firm using row-level security. Access is protected by your chosen authentication method.' },
          { heading: 'AI processing', body: 'When you use the Ask Clavio feature, your questions are processed by our AI provider under a Zero Data Retention agreement, meaning your queries and the underlying financial data are never stored or used for model training.' },
          { heading: 'Your rights', body: 'You have the right to access, correct, or delete your personal data at any time. You may also request a copy of all data held about you using the Download my data option in these settings. To exercise any of these rights, write to privacy@clavio.io.' },
          { heading: 'Retention', body: 'We retain your data for as long as your partner account is active. If your account is closed, your personal data is deleted within 30 days, except where retention is required by applicable financial regulation.' },
          { heading: 'Updates', body: 'We may update this policy from time to time. We will notify you by email of any material changes.' },
        ].map((s, i) => (
          <div key={s.heading} style={{ marginBottom: i < 6 ? 20 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.heading}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{s.body}</div>
          </div>
        ))}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--text-muted)' }}>Last updated: June 2026 · Clavio Technologies Ltd</div>
      </div>
    </div>
  )

  if (view === 'terms') return (
    <div>
      <BackBar title="Terms of Service" onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 40 }}>
        {[
          { heading: '1. Acceptance', body: 'By accessing the Clavio partner portal, you agree to these terms. If you do not agree, you must not use the portal. Your access is granted by your firm administrator and is personal to you.' },
          { heading: '2. Access and credentials', body: 'You are responsible for maintaining the confidentiality of your login credentials. You must not share access with any other person. You must notify your firm administrator immediately if you believe your account has been compromised.' },
          { heading: '3. Permitted use', body: 'The portal is provided for the sole purpose of managing and reviewing portfolio company financial reporting. You may not use any data obtained through the portal for any purpose outside of your authorised fund management activities.' },
          { heading: '4. Accuracy of information', body: 'The figures displayed in the portal are sourced from portfolio company accounting systems submitted by the companies themselves. Clavio makes reasonable efforts to standardise and validate this data but does not warrant that all information is complete or error-free. AI-generated analysis is indicative only and does not constitute investment advice.' },
          { heading: '5. Limitation of liability', body: 'To the fullest extent permitted by law, Clavio Technologies Ltd accepts no liability for any loss or damage arising from your use of or reliance on any information in the portal.' },
          { heading: '6. Governing law', body: 'These terms are governed by English law. Any dispute shall be subject to the exclusive jurisdiction of the courts of England and Wales.' },
        ].map((s, i) => (
          <div key={s.heading} style={{ marginBottom: i < 5 ? 20 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.heading}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{s.body}</div>
          </div>
        ))}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--text-muted)' }}>Last updated: June 2026 · Clavio Technologies Ltd</div>
      </div>
    </div>
  )

  if (view === 'download') return (
    <div>
      <BackBar title="Download My Data" onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          You can request a copy of all personal data we hold about you. This includes your profile information and account activity. The file will be prepared and sent to your registered email address within 48 hours.
        </div>
        {downloaded ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#10B981', marginBottom: 4 }}>Request received</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your data export will be sent to partner@example.com within 48 hours.</div>
          </div>
        ) : (
          <button onClick={() => setDownloaded(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>
            Request data export
          </button>
        )}
      </div>
    </div>
  )

  if (view === 'signout') return (
    <div>
      <BackBar title="Sign Out" onBack={() => goBack()} />
      <div style={{ ...card, marginBottom: 16, textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to sign out? You will need to sign in again to access the partner portal.
        </div>
        <button onClick={() => setSignoutConfirm(true)} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', marginBottom: 10 }}>
          {signoutConfirm ? 'Signing out…' : 'Sign out'}
        </button>
        <button onClick={() => goBack()} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1.5px solid var(--border)', background: 'white', color: 'var(--text)', cursor: 'pointer' }}>
          Cancel
        </button>
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
      {/* Profile */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Profile</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>GP</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Partner</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>partner@example.com</div>
          </div>
        </div>
        {[
          { label: 'Firm', value: 'Clavio Capital' },
          { label: 'Role', value: 'General Partner' },
          { label: 'Portfolio companies', value: '4' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{r.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Notifications</div>
        {([
          { key: 'submissions' as const, label: 'New submissions', hint: 'Alert when a portfolio co. submits financials' },
          { key: 'anomalies' as const, label: 'Anomaly alerts', hint: 'Alert when a new anomaly is detected' },
          { key: 'late' as const, label: 'Late submissions', hint: 'Alert when a company misses its submission deadline' },
          { key: 'watchlist' as const, label: 'Watch-list flags', hint: 'Alert when a company is flagged by the anomaly engine' },
          { key: 'reports' as const, label: 'Quarterly summaries', hint: 'Email me the quarterly GP digest' },
        ]).map((item, i) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{item.hint}</div>
            </div>
            <div
              onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key] }))}
              style={{ width: 40, height: 22, borderRadius: 11, background: notifs[item.key] ? 'var(--accent)' : '#D1D5DB', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: notifs[item.key] ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Language */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Language</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['en', 'fr'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: lang === l ? '1.5px solid var(--accent)' : '1px solid var(--border)', background: lang === l ? '#EFF6FF' : 'white', color: lang === l ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
              {l === 'en' ? 'English' : 'Français'}
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Security</div>
        {row('Change password', 'Update your login password', () => goTo('change-password'))}
        {row('Two-factor authentication', twoFAEnabled ? 'Active' : 'Not enabled', () => goTo('two-factor'))}
      </div>

      {/* Data & Privacy */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Data &amp; Privacy</div>
        {row('Privacy policy', null, () => goTo('privacy'))}
        {row('Terms of service', null, () => goTo('terms'))}
        {row('Download my data', 'Export a copy of your account data', () => goTo('download'))}
      </div>

      <div style={{ ...card, marginBottom: 40 }}>
        {row('Sign out', null, () => goTo('signout'), true)}
      </div>
    </div>
  )
}
