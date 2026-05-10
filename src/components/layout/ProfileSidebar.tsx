'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { User2, Target, Wallet, Key, BookOpen, Bell, Info, LogOut, ChevronRight, X, Check, HelpCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/contexts/AccountContext'
import { getAnleitungProgress, ANLEITUNG_STORAGE_KEY } from '@/lib/anleitung-progress'

interface Props {
  open: boolean
  onClose: () => void
  displayName?: string | null
  avatarUrl?: string | null
  side?: 'left' | 'right'
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  // Legacy values (backward compat)
  futures:              'Eigenhandel · Futures',
  cfd:                  'Eigenhandel · CFD',
  prop:                 'Fremdkapital · Futures',
  eigenhandel:          'Eigenhandel · CFD',
  // Eigenhandel
  eigenhandel_futures:  'Eigenhandel · Futures',
  eigenhandel_cfd:      'Eigenhandel · CFD',
  eigenhandel_fx:       'Eigenhandel · FX',
  eigenhandel_aktien:   'Eigenhandel · Aktien',
  eigenhandel_optionen: 'Eigenhandel · Optionen',
  eigenhandel_krypto:   'Eigenhandel · Krypto',
  eigenhandel_etf:      'Eigenhandel · ETF',
  // Fremdkapital (Prop Firm)
  fremdkapital_futures:  'Fremdkapital · Futures',
  fremdkapital_cfd:      'Fremdkapital · CFD',
  fremdkapital_fx:       'Fremdkapital · FX',
  fremdkapital_aktien:   'Fremdkapital · Aktien',
  fremdkapital_optionen: 'Fremdkapital · Optionen',
  fremdkapital_krypto:   'Fremdkapital · Krypto',
}

const NAV_ITEMS = [
  { href: '/einstellungen?tab=profil&solo=1',            icon: User2,       label: 'Mein Profil' },
  { href: '/einstellungen?tab=strategie&solo=1',         icon: Target,      label: 'Strategie' },
  { href: '/einstellungen?tab=konten&solo=1',            icon: Wallet,      label: 'Konten' },
  { href: '/einstellungen?tab=api-key&solo=1',           icon: Key,         label: 'API Key' },
  { href: '/einstellungen?tab=knowledge-base&solo=1',    icon: BookOpen,    label: 'Knowledge Base' },
  { href: '/einstellungen?tab=benachrichtigungen&solo=1',icon: Bell,        label: 'Benachrichtigungen' },
  { href: '/anleitung',                                  icon: HelpCircle,  label: 'Anleitung', isAnleitung: true },
]

