'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, TrendingUp, ShieldCheck, MoreHorizontal,
  Brain, CalendarDays, ClipboardList, GraduationCap, Star, Map as MapIcon,
  Telescope, Settings, LogOut, Users, BookMarked as KbIcon, Info, GripVertical,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AccountSwitcher } from '@/components/accounts/AccountSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const ALL_NAV_ITEMS = [
  { id: 'dashboard',          href: '/dashboard',          label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'journal',            href: '/journal',            label: 'Journal',             icon: BookOpen },
  { id: 'performance',        href: '/performance',        label: 'Performance',         icon: TrendingUp },
  { id: 'risk',               href: '/risk',               label: 'Risk',                icon: ShieldCheck },
  { id: 'analysen',           href: '/analysen',           label: 'Analysen',            icon: Brain },
  { id: 'kalender',           href: '/kalender',           label: 'Kalender',            icon: CalendarDays },
  { id: 'tagesplan',          href: '/tagesplan',          label: 'Tagesplan',           icon: ClipboardList },
  { id: 'lernmodus',          href: '/lernmodus',          label: 'Lernen',              icon: GraduationCap },
  { id: 'watchlist',          href: '/watchlist',          label: 'Watchlist',           icon: Star },
  { id: 'roadmap',            href: '/roadmap',            label: 'Roadmap',             icon: MapIcon },
  { id: 'wochenvorbereitung', href: '/wochenvorbereitung', label: 'Wochenvorbereitung',  icon: Telescope },
  { id: 'einstellungen',      href: '/einstellungen',      label: 'Einstellungen',       icon: Settings },
  { id: 'konten',             href: '/einstellungen?tab=konten', label: 'Konten',        icon: Users },
  { id: 'knowledge-base',     href: '/knowledge-base',     label: 'Knowledge Base',      icon: KbIcon },
  { id: 'about',              href: '/about',              label: 'Über NOUS',           icon: Info },
]

const DEFAULT_PRIMARY = ['dashboard', 'journal', 'performance', 'risk']
const STORAGE_KEY = 'nous-bottom-nav-tabs'

function loadPrimaryIds(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PRIMARY
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as string[]
      if (Array.isArray(parsed) && parsed.length === 4) return parsed
    }
  } catch {}
  return DEFAULT_PRIMARY
}

export function BottomNav() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [primaryIds, setPrimaryIds] = useState<string[]>(DEFAULT_PRIMARY)

  useEffect(() => {
    setPrimaryIds(loadPrimaryIds())
  }, [])

  const primaryTabs = primaryIds
    .map(id => ALL_NAV_ITEMS.find(i => i.id === id))
    .filter(Boolean) as typeof ALL_NAV_ITEMS

  const mehrItems = ALL_NAV_ITEMS.filter(i => !primaryIds.includes(i.id))

  const isMehrActive = mehrItems.some(
    item => pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/')
  )

  // Swipe-to-close
  const touchStartY = useRef<number | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }, [])
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 80) {
      setDrawerOpen(false)
      touchStartY.current = null
    }
  }, [])

  function togglePrimary(id: string) {
    setPrimaryIds(prev => {
      let next: string[]
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev
        next = prev.filter(x => x !== id)
      } else {
        if (prev.length >= 4) next = [...prev.slice(1), id]
        else next = [...prev, id]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: '#111111',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 'calc(56px + env(safe-area-inset-bottom))',
        }}
      >
        {primaryTabs.map(tab => {
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
          style={{
            background: '#111111',
            border: 'none',
            maxHeight: '82vh',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>

          {/* Swipe handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(82vh - 32px)' }}>
            {/* Edit / Done header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-1">
              <span className="text-[13px] font-semibold text-white/40 uppercase tracking-wider">Navigation</span>
              <button
                onClick={() => setEditMode(e => !e)}
                className="text-[13px] font-medium"
                style={{ color: editMode ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
              >
                {editMode ? 'Fertig' : 'Anpassen'}
              </button>
            </div>

            {editMode ? (
              /* Edit mode: show all items with toggle */
              <div className="px-4 pt-1 pb-2 space-y-0.5">
                <p className="text-[12px] px-3 pb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Wähle bis zu 4 Tabs für die untere Leiste.
                </p>
                {ALL_NAV_ITEMS.filter(i => i.id !== 'konten').map(item => {
                  const isSelected = primaryIds.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => togglePrimary(item.id)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left transition-colors"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                        minHeight: '44px',
                      }}
                    >
                      <item.icon className="h-5 w-5 shrink-0" style={{ color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)' }} />
                      <span className="flex-1 text-[15px] font-medium" style={{ color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)' }}>
                        {item.label}
                      </span>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)',
                          background: isSelected ? '#ffffff' : 'transparent',
                        }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              /* Normal mode: show remaining items */
              <div className="px-4 pt-1 pb-2 space-y-0.5">
                {mehrItems.filter(i => i.id !== 'konten').map(item => {
                  const base = item.href.split('?')[0]
                  const isActive = pathname === base || pathname.startsWith(base + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-[15px] font-medium transition-colors"
                      style={{
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                        background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                        minHeight: '44px',
                        display: 'flex',
                      }}
                    >
                      <item.icon className="h-5 w-5 shrink-0" style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)' }} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}

            <div className="mx-4 my-2" style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

            <div className="px-6 pb-2">
              <AccountSwitcher />
            </div>

            <div className="px-4 pb-6">
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
