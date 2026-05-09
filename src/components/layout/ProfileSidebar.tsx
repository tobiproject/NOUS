'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { User2, Target, Wallet, Key, BookOpen, Bell, Info, LogOut, ChevronRight, X, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/contexts/AccountContext'

interface Props {
  open: boolean
  onClose: () => void
  displayName?: string | null
  avatarUrl?: string | null
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  futures:     'Futures',
  prop:        'Prop Firm',
  cfd:         'CFD',
  eigenhandel: 'Eigenhandel',
}

const NAV_ITEMS = [
  { href: '/einstellungen?tab=profil&solo=1',            icon: User2,    label: 'Mein Profil' },
  { href: '/einstellungen?tab=strategie&solo=1',         icon: Target,   label: 'Strategie' },
  { href: '/einstellungen?tab=konten&solo=1',            icon: Wallet,   label: 'Konten' },
  { href: '/einstellungen?tab=api-key&solo=1',           icon: Key,      label: 'API Key' },
  { href: '/einstellungen?tab=knowledge-base&solo=1',    icon: BookOpen, label: 'Knowledge Base' },
  { href: '/einstellungen?tab=benachrichtigungen&solo=1',icon: Bell,     label: 'Benachrichtigungen' },
]

export function ProfileSidebar({ open, onClose, displayName, avatarUrl }: Props) {
  const { user, logout } = useAuth()
  const { accounts, activeAccount, setActiveAccount } = useAccountContext()
  const activeAccounts = accounts.filter(a => !a.is_archived)
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const initial = displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'
  const accountTypeLabel = activeAccount?.account_type
    ? ACCOUNT_TYPE_LABELS[activeAccount.account_type] ?? activeAccount.account_type
    : null

  // Mount immediately when opening; keep mounted while animating closed
  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  // Drive the animation whenever open or mounted changes
  useEffect(() => {
    if (!mounted) return
    const panel = panelRef.current
    const overlay = overlayRef.current
    if (!panel || !overlay) return

    if (open) {
      panel.style.transition = 'none'
      panel.style.transform = 'translateX(100%)'
      overlay.style.transition = 'none'
      overlay.style.opacity = '0'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.style.transition = 'transform 0.34s cubic-bezier(0.23, 1, 0.32, 1)'
          panel.style.transform = 'translateX(0)'
          overlay.style.transition = 'opacity 0.34s ease'
          overlay.style.opacity = '1'
        })
      })
    } else {
      panel.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 1, 1)'
      panel.style.transform = 'translateX(100%)'
      overlay.style.transition = 'opacity 0.22s ease'
      overlay.style.opacity = '0'
      const t = setTimeout(() => setMounted(false), 260)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Nothing in DOM when closed — no interference with touch events
  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60"
        style={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex flex-col overflow-hidden"
        style={{
          background: '#0F1013',
          width: 'min(270px, 75vw)',
          transform: 'translateX(100%)',
          willChange: 'transform',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full active:opacity-60"
          style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', zIndex: 10 }}
          aria-label="Schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Profile header */}
        <div className="px-5 pt-14 pb-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4 overflow-hidden"
            style={{ background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.18)', color: 'var(--brand-blue)' }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : initial}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[16px] font-semibold leading-tight" style={{ color: '#fff' }}>
                {displayName ?? 'Mein Profil'}
              </p>
              {accountTypeLabel && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
                  style={{ background: 'rgba(255,130,16,0.2)', color: 'var(--brand-blue)' }}
                >
                  {accountTypeLabel}
                </span>
              )}
            </div>
            {user?.email && (
              <p className="text-[12px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {user.email}
              </p>
            )}
            {activeAccount?.name && (
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {activeAccount.name}
              </p>
            )}
          </div>
        </div>

        {/* Account switcher */}
        {activeAccounts.length > 0 && (
          <div className="px-3 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-1 mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Konto
            </p>
            <div className="space-y-0.5">
              {activeAccounts.map(account => {
                const isActive = account.id === activeAccount?.id
                return (
                  <button
                    key={account.id}
                    onClick={() => setActiveAccount(account)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg active:bg-white/5"
                    style={{
                      background: isActive ? 'rgba(255,130,16,0.1)' : 'transparent',
                      minHeight: 40,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{
                        background: isActive ? 'rgba(255,130,16,0.25)' : 'rgba(255,255,255,0.08)',
                        color: isActive ? 'var(--brand-blue)' : 'rgba(255,255,255,0.45)',
                      }}
                    >
                      {account.name[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 text-[13px] font-medium truncate text-left" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                      {account.name}
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-blue)' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Einstellungen
          </p>

          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg active:bg-white/5"
              style={{ minHeight: 44 }}
            >
              <item.icon className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="flex-1 text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {item.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.18)' }} />
            </Link>
          ))}

          <div className="mx-3 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          <Link
            href="/about"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg active:bg-white/5"
            style={{ minHeight: 44 }}
          >
            <Info className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <span className="flex-1 text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Über NOUS
            </span>
          </Link>
        </div>

        {/* Logout */}
        <div className="px-3 pt-2 pb-6 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={async () => { onClose(); await logout() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full active:bg-white/5"
            style={{ minHeight: 44 }}
          >
            <LogOut className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,80,80,0.6)' }} />
            <span className="text-[14px] font-medium" style={{ color: 'rgba(255,80,80,0.7)' }}>
              Abmelden
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
