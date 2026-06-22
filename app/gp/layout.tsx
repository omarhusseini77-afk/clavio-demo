import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Clavio Partner',
  description: 'Partner dashboard — Clavio',
  manifest: '/manifest-gp.json',
  icons: { icon: '/icon-gp-192.png', apple: '/apple-touch-icon-gp.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clavio Partner',
  },
}

export const viewport: Viewport = {
  themeColor: '#1652A0',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function GPLayout({ children }: { children: React.ReactNode }) {
  return children
}
