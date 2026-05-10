'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, BookOpen, TrendingUp, ShieldCheck, MoreHorizontal,
  Brain, CalendarDays, ClipboardList, GraduationCap, Star, Map as MapIcon,
  Telescope, Settings, LogOut, Users, BookMarked as KbIcon, Info,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AccountSwitcher } from '@/components/accounts/AccountSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const PRIMARY_TABS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/journal',     label: 'Journal',      icon: BookOpen },
  { href: '/performance', label: 'Performance',  icon: TrendingUp },
  { href: '/risk',        label: 'Risk',         icon: ShieldCheck },
] as const

const MEHR_ITEMS = [
  { href: '/analysen',           label: 'Analysen',           icon: Brain },
  { href: '/kalender',           label: 'Kalender',           icon: CalendarDays },
  { href: '/tagesplan',          label: 'Tagesplan',          icon: ClipboardList },
  { href: '/lernmodus',          label: 'Lernen',             icon: GraduationCap },
  { href: '/watchlist',          label: 'Watchlist',          icon: Star },
  { href: '/roadmap',            label: 'Roadmap',            icon: MapIcon },
  { href: '/wochenvorbereitung', label: 'Wochenvorbereitung', icon: Telescope },
  { href: '/einstellungen',      label: 'Einstellungen',      icon: Settings },
  { href: '/einstellungen?tab=konten', label: 'Konten verwalten', icon: Users },
  { href: '/knowledge-base',     label: 'Knowledge Base',     icon: KbIcon },
  { href: '/about',              label: 'Über NOUS',          icon: Info },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isMehrActive = MEHR_ITEMS.some(
    item => pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/')
  )

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: '#111111',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          height: 'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {PRIMARY_TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          )
        })}

        {/* Mehr tab */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
          style={{ color: isMehrActive ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Mehr</span>
        </button>
      </nav>

      {/* Mehr Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-2xl"
          style={{ background: '#111111', border: 'none', maxHeight: '80vh' }}
        >
          <div className="overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Nav items */}
            <div className="px-4 pt-2 pb-2 space-y-0.5">
              {MEHR_ITEMS.map(item => {
                const base = item.href.split('?')[0]
                const isActive = pathname === base || pathname.startsWith(base + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-medium transition-colors',
                    )}
                    style={{
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      minHeight: '44px',
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)' }} />
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* Divider */}
            <div className="mx-4 my-2" style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

            {/* Account switcher */}
            <div className="px-6 pb-2">
              <AccountSwitcher />
            </div>

            {/* Logout */}
            <div className="px-4 pb-4">
              <button
                onClick={() => { setDrawerOpen(false); logout() }}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-medium w-full transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)', minHeight: '44px' }}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Abmelden
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
