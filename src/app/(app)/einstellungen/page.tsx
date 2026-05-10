'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Trash2, Loader2, Check, Plus, ExternalLink, Brain, Bell, BellOff, Mail, Key, Bot, Archive, Info, Camera, X, Upload, FileText, CheckCircle, AlertTriangle, Type, Pencil, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { applyFontSize, getStoredFontSize, FONT_SIZE_MIN, FONT_SIZE_MAX } from '@/components/layout/FontSizeApplier'
import { useAccounts } from '@/hooks/useAccounts'
import { type Account } from '@/contexts/AccountContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AssetMultiPicker } from '@/components/watchlist/AssetMultiPicker'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountCreateDialog } from '@/components/accounts/AccountCreateDialog'
import { AccountDeleteDialog } from '@/components/accounts/AccountDeleteDialog'

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
            style={{ background: 'rgba(255,130,16,0.18)', color: 'var(--brand-blue)', overflow: 'hidden' }}
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
    </div>
  )
}

function FontSizeSection() {
  const [size, setSize] = useState(16)

  useEffect(() => {
    setSize(getStoredFontSize())
  }, [])

  return (
    <Section title="Schriftgröße" subtitle="Zieht den Regler — Änderung gilt sofort für die gesamte App">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--fg-3)' }}>Aktuelle Größe</span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--brand-blue)' }}>{size}px</span>
        </div>

        <input
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          value={size}
          onChange={e => {
            const val = parseInt(e.target.value)
            setSize(val)
            applyFontSize(val)
          }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: 'var(--brand-blue)' }}
        />

        <div className="flex justify-between text-[11px]" style={{ color: 'var(--fg-4)' }}>
          <span>Klein ({FONT_SIZE_MIN}px)</span>
          <span>Normal (16px)</span>
          <span>Groß ({FONT_SIZE_MAX}px)</span>
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

