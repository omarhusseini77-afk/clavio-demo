'use client'

// One place to render "we could not load this", so the two views cannot end up
// with different ideas of what a failure looks like.
//
// Amber, not red. The data on screen is usually still valid — this reports a
// refresh that failed, not a corruption — and red would say something stronger
// than the situation warrants.
export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10,
        padding: '12px 14px', marginBottom: 16,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: '#78350F', lineHeight: 1.55, wordBreak: 'break-word' }}>{message}</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            flexShrink: 0, background: 'white', border: '1px solid #FCD34D',
            color: '#92400E', borderRadius: 8, padding: '6px 12px',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
