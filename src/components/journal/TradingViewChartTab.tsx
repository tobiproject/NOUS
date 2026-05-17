'use client'

import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'

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
  isActive: boolean
}

export function TradingViewChartTab({ asset, isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
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
      save_image: false,
      support_host: 'https://www.tradingview.com',
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [isActive, symbol])

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>
          {asset} · {symbol}
        </span>
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

      <div
        ref={containerRef}
        className="tradingview-widget-container flex-1 rounded-xl overflow-hidden"
        style={{ minHeight: 400 }}
      />
    </div>
  )
}
