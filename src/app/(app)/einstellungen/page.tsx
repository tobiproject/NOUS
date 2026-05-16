'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Trash2, Loader2, Check, Plus, ExternalLink, Brain, Bell, BellOff, Mail, Key, Bot, Archive, Info, Camera, X, Upload, FileText, CheckCircle, AlertTriangle, Type, Pencil, ChevronLeft, ChevronRight, Sparkles, GripVertical, User, Wallet, Target, BookOpen, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { applyFontSize, getStoredFontSize, FONT_SIZE_MIN, FONT_SIZE_MAX } from '@/components/layout/FontSizeApplier'
import { useAccounts } from '@/hooks/useAccounts'
import { useAccountContext, type Account } from '@/contexts/AccountContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AssetMultiPicker } from '@/components/watchlist/AssetMultiPicker'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountCreateDialog } from '@/components/accounts/AccountCreateDialog'
import { AccountDeleteDialog } from '@/components/accounts/AccountDeleteDialog'
import { CoachInsightsSection } from '@/components/lernmodus/coach/CoachInsightsSection'

interface Strategy {
  name: string
  description: string
  rules: string[]
  preferred_timeframes: string[]
  instruments: string[]
}

const EMPTY: Strategy = {
  name: 'Meine Strategie',
  description: '',
  rules: [],
  preferred_timeframes: [],
  instruments: [],
}

const EXAMPLE_STRATEGY: Strategy = {
  name: 'NQ/ES Momentum Breakout',
  description: 'Intraday Momentum-Strategie auf E-Mini Futures (NQ & ES). Ich trade ausschließlich in der ersten Handelsstunde (9:30–11:00 ET) und in der Nachmittagssession (14:00–16:00 ET). Einstiege erfolgen nach bestätigten Breakouts aus dem Opening Range oder nach Pullbacks an wichtige VWAP-Levels. Kein Trading gegen den Tagestrend.',
  rules: [
    'Kein Trade vor 9:45 ET — Opening-Volatilität abwarten',
    'Nur in Trendrichtung traden — H1 Trend bestimmt Bias für den Tag',
    'Entry nur nach Konsolidierung und Volumen-Bestätigung (kein Thin-Air-Entry)',
    'Stop Loss immer hinter letztem Swing High/Low — kein fester Pip-Stop',
    'Maximales Risiko pro Trade: 1% des Kontostands (ca. $100 bei $10k)',
    'Kein Trade nach 2 aufeinanderfolgenden Verlusten — Pause einlegen',
    'Nachrichten-Events (FOMC, NFP, CPI) meiden — 30min vor und nach',
    'Tagesgewinnlimit: +$300 — danach Bildschirm aus',
    'Tagesverlustlimit: -$200 — danach kein weiterer Trade',
  ],
  preferred_timeframes: ['5m', '15m', '1h'],
  instruments: ['NQ', 'ES'],
}

const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W']

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new window.Image()
  image.src = imageSrc
  await new Promise<void>(resolve => { image.onload = () => resolve() })
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92))
}

const DRUM_H = 44
const HOURS_ARR = Array.from({ length: 24 }, (_, i) => i)
const MINUTES_ARR = Array.from({ length: 60 }, (_, i) => i)

