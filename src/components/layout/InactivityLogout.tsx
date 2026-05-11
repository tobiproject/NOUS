'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const AUTH_PAGES = ['/login', '/register', '/reset-password']
const TIMEOUT_MS = 5 * 60 * 1000

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

export function InactivityLogout() {
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (AUTH_PAGES.some(p => pathname.startsWith(p))) return

    const reset = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        clearSupabaseSession()
        try { sessionStorage.removeItem('nous-session') } catch { /* ignore */ }
        window.location.href = '/login'
      }, TIMEOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [pathname])

  return null
}
