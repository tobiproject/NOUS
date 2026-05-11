'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function AutoLogout() {
  useEffect(() => {
    const supabase = createClient()

    const handleHide = (e: PageTransitionEvent) => {
      // persisted: true = nur in Hintergrund (Home-Button) → KEIN Logout
      // persisted: false = App wirklich beendet (aus App-Switcher gewischt) → Logout
      if (!e.persisted) {
        supabase.auth.signOut()
      }
    }

    window.addEventListener('pagehide', handleHide)
    return () => window.removeEventListener('pagehide', handleHide)
  }, [])

  return null
}
