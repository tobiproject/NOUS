'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { UserCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileSheet } from './ProfileSheet'

export function MobileHeader() {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setDisplayName(d.display_name ?? null)
        setAvatarUrl(d.avatar_url ?? null)
      })
      .catch(() => {})
  }, [])

  const initial = displayName?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()

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
          width={112}
          height={30}
          priority
        />

        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Profil"
          className="flex items-center justify-center rounded-full transition-opacity active:opacity-70 overflow-hidden"
          style={{
            width: 34,
            height: 34,
            background: avatarUrl ? 'transparent' : 'rgba(41,98,255,0.16)',
            color: 'var(--brand-blue)',
          }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={34}
              height={34}
              className="object-cover w-full h-full rounded-full"
              unoptimized
            />
          ) : initial ? (
            <span className="text-sm font-bold">{initial}</span>
          ) : (
            <UserCircle className="h-5 w-5" />
          )}
        </button>
      </header>

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
    </>
  )
}
