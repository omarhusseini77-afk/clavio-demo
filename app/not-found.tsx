// 404. Previously the bare Next.js default, which does not look like this app
// and gives a signed-in user no way back to their own view.
export default function NotFound() {
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
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: '#6E7887', lineHeight: 1.6, marginBottom: 20 }}>
          {/* Says nothing about whether the page exists for someone else. A 404
              that distinguishes "no such thing" from "not yours" is a way to
              enumerate another tenant's ids. */}
          That address doesn’t lead anywhere. Continue will take you back to your own view.
        </p>
        <a
          href="/"
          style={{
            background: '#1652A0', color: 'white', border: 'none', borderRadius: 10,
            padding: '11px 22px', fontSize: 14, fontWeight: 600,
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          Continue
        </a>
      </div>
    </div>
  )
}
