import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Clavio Partner',
  description: 'Partner dashboard — Clavio',
  manifest: '/manifest-gp.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clavio Partner',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0E1A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function GPLayout({ children }: { children: React.ReactNode }) {
  return children
}
