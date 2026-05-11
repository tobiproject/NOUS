'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      router.replace(data.session ? '/dashboard' : '/login')
    }
    init()
  }, [router])

  return null
}
