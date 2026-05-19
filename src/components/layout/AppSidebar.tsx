'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard, BookOpen, TrendingUp, Brain, ShieldCheck,
  CalendarDays, ClipboardList, GraduationCap,
  ListChecks, Star, Map as MapIcon, Telescope, Settings, RefreshCw, Sparkles, Workflow,
  ChevronRight, BookMarked, ChevronDown,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/contexts/AccountContext'
import { useWorkflowProgress } from '@/hooks/useWorkflowProgress'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import { getAnleitungProgress, fetchProgressFromServer, setProgressFromServer } from '@/lib/anleitung-progress'
import { getCurrentChangelog } from '@/lib/changelog'
import { cn } from '@/lib/utils'

const CURRENT = getCurrentChangelog()
const RELEASE_VERSION = process.env.NEXT_PUBLIC_RELEASE_VERSION ?? CURRENT.version

type NavItemDef = {
  id: string
  href: string
  label: string
  icon: React.ElementType
  tooltip: string
}

const NAV_ITEMS: Record<string, NavItemDef> = {
  dashboard:          { id: 'dashboard',          href: '/dashboard',          label: 'Dashboard',          icon: LayoutDashboard, tooltip: 'Deine wichtigsten KPIs und tägliche Zusammenfassung' },
  workflow:           { id: 'workflow',           href: '/workflow',           label: 'Tages-Workflow',     icon: Workflow,        tooltip: 'Dein täglicher Roter Faden durch die Trading-Woche' },
  journal:            { id: 'journal',            href: '/journal',            label: 'Journal',            icon: BookOpen,        tooltip: 'Trades erfassen, bearbeiten und mit KI analysieren' },
  tagesplan:          { id: 'tagesplan',          href: '/tagesplan',          label: 'Tagesplan',          icon: ClipboardList,   tooltip: 'Pre-Market Checklist, Fokus-Assets und Tagesnotizen' },
  watchlist:          { id: 'watchlist',          href: '/watchlist',          label: 'Watchlist',          icon: Star,            tooltip: 'Deine Assets mit Kontraktwerten für die Risikoberechnung' },
  wochenvorbereitung: { id: 'wochenvorbereitung', href: '/wochenvorbereitung', label: 'Wochenvorbereitung', icon: Telescope,       tooltip: 'Ziele für die Woche setzen und Events tracken' },
  kalender:           { id: 'kalender',           href: '/kalender',           label: 'Kalender',           icon: CalendarDays,    tooltip: 'Wirtschaftskalender und High-Impact-Events' },
  performance:        { id: 'performance',        href: '/performance',        label: 'Performance',        icon: TrendingUp,      tooltip: 'Statistiken, Equity-Kurve, Win-Rate und Setup-Auswertung' },
  analysen:           { id: 'analysen',           href: '/analysen',           label: 'KI-Analysen',        icon: Brain,           tooltip: 'KI-generierte Muster und Verhaltensanalysen' },
  risk:               { id: 'risk',               href: '/risk',               label: 'Risiko',             icon: ShieldCheck,     tooltip: 'Risk-Regeln, Max-Drawdown und Prop-Firm-Grenzen' },
  roadmap:            { id: 'roadmap',            href: '/roadmap',            label: 'Trader Journey',     icon: MapIcon,         tooltip: 'Level, Stärken/Schwächen und nächste Schritte' },
  lernmodus:          { id: 'lernmodus',          href: '/lernmodus',          label: 'Lernen',             icon: GraduationCap,   tooltip: 'Quiz, Chart-Replay und KI-Coach' },
  anleitung:          { id: 'anleitung',          href: '/anleitung',          label: 'Anleitung',          icon: BookMarked,      tooltip: 'Schritt-für-Schritt Erklärung aller Features' },
}

const NAV_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'TRADING',      ids: ['dashboard', 'workflow', 'journal'] },
  { label: 'VORBEREITUNG', ids: ['tagesplan', 'watchlist', 'wochenvorbereitung', 'kalender'] },
  { label: 'AUSWERTUNG',   ids: ['performance', 'analysen', 'risk'] },
  { label: 'MEHR',         ids: ['roadmap', 'lernmodus', 'anleitung'] },
]

