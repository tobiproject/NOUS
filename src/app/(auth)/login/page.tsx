import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'
import { SplashScreen } from '@/components/layout/SplashScreen'

export const metadata: Metadata = {
  title: 'Login — NOUS',
}

export default function LoginPage() {
  return (
    <>
      <SplashScreen />
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Willkommen zurück</h2>
          <p className="text-sm text-muted-foreground">Melde dich mit deinen Zugangsdaten an.</p>
        </div>
        <LoginForm />
      </div>
    </>
  )
}
