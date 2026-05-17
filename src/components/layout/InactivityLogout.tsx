'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const AUTH_PAGES = ['/login', '/register', '/reset-password']
export const INACTIVITY_KEY = 'nous-inactivity-timeout-ms'
export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 min

function getTimeoutMs(): number {
  try {
    const stored = localStorage.getItem(INACTIVITY_KEY)
    if (stored === 'never') return 0
    const ms = Number(stored)
    if (ms > 0) return ms
  } catch { /* ignore */ }
  return DEFAULT_TIMEOUT_MS
}

export function InactivityLogout() {
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (AUTH_PAGES.some(p => pathname.startsWith(p))) return

    const timeoutMs = getTimeoutMs()
    if (timeoutMs === 0) return // "Nie" — deaktiviert

    const reset = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        // Redirect to login — the login page handles the actual signOut.
        // Session is NOT cleared here so that a concurrent page reload
        // (e.g. from the update banner) keeps the user logged in.
        window.location.href = '/login?inactive=1'
      }, timeoutMs)
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