// ── Workflow ring ──────────────────────────────────────────────────────────

function lerpColor(a: [number,number,number], b: [number,number,number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

function ringColor(pct: number): string {
  const red:   [number,number,number] = [242, 54,  69]
  const blue:  [number,number,number] = [41,  98,  255]
  const green: [number,number,number] = [8,   153, 129]
  if (pct <= 0.5) return lerpColor(red, blue, pct * 2)
  return lerpColor(blue, green, (pct - 0.5) * 2)
}

function WorkflowRing({ done, total, size = 20 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 2
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const offset = circ * (1 - pct)
  const color = pct === 0 ? 'rgba(255,255,255,0.12)' : ringColor(pct)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
      />
    </svg>
  )
}

// ── Nav item ───────────────────────────────────────────────────────────────

interface NavItemProps {
  item: NavItemDef
  isActive: boolean
  dot?: { color: string; pulse?: boolean }
  fillIcon?: boolean
}

function NavItemRow({ item, isActive, dot, fillIcon }: NavItemProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2.5 px-3 py-[6px] rounded-lg text-[13px] font-medium transition-colors"
      style={{
        background: isActive
          ? 'rgba(255,255,255,0.07)'
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: isActive ? '#ffffff' : hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <item.icon
        className="h-[15px] w-[15px] shrink-0"
        style={{
          color: isActive ? '#00C4FF' : fillIcon ? '#F59E0B' : 'inherit',
          fill: fillIcon ? '#F59E0B' : undefined,
        }}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {dot && (
        <span
          className={cn('w-[5px] h-[5px] rounded-full shrink-0', dot.pulse && 'animate-pulse')}
          style={{ background: dot.color }}
        />
      )}
    </Link>
  )
}

// ── Collapsible section ────────────────────────────────────────────────────

function NavSection({
  label,
  ids,
  pathname,
  getDot,
  hasWatchlistItems,
  storageKey,
}: {
  label: string
  ids: string[]
  pathname: string
  getDot: (id: string) => NavItemProps['dot']
  hasWatchlistItems: boolean
  storageKey: string
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(storageKey)
    return stored === null ? true : stored === '1'
  })

  const toggle = () => {
    setOpen(v => {
      const next = !v
      localStorage.setItem(storageKey, next ? '1' : '0')
      return next
    })
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full px-3 py-1.5 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.03)]"
      >
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <ChevronDown
          className="h-3 w-3 transition-transform duration-200"
          style={{ color: 'rgba(255,255,255,0.2)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>

      {open && (
        <div
          className="mt-0.5 ml-3 pl-3 flex flex-col gap-0.5"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        >
          {ids.map(id => {
            const item = NAV_ITEMS[id]
            if (!item) return null
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <NavItemRow
                key={id}
                item={item}
                isActive={isActive}
                dot={getDot(id)}
                fillIcon={id === 'watchlist' && hasWatchlistItems}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Collapsed icon-only nav ────────────────────────────────────────────────

function CollapsedNav({
  pathname,
  getDot,
  hasWatchlistItems,
}: {
  pathname: string
  getDot: (id: string) => NavItemProps['dot']
  hasWatchlistItems: boolean
}) {
  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-0.5 px-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={cn('w-full flex flex-col items-center gap-0.5', gi > 0 && 'mt-2 pt-2', gi > 0 && 'border-t border-[rgba(255,255,255,0.06)]')}>
            {group.ids.map(id => {
              const item = NAV_ITEMS[id]
              if (!item) return null
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const dot = getDot(id)
              return (
                <Tooltip key={id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className="relative flex items-center justify-center w-10 h-9 rounded-lg transition-colors"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: isActive ? '#00C4FF' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <item.icon className="h-[17px] w-[17px]"
                        style={id === 'watchlist' && hasWatchlistItems ? { color: '#F59E0B' } : undefined}
                      />
                      {dot && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: dot.color }} />}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}

// ── Main sidebar ───────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { accounts, activeAccount, setActiveAccount } = useAccountContext()
  const [hasTodayPlan, setHasTodayPlan] = useState(false)
  const [hasWeeklyPrepReminder, setHasWeeklyPrepReminder] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [hasWatchlistItems, setHasWatchlistItems] = useState(false)
  const [strategies, setStrategies] = useState<{ id: string; name: string }[]>([])
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [strategyMenuOpen, setStrategyMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const strategyMenuRef = useRef<HTMLDivElement>(null)
  const update = useVersionCheck()
  const { data: workflowData } = useWorkflowProgress(activeAccount?.id)

  useEffect(() => {
    fetchProgressFromServer().then(serverSections => {
      if (serverSections.length === 0) return
      const local = getAnleitungProgress().read
      const merged = Array.from(new Set([...local, ...serverSections]))
      if (merged.length !== local.length) setProgressFromServer(merged)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setHasWatchlistItems(localStorage.getItem('nous-watchlist-has-items') === '1')
    const handle = (e: Event) => {
      setHasWatchlistItems((e as CustomEvent<{ hasItems: boolean }>).detail.hasItems)
    }
    window.addEventListener('watchlist-changed', handle)
    return () => window.removeEventListener('watchlist-changed', handle)
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setDisplayName(d.display_name ?? null)
        setAvatarUrl(d.avatar_url ?? null)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeAccount?.id) return
    setActiveStrategyId(localStorage.getItem(`nous-active-strategy-${activeAccount.id}`))
    fetch(`/api/strategy?account_id=${activeAccount.id}`)
      .then(r => r.json())
      .then(d => setStrategies(d.strategies ?? []))
      .catch(() => {})
    function onChanged(e: Event) {
      setActiveStrategyId((e as CustomEvent<{ strategyId: string }>).detail.strategyId)
    }
    window.addEventListener('nous-strategy-changed', onChanged)
    return () => window.removeEventListener('nous-strategy-changed', onChanged)
  }, [activeAccount?.id])

  useEffect(() => {
    if (!accountMenuOpen) return
    function handleOutside(e: MouseEvent) {
      if (!accountMenuRef.current?.contains(e.target as Node)) setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [accountMenuOpen])

  useEffect(() => {
    if (!strategyMenuOpen) return
    function handleOutside(e: MouseEvent) {
      if (!strategyMenuRef.current?.contains(e.target as Node)) setStrategyMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [strategyMenuOpen])

  function selectStrategy(id: string) {
    if (!activeAccount?.id) return
    localStorage.setItem(`nous-active-strategy-${activeAccount.id}`, id)
    setActiveStrategyId(id)
    setStrategyMenuOpen(false)
    window.dispatchEvent(new CustomEvent('nous-strategy-changed', { detail: { strategyId: id } }))
  }

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

  useEffect(() => {
    function check() {
      const today = new Date().toISOString().split('T')[0]
      setHasTodayPlan(!!localStorage.getItem(`nous-morning-${today}`))
    }
    check()
    const interval = setInterval(check, 10_000)
    return () => clearInterval(interval)
  }, [])

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('nous-sidebar-collapsed') === '1'
  })

  const toggleCollapsed = () => {
    setCollapsed(v => {
      const next = !v
      localStorage.setItem('nous-sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  const strategyName = useMemo(() => {
    if (!strategies.length) return null
    const found = activeStrategyId ? strategies.find(s => s.id === activeStrategyId) : null
    return (found ?? strategies[0])?.name ?? null
  }, [strategies, activeStrategyId])

  const showSettingsDot = !!(update || hasWeeklyPrepReminder)
  const initial = (displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
  const settingsActive = pathname.startsWith('/einstellungen')

  const workflowDoneIds = new Set(
    (workflowData?.steps ?? []).filter(s => s.done).map(s => {
      if (s.id === 'trade_logged' || s.id === 'trade_analyzed') return 'journal'
      if (s.id === 'briefing' || s.id === 'tagesplan') return 'tagesplan'
      return s.id
    })
  )

  function getDot(id: string): NavItemProps['dot'] {
    if (id === 'wochenvorbereitung' && hasWeeklyPrepReminder) return { color: '#ff8210', pulse: true }
    if (workflowDoneIds.has(id)) return { color: '#2962FF' }
    if (id === 'tagesplan' && hasTodayPlan) return { color: '#2962FF' }
    return undefined
  }

  const workflowPct = workflowData ? Math.round((workflowData.done_count / workflowData.total) * 100) : 0

  const sidebarBg = 'var(--bg-2)'

  return (
    <>
      {/* ── Tablet: icon-only sidebar (md–lg) ── */}
      <aside
        className="hidden md:flex lg:hidden w-14 shrink-0 flex-col h-screen sticky top-0 items-center"
        style={{ background: sidebarBg, borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-center py-4">
          <Image src="/logo/nous-mark-white.svg" alt="NOUS" width={20} height={20} priority />
        </div>
        {workflowData && (
          <Link href="/workflow" title="Tages-Workflow" className="flex items-center justify-center pb-3">
            <WorkflowRing done={workflowData.done_count} total={workflowData.total} />
          </Link>
        )}
        <nav className="flex-1 overflow-y-auto w-full py-1">
          <CollapsedNav pathname={pathname} getDot={getDot} hasWatchlistItems={hasWatchlistItems} />
        </nav>
        <div className="pb-3 w-full px-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Link
                  href="/einstellungen"
                  className="relative flex items-center justify-center w-10 h-9 rounded-lg mx-auto transition-colors"
                  style={{
                    background: settingsActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                    color: settingsActive ? '#00C4FF' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <Settings className="h-[17px] w-[17px]" />
                  {showSettingsDot && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2962FF' }} />}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Einstellungen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      {/* ── Desktop: full sidebar (≥lg) ── */}
      <aside
        className="relative shrink-0 hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden group/sidebar"
        style={{
          background: sidebarBg,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          width: collapsed ? 56 : 224,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header: Logo + collapse */}
        <div
          className="flex items-center justify-between px-4 shrink-0"
          style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {collapsed ? (
            <div className="flex items-center justify-center w-full">
              <Image src="/logo/nous-mark-white.svg" alt="NOUS" width={20} height={20} priority />
            </div>
          ) : (
            <>
              <Image src="/logo/nous-logo-full.svg" alt="NOUS" width={110} height={34} priority style={{ filter: 'brightness(0) invert(1)' }} />
              <button
                onClick={toggleCollapsed}
                className="flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
                title="Sidebar einklappen"
              >
                <ChevronDown className="h-3.5 w-3.5" style={{ transform: 'rotate(90deg)' }} />
              </button>
            </>
          )}
        </div>

        {/* Collapsed: expand button */}
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center h-8 w-8 rounded-lg mx-auto mt-2 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
            title="Sidebar ausklappen"
          >
            <ChevronDown className="h-3.5 w-3.5" style={{ transform: 'rotate(-90deg)' }} />
          </button>
        )}

        {/* Account + Strategy selectors */}
        {!collapsed && activeAccount && (
          <div className="px-3 py-2 shrink-0 space-y-0.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Konto */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => accounts.length > 1 && setAccountMenuOpen(v => !v)}
                className="flex items-center gap-1.5 w-full text-left rounded-lg px-2 py-1.5 transition-colors"
                style={{ cursor: accounts.length > 1 ? 'pointer' : 'default', background: accountMenuOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onMouseEnter={e => { if (accounts.length > 1) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!accountMenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>Konto</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeAccount.name}
                </span>
                {accounts.length > 1 && (
                  <ChevronDown className="h-3 w-3 shrink-0" style={{ color: 'rgba(255,255,255,0.3)', transform: accountMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                )}
              </button>
              {accountMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 rounded-xl overflow-hidden w-full" style={{ background: 'var(--bg-3)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'var(--elev-2)' }}>
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => { setActiveAccount(acc); setAccountMenuOpen(false) }}
                      className="w-full flex items-center px-3 py-2 text-xs text-left transition-colors"
                      style={{ color: acc.id === activeAccount.id ? '#00C4FF' : 'rgba(255,255,255,0.6)', fontWeight: acc.id === activeAccount.id ? 600 : 400 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Strategie */}
            <div className="relative" ref={strategyMenuRef}>
              <button
                onClick={() => strategies.length > 0 && setStrategyMenuOpen(v => !v)}
                className="flex items-center gap-1.5 w-full text-left rounded-lg px-2 py-1.5 transition-colors"
                style={{ cursor: strategies.length > 0 ? 'pointer' : 'default', background: strategyMenuOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onMouseEnter={e => { if (strategies.length > 0) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!strategyMenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>Strategie</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: strategyName ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {strategyName ?? '—'}
                </span>
                {strategies.length > 0 && (
                  <ChevronDown className="h-3 w-3 shrink-0" style={{ color: 'rgba(255,255,255,0.3)', transform: strategyMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                )}
              </button>
              {strategyMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 rounded-xl overflow-hidden w-full" style={{ background: 'var(--bg-3)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'var(--elev-2)' }}>
                  {strategies.map(s => (
                    <button
                      key={s.id}
                      onClick={() => selectStrategy(s.id)}
                      className="w-full flex items-center px-3 py-2 text-xs text-left transition-colors"
                      style={{ color: s.id === activeStrategyId ? '#00C4FF' : 'rgba(255,255,255,0.6)', fontWeight: s.id === activeStrategyId ? 600 : 400 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
          {collapsed ? (
            <CollapsedNav pathname={pathname} getDot={getDot} hasWatchlistItems={hasWatchlistItems} />
          ) : (
            NAV_GROUPS.map(group => (
              <NavSection
                key={group.label}
                label={group.label}
                ids={group.ids}
                pathname={pathname}
                getDot={getDot}
                hasWatchlistItems={hasWatchlistItems}
                storageKey={`nous-nav-section-${group.label.toLowerCase()}`}
              />
            ))
          )}
        </nav>

        {/* Workflow progress card (like Hynex "Upgrade to Pro") */}
        {!collapsed && workflowData && (
          <div className="mx-3 mb-3 shrink-0">
            <div
              className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(8,153,129,0.08) 0%, rgba(41,98,255,0.06) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <WorkflowRing done={workflowData.done_count} total={workflowData.total} size={18} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>Workflow · Heute</span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {workflowData.done_count}/{workflowData.total}
                </span>
              </div>
              <Progress value={workflowPct} className="h-1 mb-2.5" />
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {workflowPct === 100 ? 'Alle Schritte erledigt ✓' : `${workflowPct}% erledigt`}
                </span>
                <Link
                  href="/workflow"
                  className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ color: '#2962FF' }}
                >
                  Öffnen
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Update banner */}
        {update && !collapsed && (
          <div className="mx-3 mb-2 shrink-0 rounded-xl px-3 py-2.5" style={{ background: 'rgba(41,98,255,0.07)', border: '1px solid rgba(41,98,255,0.2)' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: '#2962FF' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2962FF' }}>v{update.releaseVersion} verfügbar</span>
              </div>
              <button
                onClick={() => { localStorage.setItem('nous-skip-logout-ts', String(Date.now())); window.location.reload() }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0"
                style={{ background: '#2962FF', color: '#fff' }}
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Laden
              </button>
            </div>
          </div>
        )}

        {/* Footer: Einstellungen */}
        <div className="px-2 pb-3 pt-1 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {collapsed ? (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Link
                    href="/einstellungen"
                    className="relative flex items-center justify-center w-10 h-9 rounded-lg mx-auto transition-colors"
                    style={{
                      background: settingsActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                      color: settingsActive ? '#00C4FF' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <Settings className="h-[17px] w-[17px]" />
                    {showSettingsDot && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2962FF' }} />}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Einstellungen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div>
              <NavItemRow
                item={{ id: 'einstellungen', href: '/einstellungen', label: 'Einstellungen', icon: Settings, tooltip: '' }}
                isActive={settingsActive}
                dot={showSettingsDot ? { color: '#2962FF', pulse: true } : undefined}
              />
              <p className="px-3 pt-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                v{RELEASE_VERSION}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
