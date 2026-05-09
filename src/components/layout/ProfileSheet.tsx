'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, Info, LogOut, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/contexts/AccountContext'

interface Props {
  open: boolean
  onClose: () => void
  displayName?: string | null
  avatarUrl?: string | null
}

export function ProfileSheet({ open, onClose, displayName, avatarUrl }: Props) {
  const { user, logout } = useAuth()
  const { activeAccount } = useAccountContext()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const initial = displayName?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? '?'

  const menuItems = [
    { href: '/einstellungen?tab=profil', icon: User, label: 'Mein Profil' },
    { href: '/about',                    icon: Info, label: 'Über NOUS'   },
  ]

  return (
    <>
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
              className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 overflow-hidden"
              style={{ background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.18)', color: 'var(--brand-blue)' }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : initial}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold truncate" style={{ color: '#fff' }}>
                {displayName ?? activeAccount?.name ?? 'Kein Konto'}
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
              onClick={() => setConfirmOpen(true)}
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abmelden?</AlertDialogTitle>
            <AlertDialogDescription>
              Du wirst aus deinem Konto abgemeldet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                onClose()
                await logout()
              }}
            >
              Abmelden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
