'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LoginForm } from './LoginForm'

export function LoginPageClient() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('inactive') === '1') {
      createClient().auth.signOut().catch(() => {})
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Willkommen zurück</h2>
        <p className="text-sm text-muted-foreground">
          {searchParams.get('inactive') === '1'
            ? 'Du wurdest wegen Inaktivität ausgeloggt.'
            : 'Melde dich mit deinen Zugangsdaten an.'}
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
