import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Passwort zurücksetzen — NOUS',
}

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Passwort zurücksetzen</h2>
        <p className="text-sm text-muted-foreground">
          Wir senden dir einen Link zum Zurücksetzen deines Passworts.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
