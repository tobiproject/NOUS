'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const sessionActive = sessionStorage.getItem('nous-session')

      if (!sessionActive) {
        // Frisches Öffnen (Tab/PWA geschlossen, sessionStorage geleert)
        // localStorage-Session löschen damit kein Auto-Login passiert
        try {
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('sb-')) localStorage.removeItem(k)
          })
        } catch { /* ignore */ }
        await supabase.auth.signOut().catch(() => {})
        router.replace('/login')
        return
      }

      // Bestehende Session (In-App-Navigation) — weiterleiten
      const { data } = await supabase.auth.getSession()
      router.replace(data.session ? '/dashboard' : '/login')
    }

    init()
  }, [router])

  return null
}
