import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'NOUS',
  description: 'Dein Trading-Betriebssystem',
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
  userScalable: false,
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
