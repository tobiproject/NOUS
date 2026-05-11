'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()
  const didNavigate = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    async function init() {
      const shown = sessionStorage.getItem('nous-splash-v4')

      if (!shown) {
        // Frisches Öffnen (Tab/Browser/PWA wurde geschlossen, sessionStorage geleert)
        // Sofort localStorage wischen (synchron, bevor irgendwas anderes passiert)
        try {
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('sb-')) localStorage.removeItem(k)
          })
        } catch { /* ignore */ }

        // Supabase signOut abwarten — löscht auch Server-Cookies
        // Hat 5.8s Zeit bevor Login kommt, kein Zeitproblem
        const supabase = createClient()
        await supabase.auth.signOut().catch(() => {})

        // Nach der Animation → Login
        timer = setTimeout(() => {
          if (!didNavigate.current) {
            didNavigate.current = true
            router.replace('/login')
          }
        }, 5800)
      } else {
        // Gleiche Session (In-App-Navigation zurück auf /) → weiterleiten
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (!didNavigate.current) {
          didNavigate.current = true
          router.replace(data.session ? '/dashboard' : '/login')
        }
      }
    }

    init()
    return () => clearTimeout(timer)
  }, [router])

  return null
}
