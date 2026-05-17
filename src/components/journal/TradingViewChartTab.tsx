'use client'

import { useEffect, useRef, useCallback, useState, useId } from 'react'
import { ExternalLink, Upload, Check, ImageIcon, Command, Camera, Loader2 } from 'lucide-react'
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
  const uid = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [capturing, setCapturing] = useState(false)
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

    // Set permissions on TV iframe as soon as it's added to the DOM (before it loads)
    const observer = new MutationObserver(() => {
      container.querySelectorAll('iframe').forEach(f => {
        if (!f.getAttribute('allow')?.includes('clipboard-write')) {
          f.setAttribute('allow', 'clipboard-read; clipboard-write; downloads; fullscreen')
        }
      })
    })
    observer.observe(container, { childList: true, subtree: true })

    return () => { observer.disconnect(); container.innerHTML = '' }
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

  const captureServerScreenshot = useCallback(async () => {
    setCapturing(true)
    toast.loading('Chart wird fotografiert…', { id: 'chart-capture' })
    try {
      const res = await fetch('/api/chart-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, tradeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Screenshot fehlgeschlagen', { id: 'chart-capture' })
        return
      }
      toast.success('Chart gespeichert ✓', { id: 'chart-capture' })
      onScreenshotAdded?.(data.url)
    } finally {
      setCapturing(false)
    }
  }, [symbol, tradeId, onScreenshotAdded])

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
    <div className="flex flex-col gap-3" style={{ height: 'calc(90vh - 200px)', minHeight: 0 }}>
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

      {/* Chart — needs explicit pixel height so TV widget resolves 100% correctly */}
      <div
        ref={containerRef}
        className="tradingview-widget-container rounded-xl overflow-hidden"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ flex: '1 1 0', minHeight: 0, height: 0, width: '100%' }}
      />

      {/* Screenshot actions */}
      <div className="shrink-0 rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-2">
          {/* Primary: server-side auto screenshot */}
          <button
            onClick={captureServerScreenshot}
            disabled={capturing || uploading}
            className="flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg flex-1 font-medium transition-opacity disabled:opacity-60"
            style={{
              background: capturing ? 'rgba(41,98,255,0.15)' : 'var(--brand-blue)',
              color: '#fff',
            }}
          >
            {capturing ? (
              <><Loader2 size={13} className="animate-spin" /><span>Wird fotografiert…</span></>
            ) : (
              <><Camera size={13} /><span>Chart-Screenshot speichern</span></>
            )}
          </button>

          {/* Fallback: Cmd+V paste */}
          <div
            className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-lg shrink-0 cursor-default"
            title="⌘V — Screenshot aus Zwischenablage einfügen"
            style={{
              background: uploading ? 'rgba(41,98,255,0.08)' : uploadedPreview ? 'rgba(34,197,94,0.08)' : 'var(--bg-3)',
              border: `1px solid ${uploadedPreview ? 'rgba(34,197,94,0.4)' : 'var(--border-1)'}`,
              color: uploadedPreview ? '#22c55e' : 'var(--fg-3)',
            }}
          >
            {uploading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : uploadedPreview ? (
              <Check size={11} />
            ) : (
              <Command size={11} />
            )}
            <span className="text-[11px]">⌘V</span>
          </div>

          {/* Fallback: file upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || capturing}
            className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-lg transition-colors disabled:opacity-60 shrink-0"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border-1)',
              color: 'var(--fg-3)',
            }}
            title="Bilddatei hochladen"
          >
            <Upload size={11} />
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
