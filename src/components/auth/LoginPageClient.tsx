'use client'

import { useEffect, useState } from 'react'
import { LoginForm } from './LoginForm'

export function LoginPageClient() {
  // Form erst rendern wenn Splash fertig — verhindert Autofill-Icon während Animation
  const [formReady, setFormReady] = useState(false)

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('nous-splash-v4')
    if (alreadyShown) {
      setFormReady(true)
      return
    }
    // Erste Session: Form nach Splash-Ende einblenden (5.1s = kurz vor Fade-out)
    const t = setTimeout(() => setFormReady(true), 5100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Willkommen zurück</h2>
        <p className="text-sm text-muted-foreground">Melde dich mit deinen Zugangsdaten an.</p>
      </div>
      {formReady && <LoginForm />}
    </div>
  )
}
