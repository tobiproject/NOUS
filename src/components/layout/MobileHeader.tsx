'use client'

import { useState } from 'react'
import Image from 'next/image'
import { UserCircle } from 'lucide-react'
import { useAccountContext } from '@/contexts/AccountContext'
import { ProfileSheet } from './ProfileSheet'

export function MobileHeader() {
  const { activeAccount } = useAccountContext()
  const [profileOpen, setProfileOpen] = useState(false)
  const initial = activeAccount?.name?.[0]?.toUpperCase()

  return (
    <>
      <header
        className="md:hidden flex items-center justify-between px-4 sticky top-0 z-30 shrink-0"
        style={{
          height: 'calc(60px + env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)',
          background: '#0C0D0F',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Image
          src="/logo/nous-logo-slogan.svg"
          alt="NOUS — Turn data into decisions"
          width={120}
          height={34}
          priority
        />

        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Profil"
          className="flex items-center justify-center rounded-full transition-opacity active:opacity-70"
          style={{
            width: 34,
            height: 34,
            background: 'rgba(41,98,255,0.16)',
            color: 'var(--brand-blue)',
          }}
        >
          {initial ? (
            <span className="text-sm font-bold">{initial}</span>
          ) : (
            <UserCircle className="h-5 w-5" />
          )}
        </button>
      </header>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
