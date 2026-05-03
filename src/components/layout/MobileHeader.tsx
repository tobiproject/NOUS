'use client'

import Link from 'next/link'
import { UserCircle } from 'lucide-react'
import { useAccountContext } from '@/contexts/AccountContext'

export function MobileHeader() {
  const { activeAccount } = useAccountContext()
  const initial = activeAccount?.name?.[0]?.toUpperCase()

  return (
    <header
      className="md:hidden flex items-center justify-between px-4 sticky top-0 z-30"
      style={{
        height: 'calc(52px + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
        background: '#0C0D0F',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span
        className="font-bold text-white"
        style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: '18px',
          letterSpacing: '-0.02em',
        }}
      >
        NOUS
      </span>

      <Link
        href="/einstellungen"
        aria-label="Einstellungen"
        className="flex items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          background: 'rgba(41,98,255,0.18)',
          color: 'var(--brand-blue)',
        }}
      >
        {initial ? (
          <span className="text-sm font-bold">{initial}</span>
        ) : (
          <UserCircle className="h-5 w-5" />
        )}
      </Link>
    </header>
  )
}
