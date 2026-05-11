'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function AutoLogout() {
  useEffect(() => {
    const supabase = createClient()

    const handleHide = () => {
      supabase.auth.signOut()
    }

    // pagehide: feuert bei Tab-/Browser-Schließen und PWA-Close
    window.addEventListener('pagehide', handleHide)
    return () => window.removeEventListener('pagehide', handleHide)
  }, [])

  return null
}
