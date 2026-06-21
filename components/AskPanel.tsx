'use client'
import { useState, useEffect, useRef } from 'react'

interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface Props {
  suggestions: string[]
  introTitle: string
  introBody: string
  connectedLabel: string
  connectedSub: string
  placeholder: string
  // Optional dataset the assistant should reason over. When omitted, the
  // server falls back to the default fund context.
  context?: unknown
  isMobile?: boolean
}

export default function AskPanel({ suggestions, introTitle, introBody, connectedLabel, connectedSub, placeholder, context, isMobile }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setError('')
    setInput('')
    const history = messages
    setMessages([...messages, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, messages: history, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages(m => [...m, { role: 'assistant', content: data.answer || '…' }])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const empty = messages.length === 0

  return (
    <div style={{ marginBottom: isMobile ? 12 : 40 }}>
      {/* Connected-data banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#0F7B4F', background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 20, padding: '4px 10px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          {connectedLabel}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{connectedSub}</span>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        style={{
          ...card, padding: empty ? '24px 20px' : '8px 4px',
          minHeight: empty ? 'auto' : 260, maxHeight: isMobile ? 'none' : 440,
          overflowY: 'auto', marginBottom: 12,
        }}
      >
        {empty ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{introTitle}</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>{introBody}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  textAlign: 'left', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer',
                  fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ color: 'var(--accent)', fontSize: 14 }}>✦</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
            {loading && <ThinkingBubble />}
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send(input) }} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 10, fontSize: 14, border: '1px solid var(--border)', outline: 'none', background: 'white' }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          padding: '0 20px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600,
          background: loading || !input.trim() ? '#C7D2E0' : 'var(--accent)', color: 'white',
          cursor: loading || !input.trim() ? 'default' : 'pointer',
        }}>
          {loading ? '…' : 'Ask'}
        </button>
      </form>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        Clavio AI can make mistakes. Verify material figures against source reports.
      </div>
    </div>
  )
}

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', padding: '6px 8px' }}>
      <div style={{
        maxWidth: '88%', padding: '11px 14px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        background: isUser ? 'var(--accent)' : 'var(--bg)',
        color: isUser ? 'white' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderBottomRightRadius: isUser ? 4 : 12,
        borderBottomLeftRadius: isUser ? 12 : 4,
      }}>
        {content}
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '6px 8px' }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `clavio-pulse 1.2s ${i * 0.18}s infinite ease-in-out` }} />
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Reading the books…</span>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
}
