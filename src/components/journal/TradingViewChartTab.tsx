'use client'

import React, { useEffect, useRef, useCallback, useState, useId } from 'react'
import { ExternalLink, Upload, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import type { Trade } from '@/hooks/useTrades'

const FUTURES_MAP: Record<string, string> = {
  NQ: 'NASDAQ:NDX', MNQ: 'NASDAQ:NDX',
  ES: 'SP:SPX', MES: 'SP:SPX',
  YM: 'DJ:DJI', MYM: 'DJ:DJI',
  RTY: 'TVC:RUT',
  CL: 'TVC:USOIL', MCL: 'TVC:USOIL',
  NG: 'TVC:NATURALGAS',
  GC: 'TVC:GOLD', MGC: 'TVC:GOLD',
  SI: 'TVC:SILVER', SIL: 'TVC:SILVER',
  HG: 'TVC:COPPER',
  ZC: 'TVC:CORN', ZW: 'TVC:WHEAT', ZS: 'TVC:SOYBEANS',
  ZN: 'TVC:US10Y', ZB: 'TVC:US30Y',
}

const INDICES_MAP: Record<string, string> = {
  US100: 'FOREXCOM:US100', NAS100: 'FOREXCOM:US100',
  US500: 'FOREXCOM:US500', SPX500: 'FOREXCOM:US500',
  US30: 'FOREXCOM:US30',
  GER40: 'FOREXCOM:GER40', DAX: 'FOREXCOM:GER40',
  UK100: 'FOREXCOM:UK100',
  JPN225: 'FOREXCOM:JPN225',
  AUS200: 'FOREXCOM:AUS200',
  FRA40: 'FOREXCOM:FRA40',
  HK50: 'FOREXCOM:HK50',
}

const METALS_MAP: Record<string, string> = {
  GOLD: 'TVC:GOLD', XAUUSD: 'OANDA:XAUUSD',
  SILVER: 'TVC:SILVER', XAGUSD: 'OANDA:XAGUSD',
  OIL: 'TVC:USOIL', USOIL: 'TVC:USOIL', UKOIL: 'TVC:UKOIL',
}

function toTvSymbol(asset: string): string {
  const s = asset.toUpperCase().replace(/[-/_.]/g, '')
  if (FUTURES_MAP[s]) return FUTURES_MAP[s]
  if (INDICES_MAP[s]) return INDICES_MAP[s]
  if (METALS_MAP[s]) return METALS_MAP[s]
  if (s.length === 6 && /^[A-Z]{6}$/.test(s)) return `FX:${s}`
  return `FX:${s}`
}

function RefVal({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-baseline gap-1 shrink-0">
      <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>{label}</span>
      <span className="text-[11px] font-semibold num" style={{ color: color ?? 'var(--fg-1)' }}>{value}</span>
    </div>
  )
}

interface Props {
  trade: Trade
  tradeId: string
  chartUrl?: string | null
  isActive: boolean
  onScreenshotAdded?: (url: string) => void
}

export function TradingViewChartTab({ trade, tradeId, isActive, onScreenshotAdded }: Props) {
  const asset = trade.asset
  const uid = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const symbol = toTvSymbol(asset)
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${symbol.replace(':', '%3A')}`

  useEffect(() => {
    if (!isActive) return
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    // Intercept iframe creation so allow-attribute is set BEFORE content loads.
    // Safari only respects clipboard-write/downloads when the attribute exists at load time.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origCreate = document.createElement.bind(document) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).createElement = (tag: string, opts?: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el = origCreate(tag, opts) as any
      if (tag.toLowerCase() === 'iframe') {
        el.setAttribute('allow', 'clipboard-read; clipboard-write; downloads; fullscreen')
      }
      return el
    }

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.cssText = 'height:calc(100% - 32px);width:100%'
    container.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'de_DE',
      withdateranges: true,
      range: '1D',
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: true,
      support_host: 'https://www.tradingview.com',
    })
    container.appendChild(script)

    const restoreTimer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(document as any).createElement = origCreate
    }, 3000)

    return () => {
      clearTimeout(restoreTimer)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(document as any).createElement = origCreate
      container.innerHTML = ''
    }
  }, [isActive, symbol, uid])

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    toast.loading('Wird hochgeladen…', { id: 'chart-upload' })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Nicht eingeloggt', { id: 'chart-upload' }); setUploading(false); return }

    const mimeToExt: Record<string, string> = {
      'image/png': 'png', 'image/jpeg': 'jpg',
      'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
    }
    const ext = mimeToExt[file.type] ?? file.name.split('.').pop() ?? 'png'
    const contentType = file.type || 'image/png'
    const path = `${user.id}/${tradeId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, file, { upsert: false, contentType })

    if (uploadError) {
      toast.error(`Upload fehlgeschlagen: ${uploadError.message}`, { id: 'chart-upload' })
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(path)

    const { data: existing } = await supabase
      .from('trades').select('screenshot_urls').eq('id', tradeId).single()

    const current: string[] = existing?.screenshot_urls ?? []
    const { error: updateError } = await supabase
      .from('trades')
      .update({ screenshot_urls: [...current, publicUrl] })
      .eq('id', tradeId)

    if (updateError) {
      toast.error('Speichern fehlgeschlagen', { id: 'chart-upload' })
      setUploading(false)
      return
    }

    toast.success('Screenshot gespeichert ✓', { id: 'chart-upload' })
    setUploadedPreview(URL.createObjectURL(file))
    setUploading(false)
    onScreenshotAdded?.(publicUrl)
  }, [tradeId, onScreenshotAdded])

  // Cmd+V paste listener
  useEffect(() => {
    if (!isActive) return
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) uploadFile(file)
          return
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isActive, uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) uploadFile(file)
  }, [uploadFile])

  return (
    <div className="flex flex-col" style={{ height: 'calc(90vh - 160px)', minHeight: 0, gap: 8 }}>

      {/* Chart — full flex height, also acts as drop target */}
      <div
        ref={containerRef}
        className="tradingview-widget-container rounded-xl overflow-hidden"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ flex: '1 1 0', minHeight: 0, height: 0, width: '100%' }}
      />

      {/* Trade reference bar */}
      <div
        className="shrink-0 flex items-center gap-3 flex-wrap rounded-lg px-3 py-2"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}
      >
        {/* Direction */}
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: trade.direction === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: trade.direction === 'long' ? 'var(--long)' : 'var(--short)',
          }}
        >
          {trade.direction === 'long' ? 'Long' : 'Short'}
        </span>

        <RefVal label="Entry" value={trade.entry_price} />
        <RefVal label="SL" value={trade.sl_price} color="var(--short)" />
        {trade.tp_price ? <RefVal label="TP" value={trade.tp_price} color="var(--long)" /> : null}
        {trade.rr_ratio !== null ? <RefVal label="RR" value={`1:${trade.rr_ratio}`} /> : null}
        {trade.lot_size ? <RefVal label="Lots" value={trade.lot_size} /> : null}

        <div className="w-px h-3 shrink-0" style={{ background: 'var(--border-1)' }} />

        <RefVal label="Zeit" value={format(parseISO(trade.traded_at), 'dd.MM.yy HH:mm')} />

        {trade.result_currency !== null && (
          <RefVal
            label="Ergebnis"
            value={`${trade.result_currency >= 0 ? '+' : ''}${trade.result_currency.toFixed(2)} €`}
            color={trade.result_currency > 0 ? 'var(--long)' : trade.result_currency < 0 ? 'var(--short)' : undefined}
          />
        )}
      </div>

      {/* Action strip — single compact row */}
      <div
        className="shrink-0 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}
      >
        {/* Status / instructions */}
        <div className="flex-1 min-w-0">
          {uploading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin shrink-0" style={{ color: 'var(--brand-blue)' }} />
              <span className="text-xs" style={{ color: 'var(--fg-3)' }}>Hochladen…</span>
            </div>
          ) : uploadedPreview ? (
            <div className="flex items-center gap-2">
              <Check size={12} className="shrink-0" style={{ color: '#22c55e' }} />
              <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Gespeichert</span>
              <img src={uploadedPreview} alt="" className="h-5 rounded object-cover" />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium" style={{ color: 'var(--fg-2)' }}>
                📷 Kamera-Icon im Chart → &quot;Bild herunterladen&quot; → hier reinziehen
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
                style={{ background: 'var(--bg-3)', color: 'var(--fg-4)', border: '1px solid var(--border-1)' }}
              >
                oder ⌘V
              </span>
            </div>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-opacity disabled:opacity-50"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', color: 'var(--fg-3)' }}
          title="Datei hochladen"
        >
          <Upload size={11} />
          <span>Datei</span>
        </button>

        {/* TV link */}
        <a
          href={tvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', color: 'var(--fg-4)' }}
          title="In TradingView öffnen"
        >
          <ExternalLink size={11} />
        </a>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
      />
    </div>
  )
}
