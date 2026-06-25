'use client'

export type AppNotification = {
  id: string
  type: 'call' | 'distribution' | 'document' | 'anomaly' | 'submission' | 'watchlist'
  title: string
  body: string
  time: string
  read: boolean
}

const iconFor = (type: AppNotification['type']) => {
  const base = { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as const
  const icons: Record<AppNotification['type'], { bg: string; el: React.ReactNode }> = {
    call: { bg: '#FEF3C7', el: <span style={{ fontSize: 16 }}>📋</span> },
    distribution: { bg: '#D1FAE5', el: <span style={{ fontSize: 16 }}>💸</span> },
    document: { bg: '#EFF6FF', el: <span style={{ fontSize: 16 }}>📄</span> },
    anomaly: { bg: '#FEE2E2', el: <span style={{ fontSize: 16 }}>⚠️</span> },
    submission: { bg: '#D1FAE5', el: <span style={{ fontSize: 16 }}>✅</span> },
    watchlist: { bg: '#FEE2E2', el: <span style={{ fontSize: 16 }}>🔴</span> },
  }
  const { bg, el } = icons[type]
  return <div style={{ ...base, background: bg }}>{el}</div>
}

export default function NotificationsPanel({
  notifications,
  onClose,
  onMarkRead,
}: {
  notifications: AppNotification[]
  onClose: () => void
  onMarkRead: (id: string) => void
}) {
  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, animation: 'fadeIn 0.15s ease',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderRadius: '20px 20px 0 0',
        zIndex: 101, maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.22s ease',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>Notifications</span>
            {unread > 0 && (
              <span style={{ background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>{unread} new</span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: 4 }}
          >×</button>
        </div>
        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 32 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
              No notifications
            </div>
          ) : notifications.map((n, i) => (
            <div
              key={n.id}
              onClick={() => onMarkRead(n.id)}
              style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderTop: i === 0 ? '1px solid #F3F4F6' : '1px solid #F3F4F6',
                background: n.read ? 'white' : '#F8FAFF',
                cursor: 'pointer',
              }}
            >
              {iconFor(n.type)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: 'var(--text)' }}>{n.title}</span>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 4 }} />}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
