'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const AUTH_PAGES = ['/login', '/register', '/reset-password']

function clearSupabaseSession() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-')) localStorage.removeItem(k)
    })
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
    if (AUTH_PAGES.some(p => pathname.startsWith(p))) return

    // pagehide with persisted:false fires on iOS when the app is truly closed
    // (home button / app switcher). On desktop Safari and Chrome it also fires
    // on normal reloads — so we restrict this to iOS only to avoid clearing the
    // session on every page reload.
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isIOS) return

    const handleHide = (e: PageTransitionEvent) => {
      if (!e.persisted) {
        // Skip if a reload was triggered intentionally within the last 10 s
        // (uses localStorage so it survives the pagehide/reload boundary on iOS)
        const skipTs = Number(localStorage.getItem('nous-skip-logout-ts') || '0')
        if (Date.now() - skipTs < 10_000) {
          localStorage.removeItem('nous-skip-logout-ts')
          return
        }
        clearSupabaseSession()
      }
    }

    window.addEventListener('pagehide', handleHide)
    return () => window.removeEventListener('pagehide', handleHide)
  }, [pathname])

  return null
}
