'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard, BookOpen, TrendingUp, Brain, ShieldCheck,
  CalendarDays, ClipboardList, GraduationCap,
  ListChecks, Star, Map as MapIcon, Telescope, Settings, RefreshCw, Sparkles, Workflow,
  ChevronLeft, ChevronRight, BookMarked, ChevronDown,
} from 'lucide-react'
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
  dashboard:          { id: 'dashboard',          href: '/dashboard',          label: 'Dashboard',          icon: LayoutDashboard, tooltip: 'Deine wichtigsten KPIs, offene Trades und tägliche Zusammenfassung' },
  workflow:           { id: 'workflow',           href: '/workflow',           label: 'Tages-Workflow',     icon: Workflow,        tooltip: 'Dein täglicher Roter Faden — Schritt für Schritt durch die Trading-Woche' },
  journal:            { id: 'journal',            href: '/journal',            label: 'Journal',            icon: BookOpen,        tooltip: 'Trades erfassen, bearbeiten und mit KI analysieren lassen' },
  tagesplan:          { id: 'tagesplan',          href: '/tagesplan',          label: 'Tagesplan',          icon: ClipboardList,   tooltip: 'Tägliche Routine: Pre-Market Checklist, Fokus-Assets und Tagesnotizen' },
  performance:        { id: 'performance',        href: '/performance',        label: 'Performance',        icon: TrendingUp,      tooltip: 'Statistiken, Equity-Kurve, Win-Rate und Setup-Auswertung' },
  analysen:           { id: 'analysen',           href: '/analysen',           label: 'Analysen',           icon: Brain,           tooltip: 'KI-generierte Muster und Verhaltensanalysen aus deinem Journal' },
  risk:               { id: 'risk',               href: '/risk',               label: 'Risk',               icon: ShieldCheck,     tooltip: 'Risiko-Regeln, Max-Drawdown, Tageslimit und Prop-Firm-Grenzen' },
  wochenvorbereitung: { id: 'wochenvorbereitung', href: '/wochenvorbereitung', label: 'Wochenvorbereitung', icon: Telescope,       tooltip: 'Ziele für die Woche setzen, Fokus-Assets wählen und Events tracken' },
  kalender:           { id: 'kalender',           href: '/kalender',           label: 'Kalender',           icon: CalendarDays,    tooltip: 'Wirtschaftskalender und High-Impact-Events in deiner Zeitzone' },
  lernmodus:          { id: 'lernmodus',          href: '/lernmodus',          label: 'Lernen',             icon: GraduationCap,   tooltip: 'Quiz, Chart-Replay und KI-Coach zum Verbessern deiner Entscheidungen' },
  watchlist:          { id: 'watchlist',          href: '/watchlist',          label: 'Watchlist',          icon: Star,            tooltip: 'Deine gehandelten Assets mit Kontraktwerten für die Risikoberechnung' },
  roadmap:            { id: 'roadmap',            href: '/roadmap',            label: 'Trader Journey',     icon: MapIcon,         tooltip: 'Deine Trader-Journey: Level, Stärken/Schwächen und nächste Schritte' },
  anleitung:          { id: 'anleitung',          href: '/anleitung',          label: 'Anleitung',          icon: BookMarked,      tooltip: 'Schritt-für-Schritt Erklärung aller Nous-Features' },
}

// Trader workflow: Trading → Vorbereitung → Auswertung → Mehr
const NAV_GROUPS: { label: string; color: string; ids: string[] }[] = [
  { label: 'TRADING',      color: '#ff8210', ids: ['dashboard', 'journal'] },
  { label: 'VORBEREITUNG', color: '#8E8E93', ids: ['tagesplan', 'watchlist', 'wochenvorbereitung', 'kalender'] },
  { label: 'AUSWERTUNG',   color: '#8E8E93', ids: ['performance', 'analysen', 'risk'] },
  { label: 'MEHR',         color: '#8E8E93', ids: ['roadmap', 'lernmodus', 'anleitung'] },
]