function DrumColumn({ values, selected, onChange }: {
  values: number[]
  selected: number
  onChange: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const fmt = (v: number) => String(v).padStart(2, '0')

  // Initial scroll — instant, no animation
  useEffect(() => {
    const idx = values.indexOf(selected)
    if (idx >= 0 && ref.current) ref.current.scrollTop = idx * DRUM_H
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Programmatic scroll when parent changes value externally
  const prevSelected = useRef(selected)
  useEffect(() => {
    if (prevSelected.current === selected) return
    prevSelected.current = selected
    const idx = values.indexOf(selected)
    if (idx >= 0 && ref.current) ref.current.scrollTo({ top: idx * DRUM_H, behavior: 'smooth' })
  }, [selected, values])

  const handleScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const idx = Math.round(el.scrollTop / DRUM_H)
    const v = values[Math.max(0, Math.min(idx, values.length - 1))]
    if (v !== undefined && v !== prevSelected.current) {
      prevSelected.current = v
      onChange(v)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
    }
  }, [values, onChange])

  return (
    <div style={{ position: 'relative', height: DRUM_H * 3, width: 52, overflow: 'hidden', borderRadius: 8, background: 'var(--bg-3)' }}>
      {/* Selection highlight */}
      <div style={{
        position: 'absolute', top: DRUM_H, left: 0, right: 0, height: DRUM_H,
        background: 'rgba(255,255,255,0.07)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: DRUM_H,
        background: 'linear-gradient(to bottom, var(--bg-3) 10%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: DRUM_H,
        background: 'linear-gradient(to top, var(--bg-3) 10%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height: '100%', overflowY: 'scroll',
          scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div style={{ height: DRUM_H }} />
        {values.map(v => (
          <div key={v} style={{
            height: DRUM_H, scrollSnapAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: v === selected ? 700 : 400,
            color: v === selected ? 'var(--fg-1)' : 'rgba(255,255,255,0.28)',
            fontVariantNumeric: 'tabular-nums', userSelect: 'none',
            transition: 'color 0.1s',
          }}>
            {fmt(v)}
          </div>
        ))}
        <div style={{ height: DRUM_H }} />
      </div>
    </div>
  )
}

function TimePickerRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':').map(Number)
  return (
    <div className="pt-2">
      <span className="text-xs font-medium block mb-2" style={{ color: 'var(--fg-3)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <DrumColumn values={HOURS_ARR} selected={h} onChange={v => onChange(`${String(v).padStart(2,'0')}:${String(m).padStart(2,'0')}`)} />
        <span style={{ color: 'var(--fg-3)', fontWeight: 700, fontSize: 18 }}>:</span>
        <DrumColumn values={MINUTES_ARR} selected={m} onChange={v => onChange(`${String(h).padStart(2,'0')}:${String(v).padStart(2,'0')}`)} />
        <span className="text-sm" style={{ color: 'var(--fg-4)' }}>Uhr</span>
      </div>
    </div>
  )
}

// One entry per UTC offset — curated, no duplicates
const CURATED_TIMEZONES: { tz: string; city: string }[] = [
  { tz: 'Etc/GMT+12',              city: 'UTC-12'    },
  { tz: 'Pacific/Pago_Pago',       city: 'Samoa'     },
  { tz: 'Pacific/Honolulu',        city: 'Hawaii'    },
  { tz: 'America/Anchorage',       city: 'Anchorage' },
  { tz: 'America/Los_Angeles',     city: 'L.A.'      },
  { tz: 'America/Denver',          city: 'Denver'    },
  { tz: 'America/Chicago',         city: 'Chicago'   },
  { tz: 'America/New_York',        city: 'New York'  },
  { tz: 'America/Caracas',         city: 'Caracas'   },
  { tz: 'America/Sao_Paulo',       city: 'São Paulo' },
  { tz: 'Atlantic/South_Georgia',  city: 'S. Georgia'},
  { tz: 'Atlantic/Azores',         city: 'Azoren'    },
  { tz: 'Europe/London',           city: 'London'    },
  { tz: 'Europe/Berlin',           city: 'Berlin'    },
  { tz: 'Europe/Helsinki',         city: 'Helsinki'  },
  { tz: 'Europe/Moscow',           city: 'Moskau'    },
  { tz: 'Asia/Tehran',             city: 'Teheran'   },
  { tz: 'Asia/Dubai',              city: 'Dubai'     },
  { tz: 'Asia/Kabul',              city: 'Kabul'     },
  { tz: 'Asia/Karachi',            city: 'Karachi'   },
  { tz: 'Asia/Kolkata',            city: 'Mumbai'    },
  { tz: 'Asia/Kathmandu',          city: 'Kathmandu' },
  { tz: 'Asia/Dhaka',              city: 'Dhaka'     },
  { tz: 'Asia/Yangon',             city: 'Yangon'    },
  { tz: 'Asia/Bangkok',            city: 'Bangkok'   },
  { tz: 'Asia/Singapore',          city: 'Singapur'  },
  { tz: 'Asia/Tokyo',              city: 'Tokio'     },
  { tz: 'Australia/Adelaide',      city: 'Adelaide'  },
  { tz: 'Australia/Sydney',        city: 'Sydney'    },
  { tz: 'Pacific/Noumea',          city: 'Noumea'    },
  { tz: 'Pacific/Auckland',        city: 'Auckland'  },
  { tz: 'Pacific/Chatham',         city: 'Chatham'   },
  { tz: 'Pacific/Apia',            city: 'Apia'      },
  { tz: 'Pacific/Kiritimati',      city: 'Kiritimati'},
]

function getTzOffset(tz: string, now: Date): string {
  try {
    const v = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'UTC'
    return v.replace('GMT', 'UTC')
  } catch { return 'UTC' }
}

// Map any IANA tz → nearest curated entry (by current offset)
function normalizeToCurated(tz: string): string {
  if (CURATED_TIMEZONES.some(t => t.tz === tz)) return tz
  try {
    const now = new Date()
    const target = getTzOffset(tz, now)
    const match = CURATED_TIMEZONES.find(t => getTzOffset(t.tz, now) === target)
    return match?.tz ?? 'Europe/Berlin'
  } catch { return 'Europe/Berlin' }
}

function TimezoneDrum({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const normalized = normalizeToCurated(value)
  const idx = CURATED_TIMEZONES.findIndex(t => t.tz === normalized)
  const safeidx = idx >= 0 ? idx : 13 // fallback to Berlin
  const ref = useRef<HTMLDivElement>(null)
  const prevIdx = useRef(safeidx)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = safeidx * DRUM_H
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (prevIdx.current === safeidx) return
    prevIdx.current = safeidx
    if (ref.current) ref.current.scrollTo({ top: safeidx * DRUM_H, behavior: 'smooth' })
  }, [safeidx])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const handleScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollTop / DRUM_H)
    const entry = CURATED_TIMEZONES[Math.max(0, Math.min(i, CURATED_TIMEZONES.length - 1))]
    if (entry && entry.tz !== CURATED_TIMEZONES[prevIdx.current]?.tz) {
      const newIdx = CURATED_TIMEZONES.indexOf(entry)
      prevIdx.current = newIdx
      onChange(entry.tz)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8)
    }
  }, [onChange])

  const current = CURATED_TIMEZONES[safeidx]
  const offset = getTzOffset(current.tz, now)
  const localTime = (() => {
    try {
      return new Intl.DateTimeFormat('de-DE', { timeZone: current.tz, hour: '2-digit', minute: '2-digit' }).format(now)
    } catch { return '' }
  })()

  return (
    <div className="pt-1 space-y-2">
      <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>Zeitzone</span>
      <div className="flex items-center gap-3">
        {/* Drum */}
        <div style={{ position: 'relative', height: DRUM_H * 3, width: 120, overflow: 'hidden', borderRadius: 8, background: 'var(--bg-3)', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: DRUM_H, left: 0, right: 0, height: DRUM_H, background: 'rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none', zIndex: 1 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: DRUM_H, background: 'linear-gradient(to bottom, var(--bg-3) 10%, transparent 100%)', pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: DRUM_H, background: 'linear-gradient(to top, var(--bg-3) 10%, transparent 100%)', pointerEvents: 'none', zIndex: 2 }} />
          <div ref={ref} onScroll={handleScroll} style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <div style={{ height: DRUM_H }} />
            {CURATED_TIMEZONES.map((t, i) => (
              <div key={t.tz} style={{
                height: DRUM_H, scrollSnapAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                userSelect: 'none', gap: 1,
              }}>
                <span style={{ fontSize: 13, fontWeight: i === safeidx ? 700 : 400, color: i === safeidx ? 'var(--fg-1)' : 'rgba(255,255,255,0.28)', transition: 'color 0.1s', lineHeight: 1.2 }}>
                  {getTzOffset(t.tz, now)}
                </span>
                <span style={{ fontSize: 11, color: i === safeidx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', transition: 'color 0.1s', lineHeight: 1.2 }}>
                  {t.city}
                </span>
              </div>
            ))}
            <div style={{ height: DRUM_H }} />
          </div>
        </div>
        {/* Live info */}
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{current.city}</p>
          <p className="text-xs" style={{ color: 'var(--fg-4)' }}>{offset}</p>
          {localTime && <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--brand-blue)' }}>{localTime} Uhr</p>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-5 space-y-3"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Tab: Profil ─────────────────────────────────────────────────────────────

function ProfilTab() {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setDisplayName(d.display_name ?? '')
        setAvatarUrl(d.avatar_url ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveName = useCallback(async () => {
    setNameSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    })
    setNameSaving(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }, [displayName])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei zu groß — max. 10 MB')
      return
    }
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropSrc(URL.createObjectURL(file))
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleCropConfirm = useCallback(async () => {
    if (!cropSrc || !croppedAreaPixels) return
    setUploading(true)
    setCropSrc(null)
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels)
      setPreview(URL.createObjectURL(blob))
      const fd = new FormData()
      fd.append('avatar', blob, 'avatar.jpg')
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setAvatarUrl(data.avatar_url)
        setPreview(null)
        toast.success('Profilbild gespeichert')
      } else {
        toast.error(data.error ?? 'Upload fehlgeschlagen')
        setPreview(null)
      }
    } catch {
      toast.error('Verbindungsfehler beim Upload')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }, [cropSrc, croppedAreaPixels])

  const initial = displayName?.[0]?.toUpperCase() ?? '?'
  const displayImg = preview ?? avatarUrl

  if (loading) return (
    <div className="space-y-4">
      {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Section title="Profilbild" subtitle="Antippen zum Ändern · JPEG, PNG, WebP · max. 10 MB">
        <input
          id="avatar-file-input"
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <label
          htmlFor="avatar-file-input"
          className="group relative w-24 h-24 rounded-full cursor-pointer shrink-0 block"
          style={{ pointerEvents: uploading ? 'none' : 'auto' }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(255,130,16,0.18)', color: '#fff', overflow: 'hidden' }}
          >
            {displayImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
            ) : initial}
          </div>
          {uploading ? (
            <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div className="sm:hidden absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--brand-blue)', border: '2px solid var(--bg-2)' }}>
                <Camera className="h-3.5 w-3.5 text-white" />
              </div>
            </>
          )}
        </label>
      </Section>

      {/* Crop overlay */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setCropSrc(null)}
              className="text-[15px] font-medium active:opacity-60"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Abbrechen
            </button>
            <p className="text-[15px] font-semibold" style={{ color: '#fff' }}>Zuschneiden</p>
            <button
              onClick={handleCropConfirm}
              className="text-[15px] font-semibold active:opacity-60"
              style={{ color: 'var(--brand-blue)' }}
            >
              Fertig
            </button>
          </div>

          {/* Crop area */}
          <div className="flex-1 relative">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>

          {/* Zoom slider */}
          <div className="px-8 py-6 shrink-0" style={{ background: '#000' }}>
            <p className="text-[11px] uppercase tracking-widest text-center mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Zoom</p>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Display name */}
      <Section title="Anzeigename" subtitle="Wie soll dich NOUS nennen? Wird für Begrüßungen und KI-Kontext verwendet.">
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="z.B. Tobi"
            className="flex-1"
          />
          <Button
            onClick={saveName}
            disabled={nameSaving}
            className="h-8 px-4 text-[13px] font-semibold rounded shrink-0"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
          >
            {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? <Check className="h-4 w-4" /> : 'Speichern'}
          </Button>
        </div>
      </Section>

      {/* Font Size */}
      <FontSizeSection />

      {/* Workflow Reset */}
      <WorkflowResetSection />

      {/* Password */}
      <PasswordSection />
    </div>
  )
}

function WorkflowResetSection() {
  const [resetHour, setResetHour] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => setResetHour(d.workflow_reset_hour ?? 0))
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_reset_hour: resetHour }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <Section title="Workflow-Reset" subtitle="Zu welcher Uhrzeit soll sich der Tages-Workflow zurücksetzen?">
      <div className="flex items-center gap-3">
        <select
          value={resetHour}
          onChange={e => setResetHour(Number(e.target.value))}
          className="h-9 rounded px-3 text-sm flex-1"
          style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
        >
          {hours.map(h => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}:00 Uhr
            </option>
          ))}
        </select>
        <Button
          onClick={save}
          disabled={saving}
          className="h-9 px-4 text-[13px] font-semibold rounded shrink-0"
          style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : 'Speichern'}
        </Button>
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--fg-4)' }}>
        Vor dieser Uhrzeit zählt der aktuelle Workflow-Tag noch als "gestern". Ideal für Night-Trader.
      </p>
    </Section>
  )
}

function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const save = async () => {
    setError(null)
    if (next.length < 8) { setError('Neues Passwort muss mindestens 8 Zeichen haben.'); return }
    if (next !== confirm) { setError('Passwörter stimmen nicht überein.'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email ?? '',
        password: current,
      })
      if (signInErr) { setError('Aktuelles Passwort ist falsch.'); setSaving(false); return }
      const { error: updateErr } = await supabase.auth.updateUser({ password: next })
      if (updateErr) { setError(updateErr.message); setSaving(false); return }
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Passwort ändern" subtitle="Gib dein aktuelles Passwort ein und wähle ein neues.">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>Aktuelles Passwort</label>
          <Input
            type="password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>Neues Passwort</label>
          <Input
            type="password"
            value={next}
            onChange={e => setNext(e.target.value)}
            placeholder="Min. 8 Zeichen"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>Neues Passwort bestätigen</label>
          <Input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="text-[12px] font-medium" style={{ color: 'var(--short)' }}>{error}</p>
        )}
        <Button
          onClick={save}
          disabled={saving || !current || !next || !confirm}
          className="h-8 px-4 text-[13px] font-semibold rounded"
          style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <Check className="h-4 w-4" /> : 'Passwort ändern'}
        </Button>
      </div>
    </Section>
  )
}

