'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const AUTH_PAGES = ['/login', '/register', '/reset-password']

function clearSupabaseSession() {
  try {
    // localStorage synchron löschen
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-')) localStorage.removeItem(k)
    })
    // Cookies synchron löschen (document.cookie ist synchron)
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim()
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${location.hostname}`
      }
    })
  } catch { /* ignore */ }
}

export function AutoLogout() {
  const pathname = usePathname()

  useEffect(() => {
    // Auf Auth-Seiten kein Listener — window.location.href dort würde pagehide triggern
    if (AUTH_PAGES.some(p => pathname.startsWith(p))) return

    const handleHide = (e: PageTransitionEvent) => {
      // persisted: true = nur Hintergrund (Home-Button) → kein Logout
      // persisted: false = App wirklich beendet (Dock, App-Switcher) → Logout
      if (!e.persisted) {
        clearSupabaseSession()
      }
    }

    window.addEventListener('pagehide', handleHide)
    return () => window.removeEventListener('pagehide', handleHide)
  }, [pathname])

  return null
}
