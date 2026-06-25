'use client'

export type AppNotification = {
  id: string
  type: 'call' | 'distribution' | 'document' | 'anomaly' | 'submission' | 'watchlist'
  title: string
  body: string
  time: string
  read: boolean
}

const ICON_DEFS: Record<AppNotification['type'], { bg: string; stroke: string; path: React.ReactNode }> = {
  call: {
    bg: '#FEF9EC', stroke: '#D97706',
    path: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></>,
  },
  distribution: {
    bg: '#ECFDF5', stroke: '#059669',
    path: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  },
  document: {
    bg: '#EFF6FF', stroke: '#2563EB',
    path: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  },
  anomaly: {
    bg: '#FEF2F2', stroke: '#DC2626',
    path: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  },
  submission: {
    bg: '#ECFDF5', stroke: '#059669',
    path: <><polyline points="20 6 9 17 4 12"/></>,
  },
  watchlist: {
    bg: '#FEF2F2', stroke: '#DC2626',
    path: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  },
}

const iconFor = (type: AppNotification['type']) => {
  const { bg, stroke, path } = ICON_DEFS[type]
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </div>
  )
}

export default function NotificationsPanel({
  notifications,
  onClose,
  onMarkRead,
  onNavigate,
}: {
  notifications: AppNotification[]
  onClose: () => void
  onMarkRead: (id: string) => void
  onNavigate?: (id: string) => void
}) {
  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      {/* Backdrop — tap to dismiss */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 100, animation: 'fadeIn 0.15s ease',
        }}
      />
      {/* Dropdown panel — falls from top bar */}
      <div style={{
        position: 'fixed', top: 'calc(52px + env(safe-area-inset-top))', left: 0, right: 0,
        background: 'white',
        zIndex: 101, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        animation: 'dropDown 0.2s ease',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Notifications</span>
            {unread > 0 && (
              <span style={{ background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{unread} new</span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '2px 4px' }}
          >×</button>
        </div>
        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
              No notifications
            </div>
          ) : notifications.map((n, i) => (
            <div
              key={n.id}
              onClick={() => { onMarkRead(n.id); if (onNavigate) { onClose(); onNavigate(n.id) } }}
              style={{
                display: 'flex', gap: 12, padding: '13px 18px',
                borderTop: i === 0 ? 'none' : '1px solid #F3F4F6',
                background: n.read ? 'white' : '#F8FAFF',
                cursor: 'pointer',
              }}
            >
              {iconFor(n.type)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--text)' }}>{n.title}</span>
                  {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 4 }} />}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dropDown { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  )
}
