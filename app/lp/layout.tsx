import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Clavio Investor',
  description: 'Investor portal — Clavio',
  manifest: '/manifest-lp.json',
  icons: { apple: '/icon-lp-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clavio Investor',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0E1A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function LPLayout({ children }: { children: React.ReactNode }) {
  return children
}
