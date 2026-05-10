'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileSidebar } from './ProfileSidebar'

export function DesktopProfileButton() {
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

  const initial = (displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  return (
    <>
      {/* Fixed top-right avatar — desktop only (md+) */}
      <button
        onClick={() => setProfileOpen(true)}
        aria-label="Profil"
        className="hidden md:flex fixed z-40 transition-opacity active:opacity-70"
        style={{
          top: 16,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.16)',
          color: 'var(--brand-blue)',
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
        ) : (
          <span className="text-sm font-bold">{initial}</span>
        )}
      </button>

      <ProfileSidebar
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
    </>
  )
}
