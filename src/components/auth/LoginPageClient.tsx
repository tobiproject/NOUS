'use client'

import { useEffect, useState } from 'react'
import { LoginForm } from './LoginForm'

export function LoginPageClient() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const shown = sessionStorage.getItem('nous-splash-v4')
    if (!shown) {
      // Splash wurde noch nicht gezeigt — erst zur Startseite
      window.location.replace('/')
    } else {
      setReady(true)
    }
  }, [])

  if (!ready) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Willkommen zurück</h2>
        <p className="text-sm text-muted-foreground">Melde dich mit deinen Zugangsdaten an.</p>
      </div>
      <LoginForm />
    </div>
  )
}
