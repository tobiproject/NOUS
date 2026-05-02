'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, BookOpen, TrendingUp, ShieldCheck, MoreHorizontal,
  Brain, CalendarDays, ClipboardList, GraduationCap, Star, Map as MapIcon,
  Telescope, Settings, LogOut, Users, BookMarked as KbIcon, Info,
} from 'lucide-react'
import { AccountSwitcher } from '@/components/accounts/AccountSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// ─── Nav catalogue ────────────────────────────────────────────────────────────

const ALL_ITEMS = [
  { id: 'dashboard',          href: '/dashboard',           label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'journal',            href: '/journal',             label: 'Journal',            icon: BookOpen },
  { id: 'performance',        href: '/performance',         label: 'Performance',        icon: TrendingUp },
  { id: 'risk',               href: '/risk',                label: 'Risk',               icon: ShieldCheck },
  { id: 'analysen',           href: '/analysen',            label: 'Analysen',           icon: Brain },
  { id: 'kalender',           href: '/kalender',            label: 'Kalender',           icon: CalendarDays },
  { id: 'tagesplan',          href: '/tagesplan',           label: 'Tagesplan',          icon: ClipboardList },
  { id: 'lernmodus',          href: '/lernmodus',           label: 'Lernen',             icon: GraduationCap },
  { id: 'watchlist',          href: '/watchlist',           label: 'Watchlist',          icon: Star },
  { id: 'roadmap',            href: '/roadmap',             label: 'Roadmap',            icon: MapIcon },
  { id: 'wochenvorbereitung', href: '/wochenvorbereitung',  label: 'Wochenvorbereitung', icon: Telescope },
  { id: 'einstellungen',      href: '/einstellungen',       label: 'Einstellungen',      icon: Settings },
  { id: 'knowledge-base',     href: '/knowledge-base',      label: 'Knowledge Base',     icon: KbIcon },
  { id: 'about',              href: '/about',               label: 'Über NOUS',          icon: Info },
] as const

type NavId = typeof ALL_ITEMS[number]['id']

const DEFAULT_PRIMARY: NavId[] = ['dashboard', 'journal', 'performance', 'risk']
const STORAGE_KEY = 'nous-bottom-nav-tabs'
const SNAP_THRESHOLD = 0.38  // fraction of drawer height
const VELOCITY_THRESHOLD = 0.5 // px/ms

function loadPrimary(): NavId[] {
  if (typeof window === 'undefined') return DEFAULT_PRIMARY
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) {
      const p = JSON.parse(v) as string[]
      if (Array.isArray(p) && p.length >= 2 && p.length <= 4) return p as NavId[]
    }
  } catch {}
  return DEFAULT_PRIMARY
}

// ─── Smooth gesture drawer ─────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

