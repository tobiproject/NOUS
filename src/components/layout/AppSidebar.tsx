'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard, BookOpen, TrendingUp, Brain, ShieldCheck,
  CalendarDays, ClipboardList, GraduationCap,
  Plus, GripVertical, Star, Map as MapIcon, Telescope,
} from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/contexts/AccountContext'
import { useWatchlist } from '@/hooks/useWatchlist'
import { ProfileSidebar } from '@/components/layout/ProfileSidebar'
import { cn } from '@/lib/utils'

type NavItem =
  | { id: string; href: string; label: string; icon: React.ElementType; kbd: string | null; tooltip: string; isDivider?: false }
  | { id: string; isDivider: true; href?: never; label?: never; icon?: never; kbd?: never; tooltip?: never }

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',          href: '/dashboard',          label: 'Dashboard',          icon: LayoutDashboard, kbd: 'G D', tooltip: 'Deine wichtigsten KPIs, offene Trades und tägliche Zusammenfassung' },
  { id: 'journal',            href: '/journal',            label: 'Journal',            icon: BookOpen,        kbd: 'G J', tooltip: 'Trades erfassen, bearbeiten und mit KI analysieren lassen' },
  { id: 'performance',        href: '/performance',        label: 'Performance',        icon: TrendingUp,      kbd: 'G P', tooltip: 'Statistiken, Equity-Kurve, Win-Rate und Setup-Auswertung' },
  { id: 'divider-1',          isDivider: true },
  { id: 'analysen',           href: '/analysen',           label: 'Analysen',           icon: Brain,           kbd: 'G A', tooltip: 'KI-generierte Muster und Verhaltensanalysen aus deinem Journal' },
  { id: 'risk',               href: '/risk',               label: 'Risk',               icon: ShieldCheck,     kbd: 'G R', tooltip: 'Risiko-Regeln, Max-Drawdown, Tageslimit und Prop-Firm-Grenzen' },
  { id: 'divider-2',          isDivider: true },
  { id: 'wochenvorbereitung', href: '/wochenvorbereitung', label: 'Wochenvorbereitung', icon: Telescope,       kbd: null,  tooltip: 'Ziele für die Woche setzen, Fokus-Assets wählen und Events tracken' },
  { id: 'kalender',           href: '/kalender',           label: 'Kalender',           icon: CalendarDays,    kbd: null,  tooltip: 'Wirtschaftskalender und High-Impact-Events in deiner Zeitzone' },
  { id: 'tagesplan',          href: '/tagesplan',          label: 'Tagesplan',          icon: ClipboardList,   kbd: null,  tooltip: 'Tägliche Routine: Pre-Market Checklist, Fokus-Assets und Tagesnotizen' },
  { id: 'divider-3',          isDivider: true },
  { id: 'lernmodus',          href: '/lernmodus',          label: 'Lernen',             icon: GraduationCap,   kbd: null,  tooltip: 'Quiz, Chart-Replay und KI-Coach zum Verbessern deiner Entscheidungen' },
  { id: 'watchlist',          href: '/watchlist',          label: 'Watchlist',          icon: Star,            kbd: null,  tooltip: 'Deine gehandelten Assets mit Kontraktwerten für die Risikoberechnung' },
  { id: 'roadmap',            href: '/roadmap',            label: 'Roadmap',            icon: MapIcon,         kbd: null,  tooltip: 'Deine Trader-Journey: Level, Stärken/Schwächen und nächste Schritte' },
]

const STORAGE_KEY = 'nous-sidebar-order'

