'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { UserCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileSidebar } from './ProfileSidebar'

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
        className="md:hidden flex items-center justify-between px-4 sticky top-0 z-30 shrink-0 gap-2"
        style={{
          height: 'calc(68px + env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)',
          background: '#0C0D0F',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Image
          src="/logo/nous-logo-slogan.svg"
          alt="NOUS — Turn data into decisions"
          width={164}
          height={52}
          priority
        />

        {/* Profile Avatar */}
        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Profil"
          className="shrink-0 transition-opacity active:opacity-70"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.16)',
            color: 'var(--brand-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: 0,
            border: 'none',
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%', display: 'block' }}
            />
          ) : initial ? (
            <span className="text-sm font-bold">{initial}</span>
          ) : (
            <UserCircle className="h-5 w-5" />
          )}
        </button>
      </header>

      <ProfileSidebar
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />

    </>
  )
}