function GestureDrawer({ open, onClose, children }: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef  = useRef<HTMLDivElement>(null)
  const gesture = useRef({ startY: 0, startTime: 0, currentY: 0, dragging: false })

  function setY(y: number, animated: boolean) {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = animated ? 'transform 0.32s cubic-bezier(0.32,0.72,0,1)' : 'none'
    el.style.transform = `translateY(${Math.max(0, y)}px)`
  }

  function setOverlay(progress: number) {
    const el = overlayRef.current
    if (!el) return
    el.style.opacity = String(Math.max(0, Math.min(1, progress)))
  }

  // Lock body scroll when open, release when closed
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [open])

  // Open / close animation
  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    if (open) {
      el.style.transition = 'none'
      el.style.transform = 'translateY(100%)'
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.36s cubic-bezier(0.32,0.72,0,1)'
        el.style.transform = 'translateY(0)'
      })
      setOverlay(1)
    } else {
      el.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
      el.style.transform = 'translateY(100%)'
      setOverlay(0)
    }
  }, [open])

  // Native (non-passive) touch listeners so preventDefault() works
  useEffect(() => {
    const el = sheetRef.current
    if (!el) return

    function onStart(e: TouchEvent) {
      gesture.current = {
        startY: e.touches[0].clientY,
        startTime: Date.now(),
        currentY: e.touches[0].clientY,
        dragging: true,
      }
      setY(0, false)
    }

    function onMove(e: TouchEvent) {
      if (!gesture.current.dragging) return
      const dy = e.touches[0].clientY - gesture.current.startY
      gesture.current.currentY = e.touches[0].clientY
      if (dy <= 0) return
      e.preventDefault() // stops page scroll
      const h = el.offsetHeight ?? 400
      setY(dy, false)
      setOverlay(1 - dy / h)
    }

    function onEnd() {
      if (!gesture.current.dragging) return
      gesture.current.dragging = false
      const dy = gesture.current.currentY - gesture.current.startY
      const dt = Date.now() - gesture.current.startTime
      const velocity = dy / Math.max(dt, 1)
      const h = el.offsetHeight ?? 400
      if (velocity > VELOCITY_THRESHOLD || dy / h > SNAP_THRESHOLD) {
        el.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)'
        el.style.transform = 'translateY(100%)'
        setOverlay(0)
        setTimeout(onClose, 280)
      } else {
        setY(0, true)
        setOverlay(1)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false }) // must be non-passive for preventDefault
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [onClose])

  if (!open && sheetRef.current?.style.transform === 'translateY(100%)') return null

  return (
    <div
      className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')}
      aria-modal="true"
      role="dialog"
    >
      {/* overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60"
        style={{ opacity: open ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={onClose}
      />

      {/* sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden"
        style={{
          background: '#111111',
          maxHeight: '82vh',
          transform: 'translateY(100%)',
          willChange: 'transform',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function BottomNav() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [primaryIds, setPrimaryIds] = useState<NavId[]>(DEFAULT_PRIMARY)

  useEffect(() => { setPrimaryIds(loadPrimary()) }, [])

  const primaryTabs = useMemo(
    () => primaryIds.map(id => ALL_ITEMS.find(i => i.id === id)).filter(Boolean) as typeof ALL_ITEMS[number][],
    [primaryIds]
  )
  const mehrItems = useMemo(
    () => ALL_ITEMS.filter(i => !primaryIds.includes(i.id)),
    [primaryIds]
  )
  const isMehrActive = mehrItems.some(
    i => pathname === i.href || pathname.startsWith(i.href + '/')
  )

  function handleClose() {
    setOpen(false)
    setEditing(false)
  }

  function togglePrimary(id: NavId) {
    setPrimaryIds(prev => {
      let next: NavId[]
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev
        next = prev.filter(x => x !== id)
      } else {
        next = prev.length >= 4 ? [...prev.slice(1), id] : [...prev, id]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <>
      {/* ── Bottom bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{
          background: '#111111',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          height: 'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {primaryTabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
              style={{ color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5"
          style={{ color: isMehrActive ? '#fff' : 'rgba(255,255,255,0.35)' }}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Mehr</span>
        </button>
      </nav>

      {/* ── Gesture Drawer ── */}
      <GestureDrawer open={open} onClose={handleClose}>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(82vh - 32px)' }}>

          {/* Header row */}
          <div className="flex items-center justify-between px-5 py-2">
            <span className="text-[13px] font-semibold tracking-wider uppercase text-white/40">
              {editing ? 'Tab-Leiste anpassen' : 'Navigation'}
            </span>
            <button
              onClick={() => setEditing(e => !e)}
              className="text-[14px] font-semibold"
              style={{ color: editing ? '#fff' : 'rgba(255,255,255,0.55)' }}
            >
              {editing ? 'Fertig' : 'Bearbeiten'}
            </button>
          </div>

          {editing ? (
            /* ── Edit mode ── */
            <div className="px-4 pb-4">
              <p className="text-[12px] text-white/35 px-3 pb-3">
                Wähle 2–4 Tabs für die untere Leiste.
              </p>
              {ALL_ITEMS.map(item => {
                const selected = primaryIds.includes(item.id)
                const disabled = selected && primaryIds.length <= 2
                return (
                  <button
                    key={item.id}
                    disabled={disabled}
                    onClick={() => togglePrimary(item.id)}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl"
                    style={{
                      background: selected ? 'rgba(255,255,255,0.07)' : 'transparent',
                      minHeight: 48,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {/* checkbox circle */}
                    <div
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: selected ? '#fff' : 'rgba(255,255,255,0.25)',
                        background: selected ? '#fff' : 'transparent',
                      }}
                    >
                      {selected && (
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                          <path d="M1 4L4.5 7.5L11 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <item.icon className="h-5 w-5 shrink-0" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.45)' }} />
                    <span className="flex-1 text-[15px] font-medium text-left" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            /* ── Normal mode ── */
            <div className="px-4 pb-2 space-y-0.5">
              {mehrItems.map(item => {
                const base = item.href.split('?')[0]
                const active = pathname === base || pathname.startsWith(base + '/')
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={handleClose}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-xl"
                    style={{
                      color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                      minHeight: 48,
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.45)' }} />
                    <span className="text-[15px] font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="mx-4 my-2 h-px bg-white/8" />
          <div className="px-6 pb-2"><AccountSwitcher /></div>
          <div className="px-4 pb-6">
            <button
              onClick={() => { handleClose(); logout() }}
              className="flex items-center gap-3 px-3 py-3.5 rounded-xl w-full"
              style={{ color: 'rgba(255,255,255,0.45)', minHeight: 48 }}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="text-[15px] font-medium">Abmelden</span>
            </button>
          </div>
        </div>
      </GestureDrawer>
    </>
  )
}