export function ProfileSidebar({ open, onClose, displayName, avatarUrl, side = 'right' }: Props) {
  const { user, logout } = useAuth()
  const { accounts, activeAccount, setActiveAccount } = useAccountContext()
  const activeAccounts = accounts.filter(a => !a.is_archived)
  const [mounted, setMounted] = useState(false)
  const [accountPickerOpen, setAccountPickerOpen] = useState(false)
  const [anleitungProgress, setAnleitungProgress] = useState({ read: [] as string[], total: 10, percent: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const initial = displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'
  const accountTypeLabel = activeAccount?.account_type
    ? ACCOUNT_TYPE_LABELS[activeAccount.account_type] ?? activeAccount.account_type
    : null

  // Read anleitung progress from localStorage, react to updates
  useEffect(() => {
    const update = () => setAnleitungProgress(getAnleitungProgress())
    update()
    window.addEventListener('anleitung-progress-changed', update)
    window.addEventListener('storage', (e) => { if (e.key === ANLEITUNG_STORAGE_KEY) update() })
    return () => {
      window.removeEventListener('anleitung-progress-changed', update)
    }
  }, [])

  // Reset account picker when sidebar closes
  useEffect(() => {
    if (!open) setAccountPickerOpen(false)
  }, [open])

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

    const offscreen = side === 'left' ? 'translateX(-100%)' : 'translateX(100%)'

    if (open) {
      panel.style.transition = 'none'
      panel.style.transform = offscreen
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
      panel.style.transform = offscreen
      overlay.style.transition = 'opacity 0.22s ease'
      overlay.style.opacity = '0'
      const t = setTimeout(() => setMounted(false), 260)
      return () => clearTimeout(t)
    }
  }, [open, mounted, side])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!mounted) return null

  const showAnleitungDot = anleitungProgress.percent < 100

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
        className={`absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} flex flex-col`}
        style={{
          background: '#141417',
          width: 'min(270px, 75vw)',
          transform: side === 'left' ? 'translateX(-100%)' : 'translateX(100%)',
          willChange: 'transform',
          paddingBottom: 'env(safe-area-inset-bottom)',
          overflowX: 'hidden',
          overflowY: 'hidden',
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
        <div className="px-5 pt-14 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-3 overflow-hidden"
            style={{ background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.18)', color: 'var(--brand-blue)' }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
            ) : initial}
          </div>

          <p className="text-[17px] font-bold leading-tight mb-1" style={{ color: '#fff' }}>
            {displayName ?? 'Mein Profil'}
          </p>

          {/* Account quick-switch trigger */}
          {activeAccount && (
            <button
              onClick={() => setAccountPickerOpen(v => !v)}
              className="flex items-center gap-1 rounded active:opacity-70 transition-opacity"
              style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '100%' }}
            >
              <span className="text-[12px] truncate">
                {activeAccount.name}
                {accountTypeLabel && (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {accountTypeLabel}</span>
                )}
              </span>
              <ChevronDown
                className="h-3 w-3 shrink-0 transition-transform duration-200"
                style={{ transform: accountPickerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          )}

          {/* Inline account picker */}
          {accountPickerOpen && activeAccounts.length > 0 && (
            <div
              className="mt-2 rounded-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {activeAccounts.map(account => {
                const isActive = account.id === activeAccount?.id
                const label = account.account_type ? (ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type) : null
                return (
                  <button
                    key={account.id}
                    onClick={() => { setActiveAccount(account); setAccountPickerOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 active:bg-white/5 transition-colors"
                    style={{ background: isActive ? 'rgba(255,130,16,0.1)' : 'transparent' }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: isActive ? 'rgba(255,130,16,0.25)' : 'rgba(255,255,255,0.12)',
                        color: isActive ? 'var(--brand-blue)' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {account.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[12px] font-medium truncate" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                        {account.name}
                      </div>
                      {label && (
                        <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                      )}
                    </div>
                    {isActive && <Check className="h-3 w-3 shrink-0" style={{ color: 'var(--brand-blue)' }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
              <div className="relative shrink-0">
                <item.icon className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.6)' }} />
                {/* Pulsing attention dot for Anleitung when not completed */}
                {item.isAnleitung && showAnleitungDot && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                    style={{ background: 'var(--brand-blue)', boxShadow: '0 0 4px var(--brand-blue)' }}
                  />
                )}
              </div>
              <span className="flex-1 text-[14px] font-medium" style={{ color: '#fff' }}>
                {item.label}
              </span>
              {/* Anleitung progress badge */}
              {item.isAnleitung ? (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: anleitungProgress.percent === 100
                      ? 'rgba(34,197,94,0.15)'
                      : 'rgba(41,98,255,0.15)',
                    color: anleitungProgress.percent === 100
                      ? 'rgb(134,239,172)'
                      : 'var(--brand-blue)',
                  }}
                >
                  {anleitungProgress.read.length}/{anleitungProgress.total}
                </span>
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              )}
            </Link>
          ))}

          <div className="mx-3 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />

          <Link
            href="/about"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg active:bg-white/5"
            style={{ minHeight: 44 }}
          >
            <Info className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />
            <span className="flex-1 text-[14px] font-medium" style={{ color: '#fff' }}>
              Über NOUS
            </span>
          </Link>
        </div>

        {/* Logout — small/subtle */}
        <div className="px-3 pt-1 pb-5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={async () => { onClose(); await logout() }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg w-full active:bg-white/5"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,80,80,0.65)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'rgba(255,80,80,0.75)' }}>
              Abmelden
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
