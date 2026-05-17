'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { ExternalLink, Upload, Link } from 'lucide-react'
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

function toTvUrl(asset: string): string {
  const sym = toTvSymbol(asset).replace(':', '%3A')
  return `https://www.tradingview.com/chart/?symbol=${sym}`
}

interface Props {
  asset: string
  tradeId: string
  chartUrl?: string | null
  isActive: boolean
  onScreenshotAdded?: () => void
  onChartUrlSaved?: (url: string) => void
}

export function TradingViewChartTab({ asset, tradeId, chartUrl, isActive, onScreenshotAdded, onChartUrlSaved }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [linkInput, setLinkInput] = useState(chartUrl ?? '')
  const [savingLink, setSavingLink] = useState(false)
  const symbol = toTvSymbol(asset)
  const tvUrl = toTvUrl(asset)

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
      backgroundColor: 'rgba(0,0,0,0)',
      gridColor: 'rgba(255,255,255,0.06)',
      withdateranges: true,
      range: '1D',
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: true,
      support_host: 'https://www.tradingview.com',
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [isActive, symbol])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien erlaubt')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${user.id}/${tradeId}/${Date.now()}.${ext}`

    toast.loading('Wird hochgeladen…', { id: 'chart-upload' })

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      toast.error(`Upload fehlgeschlagen: ${uploadError.message}`, { id: 'chart-upload' })
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(path)

    const { data: existing } = await supabase
      .from('trades')
      .select('screenshot_urls')
      .eq('id', tradeId)
      .single()

    const current: string[] = existing?.screenshot_urls ?? []
    const { error: updateError } = await supabase
      .from('trades')
      .update({ screenshot_urls: [...current, publicUrl] })
      .eq('id', tradeId)

    if (updateError) {
      toast.error('Speichern fehlgeschlagen', { id: 'chart-upload' })
      return
    }

    toast.success('Chart-Screenshot gespeichert ✓', { id: 'chart-upload' })
    onScreenshotAdded?.()
  }, [tradeId, onScreenshotAdded])

  const handleSaveLink = useCallback(async () => {
    if (!linkInput.trim()) return
    setSavingLink(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('trades')
      .update({ chart_url: linkInput.trim() })
      .eq('id', tradeId)

    if (error) {
      toast.error('Link konnte nicht gespeichert werden')
    } else {
      toast.success('Chart-Link gespeichert ✓')
      onChartUrlSaved?.(linkInput.trim())
    }
    setSavingLink(false)
  }, [linkInput, tradeId, onChartUrlSaved])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }, [handleFileUpload])

  return (
    <div className="flex flex-col gap-3" style={{ height: 'calc(90vh - 200px)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>
          {asset} · {symbol}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border-1)',
              color: 'var(--fg-2)',
            }}
          >
            <Upload size={11} />
            Screenshot hochladen
          </button>
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
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
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="tradingview-widget-container flex-1 rounded-xl overflow-hidden"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      />

      {/* Link input */}
      <div
        className="shrink-0 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}
      >
        <Link size={12} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
        <input
          type="url"
          value={linkInput}
          onChange={e => setLinkInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSaveLink()}
          placeholder="TradingView Chart-Link einfügen…"
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: 'var(--fg-1)' }}
        />
        {linkInput.trim() && linkInput !== (chartUrl ?? '') && (
          <button
            onClick={handleSaveLink}
            disabled={savingLink}
            className="text-xs px-2.5 py-1 rounded font-medium shrink-0 disabled:opacity-50"
            style={{ background: 'var(--brand-blue)', color: '#fff' }}
          >
            {savingLink ? '…' : 'Speichern'}
          </button>
        )}
        {linkInput.trim() && (
          <a
            href={linkInput}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
            style={{ color: 'var(--fg-4)' }}
          >
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