function lerpColor(a: [number,number,number], b: [number,number,number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

function ringColor(pct: number): string {
  const red:    [number,number,number] = [242, 54,  69]
  const orange: [number,number,number] = [255, 130, 16]
  const green:  [number,number,number] = [74,  222, 128]
  if (pct <= 0.5) return lerpColor(red, orange, pct * 2)
  return lerpColor(orange, green, (pct - 0.5) * 2)
}

function WorkflowRing({ done, total }: { done: number; total: number }) {
  const r = 8
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const offset = circ * (1 - pct)
  const complete = done === total && total > 0
  const color = pct === 0 ? 'rgba(255,255,255,0.15)' : ringColor(pct)
  const glowColor = pct === 0 ? 'none' : ringColor(pct)

  return (
    <svg
      width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden
      style={complete ? { filter: `drop-shadow(0 0 4px ${color})`, animation: 'ring-celebrate 0.5s ease' } : { filter: pct > 0 ? `drop-shadow(0 0 3px ${glowColor}80)` : 'none' }}
    >
      <circle cx="10" cy="10" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
      <circle
        cx="10" cy="10" r={r}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 10 10)"
        style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
      />
    </svg>
  )
}

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
      className={cn(
        'flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] transition-colors duration-100',
        isActive ? 'font-semibold' : 'font-medium'
      )}
      style={{
        background: isActive ? 'rgba(255,130,16,0.1)' : hovered ? 'var(--bg-3)' : 'transparent',
        color: isActive ? '#ff8210' : hovered ? 'var(--fg-1)' : 'var(--fg-2)',
        borderLeft: isActive ? '2px solid #ff8210' : '2px solid transparent',
        paddingLeft: isActive ? '10px' : '12px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <item.icon
        className="h-[15px] w-[15px] shrink-0"
        style={fillIcon ? { color: '#F59E0B', fill: '#F59E0B' } : undefined}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {dot && (
        <span
          className={cn('w-[6px] h-[6px] rounded-full shrink-0 self-center', dot.pulse && 'animate-pulse')}
          style={{ background: dot.color }}
        />
      )}
    </Link>
  )
}

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
  const accountMenuRef = useRef<HTMLDivElement>(null)
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

  // Load strategies and track active one via localStorage + custom event
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

  // Close account menu on outside click
  useEffect(() => {
    if (!accountMenuOpen) return
    function handleOutside(e: MouseEvent) {
      if (!accountMenuRef.current?.contains(e.target as Node)) setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [accountMenuOpen])

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

  // Orange = action needed, Blue = confirmed/done today
  function getDot(id: string): NavItemProps['dot'] | undefined {
    if (id === 'wochenvorbereitung' && hasWeeklyPrepReminder) return { color: '#ff8210', pulse: true }
    if (workflowDoneIds.has(id)) return { color: '#2962FF' }
    if (id === 'tagesplan' && hasTodayPlan) return { color: '#2962FF' }
    return undefined
  }

  return (
    <>
      {/* ── Collapsed sidebar (tablet 768–1023px) ── */}
      <aside
        className="hidden md:flex lg:hidden w-14 shrink-0 flex-col h-screen sticky top-0 items-center"
        style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border-raw)', borderRadius: '0 16px 16px 0' }}
      >
        <div className="flex items-center justify-center py-4">
          <Image src="/logo/nous-mark-white.svg" alt="NOUS" width={20} height={20} priority />
        </div>

        {workflowData && (
          <Link href="/dashboard" title="Tages-Workflow" className="flex items-center justify-center pb-3">
            <WorkflowRing done={workflowData.done_count} total={workflowData.total} />
          </Link>
        )}

        <nav className="flex-1 flex flex-col items-center overflow-y-auto w-full px-2 py-1 gap-0.5">
          <TooltipProvider>
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className={cn('w-full flex flex-col items-center gap-0.5', gi > 0 && 'mt-1.5')}>
                {gi > 0 && <div className="w-6 mb-1.5" style={{ height: '1px', background: 'var(--border-raw)' }} />}
                {group.ids.map(id => {
                  const item = NAV_ITEMS[id]
                  if (!item) return null
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Tooltip key={id} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className="flex items-center justify-center w-10 h-9 rounded-md transition-colors duration-100"
                          style={{
                            background: isActive ? 'var(--bg-3)' : 'transparent',
                            color: isActive ? 'var(--fg-1)' : 'var(--fg-3)',
                          }}
                        >
                          <item.icon
                            className="h-[18px] w-[18px]"
                            style={id === 'watchlist' && hasWatchlistItems ? { color: '#F59E0B', fill: '#F59E0B' } : undefined}
                          />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            ))}
          </TooltipProvider>
        </nav>

        <div className="flex flex-col items-center pb-3 pt-2 w-full px-2" style={{ borderTop: '1px solid var(--border-raw)' }}>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href="/einstellungen"
                  className="relative flex items-center justify-center w-10 h-9 rounded-md transition-colors duration-100"
                  style={{
                    color: settingsActive ? 'var(--fg-1)' : 'var(--fg-3)',
                    background: settingsActive ? 'var(--bg-3)' : 'transparent',
                  }}
                >
                  <Settings className="h-[18px] w-[18px]" />
                  {showSettingsDot && (
                    <span
                      className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse border border-[var(--bg-1)]"
                      style={{ background: '#2962FF' }}
                    />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Einstellungen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      {/* ── Full sidebar (desktop ≥1024px) ── */}
      <aside
        className="relative shrink-0 hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden group/sidebar"
        style={{
          background: 'var(--bg-1)',
          borderRadius: '0 20px 20px 0',
          width: collapsed ? 56 : 224,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '1px 0 0 0 var(--border-raw)',
        }}
      >
        {/* Header: logo + avatar */}
        <div className="px-3 pt-4 pb-2 flex items-center justify-between gap-2 shrink-0">
          {collapsed ? (
            <div className="flex items-center justify-center w-full">
              <Image src="/logo/nous-mark-white.svg" alt="NOUS" width={20} height={20} priority />
            </div>
          ) : (
            <>
              <Image src="/logo/nous-logo-slogan.svg" alt="NOUS" width={100} height={32} priority />
              <div
                className="shrink-0 flex items-center justify-center overflow-hidden"
                style={{ width: 24, height: 24, borderRadius: '50%', background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.15)', color: '#fff', fontSize: 10, fontWeight: 700 }}
              >
                {avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: '50%' }} />
                  : initial}
              </div>
            </>
          )}
        </div>

        {/* Account switcher + strategy badge */}
        {!collapsed && activeAccount && (
          <div className="px-3 pb-2 shrink-0 space-y-1.5">
            {/* Account switcher */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => accounts.length > 1 && setAccountMenuOpen(v => !v)}
                className="flex items-center gap-1 w-full text-left rounded-md px-1.5 py-1 transition-colors"
                style={{
                  cursor: accounts.length > 1 ? 'pointer' : 'default',
                  background: accountMenuOpen ? 'var(--bg-3)' : 'transparent',
                }}
                onMouseEnter={e => { if (accounts.length > 1) (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)' }}
                onMouseLeave={e => { if (!accountMenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span className="text-[11px] truncate flex-1 font-medium" style={{ color: 'var(--fg-4)' }}>
                  {activeAccount.name}
                </span>
                {accounts.length > 1 && (
                  <ChevronDown
                    className="h-3 w-3 shrink-0 transition-transform duration-150"
                    style={{ color: 'var(--fg-4)', transform: accountMenuOpen ? 'rotate(180deg)' : 'none' }}
                  />
                )}
              </button>
              {accountMenuOpen && (
                <div
                  className="absolute left-0 top-full z-50 mt-1 rounded-lg overflow-hidden"
                  style={{
                    minWidth: 180,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-raw)',
                    boxShadow: 'var(--elev-2)',
                  }}
                >
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => { setActiveAccount(acc); setAccountMenuOpen(false) }}
                      className="w-full flex items-center px-3 py-2 text-[12px] text-left transition-colors"
                      style={{
                        color: acc.id === activeAccount.id ? '#ff8210' : 'var(--fg-2)',
                        fontWeight: acc.id === activeAccount.id ? 600 : 400,
                        background: 'transparent',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active strategy badge */}
            <Link
              href="/einstellungen?tab=strategie&solo=1"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-opacity hover:opacity-80 max-w-full"
              style={{
                background: strategyName ? 'rgba(41,98,255,0.1)' : 'var(--bg-3)',
                color: strategyName ? '#60a5fa' : 'var(--fg-4)',
                border: strategyName ? '1px solid rgba(41,98,255,0.2)' : '1px solid var(--border-raw)',
              }}
            >
              <span className="truncate">{strategyName ?? 'Strategie setzen'}</span>
            </Link>
          </div>
        )}

        {/* Workflow CTA */}
        <div className="px-3 pb-3 shrink-0">
          {collapsed ? (
            <Link href="/workflow" className="flex items-center justify-center w-full py-1" title="Tages-Workflow">
              {workflowData
                ? <WorkflowRing done={workflowData.done_count} total={workflowData.total} />
                : <ListChecks className="h-4 w-4" style={{ color: '#ff8210' }} />}
            </Link>
          ) : (
            <Link
              href="/workflow"
              className="flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors"
              style={{ background: 'var(--bg-3)', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ListChecks className="h-3.5 w-3.5 shrink-0" style={{ color: '#ff8210' }} />
                <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--fg-1)' }}>Tages-Workflow</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {workflowData && workflowData.done_count < workflowData.total && (
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-4)' }}>
                    {workflowData.done_count}/{workflowData.total}
                  </span>
                )}
                {workflowData && <WorkflowRing done={workflowData.done_count} total={workflowData.total} />}
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 flex flex-col gap-4 py-1">
          {collapsed ? (
            <TooltipProvider>
              <div className="flex flex-col items-center gap-0.5">
                {NAV_GROUPS.map((group, gi) => (
                  <div key={group.label} className={cn('w-full flex flex-col items-center gap-0.5', gi > 0 && 'mt-2')}>
                    {gi > 0 && <div className="w-6 mb-1" style={{ height: '1px', background: 'var(--border-raw)' }} />}
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
                              className="relative flex items-center justify-center w-10 h-9 rounded-md transition-colors"
                              style={{
                                background: isActive ? `${group.color}18` : 'transparent',
                                color: isActive ? group.color : 'var(--fg-3)',
                              }}
                            >
                              <item.icon className="h-[17px] w-[17px]" />
                              {dot && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: dot.color }} />
                              )}
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
          ) : (
            NAV_GROUPS.map(group => (
              <div key={group.label}>
                <p
                  className="px-3 mb-1"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: group.color, textTransform: 'uppercase' }}
                >
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.ids.map(id => {
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
              </div>
            ))
          )}
        </nav>

        {/* Update banner — blue for new version info */}
        {update && !collapsed && (
          <div className="mx-3 mb-2 rounded-lg px-3 py-2.5" style={{ background: 'rgba(41,98,255,0.07)', border: '1px solid rgba(41,98,255,0.2)' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: '#2962FF' }} />
                <span className="text-[11px] font-bold" style={{ color: '#2962FF' }}>
                  v{update.releaseVersion} verfügbar
                </span>
              </div>
              <button
                onClick={() => { localStorage.setItem('nous-skip-logout-ts', String(Date.now())); window.location.reload() }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                style={{ background: '#2962FF', color: '#fff' }}
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Laden
              </button>
            </div>
          </div>
        )}

        {/* Einstellungen */}
        <div className="px-2 pb-3 pt-1 shrink-0" style={{ borderTop: '1px solid var(--border-raw)' }}>
          {collapsed ? (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Link
                    href="/einstellungen"
                    className="relative flex items-center justify-center w-10 h-9 rounded-md mx-auto transition-colors"
                    style={{ color: settingsActive ? 'var(--fg-1)' : 'var(--fg-3)', background: settingsActive ? 'var(--bg-3)' : 'transparent' }}
                  >
                    <Settings className="h-[17px] w-[17px]" />
                    {showSettingsDot && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2962FF' }} />}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Einstellungen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <NavItemRow
                item={{ id: 'einstellungen', href: '/einstellungen', label: 'Einstellungen', icon: Settings, tooltip: '' }}
                isActive={settingsActive}
                dot={showSettingsDot ? { color: '#2962FF', pulse: true } : undefined}
              />
              <p className="px-3 pt-1 text-[10px]" style={{ color: 'var(--fg-4)' }}>
                v{RELEASE_VERSION}
              </p>
            </>
          )}
        </div>

        {/* Toggle tab — TradingView style */}
        <button
          onClick={toggleCollapsed}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150"
          style={{
            width: 14,
            height: 28,
            background: 'var(--bg-3)',
            color: 'var(--fg-4)',
            borderRadius: '0 6px 6px 0',
            borderTop: '1px solid var(--border-raw)',
            borderRight: '1px solid var(--border-raw)',
            borderBottom: '1px solid var(--border-raw)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--fg-1)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-4)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--fg-4)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
          }}
          title={collapsed ? 'Sidebar öffnen' : 'Sidebar schließen'}
        >
          {collapsed
            ? <ChevronRight className="h-2.5 w-2.5" />
            : <ChevronLeft className="h-2.5 w-2.5" />}
        </button>
      </aside>
    </>
  )
}
