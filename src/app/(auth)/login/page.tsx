import type { Metadata } from 'next'
import { LoginPageClient } from '@/components/auth/LoginPageClient'

export const metadata: Metadata = {
  title: 'Login — NOUS',
}

export default function LoginPage() {
  return <LoginPageClient />
}