function FontSizeSection() {
  const [size, setSize] = useState(16)

  useEffect(() => {
    setSize(getStoredFontSize())
  }, [])

  const change = (delta: number) => {
    const next = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size + delta))
    setSize(next)
    applyFontSize(next)
  }

  const label = size <= 13 ? 'Klein' : size <= 15 ? 'Normal' : size <= 17 ? 'Groß' : size <= 19 ? 'Sehr groß' : 'Maximum'

  return (
    <Section title="Schriftgröße" subtitle="Änderung gilt sofort in der gesamten App">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => change(-1)}
            disabled={size <= FONT_SIZE_MIN}
            className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
            style={{ width: 40, height: 40, background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-2)' }}
            aria-label="Schrift kleiner"
          >
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>A</span>
          </button>
          <span className="flex-1 text-center text-sm font-medium" style={{ color: 'var(--fg-3)' }}>{label}</span>
          <button
            onClick={() => change(1)}
            disabled={size >= FONT_SIZE_MAX}
            className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
            style={{ width: 40, height: 40, background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-2)' }}
            aria-label="Schrift größer"
          >
            <span style={{ fontSize: 19, fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>A</span>
          </button>
        </div>

        {/* Live preview */}
        <div className="rounded-lg px-4 py-3 space-y-1" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}>
          <p style={{ fontSize: `${size * 0.875}px`, color: 'var(--fg-1)', fontWeight: 500 }}>
            Dashboard — Heutige Performance
          </p>
          <p style={{ fontSize: `${size * 0.75}px`, color: 'var(--fg-3)' }}>
            +3 Trades · Win Rate 66% · P&L +$142.50
          </p>
        </div>
      </div>
    </Section>
  )
}

// ─── Tab: Strategie ─────────────────────────────────────────────────────────

type FullStrategy = Strategy & { id: string }

function StrategieTab() {
  const { activeAccount } = useAccountContext()
  const [strategies, setStrategies] = useState<FullStrategy[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)   // KI-Hauptstrategie
  const [expandedId, setExpandedId] = useState<string | null>(null) // welche ist aufgeklappt
  const [editFields, setEditFields] = useState<Strategy>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<{ name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Keep legacy selectedId alias so save/delete logic still works
  const selectedId = expandedId

  useEffect(() => {
    if (!activeAccount?.id) return
    setLoading(true)
    fetch(`/api/strategy?account_id=${activeAccount.id}`)
      .then(r => r.json())
      .then(data => {
        const list: FullStrategy[] = data.strategies ?? []
        setStrategies(list)
        if (list.length > 0) {
          // Restore active strategy from localStorage, fallback to first
          const stored = localStorage.getItem(`nous-active-strategy-${activeAccount.id}`)
          const storedValid = stored && list.some(s => s.id === stored)
          setActiveId(storedValid ? stored : list[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [activeAccount?.id])

  const expandStrategy = (s: FullStrategy) => {
    const alreadyOpen = expandedId === s.id
    setExpandedId(alreadyOpen ? null : s.id)
    if (!alreadyOpen) {
      setEditFields({ name: s.name, description: s.description, rules: s.rules, preferred_timeframes: s.preferred_timeframes, instruments: s.instruments })
      setSaved(false)
      setAddingNew(false)
    }
  }

  const activateStrategy = (s: FullStrategy, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveId(s.id)
    if (activeAccount?.id) localStorage.setItem(`nous-active-strategy-${activeAccount.id}`, s.id)
  }

  const save = useCallback(async () => {
    if (!selectedId) return
    setSaving(true)
    const res = await fetch(`/api/strategy/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editFields),
    })
    setSaving(false)
    if (res.ok) {
      setStrategies(prev => prev.map(s => s.id === selectedId ? { ...s, ...editFields } : s))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }, [editFields, selectedId])

  const createNew = async () => {
    const name = newName.trim()
    if (!name || !activeAccount?.id) return
    setCreatingNew(true)
    const res = await fetch('/api/strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: activeAccount.id, name, description: '', rules: [], preferred_timeframes: [], instruments: [] }),
    })
    setCreatingNew(false)
    if (res.ok) {
      const data = await res.json()
      const newS: FullStrategy = { id: data.id, name, description: '', rules: [], preferred_timeframes: [], instruments: [] }
      setStrategies(prev => [...prev, newS])
      setExpandedId(data.id)
      setEditFields({ name, description: '', rules: [], preferred_timeframes: [], instruments: [] })
      setAddingNew(false)
      setNewName('')
    }
  }

  const requestDelete = (s: FullStrategy) => {
    setConfirmDeleteId(s.id)
    setDeleteInfo({ name: s.name })
  }

  const doDelete = async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    const res = await fetch(`/api/strategy/${confirmDeleteId}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      const data = await res.json()
      if (data.tradesAffected > 0) {
        toast.warning(`Strategie gelöscht. ${data.tradesAffected} Trade${data.tradesAffected === 1 ? '' : 's'} referenzieren sie noch.`)
      } else {
        toast.success('Strategie gelöscht.')
      }
      const deletedId = confirmDeleteId
      setStrategies(prev => {
        const next = prev.filter(s => s.id !== deletedId)
        if (expandedId === deletedId) setExpandedId(null)
        if (activeId === deletedId) {
          const fallback = next[0]?.id ?? null
          setActiveId(fallback)
          if (activeAccount?.id && fallback) localStorage.setItem(`nous-active-strategy-${activeAccount.id}`, fallback)
        }
        return next
      })
      setConfirmDeleteId(null)
      setDeleteInfo(null)
    }
  }

  const addRule = () => {
    const r = newRule.trim()
    if (!r) return
    setEditFields(s => ({ ...s, rules: [...s.rules, r] }))
    setNewRule('')
  }

  const removeRule = (i: number) =>
    setEditFields(s => ({ ...s, rules: s.rules.filter((_, j) => j !== i) }))

  const toggleTF = (tf: string) =>
    setEditFields(s => ({
      ...s,
      preferred_timeframes: s.preferred_timeframes.includes(tf)
        ? s.preferred_timeframes.filter(t => t !== tf)
        : [...s.preferred_timeframes, tf],
    }))

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-2)' }}>
          Strategien ({strategies.length})
        </p>
        {!addingNew && (
          <Button
            onClick={() => { setAddingNew(true); setNewName('') }}
            className="h-7 px-3 text-[13px] font-semibold rounded gap-1"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Neue Strategie
          </Button>
        )}
      </div>

      {addingNew && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Name der neuen Strategie…"
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); createNew() }
              if (e.key === 'Escape') { setAddingNew(false); setNewName('') }
            }}
          />
          <Button
            onClick={createNew}
            disabled={creatingNew || !newName.trim()}
            className="h-9 px-3 shrink-0 rounded"
            style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
          >
            {creatingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Anlegen'}
          </Button>
          <Button
            onClick={() => { setAddingNew(false); setNewName('') }}
            className="h-9 w-9 p-0 shrink-0 rounded"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {strategies.length === 0 && !addingNew && (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--fg-4)' }}>
          Noch keine Strategien angelegt.
        </p>
      )}

      {/* Strategy list */}
      <div className="space-y-1.5">
        {strategies.map(s => {
          const isOpen = expandedId === s.id
          const isActive = activeId === s.id
          return (
            <div
              key={s.id}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${isOpen ? 'rgba(255,255,255,0.15)' : 'var(--border-raw)'}` }}
            >
              {confirmDeleteId === s.id ? (
                <div
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{ background: 'rgba(239, 68, 68, 0.08)' }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: '#ef4444' }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--fg-2)' }}>
                    „{deleteInfo?.name}" wirklich löschen?
                  </span>
                  <Button
                    onClick={doDelete}
                    disabled={deleting}
                    className="h-7 px-3 text-[12px] font-semibold rounded shrink-0"
                    style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Löschen'}
                  </Button>
                  <Button
                    onClick={() => { setConfirmDeleteId(null); setDeleteInfo(null) }}
                    className="h-7 px-3 text-[12px] font-semibold rounded shrink-0"
                    style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
                  >
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <>
                  {/* Header row: [radio] [name] [KI-badge] [delete] [chevron] */}
                  <div
                    className="flex items-center gap-3 px-3 py-3 select-none"
                    style={{ background: isOpen ? 'var(--bg-3)' : 'var(--bg-2)' }}
                  >
                    {/* Radio button — click to set as KI-Aktiv */}
                    <button
                      type="button"
                      onClick={e => activateStrategy(s, e)}
                      className="shrink-0 flex items-center justify-center rounded-full transition-all"
                      style={{
                        width: 20, height: 20,
                        border: `2px solid ${isActive ? 'var(--brand-blue)' : 'var(--fg-4)'}`,
                        background: isActive ? 'var(--brand-blue)' : 'transparent',
                      }}
                      title="Als KI-Hauptstrategie setzen"
                    >
                      {isActive && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                      )}
                    </button>

                    {/* Name — click to expand/collapse editor */}
                    <button
                      type="button"
                      className="flex-1 text-left text-sm font-semibold"
                      style={{ color: 'var(--fg-1)' }}
                      onClick={() => expandStrategy(s)}
                    >
                      {s.name}
                    </button>

                    {isActive && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: 'rgba(41,98,255,0.15)', color: 'var(--brand-blue)' }}
                      >
                        KI-Aktiv
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); requestDelete(s) }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                      aria-label={`Strategie "${s.name}" löschen`}
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                    </button>

                    {/* Chevron — expand/collapse */}
                    <button
                      type="button"
                      onClick={() => expandStrategy(s)}
                      className="p-1.5 rounded-lg transition-colors shrink-0"
                      style={{ color: 'var(--fg-4)' }}
                      aria-label={isOpen ? 'Zuklappen' : 'Aufklappen'}
                    >
                      <ChevronRight
                        className="h-4 w-4 transition-transform duration-200"
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      />
                    </button>
                  </div>

                  {/* Inline editor (accordion body) */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-3 space-y-4" style={{ borderTop: '1px solid var(--border-raw)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                          Die KI nutzt das Strategie-Profil für alle Analysen.
                        </p>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            onClick={() => setEditFields(EXAMPLE_STRATEGY)}
                            className="h-7 px-3 text-[12px] font-semibold rounded"
                            style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
                          >
                            Beispiel
                          </Button>
                          <Button
                            onClick={save}
                            disabled={saving}
                            className="h-7 px-3 text-[12px] font-semibold rounded gap-1"
                            style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
                            {saved ? 'Gespeichert' : 'Speichern'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Name</p>
                          <Input
                            value={editFields.name}
                            onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                            placeholder="z.B. Trend-Following mit Breakout-Entries"
                          />
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Beschreibung</p>
                          <Textarea
                            rows={3}
                            value={editFields.description}
                            onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                            placeholder="Beschreibe deinen Trading-Stil, Ansatz und Philosophie…"
                            className="resize-none"
                          />
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Trading-Regeln</p>
                          <div className="space-y-1.5">
                            {editFields.rules.map((rule, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 rounded px-3 py-2"
                                style={{ background: 'var(--bg-3)' }}
                              >
                                <span className="num text-xs shrink-0 mt-0.5" style={{ color: 'var(--fg-4)' }}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="text-sm flex-1" style={{ color: 'var(--fg-1)' }}>{rule}</span>
                                <button onClick={() => removeRule(i)}>
                                  <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input
                                value={newRule}
                                onChange={e => setNewRule(e.target.value)}
                                placeholder="Neue Regel hinzufügen…"
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRule())}
                              />
                              <Button
                                type="button"
                                onClick={addRule}
                                className="h-9 px-3 shrink-0 rounded"
                                style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Timeframes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {TIMEFRAME_OPTIONS.map(tf => {
                              const active = editFields.preferred_timeframes.includes(tf)
                              return (
                                <button
                                  key={tf}
                                  onClick={() => toggleTF(tf)}
                                  className="num text-xs font-semibold px-2.5 py-1 rounded transition-colors"
                                  style={{
                                    background: active ? 'var(--brand-blue)' : 'var(--bg-3)',
                                    color: active ? '#fff' : 'var(--fg-2)',
                                    border: `1px solid ${active ? 'var(--brand-blue)' : 'var(--border-raw)'}`,
                                  }}
                                >
                                  {tf}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Instrumente</p>
                          <AssetMultiPicker
                            value={editFields.instruments}
                            onChange={instruments => setEditFields(f => ({ ...f, instruments }))}
                            placeholder="Asset aus Watchlist…"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: Konten ─────────────────────────────────────────────────────────────

function KontenTab() {
  const { accounts, activeAccount, isLoading, setActiveAccount, archiveAccount, deleteAccount } = useAccounts()
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  async function handleArchive(account: Account) {
    setArchiveError(null)
    const { error } = await archiveAccount(account.id)
    if (error) {
      setArchiveError(error.message)
    } else {
      toast.success(`„${account.name}" archiviert.`)
    }
  }

  async function handleDelete(accountId: string) {
    const { error } = await deleteAccount(accountId)
    if (error) {
      toast.error('Konto konnte nicht gelöscht werden.')
    } else {
      toast.success('Konto gelöscht.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
          {accounts.length}/10 Konten · Klick auf ein Konto, um es zu aktivieren.
        </p>
        <AccountCreateDialog />
      </div>

      {archiveError && (
        <Alert variant="destructive">
          <AlertDescription>{archiveError}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div
          className="rounded-lg border border-dashed p-12 text-center space-y-4"
          style={{ borderColor: 'var(--border-raw)' }}
        >
          <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Noch kein Konto angelegt.</p>
          <AccountCreateDialog
            trigger={
              <Button
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Erstes Konto erstellen
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              isActive={account.id === activeAccount?.id}
              onSelect={setActiveAccount}
              onArchive={handleArchive}
              onDelete={acc => setAccountToDelete(acc)}
            />
          ))}
        </div>
      )}

      <AccountDeleteDialog
        account={accountToDelete}
        onConfirm={handleDelete}
        onClose={() => setAccountToDelete(null)}
      />

      {/* Archive info */}
      {accounts.length > 0 && (
        <div className="flex items-start gap-2 rounded px-4 py-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
          <Archive className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--fg-4)' }} />
          <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
            Archivierte Konten werden aus dem aktiven Wechsler entfernt, aber alle Trades bleiben erhalten und können exportiert werden.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: API Key ─────────────────────────────────────────────────────────────

function ApiKeyTab() {
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiSaving, setAiSaving] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)

  useEffect(() => {
    fetch('/api/ai-settings').then(r => r.json()).then(d => {
      setAiApiKey(d.api_key ?? '')
    })
  }, [])

  const saveAiSettings = useCallback(async () => {
    setAiSaving(true)
    await fetch('/api/ai-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', api_key: aiApiKey || null }),
    })
    setAiSaving(false)
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2500)
  }, [aiApiKey])

  return (
    <div className="space-y-6">
      <Section title="Claude API-Key" subtitle="Eigenen Anthropic API-Key hinterlegen — NOUS nutzt dann dein Konto statt des Server-Schlüssels.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
              Anthropic API-Key — wird verschlüsselt in deiner DB-Row gespeichert, nur du kannst ihn lesen.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                <Input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder="sk-ant-…"
                  className="pl-9"
                />
              </div>
              <Button
                onClick={saveAiSettings}
                disabled={aiSaving}
                className="h-9 px-4 text-sm font-semibold rounded shrink-0"
                style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
              >
                {aiSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : aiSaved ? <Check className="h-3.5 w-3.5" /> : 'Speichern'}
              </Button>
            </div>
            {!aiApiKey && (
              <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                Kein eigener Key — NOUS nutzt den Server-Schlüssel (Shared Budget).
              </p>
            )}
            <div
              className="flex items-start gap-2 px-3 py-2 rounded text-xs"
              style={{ background: 'rgba(41,98,255,0.08)', borderLeft: '2px solid var(--brand-blue)' }}
            >
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--brand-blue)' }} />
              <p style={{ color: 'var(--fg-3)' }}>
                Damit alle Funktionen verfügbar sind, lade dein Anthropic-Konto mit mindestens 5 € auf.{' '}
                <a
                  href="https://console.anthropic.com/settings/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:opacity-80"
                  style={{ color: 'var(--brand-blue)' }}
                >
                  Guthaben aufladen →
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded px-4 py-3 flex items-start gap-3" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}>
              <Brain className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-blue)' }} />
              <div className="space-y-1">
                <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                  Jede KI-Analyse kostet ca. <span style={{ color: 'var(--fg-1)' }}>$0.002–$0.01</span> — bei normalem Nutzungsverhalten unter <span style={{ color: 'var(--fg-1)' }}>$5/Monat</span>.
                </p>
                <p className="text-xs" style={{ color: 'var(--warn)' }}>
                  Mindest-Aufladung: <span className="font-semibold">$5</span> — Anthropic aktiviert den Key erst ab diesem Betrag.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold hover:opacity-80"
                style={{ background: 'var(--brand-blue)', color: '#fff' }}>
                <ExternalLink className="h-3 w-3" /> Billing öffnen
              </Link>
              <Link href="https://console.anthropic.com/settings/usage" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold hover:opacity-80"
                style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}>
                <ExternalLink className="h-3 w-3" /> API Usage
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

// ─── Browser detection helper ─────────────────────────────────────────────────

function getBrowserInfo() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent

  let browser = 'Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'

  let os = 'System'
  if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Mac/.test(ua)) os = 'macOS'
  else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Linux/.test(ua)) os = 'Linux'

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  const instructions: Record<string, string> = {
    'Chrome-macOS':   'Adressleiste → Schloss-Icon → „Website-Einstellungen" → „Benachrichtigungen" → „Zulassen"',
    'Chrome-Windows': 'Adressleiste → Schloss-Icon → „Website-Einstellungen" → „Benachrichtigungen" → „Zulassen"',
    'Chrome-Android': 'Chrome-Menü (⋮) → „Einstellungen" → „Website-Einstellungen" → „Benachrichtigungen" → getnous.de → „Zulassen"',
    'Safari-macOS':   'Safari-Menü → „Einstellungen…" (⌘,) → Tab „Websites" → „Benachrichtigungen" → getnous.de → „Erlauben". Falls getnous.de dort fehlt: zuerst im Browser-Tab auf „Aktivieren" klicken.',
    'Safari-iOS':     'Nur als installierte App möglich (iOS 16.4+): Im Browser auf „Teilen" → „Zum Home-Bildschirm" → App öffnen → dort auf „Aktivieren" tippen.',
    'Firefox-macOS':  'Adressleiste → Schloss-Icon → „Verbindung sicher" → „Berechtigungen" → Benachrichtigungen freigeben',
    'Firefox-Windows':'Adressleiste → Schloss-Icon → „Verbindung sicher" → „Berechtigungen" → Benachrichtigungen freigeben',
    'Edge-macOS':     'Adressleiste → Schloss-Icon → „Berechtigungen für diese Website" → „Benachrichtigungen" → „Zulassen"',
    'Edge-Windows':   'Adressleiste → Schloss-Icon → „Berechtigungen für diese Website" → „Benachrichtigungen" → „Zulassen"',
  }

  // Installed PWA (Dock/Home Screen) has its own permission context separate from the browser
  const standaloneInstructions = os === 'macOS'
    ? 'Als installierte App gelten eigene System-Berechtigungen: Systemeinstellungen → „Mitteilungen" → „NOUS" → Mitteilungen erlauben. Danach App neu starten und hier aktivieren.'
    : 'Als installierte App: Einstellungen → Apps → NOUS → Benachrichtigungen → Erlauben.'

  const key = `${browser}-${os}`
  const fallback = instructions[`${browser}-macOS`] ?? 'Browser-Einstellungen → Benachrichtigungen für getnous.de erlauben'
  return { browser, os, isStandalone, instructions: isStandalone ? standaloneInstructions : (instructions[key] ?? fallback) }
}

