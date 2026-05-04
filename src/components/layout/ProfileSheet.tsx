'use client'

import Link from 'next/link'
import { Settings, Wallet, Info, LogOut, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/contexts/AccountContext'

interface Props {
  open: boolean
  onClose: () => void
}

export function ProfileSheet({ open, onClose }: Props) {
  const { user, logout } = useAuth()
  const { activeAccount } = useAccountContext()

  const initial = activeAccount?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

  async function handleLogout() {
    onClose()
    await logout()
  }

  const menuItems = [
    { href: '/einstellungen',             icon: Settings, label: 'Einstellungen' },
    { href: '/einstellungen?tab=konten',  icon: Wallet,   label: 'Konten'        },
    { href: '/about',                     icon: Info,     label: 'Über NOUS'     },
  ]

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-2xl border-0 focus:outline-none"
        style={{ background: '#111111', maxHeight: '70vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Profile header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: 'rgba(41,98,255,0.18)', color: 'var(--brand-blue)' }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold truncate" style={{ color: '#fff' }}>
              {activeAccount?.name ?? 'Kein Konto'}
            </p>
            <p className="text-[12px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {user?.email ?? ''}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="px-4 py-2 space-y-0.5">
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3.5 rounded-xl"
              style={{ minHeight: 48 }}
            >
              <item.icon className="h-5 w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }} />
              <span className="flex-1 text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </Link>
          ))}
        </div>

        {/* Logout */}
        <div className="px-4 pb-8">
          <div className="h-px mb-2" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3.5 rounded-xl w-full"
            style={{ minHeight: 48 }}
          >
            <LogOut className="h-5 w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <span className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Abmelden
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
