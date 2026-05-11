'use client'

import { LoginForm } from './LoginForm'

export function LoginPageClient() {
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
