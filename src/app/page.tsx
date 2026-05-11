'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function go() {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        router.replace('/dashboard')
        return
      }

      const shown = sessionStorage.getItem('nous-splash-v4')
      if (shown) {
        router.replace('/login')
        return
      }

      // Erste Session: nach Splash-Ende zu /login
      const t = setTimeout(() => router.replace('/login'), 5800)
      cleanup = () => clearTimeout(t)
    }

    go()
    return () => cleanup?.()
  }, [router])

  return null
}
