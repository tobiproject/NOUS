'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const AUTH_PAGES = ['/login', '/register', '/reset-password']

export function AutoLogout() {
  const pathname = usePathname()

  useEffect(() => {
    // Auf Auth-Seiten kein Listener — window.location.href dort würde pagehide triggern
    // und die gerade gesetzte Session sofort wieder löschen
    if (AUTH_PAGES.some(p => pathname.startsWith(p))) return

    const supabase = createClient()

    const handleHide = (e: PageTransitionEvent) => {
      // persisted: true = App nur im Hintergrund (Home-Button) → kein Logout
      // persisted: false = App wirklich beendet (Dock, App-Switcher) → Logout
      if (!e.persisted) {
        supabase.auth.signOut()
      }
    }

    window.addEventListener('pagehide', handleHide)
    return () => window.removeEventListener('pagehide', handleHide)
  }, [pathname])

  return null
}
