'use client'
import { useEffect, useState, useCallback } from 'react'

// The admin panel.
//
// What it can do is the whole point of the design, so it says so on screen
// rather than leaving a partner to find out by clicking: read everything in
// this fund, change two settings, queue a reminder, cancel a queued one. No
// deletes anywhere, no figures, no accounts, no send button.

interface Company {
  id: string; name: string; slug: string
  cfoSignalsSimultaneous: boolean
  reportingDeadlineDays: number
  quartersFiled: number
  latestPeriod: string | null
}
interface OutboxRow {
  id: string; company_id: string | null; audience: string; kind: string
  subject: string; body: string; status: string; created_at: string; sent_at: string | null
}
interface AdminData {
  fund: { id: string; name: string; period_label: string; email_dispatch_enabled: boolean } | null
  companies: Company[]
  outbox: OutboxRow[]
  usage: {
    window: number
    routes: { route: string; calls: number; avgMs: number; errors: number }[]
    tokens: { input: number; output: number; cacheRead: number; cacheWrite: number }
  }
  dispatch: { fundEnabled: boolean; providerConfigured: boolean }
}

export default function AdminPanel({ isMobile }: { isMobile: boolean }) {
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [openMessage, setOpenMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin')
      const text = await res.text()
      const body = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`)
      setData(body)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load the admin data.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (payload: Record<string, unknown>, key: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      const body = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error(body?.error ?? 'That did not work.')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'That did not work.')
    } finally {
      setBusy(null)
    }
  }

  if (error && !data) return <div style={{ ...card, color: '#B45309' }}>{error}</div>
  if (!data) return <div style={{ ...card, color: 'var(--text-muted)' }}>Loading…</div>

  const nameOf = (id: string | null) =>
    data.companies.find(c => c.id === id)?.name ?? '—'

  return (
    <div>
      {error && <div style={{ ...card, color: '#B45309', marginBottom: 12 }}>{error}</div>}

      {/* What this panel is, and is not. On the screen, not only in a doc. */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionTitle}>Administration · {data.fund?.name ?? 'this fund'}</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
          Everything here is scoped to this fund by the same policies the rest of the app uses.
          This panel can change two settings, queue a reminder and cancel a queued one.
          It cannot delete anything, edit any financial figure, change any account or password,
          or send email — queueing a message and transmitting one are separate, and nothing here transmits.
        </p>
      </div>

      {/* Dispatch state */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionTitle}>Email dispatch</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Pill on={data.dispatch.providerConfigured} label={data.dispatch.providerConfigured ? 'Provider configured' : 'No provider configured'} />
          <Pill on={data.dispatch.fundEnabled} label={data.dispatch.fundEnabled ? 'Fund flag on' : 'Fund flag off'} />
          <button
            onClick={() => act({ action: 'set_dispatch', value: !data.dispatch.fundEnabled }, 'dispatch')}
            disabled={busy === 'dispatch'}
            style={btn}
          >
            {data.dispatch.fundEnabled ? 'Turn the fund flag off' : 'Turn the fund flag on'}
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
          Both must be true before anything is transmitted. With no provider configured, turning the
          flag on changes nothing that leaves this system — messages continue to accumulate below.
        </p>
      </div>

      {/* Companies */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionTitle}>Companies</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.companies.map(c => (
            <div key={c.id} style={{
              border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px',
              display: 'flex', gap: 12, alignItems: isMobile ? 'flex-start' : 'center',
              flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, fontWeight: 650 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.quartersFiled} filed{c.latestPeriod ? ` · latest ${c.latestPeriod}` : ' · nothing filed yet'}
                </div>
              </div>
              <label style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                Deadline
                <input
                  type="number" min={1} max={120}
                  defaultValue={c.reportingDeadlineDays}
                  onBlur={e => {
                    const v = Number(e.target.value)
                    if (v !== c.reportingDeadlineDays) act({ action: 'set_deadline_days', companyId: c.id, value: v }, `dl-${c.id}`)
                  }}
                  style={{ width: 62, padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }}
                />
                days
              </label>
              <button
                onClick={() => act({ action: 'set_simultaneous', companyId: c.id, value: !c.cfoSignalsSimultaneous }, `sim-${c.id}`)}
                disabled={busy === `sim-${c.id}`}
                style={{ ...btn, background: c.cfoSignalsSimultaneous ? 'var(--navy)' : 'white', color: c.cfoSignalsSimultaneous ? 'white' : 'var(--text-muted)' }}
                title="Whether this company sees its own early-warning signals as soon as they compute"
              >
                Signals {c.cfoSignalsSimultaneous ? 'shared' : 'withheld'}
              </button>
              <button
                onClick={() => {
                  const period = data.fund?.period_label ?? ''
                  act({ action: 'compose_reminder', companyId: c.id, period }, `rem-${c.id}`)
                }}
                disabled={busy === `rem-${c.id}`}
                style={btn}
              >
                Queue reminder
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Outbox */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionTitle}>Outbox · {data.outbox.length}</div>
        {data.outbox.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing composed yet.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.outbox.map(m => (
            <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {m.audience}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 160 }}>{m.subject}</span>
                <StatusPill status={m.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                {nameOf(m.company_id)} · {new Date(m.created_at).toLocaleString('en-GB')}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setOpenMessage(openMessage === m.id ? null : m.id)} style={btnSmall}>
                  {openMessage === m.id ? 'Hide' : 'Read'}
                </button>
                {m.status === 'pending' && (
                  <button
                    onClick={() => act({ action: 'cancel_outbox', id: m.id }, `cx-${m.id}`)}
                    disabled={busy === `cx-${m.id}`}
                    style={btnSmall}
                  >
                    Cancel
                  </button>
                )}
              </div>
              {openMessage === m.id && (
                <pre style={{
                  marginTop: 10, marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontSize: 12.5, lineHeight: 1.6, color: 'var(--text)', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
                  fontFamily: 'inherit',
                }}>{m.body}</pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Usage */}
      <div style={{ ...card, marginBottom: 40 }}>
        <div style={sectionTitle}>Usage · last {data.usage.window} calls</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4, marginBottom: 12, lineHeight: 1.55 }}>
          Counts and latencies only. Nothing is recorded about what any request contained — no question
          text, no figures, no file names.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Route</th><th style={{ ...th, textAlign: 'right' }}>Calls</th>
                <th style={{ ...th, textAlign: 'right' }}>Avg</th><th style={{ ...th, textAlign: 'right' }}>Errors</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.routes.map(r => (
                <tr key={r.route}>
                  <td style={td}>{r.route}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.calls}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.avgMs}ms</td>
                  <td style={{ ...td, textAlign: 'right', color: r.errors ? '#B45309' : 'var(--text-muted)' }}>{r.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 12 }}>
          Model tokens — in {data.usage.tokens.input.toLocaleString('en-GB')} ·
          out {data.usage.tokens.output.toLocaleString('en-GB')} ·
          cache read {data.usage.tokens.cacheRead.toLocaleString('en-GB')} ·
          cache write {data.usage.tokens.cacheWrite.toLocaleString('en-GB')}
        </div>
      </div>
    </div>
  )
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
      background: on ? '#ECFDF5' : 'var(--bg)', color: on ? '#065F46' : 'var(--text-muted)',
      border: `1px solid ${on ? '#A7F3D0' : 'var(--border)'}`,
    }}>{label}</span>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'pending' ? ['#FFFBEB', '#92400E', '#FCD34D']
    : status === 'sent' ? ['#ECFDF5', '#065F46', '#A7F3D0']
    : ['var(--bg)', 'var(--text-muted)', 'var(--border)']
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      background: tone[0], color: tone[1], border: `1px solid ${tone[2]}`, textTransform: 'uppercase',
    }}>{status}</span>
  )
}

const card: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 12, padding: '16px 18px',
  border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
}
const sectionTitle: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 700, color: 'var(--accent)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
}
const btn: React.CSSProperties = {
  border: '1px solid var(--border)', background: 'white', color: 'var(--text)',
  borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}
const btnSmall: React.CSSProperties = { ...btn, padding: '5px 11px', fontSize: 12 }
const th: React.CSSProperties = {
  textAlign: 'left', padding: '9px 10px', fontSize: 11, fontWeight: 600,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid var(--border)' }