// ─── Tab: Benachrichtigungen ──────────────────────────────────────────────────

function BenachrichtigungenTab() {
  const [notifEmail, setNotifEmail] = useState('')
  const [notifEmailEnabled, setNotifEmailEnabled] = useState(false)
  const [propFirmReminderEnabled, setPropFirmReminderEnabled] = useState(false)
  const [highImpactAlertsEnabled, setHighImpactAlertsEnabled] = useState(false)
  const [weeklyPrepTime, setWeeklyPrepTime] = useState('09:00')
  const [propFirmTime, setPropFirmTime] = useState('07:00')
  const [notifTimezone, setNotifTimezone] = useState(() => {
    if (typeof window !== 'undefined') {
      return normalizeToCurated(Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
    return 'Europe/Berlin'
  })
  const [notifSaving, setNotifSaving] = useState(false)
  const { permission, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()

  useEffect(() => {
    fetch('/api/notifications/settings').then(r => r.json()).then(d => {
      setNotifEmailEnabled(d.email_enabled ?? false)
      setNotifEmail(d.email_address ?? '')
      setPropFirmReminderEnabled(d.prop_firm_reminder_enabled ?? false)
      setHighImpactAlertsEnabled(d.high_impact_alerts_enabled ?? false)
      setWeeklyPrepTime(d.weekly_prep_time ?? '09:00')
      setPropFirmTime(d.prop_firm_reminder_time ?? '07:00')
      if (d.notification_timezone) setNotifTimezone(normalizeToCurated(d.notification_timezone))
    })
  }, [])

  const saveNotifSettings = useCallback(async () => {
    setNotifSaving(true)
    await fetch('/api/notifications/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_enabled: notifEmailEnabled,
        email_address: notifEmail,
        prop_firm_reminder_enabled: propFirmReminderEnabled,
        high_impact_alerts_enabled: highImpactAlertsEnabled,
        weekly_prep_time: weeklyPrepTime,
        prop_firm_reminder_time: propFirmTime,
        notification_timezone: notifTimezone,
      }),
    })
    setNotifSaving(false)
    toast.success('Einstellungen gespeichert')
  }, [notifEmailEnabled, notifEmail, propFirmReminderEnabled, highImpactAlertsEnabled, weeklyPrepTime, propFirmTime, notifTimezone])

  const handlePushToggle = async () => {
    if (subscribed || permission === 'granted') {
      await unsubscribe()
      toast.success('Push-Benachrichtigungen deaktiviert')
    } else {
      const ok = await subscribe()
      if (ok) toast.success('Push-Benachrichtigungen aktiviert')
      else if (permission === 'denied') toast.error('Browser hat Benachrichtigungen blockiert — bitte in Browser-Einstellungen erlauben')
    }
  }

  const sendTestNotification = async () => {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('NOUS — Test', {
      body: 'Push-Benachrichtigungen funktionieren! Samstag & Sonntag erhältst du eine Erinnerung.',
      icon: '/icon.png',
      badge: '/icon.png',
      image: '/icon.png',
      tag: 'nous-test',
      data: { url: '/wochenvorbereitung' },
    } as NotificationOptions)
  }

  return (
    <div className="space-y-6">
      <Section title="Browser Push" subtitle="Erinnerungen für Wochenvorbereitung — samstags & sonntags">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {(subscribed || permission === 'granted') ? (
                <Bell className="h-4 w-4" style={{ color: 'var(--long)' }} />
              ) : (
                <BellOff className="h-4 w-4" style={{ color: 'var(--fg-4)' }} />
              )}
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Browser Push</p>
                {permission === 'denied' ? (() => {
                  const info = getBrowserInfo()
                  return (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs font-medium" style={{ color: 'rgba(255,80,80,0.85)' }}>
                        Blockiert in {info?.browser ?? 'Browser'} auf {info?.os ?? 'deinem System'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-4)' }}>
                        {info?.instructions}
                      </p>
                    </div>
                  )
                })() : (
                  <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                    {permission === 'unsupported'
                      ? 'Von diesem Browser nicht unterstützt'
                      : subscribed || permission === 'granted'
                      ? 'Aktiv — du erhältst Samstag & Sonntag eine Erinnerung'
                      : 'Einmalige Browser-Erlaubnis nötig'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {(subscribed || permission === 'granted') && (
                <Button
                  onClick={sendTestNotification}
                  className="h-8 px-3 text-xs font-semibold rounded"
                  style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
                >
                  Test
                </Button>
              )}
              <Button
                onClick={handlePushToggle}
                disabled={pushLoading || permission === 'denied' || permission === 'unsupported'}
                className="h-8 px-3 text-xs font-semibold rounded"
                style={{
                  background: (subscribed || permission === 'granted') ? 'var(--bg-3)' : 'var(--brand-blue)',
                  color: (subscribed || permission === 'granted') ? 'var(--fg-2)' : '#fff',
                  border: (subscribed || permission === 'granted') ? '1px solid var(--border-raw)' : 'none',
                }}
              >
                {pushLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                  (subscribed || permission === 'granted') ? 'Deaktivieren' : 'Aktivieren'}
              </Button>
            </div>
          </div>

          {/* Weekly prep time picker */}
          {(subscribed || permission === 'granted') && (
            <TimePickerRow
              label="Uhrzeit Sa & So"
              value={weeklyPrepTime}
              onChange={setWeeklyPrepTime}
            />
          )}
        </div>
      </Section>

      <Section title="Prop-Firm Regelwerk" subtitle="Mo–Fr — deine Regeln als Push-Erinnerung vor dem Trading">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4" style={{ color: propFirmReminderEnabled ? 'var(--brand-blue)' : 'var(--fg-4)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Täglich erinnern</p>
            </div>
            <button
              onClick={() => setPropFirmReminderEnabled(v => !v)}
              disabled={!(subscribed || permission === 'granted')}
              className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                width: 50, height: 28, borderRadius: 14, padding: 3,
                background: propFirmReminderEnabled ? 'var(--brand-blue)' : 'rgba(255,255,255,0.15)',
                transition: 'background 200ms',
                display: 'flex', alignItems: 'center',
              }}
            >
              <span style={{
                display: 'block', width: 22, height: 22, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                transform: `translateX(${propFirmReminderEnabled ? 22 : 0}px)`,
                transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            </button>
          </div>
          {propFirmReminderEnabled && !(subscribed || permission === 'granted') && (
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Browser Push muss erst aktiviert sein.</p>
          )}
          {propFirmReminderEnabled && (subscribed || permission === 'granted') && (
            <TimePickerRow
              label="Uhrzeit Mo–Fr"
              value={propFirmTime}
              onChange={setPropFirmTime}
            />
          )}
        </div>
      </Section>

      <Section title="Wirtschaftskalender Alerts" subtitle="30 Minuten vor jedem High-Impact Event — nur wenn Push aktiviert ist">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4" style={{ color: highImpactAlertsEnabled ? 'var(--short)' : 'var(--fg-4)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>High-Impact Event Alerts</p>
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  {!(subscribed || permission === 'granted')
                    ? 'Browser Push muss erst aktiviert sein'
                    : 'NFP, CPI, Zinsentscheide — 30min vorher'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setHighImpactAlertsEnabled(v => !v)}
              disabled={!(subscribed || permission === 'granted')}
              className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                width: 50, height: 28, borderRadius: 14, padding: 3,
                background: highImpactAlertsEnabled ? 'var(--brand-blue)' : 'rgba(255,255,255,0.15)',
                transition: 'background 200ms',
                display: 'flex', alignItems: 'center',
              }}
            >
              <span style={{
                display: 'block', width: 22, height: 22, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                transform: `translateX(${highImpactAlertsEnabled ? 22 : 0}px)`,
                transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            </button>
          </div>
        </div>
      </Section>

      <Section title="Zeitzone" subtitle="Gilt für alle Benachrichtigungen — Uhrzeiten werden in dieser Zeitzone interpretiert">
        <div className="space-y-3">
          <TimezoneDrum value={notifTimezone} onChange={setNotifTimezone} />
        </div>
      </Section>

      <Section title="E-Mail Erinnerung" subtitle="Benötigt einen konfigurierten Resend-Key (RESEND_API_KEY)">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4" style={{ color: notifEmailEnabled ? 'var(--brand-blue)' : 'var(--fg-4)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>E-Mail aktivieren</p>
            </div>
            <button
              onClick={() => setNotifEmailEnabled(v => !v)}
              className="shrink-0"
              style={{
                width: 50, height: 28, borderRadius: 14, padding: 3,
                background: notifEmailEnabled ? 'var(--brand-blue)' : 'rgba(255,255,255,0.15)',
                transition: 'background 200ms',
                display: 'flex', alignItems: 'center',
              }}
            >
              <span style={{
                display: 'block', width: 22, height: 22, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                transform: `translateX(${notifEmailEnabled ? 22 : 0}px)`,
                transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            </button>
          </div>
          {notifEmailEnabled && (
            <Input
              type="email"
              value={notifEmail}
              onChange={e => setNotifEmail(e.target.value)}
              placeholder="deine@email.de"
            />
          )}
        </div>
      </Section>

      {/* Speichern — prominent, covers all notification settings */}
      <Button
        onClick={saveNotifSettings}
        disabled={notifSaving}
        className="w-full h-10 text-sm font-semibold rounded-lg"
        style={{ background: 'var(--brand-blue)', color: '#fff' }}
      >
        {notifSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
        Benachrichtigungseinstellungen speichern
      </Button>
    </div>
  )
}

// ─── Tab: Knowledge Base ──────────────────────────────────────────────────────

interface KnowledgeDoc {
  id: string
  name: string
  file_size: number
  status: 'processing' | 'ready' | 'error'
  error_message: string | null
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function KnowledgeBaseTab() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [kbLoading, setKbLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [kbTab, setKbTab] = useState<'pdf' | 'text'>('pdf')
  const [textName, setTextName] = useState('')
  const [textContent, setTextContent] = useState('')
  const [savingText, setSavingText] = useState(false)
  const kbInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    const res = await fetch('/api/knowledge-base')
    const data = await res.json()
    setDocs(data.documents ?? [])
    setKbLoading(false)
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Nur PDF-Dateien erlaubt'); return }
    if (file.size > 100 * 1024 * 1024) { toast.error('Datei zu groß (max. 100 MB)'); return }
    setUploading(true)
    setUploadStatus('1/3 · Startet…')
    const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
    const fileMB = (file.size / (1024 * 1024)).toFixed(1)
    let claudeTimer: ReturnType<typeof setInterval> | null = null
    try {
      const urlRes = await fetch('/api/knowledge-base/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) { toast.error(urlData.error ?? 'Nicht eingeloggt — bitte Seite neu laden'); return }
      const { signedUrl, storagePath } = urlData

      setUploadStatus(`2/3 · Hochladen (${fileMB} MB)…`)
      const formData = new FormData()
      formData.append('cacheControl', '3600')
      formData.append('', file)
      const uploadRes = await fetch(signedUrl, { method: 'PUT', body: formData, headers: { 'x-upsert': 'false' } })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '')
        toast.error(`Upload fehlgeschlagen (${uploadRes.status})`)
        console.error('Storage upload error:', errText)
        return
      }
      setUploadStatus('2/3 · Hochgeladen ✓')

      let elapsed = 0
      setUploadStatus('3/3 · Claude liest Dokument… 0s')
      claudeTimer = setInterval(() => { elapsed++; setUploadStatus(`3/3 · Claude liest Dokument… ${elapsed}s`) }, 1000)

      const res = await fetch('/api/knowledge-base/vision-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, name, fileSize: file.size }),
      })
      clearInterval(claudeTimer)
      claudeTimer = null
      if (!res.ok) {
        if (res.status === 504) {
          toast.error('Zeitüberschreitung — PDF zu groß. Bitte in kleinere Teile aufteilen (max. ~50 Seiten).')
        } else {
          const d = await res.json().catch(() => ({})) as { error?: string }
          toast.error(d.error ?? 'Verarbeitung fehlgeschlagen')
        }
        return
      }
      const data = await res.json()
      toast.success(`"${name}" hochgeladen und mit KI analysiert`)
      loadDocs()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Fehler: ${msg}`)
      console.error('PDF upload error:', err)
    } finally {
      if (claudeTimer) clearInterval(claudeTimer)
      setUploading(false)
      setUploadStatus('')
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  const handleSaveText = async () => {
    if (!textName.trim() || !textContent.trim()) { toast.error('Bitte Name und Inhalt ausfüllen'); return }
    setSavingText(true)
    const res = await fetch('/api/knowledge-base/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: textName.trim(), text: textContent.trim() }),
    })
    const data = await res.json()
    setSavingText(false)
    if (!res.ok) { toast.error(data.error ?? 'Fehler beim Speichern'); return }
    toast.success(`"${textName}" gespeichert`)
    setTextName('')
    setTextContent('')
    loadDocs()
  }

  const startRename = (doc: KnowledgeDoc) => { setRenamingId(doc.id); setRenameValue(doc.name) }

  const commitRename = async (id: string) => {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    await fetch(`/api/knowledge-base/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setDocs(prev => prev.map(d => d.id === id ? { ...d, name } : d))
    setRenamingId(null)
  }

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id)
    const res = await fetch(`/api/knowledge-base/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== id))
      toast.success(`"${name}" gelöscht`)
    } else {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg px-5 py-4 flex items-start gap-3"
        style={{ background: 'rgba(41,98,255,0.08)', border: '1px solid rgba(41,98,255,0.2)' }}
      >
        <Brain className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-blue)' }} />
        <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
          Die KI liest deine hochgeladenen Dokumente und bezieht sich bei Trade-Analysen und der Wochenvorbereitung explizit darauf.
        </p>
      </div>

      {/* Upload tabs */}
      <div className="space-y-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
          {([
            { id: 'pdf' as const, label: 'PDF hochladen', icon: Upload },
            { id: 'text' as const, label: 'Text einfügen', icon: Type },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setKbTab(id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors"
              style={{
                background: kbTab === id ? 'var(--bg-3)' : 'transparent',
                color: kbTab === id ? 'var(--fg-1)' : 'var(--fg-3)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {kbTab === 'pdf' && (
          <div
            className="rounded-lg border-2 border-dashed transition-colors"
            style={{ borderColor: dragOver ? 'var(--brand-blue)' : 'var(--border-raw)' }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          >
            <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--brand-blue)' }} />
                  <p className="text-sm" style={{ color: 'var(--fg-3)' }}>{uploadStatus || 'Startet…'}</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 opacity-30" style={{ color: 'var(--fg-3)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>PDF hierher ziehen oder</p>
                    <button onClick={() => kbInputRef.current?.click()} className="text-sm underline" style={{ color: 'var(--brand-blue)' }}>
                      Datei auswählen
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Nur PDF · max. 100 MB · max. 10 Dokumente</p>
                </>
              )}
            </div>
            <input ref={kbInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>
        )}

        {kbTab === 'text' && (
          <div className="rounded-lg p-5 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Für passwortgeschützte PDFs oder andere Formate: Inhalt direkt einfügen.</p>
            <Input
              value={textName}
              onChange={e => setTextName(e.target.value)}
              placeholder="Name des Dokuments"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-1)' }}
            />
            <Textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Inhalt hier einfügen…"
              rows={10}
              className="resize-none font-mono text-xs"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-1)' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--fg-4)' }}>{textContent.length.toLocaleString('de-DE')} / 200.000 Zeichen</span>
              <Button
                onClick={handleSaveText}
                disabled={savingText || !textName.trim() || !textContent.trim()}
                className="h-8 px-4 text-[13px] font-semibold rounded"
                style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
              >
                {savingText ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                Speichern
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>
          Dokumente ({docs.length}/10)
        </p>
        {kbLoading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: 'var(--fg-4)' }}>
            <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Laden…</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-lg py-8 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--fg-4)' }} />
            <p className="text-sm" style={{ color: 'var(--fg-4)' }}>Noch keine Dokumente hochgeladen</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
                <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--fg-4)' }} />
                <div className="flex-1 min-w-0">
                  {renamingId === doc.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(doc.id); if (e.key === 'Escape') setRenamingId(null) }}
                        onBlur={() => commitRename(doc.id)}
                        className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b outline-none"
                        style={{ color: 'var(--fg-1)', borderColor: 'var(--brand-blue)' }}
                      />
                      <button onClick={() => commitRename(doc.id)}><Check className="h-3.5 w-3.5" style={{ color: 'var(--long)' }} /></button>
                      <button onClick={() => setRenamingId(null)}><X className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startRename(doc)} className="flex items-center gap-1.5 group/name w-full text-left">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--fg-1)' }}>{doc.name}</p>
                      <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" style={{ color: 'var(--fg-4)' }} />
                    </button>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
                    {formatBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('de-DE')}
                  </p>
                  {doc.status === 'error' && doc.error_message && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--short)' }}>{doc.error_message}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {doc.status === 'processing' && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-4)' }}><Loader2 className="h-3 w-3 animate-spin" /> Verarbeitung…</span>}
                  {doc.status === 'ready' && <CheckCircle className="h-4 w-4" style={{ color: 'var(--long)' }} />}
                  {doc.status === 'error' && <AlertTriangle className="h-4 w-4" style={{ color: 'var(--short)' }} />}
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  disabled={deletingId === doc.id}
                  className="shrink-0 p-1 rounded transition-colors"
                  style={{ color: 'var(--fg-4)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--short)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-4)')}
                >
                  {deletingId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Tradingplan ─────────────────────────────────────────────────────────

interface TradingPlanSection {
  section_key: string
  rules: string[]
  notes: string
  updated_at: string | null
}

interface AISuggestion {
  rules: string[]
  notes: string
  source: string
}

const TRADING_PLAN_SECTIONS = [
  { key: 'strategie_uebersicht', title: 'Strategie-Übersicht', description: 'Was ist deine Strategie, Markttyp, Timeframes, Assets' },
  { key: 'setup_kriterien', title: 'Setup-Kriterien', description: 'Genaue Bedingungen, die erfüllt sein müssen, bevor du einen Trade nimmst' },
  { key: 'entry_exit_regeln', title: 'Entry & Exit Regeln', description: 'Entry-Bedingungen, SL-Platzierung, TP-Ziele, Trailing-Stop-Regeln' },
  { key: 'risiko_regeln', title: 'Risiko-Regeln', description: 'Max Risk per Trade, Max Daily Loss, Drawdown-Grenze, Positionsgrößen' },
  { key: 'psychologie_mindset', title: 'Psychologie & Mindset', description: 'Regeln für emotionales Trading, Selbst-Check vor dem Trade' },
  { key: 'verbotene_verhaltensweisen', title: 'Verbotene Verhaltensweisen', description: 'Explizite No-Gos — was du unter keinen Umständen tust' },
  { key: 'review_prozess', title: 'Review-Prozess', description: 'Wie und wie oft du Trades reviewst, worauf du achtest' },
  { key: 'prop_firm_regeln', title: 'Prop-Firm Regeln', description: 'Spezifische Regeln für Prop-Firm Konten' },
] as const

type SectionKey = typeof TRADING_PLAN_SECTIONS[number]['key']

function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function TradingPlanSectionPanel({
  sectionDef,
  data,
  hasKbDocs,
  onSaved,
}: {
  sectionDef: typeof TRADING_PLAN_SECTIONS[number]
  data: TradingPlanSection | undefined
  hasKbDocs: boolean
  onSaved: (section: TradingPlanSection) => void
}) {
  const [rules, setRules] = useState<string[]>(data?.rules ?? [])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [notes, setNotes] = useState(data?.notes ?? '')
  const [newRule, setNewRule] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editingVal, setEditingVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(data?.updated_at ?? null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiRules, setAiRules] = useState<string[]>([])
  const [aiNotes, setAiNotes] = useState('')

  const toggleCheck = (idx: number) => setChecked(prev => {
    const next = new Set(prev)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    return next
  })

  const checkedCount = checked.size

  // Sync external data on first load
  useEffect(() => {
    setRules(data?.rules ?? [])
    setNotes(data?.notes ?? '')
    setSavedAt(data?.updated_at ?? null)
  }, [data?.section_key]) // eslint-disable-line react-hooks/exhaustive-deps

  const addRule = () => {
    const r = newRule.trim()
    if (!r) return
    setRules(prev => [...prev, r])
    setNewRule('')
  }

  const deleteRule = (idx: number) => setRules(prev => prev.filter((_, i) => i !== idx))

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditingVal(rules[idx] ?? '')
  }

  const commitEdit = (idx: number) => {
    const v = editingVal.trim()
    if (v) setRules(prev => prev.map((r, i) => i === idx ? v : r))
    setEditingIdx(null)
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/trading-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_key: sectionDef.key, rules, notes }),
    })
    setSaving(false)
    if (res.ok) {
      const now = new Date().toISOString()
      setSavedAt(now)
      onSaved({ section_key: sectionDef.key, rules, notes, updated_at: now })
      toast.success('Gespeichert')
    } else {
      toast.error('Fehler beim Speichern')
    }
  }

  const requestAiSuggestion = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiSuggestion(null)
    const res = await fetch('/api/ai/trading-plan-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_key: sectionDef.key }),
    })
    setAiLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setAiError(d.error ?? 'KI-Fehler')
      return
    }
    const d = await res.json() as AISuggestion
    setAiSuggestion(d)
    setAiRules(d.rules)
    setAiNotes(d.notes)
  }

  const acceptSuggestion = () => {
    setRules(prev => [...prev, ...aiRules.filter(r => r.trim())])
    if (aiNotes.trim()) {
      setNotes(prev => prev ? `${prev}\n\n${aiNotes}` : aiNotes)
    }
    setAiSuggestion(null)
    setAiError(null)
  }

  const dismissSuggestion = () => {
    setAiSuggestion(null)
    setAiError(null)
  }

  const hasContent = rules.length > 0 || notes.trim().length > 0

  return (
    <div className="space-y-4">
      {/* Rule list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Regeln</p>
          {rules.length > 0 && (
            <span className="text-[11px]" style={{ color: checkedCount === rules.length ? '#4ade80' : 'var(--fg-4)' }}>
              {checkedCount}/{rules.length} abgehakt
            </span>
          )}
        </div>
        {rules.map((rule, idx) => {
          const isDone = checked.has(idx)
          return (
            <div
              key={idx}
              className="flex items-start gap-2 rounded px-3 py-2 transition-colors"
              style={{ background: isDone ? 'rgba(74,222,128,0.05)' : 'var(--bg-3)', opacity: isDone ? 0.7 : 1 }}
            >
              <button
                onClick={() => toggleCheck(idx)}
                className="shrink-0 mt-0.5 rounded transition-colors"
                style={{
                  width: 16, height: 16,
                  border: `1.5px solid ${isDone ? '#4ade80' : 'var(--fg-4)'}`,
                  background: isDone ? 'rgba(74,222,128,0.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label={isDone ? 'Abhaken rückgängig' : 'Abhaken'}
              >
                {isDone && <Check className="h-2.5 w-2.5" style={{ color: '#4ade80' }} />}
              </button>
              {editingIdx === idx ? (
                <input
                  autoFocus
                  value={editingVal}
                  onChange={e => setEditingVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(idx) }
                    if (e.key === 'Escape') setEditingIdx(null)
                  }}
                  onBlur={() => commitEdit(idx)}
                  className="flex-1 bg-transparent text-sm outline-none border-b"
                  style={{ color: 'var(--fg-1)', borderColor: 'var(--brand-blue)' }}
                />
              ) : (
                <span
                  className="flex-1 text-sm cursor-text"
                  style={{ color: isDone ? 'var(--fg-4)' : 'var(--fg-1)', textDecoration: isDone ? 'line-through' : 'none' }}
                  onClick={() => startEdit(idx)}
                >
                  {rule}
                </span>
              )}
              <button onClick={() => deleteRule(idx)} className="shrink-0">
                <X className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
              </button>
            </div>
          )
        })}
        <div className="flex gap-2">
          <Input
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            placeholder="Neue Regel hinzufügen…"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRule())}
          />
          <Button
            type="button"
            onClick={addRule}
            className="h-9 px-3 shrink-0 rounded"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notes textarea */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Notizen & Kontext</p>
        <Textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Weitere Erläuterungen, Kontext, Beispiele…"
          className="resize-none"
          maxLength={5000}
        />
        <p className="text-xs text-right" style={{ color: 'var(--fg-4)' }}>{notes.length}/5000</p>
      </div>

      {/* AI suggestion area */}
      {(aiLoading || aiSuggestion || aiError) && (
        <div
          className="rounded-lg p-4 space-y-3"
          style={{ background: 'rgba(41,98,255,0.06)', border: '1px solid rgba(41,98,255,0.2)' }}
        >
          {aiLoading && (
            <div className="flex items-center gap-2" style={{ color: 'var(--brand-blue)' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">KI generiert Vorschlag aus deiner Knowledge Base…</span>
            </div>
          )}
          {aiError && (
            <p className="text-sm" style={{ color: 'var(--short)' }}>{aiError}</p>
          )}
          {aiSuggestion && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand-blue)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--brand-blue)' }}>KI-Vorschlag — bearbeite vor der Übernahme</p>
              </div>

              {/* Editable rules preview */}
              {aiRules.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Regeln</p>
                  {aiRules.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        value={r}
                        onChange={e => setAiRules(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                        className="flex-1 text-sm px-2 py-1 rounded"
                        style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)', outline: 'none' }}
                      />
                      <button onClick={() => setAiRules(prev => prev.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Editable notes preview */}
              {aiNotes && (
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Notizen</p>
                  <Textarea
                    rows={3}
                    value={aiNotes}
                    onChange={e => setAiNotes(e.target.value)}
                    className="resize-none text-sm"
                    style={{ background: 'var(--bg-3)' }}
                  />
                </div>
              )}

              {/* Source */}
              {aiSuggestion.source && (
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  📄 Quelle: {aiSuggestion.source}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={acceptSuggestion}
                  className="h-8 px-4 text-xs font-semibold rounded"
                  style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
                >
                  Übernehmen
                </Button>
                <Button
                  onClick={dismissSuggestion}
                  className="h-8 px-4 text-xs font-semibold rounded"
                  style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
                >
                  Verwerfen
                </Button>
              </div>
            </div>
          )}
          {aiError && (
            <Button
              onClick={dismissSuggestion}
              className="h-8 px-3 text-xs font-semibold rounded"
              style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
            >
              Schließen
            </Button>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Button
            onClick={requestAiSuggestion}
            disabled={!hasKbDocs || aiLoading || !!aiSuggestion}
            className="h-8 px-3 text-xs font-semibold rounded gap-1.5"
            style={{
              background: 'var(--bg-3)',
              color: hasKbDocs ? 'var(--brand-blue)' : 'var(--fg-4)',
              border: `1px solid ${hasKbDocs ? 'rgba(41,98,255,0.3)' : 'var(--border-raw)'}`,
            }}
            title={!hasKbDocs ? 'Bitte zuerst Dokumente in der Knowledge Base hochladen' : undefined}
          >
            <Sparkles className="h-3.5 w-3.5" />
            KI-Vorschlag aus Knowledge Base
          </Button>
          {!hasKbDocs && (
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>KB leer</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !saving && (
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
              Gespeichert: {formatUpdatedAt(savedAt)}
            </p>
          )}
          {hasContent && !savedAt && (
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Nicht gespeichert</p>
          )}
          <Button
            onClick={save}
            disabled={saving}
            className="h-8 px-4 text-xs font-semibold rounded"
            style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Speichern</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function TradingplanTab() {
  const [sections, setSections] = useState<TradingPlanSection[]>([])
  const [loading, setLoading] = useState(true)
  const [hasKbDocs, setHasKbDocs] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/trading-plan').then(r => r.json()) as Promise<{ sections: TradingPlanSection[] }>,
      fetch('/api/knowledge-base').then(r => r.json()) as Promise<{ documents: { id: string; status: string }[] }>,
    ]).then(([planData, kbData]) => {
      setSections(planData.sections ?? [])
      setHasKbDocs((kbData.documents ?? []).some(d => d.status === 'ready'))
    }).finally(() => setLoading(false))
  }, [])

  const handleSaved = useCallback((updated: TradingPlanSection) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.section_key === updated.section_key)
      if (idx >= 0) return prev.map((s, i) => i === idx ? updated : s)
      return [...prev, updated]
    })
  }, [])

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
        Dein persönlicher Tradingplan — 8 Sektionen. Die KI nutzt diesen Plan als Kontext für Analysen und Wochenvorbereitung.
      </p>

      <Accordion type="single" collapsible className="space-y-2">
        {TRADING_PLAN_SECTIONS.map(sectionDef => {
          const data = sections.find(s => s.section_key === sectionDef.key)
          const hasContent = (data?.rules.length ?? 0) > 0 || (data?.notes?.trim().length ?? 0) > 0

          return (
            <AccordionItem
              key={sectionDef.key}
              value={sectionDef.key}
              className="rounded-lg border-0 overflow-hidden"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/[0.02]">
                <div className="flex items-start gap-3 text-left flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
                        {sectionDef.title}
                      </span>
                      {hasContent && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--long)' }} />
                      )}
                    </div>
                    {data?.updated_at ? (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
                        Gespeichert: {formatUpdatedAt(data.updated_at)}
                      </p>
                    ) : (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>{sectionDef.description}</p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                <TradingPlanSectionPanel
                  sectionDef={sectionDef}
                  data={data}
                  hasKbDocs={hasKbDocs}
                  onSaved={handleSaved}
                />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

type TabId = 'profil' | 'strategie' | 'konten' | 'api-key' | 'knowledge-base' | 'benachrichtigungen' | 'tradingplan' | 'coach-memory'

const TAB_META: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profil',             label: 'Profil',             icon: User },
  { id: 'strategie',          label: 'Strategie',          icon: Target },
  { id: 'konten',             label: 'Konten',             icon: Wallet },
  { id: 'api-key',            label: 'API Key',            icon: Key },
  { id: 'knowledge-base',     label: 'Knowledge Base',     icon: BookOpen },
  { id: 'benachrichtigungen', label: 'Benachrichtigungen', icon: Bell },
  { id: 'tradingplan',        label: 'Tradingplan',        icon: ClipboardList },
  { id: 'coach-memory',       label: 'Coach Memory',       icon: Brain },
]

function EinstellungenInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = (searchParams.get('tab') ?? 'profil') as TabId
  const solo = searchParams.get('solo') === '1'

  const handleTabChange = (id: TabId) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.replace(`/einstellungen?${params.toString()}`, { scroll: false })
  }

  const tabContent: Record<TabId, React.ReactNode> = {
    'profil':             <ProfilTab />,
    'strategie':          <StrategieTab />,
    'konten':             <KontenTab />,
    'api-key':            <ApiKeyTab />,
    'knowledge-base':     <KnowledgeBaseTab />,
    'benachrichtigungen': <BenachrichtigungenTab />,
    'tradingplan':        <TradingplanTab />,
    'coach-memory':       <CoachInsightsSection />,
  }

  const currentMeta = TAB_META.find(t => t.id === tab)!

  if (solo) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm mb-4"
            style={{ color: 'var(--brand-blue)' }}
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </button>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}
          >
            {currentMeta.label}
          </h1>
        </div>
        {tabContent[tab]}
      </div>
    )
  }

  return (
    <div>
      {/* Mobile: horizontal scrollable tabs */}
      <div className="md:hidden mb-6">
        <div className="eyebrow mb-1">Mein Konto</div>
        <h1 className="text-2xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}>
          Einstellungen
        </h1>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TAB_META.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap"
                style={{
                  background: tab === t.id ? 'rgba(255,130,16,0.12)' : 'var(--bg-3)',
                  color: tab === t.id ? '#ff8210' : 'var(--fg-2)',
                  border: `1px solid ${tab === t.id ? 'rgba(255,130,16,0.3)' : 'var(--border-raw)'}`,
                }}
              >
                <t.icon className="h-3.5 w-3.5 shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:flex gap-8 items-start max-w-5xl">
        {/* Left nav */}
        <nav className="w-52 shrink-0 space-y-0.5 sticky top-4">
          <div className="eyebrow mb-3">Mein Konto</div>
          {TAB_META.map(t => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors text-left"
                style={{
                  background: isActive ? 'rgba(255,130,16,0.1)' : 'transparent',
                  color: isActive ? '#ff8210' : 'var(--fg-2)',
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: `2px solid ${isActive ? '#ff8210' : 'transparent'}`,
                  paddingLeft: isActive ? 10 : 12,
                }}
              >
                <t.icon className="h-[15px] w-[15px] shrink-0" />
                <span className="flex-1">{t.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
              </button>
            )
          })}
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}>
            {currentMeta.label}
          </h1>
          {tabContent[tab]}
        </div>
      </div>

      {/* Mobile content */}
      <div className="md:hidden">
        {tabContent[tab]}
      </div>
    </div>
  )
}

export default function EinstellungenPage() {
  return (
    <Suspense>
      <EinstellungenInner />
    </Suspense>
  )
}
