export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">NOUS</h1>
          <p className="text-sm text-muted-foreground mt-1">Dein Trading-Betriebssystem</p>
        </div>
        {children}
      </div>
    </div>
  )
}
