'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { ExternalLink, Upload, Check, ImageIcon, Command } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

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

interface Props {
  asset: string
  tradeId: string
  chartUrl?: string | null
  isActive: boolean
  onScreenshotAdded?: (url: string) => void
}

export function TradingViewChartTab({ asset, tradeId, isActive, onScreenshotAdded }: Props) {
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

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'
    container.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'de_DE',
      backgroundColor: '#131722',
      gridColor: 'rgba(255,255,255,0.06)',
      withdateranges: true,
      range: '1D',
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: true,
      support_host: 'https://www.tradingview.com',
      overrides: {
        'paneProperties.background': '#131722',
        'paneProperties.backgroundType': 'solid',
        'paneProperties.backgroundGradientStartColor': '#131722',
        'paneProperties.backgroundGradientEndColor': '#131722',
      },
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [isActive, symbol])

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    toast.loading('Wird hochgeladen…', { id: 'chart-upload' })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Nicht eingeloggt', { id: 'chart-upload' }); setUploading(false); return }

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${user.id}/${tradeId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, file, { upsert: false })

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

  // Listen for Cmd+V paste when tab is active — works in Safari too
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
    <div className="flex flex-col gap-3" style={{ height: 'calc(90vh - 200px)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>
          {asset} · {symbol}
        </span>
        <a
          href={tvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: 'rgba(41,98,255,0.10)',
            border: '1px solid rgba(41,98,255,0.25)',
            color: 'var(--brand-blue)',
          }}
        >
          <ExternalLink size={11} />
          In TradingView öffnen
        </a>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="tradingview-widget-container flex-1 rounded-xl overflow-hidden"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      />

      {/* Screenshot actions */}
      <div className="shrink-0 rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
        {/* Steps */}
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap" style={{ color: 'var(--fg-4)' }}>
          <span>📷 Kamera-Icon</span>
          <span style={{ color: 'var(--fg-5)' }}>→</span>
          <span style={{ color: 'var(--fg-2)' }}>"Copy image"</span>
          <span style={{ color: 'var(--fg-5)' }}>→</span>
          <span>zurück hier</span>
          <span style={{ color: 'var(--fg-5)' }}>→</span>
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', color: 'var(--fg-2)' }}
          >
            ⌘V
          </kbd>
        </div>

        <div className="flex items-center gap-2">
          {/* Primary: Cmd+V paste zone */}
          <div
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg flex-1 justify-center"
            style={{
              background: uploading ? 'rgba(41,98,255,0.08)' : uploadedPreview ? 'rgba(34,197,94,0.08)' : 'rgba(41,98,255,0.08)',
              border: `1px dashed ${uploading ? 'rgba(41,98,255,0.4)' : uploadedPreview ? 'rgba(34,197,94,0.4)' : 'rgba(41,98,255,0.3)'}`,
              color: uploadedPreview ? '#22c55e' : 'var(--brand-blue)',
            }}
          >
            {uploading ? (
              <span className="animate-pulse text-xs">Hochladen…</span>
            ) : uploadedPreview ? (
              <><Check size={12} /> <span>Gespeichert — Details-Tab geöffnet</span></>
            ) : (
              <>
                <Command size={11} />
                <span>⌘V — Bild aus Zwischenablage einfügen</span>
              </>
            )}
          </div>

          {/* Fallback: file upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-60 shrink-0"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border-1)',
              color: 'var(--fg-3)',
            }}
            title="Bilddatei hochladen"
          >
            <Upload size={11} />
            Datei
          </button>
        </div>

        {uploadedPreview && (
          <div className="flex items-center gap-2">
            <ImageIcon size={11} style={{ color: 'var(--fg-4)' }} />
            <img src={uploadedPreview} alt="Vorschau" className="h-8 rounded object-cover" style={{ border: '1px solid var(--border-1)' }} />
          </div>
        )}
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
