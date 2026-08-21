'use client'
import { useEffect } from 'react'

// Segment error boundary. Without this, an unhandled render error shows the
// Next.js dev overlay locally and a blank white page in production — the user
// gets nothing to read and nothing to do.
//
// Not translated through useLang on purpose: this boundary catches errors that
// may have come from the provider tree itself, so it must render without any
// context. English only, kept short.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[boundary]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F8FA',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #E4E8EF',
        boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
        padding: '32px 30px', maxWidth: 460, width: '100%',
      }}>
        <div style={{ color: '#0A0E1A', fontWeight: 800, fontSize: 22, letterSpacing: '1px', marginBottom: 18 }}>
          CLA<span style={{ color: '#1652A0', marginLeft: -5, marginRight: -3, display: 'inline-block' }}>V</span>IO
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0A0E1A', marginBottom: 8 }}>
          This page didn’t load
        </h1>
        <p style={{ fontSize: 14, color: '#6E7887', lineHeight: 1.6, marginBottom: 20 }}>
          Something failed while rendering. Your data has not been changed by this.
          Trying again is safe.
        </p>
        {/* Next.js sets `digest` in production and it is the only handle that
            ties this screen to a server log line. Shown when present rather
            than a raw message, which would be the internals leak the API
            responses were just cleaned of. */}
        {error.digest && (
          <div style={{
            fontSize: 12, color: '#6E7887', background: '#F7F8FA',
            border: '1px solid #E4E8EF', borderRadius: 8, padding: '8px 10px', marginBottom: 20,
          }}>
            Reference: <code style={{ fontFamily: 'ui-monospace, monospace' }}>{error.digest}</code>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              background: '#1652A0', color: 'white', border: 'none', borderRadius: 10,
              padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: 'white', color: '#0A0E1A', border: '1px solid #E4E8EF', borderRadius: 10,
              padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            Back to sign-in
          </a>
        </div>
      </div>
    </div>
  )
}