function StrategieTab() {
  const [strategy, setStrategy] = useState<Strategy>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newRule, setNewRule] = useState('')

  useEffect(() => {
    fetch('/api/strategy').then(r => r.json()).then(stratData => {
      if (stratData.strategy) {
        setStrategy({
          name: stratData.strategy.name || '',
          description: stratData.strategy.description || '',
          rules: stratData.strategy.rules || [],
          preferred_timeframes: stratData.strategy.preferred_timeframes || [],
          instruments: stratData.strategy.instruments || [],
        })
      }
    }).finally(() => setLoading(false))
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    const res = await fetch('/api/strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }, [strategy])

  const addRule = () => {
    const r = newRule.trim()
    if (!r) return
    setStrategy(s => ({ ...s, rules: [...s.rules, r] }))
    setNewRule('')
  }

  const removeRule = (i: number) =>
    setStrategy(s => ({ ...s, rules: s.rules.filter((_, j) => j !== i) }))

  const toggleTF = (tf: string) =>
    setStrategy(s => ({
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
          Definiere deine Trading-Strategie — die KI nutzt dieses Profil für alle Analysen.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => setStrategy(EXAMPLE_STRATEGY)}
            className="h-8 px-3 text-[13px] font-semibold rounded"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
          >
            Beispiel laden
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="h-8 px-4 text-[13px] font-semibold rounded"
            style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <Check className="h-4 w-4 mr-2" /> : null}
            {saved ? 'Gespeichert' : 'Speichern'}
          </Button>
        </div>
      </div>

      <Section title="Strategie-Name">
        <Input
          value={strategy.name}
          onChange={e => setStrategy(s => ({ ...s, name: e.target.value }))}
          placeholder="z.B. Trend-Following mit Breakout-Entries"
        />
      </Section>

      <Section title="Beschreibung" subtitle="Kurze Zusammenfassung deines Ansatzes">
        <Textarea
          rows={4}
          value={strategy.description}
          onChange={e => setStrategy(s => ({ ...s, description: e.target.value }))}
          placeholder="Beschreibe deinen Trading-Stil, Ansatz und Philosophie…"
          className="resize-none"
        />
      </Section>

      <Section title="Trading-Regeln" subtitle="Konkrete Regeln, die dein Setup definieren">
        <div className="space-y-2">
          {strategy.rules.map((rule, i) => (
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
              className="h-8 px-3 shrink-0 rounded"
              style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Bevorzugte Timeframes">
        <div className="flex flex-wrap gap-2">
          {TIMEFRAME_OPTIONS.map(tf => {
            const active = strategy.preferred_timeframes.includes(tf)
            return (
              <button
                key={tf}
                onClick={() => toggleTF(tf)}
                className="num text-xs font-semibold px-3 py-1.5 rounded transition-colors"
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
      </Section>

      <Section title="Instrumente / Märkte" subtitle="Welche Assets tradest du? Aus deiner Watchlist wählen.">
        <AssetMultiPicker
          value={strategy.instruments}
          onChange={instruments => setStrategy(s => ({ ...s, instruments }))}
          placeholder="Asset aus Watchlist…"
        />
      </Section>
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
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiSaving, setAiSaving] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)

  useEffect(() => {
    fetch('/api/ai-settings').then(r => r.json()).then(d => {
      setAiProvider(d.provider ?? 'anthropic')
      setAiApiKey(d.api_key ?? '')
    })
  }, [])

  const saveAiSettings = useCallback(async () => {
    setAiSaving(true)
    await fetch('/api/ai-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: aiProvider, api_key: aiApiKey || null }),
    })
    setAiSaving(false)
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2500)
  }, [aiProvider, aiApiKey])

  return (
    <div className="space-y-6">
      <Section title="KI-Provider" subtitle="Eigenen API-Key hinterlegen — NOUS nutzt dann dein Konto statt des Server-Schlüssels.">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['anthropic', 'openai'] as const).map(p => (
              <button
                key={p}
                onClick={() => setAiProvider(p)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors"
                style={{
                  background: aiProvider === p ? 'var(--brand-blue)' : 'var(--bg-3)',
                  color: aiProvider === p ? '#fff' : 'var(--fg-3)',
                  border: `1px solid ${aiProvider === p ? 'var(--brand-blue)' : 'var(--border-raw)'}`,
                }}
              >
                <Bot className="h-3.5 w-3.5" />
                {p === 'anthropic' ? 'Claude (Anthropic)' : 'GPT-4o (OpenAI)'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
              {aiProvider === 'anthropic' ? 'Anthropic API-Key' : 'OpenAI API-Key'}
              {' '}— wird verschlüsselt in deiner DB-Row gespeichert, nur du kannst ihn lesen.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                <Input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder={aiProvider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
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
            {aiProvider === 'anthropic' && (
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
            )}
          </div>

          {aiProvider === 'anthropic' && (
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
          )}
          {aiProvider === 'openai' && (
            <Link href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold hover:opacity-80"
              style={{ background: 'var(--brand-blue)', color: '#fff' }}>
              <ExternalLink className="h-3 w-3" /> OpenAI Usage öffnen
            </Link>
          )}
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
        weekly_prep_time: weeklyPrepTime,
        prop_firm_reminder_time: propFirmTime,
        notification_timezone: notifTimezone,
      }),
    })
    setNotifSaving(false)
    toast.success('Einstellungen gespeichert')
  }, [notifEmailEnabled, notifEmail, propFirmReminderEnabled, weeklyPrepTime, propFirmTime, notifTimezone])

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
              className="w-11 h-6 rounded-full transition-colors duration-200 shrink-0 relative disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: propFirmReminderEnabled ? 'var(--brand-blue)' : 'rgba(255,255,255,0.15)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-200"
                style={{ background: '#fff', left: propFirmReminderEnabled ? '22px' : '2px' }}
              />
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
              className="w-11 h-6 rounded-full transition-colors duration-200 shrink-0 relative"
              style={{ background: notifEmailEnabled ? 'var(--brand-blue)' : 'rgba(255,255,255,0.15)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-200"
                style={{ background: '#fff', left: notifEmailEnabled ? '22px' : '2px' }}
              />
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
    if (file.size > 20 * 1024 * 1024) { toast.error('Datei zu groß (max. 20 MB)'); return }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/knowledge-base', { method: 'POST', body: form })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { toast.error(data.error ?? 'Upload fehlgeschlagen'); return }
    if (data.document?.status === 'error') {
      toast.error(`"${file.name}" konnte nicht gelesen werden — Text einfügen als Alternative`)
    } else {
      toast.success(`"${file.name}" hochgeladen`)
    }
    loadDocs()
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
                  <p className="text-sm" style={{ color: 'var(--fg-3)' }}>PDF wird verarbeitet…</p>
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
                  <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Nur PDF · max. 20 MB · max. 10 Dokumente</p>
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

// ─── Main page ───────────────────────────────────────────────────────────────

type TabId = 'profil' | 'strategie' | 'konten' | 'api-key' | 'knowledge-base' | 'benachrichtigungen'

const TAB_LABELS: Record<TabId, string> = {
  'profil':              'Profil',
  'strategie':           'Strategie',
  'konten':              'Konten',
  'api-key':             'API Key',
  'knowledge-base':      'Knowledge Base',
  'benachrichtigungen':  'Benachrichtigungen',
}

function EinstellungenInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = (searchParams.get('tab') ?? 'profil') as TabId
  const solo = searchParams.get('solo') === '1'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/einstellungen?${params.toString()}`, { scroll: false })
  }

  const tabContent: Record<TabId, React.ReactNode> = {
    'profil':             <ProfilTab />,
    'strategie':          <StrategieTab />,
    'konten':             <KontenTab />,
    'api-key':            <ApiKeyTab />,
    'knowledge-base':     <KnowledgeBaseTab />,
    'benachrichtigungen': <BenachrichtigungenTab />,
  }

  if (solo) {
    return (
      <div className="space-y-6 max-w-2xl">
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
            {TAB_LABELS[tab]}
          </h1>
        </div>
        {tabContent[tab]}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="eyebrow mb-1">Mein Konto</div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}
        >
          Mein Profil
        </h1>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto mb-6">
          <TabsList className="w-max min-w-full">
            <TabsTrigger value="profil">Profil</TabsTrigger>
            <TabsTrigger value="strategie">Strategie</TabsTrigger>
            <TabsTrigger value="konten">Konten</TabsTrigger>
            <TabsTrigger value="api-key">API Key</TabsTrigger>
            <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
            <TabsTrigger value="benachrichtigungen">Benachrichtigungen</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profil"><ProfilTab /></TabsContent>
        <TabsContent value="strategie"><StrategieTab /></TabsContent>
        <TabsContent value="konten"><KontenTab /></TabsContent>
        <TabsContent value="api-key"><ApiKeyTab /></TabsContent>
        <TabsContent value="knowledge-base"><KnowledgeBaseTab /></TabsContent>
        <TabsContent value="benachrichtigungen"><BenachrichtigungenTab /></TabsContent>
      </Tabs>
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