function loadOrder(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveOrder(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {}
}

function applyOrder(items: NavItem[], order: string[]) {
  if (!order.length) return items
  const map = new Map(items.map(i => [i.id, i]))
  const ordered = order.flatMap(id => {
    const item = map.get(id)
    return item ? [item] : []
  })
  const known = new Set(order)
  items.forEach(i => { if (!known.has(i.id)) ordered.push(i) })
  return ordered
}

function SortableDivider({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="group flex items-center gap-1 px-2 py-0.5 cursor-grab active:cursor-grabbing"
      suppressHydrationWarning
      {...attributes}
      {...listeners}
    >
      <div className="flex-1 h-px" style={{ background: 'var(--border-raw)' }} />
      <GripVertical className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" style={{ color: 'var(--fg-4)' }} />
    </div>
  )
}

interface NavItemProps {
  item: Extract<NavItem, { isDivider?: false }>
  isActive: boolean
  hasTodayPlan?: boolean
  hasWatchlistItems?: boolean
  hasWeeklyPrepReminder?: boolean
  showTooltips?: boolean
}

function SortableNavItem({ item, isActive, hasTodayPlan, hasWatchlistItems, hasWeeklyPrepReminder, showTooltips }: NavItemProps) {
  const [hovered, setHovered] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const showTagesplanDot = item.id === 'tagesplan' && hasTodayPlan
  const showWeeklyPrepDot = item.id === 'wochenvorbereitung' && hasWeeklyPrepReminder
  const watchlistActive = item.id === 'watchlist' && hasWatchlistItems

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle — only visible on hover */}
      <button
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        tabIndex={-1}
        className="flex items-center justify-center w-4 h-6 shrink-0 cursor-grab active:cursor-grabbing ml-1"
        style={{
          color: 'var(--fg-4)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 100ms',
        }}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      <Tooltip delayDuration={600}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              'flex flex-1 items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors duration-100',
              isActive ? 'font-semibold' : 'font-medium'
            )}
            style={{
              background: isActive ? 'var(--bg-3)' : hovered ? 'var(--bg-3)' : 'transparent',
              color: isActive ? 'var(--fg-1)' : 'var(--fg-2)',
            }}
          >
            <item.icon
              className="h-4 w-4 shrink-0"
              style={watchlistActive ? { color: '#F59E0B', fill: '#F59E0B' } : undefined}
            />
            <span className="flex-1">{item.label}</span>

            {showTagesplanDot && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--long)' }}
              />
            )}
            {showWeeklyPrepDot && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--warn)' }}
              />
            )}
          </Link>
        </TooltipTrigger>
        {showTooltips && item.tooltip && (
          <TooltipContent side="right" className="max-w-[220px] text-xs">
            {item.tooltip}
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { activeAccount } = useAccountContext()
  const [navItems, setNavItems] = useState(DEFAULT_NAV_ITEMS)
  const [hasTodayPlan, setHasTodayPlan] = useState(false)
  const [hasWeeklyPrepReminder, setHasWeeklyPrepReminder] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { items: watchlistItems } = useWatchlist(activeAccount?.id)
  const hasWatchlistItems = watchlistItems.length > 0

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setDisplayName(d.display_name ?? null)
        setAvatarUrl(d.avatar_url ?? null)
      })
      .catch(() => {})
  }, [])

  // Restore saved order from localStorage (client-side only)
  useEffect(() => {
    const order = loadOrder()
    if (order.length) setNavItems(applyOrder(DEFAULT_NAV_ITEMS, order))
  }, [])

  useEffect(() => {
    function check() {
      const day = new Date().getDay()
      if (day !== 0 && day !== 6) { setHasWeeklyPrepReminder(false); return }
      const today = new Date()
      const next = new Date(today)
      next.setDate(today.getDate() + (day === 0 ? 1 : 2))
      const key = `nous-weekly-prep-done-${next.toISOString().split('T')[0]}`
      setHasWeeklyPrepReminder(localStorage.getItem(key) !== '1')
    }
    check()
    window.addEventListener('weekly-prep-changed', check)
    return () => window.removeEventListener('weekly-prep-changed', check)
  }, [])

  // Green dot on Tagesplan = morning briefing fully completed today
  useEffect(() => {
    const check = () => {
      const today = new Date().toISOString().split('T')[0]
      setHasTodayPlan(!!localStorage.getItem(`nous-morning-${today}`))
    }
    check()
    const interval = setInterval(check, 10_000)
    return () => clearInterval(interval)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setNavItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      saveOrder(next.map(i => i.id))
      return next
    })
  }, [])

  return (
    <>
    {/* ── Collapsed sidebar (tablet 768–1023px) ── */}
    <aside
      className="hidden md:flex lg:hidden w-14 shrink-0 flex-col h-screen sticky top-0 items-center"
      style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border-raw)' }}
    >
      {/* Logo mark */}
      <div className="flex items-center justify-center py-4">
        <Image src="/logo/nous-mark-white.svg" alt="NOUS" width={20} height={20} priority />
      </div>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto w-full px-1">
        <TooltipProvider>
          {navItems.map(item => {
            if (item.isDivider) {
              return <div key={item.id} className="w-6 my-1" style={{ height: '1px', background: 'var(--border-raw)' }} />
            }
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Tooltip key={item.id} delayDuration={300}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className="flex items-center justify-center w-10 h-10 rounded transition-colors duration-100"
                    style={{
                      background: isActive ? 'var(--bg-3)' : 'transparent',
                      color: isActive ? 'var(--fg-1)' : 'var(--fg-3)',
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </nav>

      {/* Bottom: avatar only */}
      <div className="flex flex-col items-center pb-3 pt-2 w-full px-1" style={{ borderTop: '1px solid var(--border-raw)' }}>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded transition-colors duration-100"
                style={{ background: 'transparent' }}
              >
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.16)', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-blue)' }}>
                      {(displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
                    </span>
                  )}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Profil & Einstellungen</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>

    {/* ── Full sidebar (desktop ≥1024px) ── */}
    <aside
      className="w-56 shrink-0 hidden lg:flex flex-col h-screen sticky top-0"
      style={{
        background: 'var(--bg-1)',
        borderRight: '1px solid var(--border-raw)',
      }}
    >
      {/* Logo */}
      <div className="px-4 py-4 pb-3">
        <Image
          src="/logo/nous-logo-slogan.svg"
          alt="NOUS — Turn data into decisions"
          width={130}
          height={41}
          priority
        />
      </div>

      {/* Log trade CTA */}
      <div className="px-3 pb-3">
        <Button
          asChild
          className="w-full justify-start gap-2 h-8 text-[13px] font-semibold rounded"
          style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
        >
          <Link href="/journal?new=1">
            <Plus className="h-3.5 w-3.5" />
            Log trade
          </Link>
        </Button>
      </div>

      {/* Navigation — draggable */}
      <nav className="flex-1 flex flex-col gap-0 px-1 overflow-y-auto">
        <TooltipProvider>
          <DndContext id="sidebar-dnd" sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={navItems.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {navItems.map(item => {
                if (item.isDivider) {
                  return <SortableDivider key={item.id} id={item.id} />
                }
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SortableNavItem
                    key={item.id}
                    item={item}
                    isActive={isActive}
                    hasTodayPlan={hasTodayPlan}
                    hasWatchlistItems={hasWatchlistItems}
                    hasWeeklyPrepReminder={hasWeeklyPrepReminder}
                    showTooltips
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </TooltipProvider>
      </nav>

      {/* Bottom: profile row only — all settings + logout live inside ProfileSidebar */}
      <div
        className="mt-auto px-2 pb-3 pt-2"
        style={{ borderTop: '1px solid var(--border-raw)' }}
      >
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2.5 px-2 py-2 rounded w-full text-left transition-colors duration-100"
          style={{ background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <div
            style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.16)',
              color: 'var(--brand-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {(displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--fg-1)' }}>
              {displayName ?? user?.email ?? 'Profil'}
            </div>
            {activeAccount && (
              <div className="text-[11px] truncate" style={{ color: 'var(--fg-3)' }}>
                {activeAccount.name}
              </div>
            )}
          </div>
        </button>
      </div>
    </aside>

    <ProfileSidebar
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      displayName={displayName}
      avatarUrl={avatarUrl}
    />
    </>
  )
}
