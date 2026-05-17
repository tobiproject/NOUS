import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Registrieren — NOUS',
}

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Konto erstellen</h2>
        <p className="text-sm text-muted-foreground">Starte dein Trading-Journal noch heute.</p>
      </div>
      <RegisterForm />
    </div>
  )
}
