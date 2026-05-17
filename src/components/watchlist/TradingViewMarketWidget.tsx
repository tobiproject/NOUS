'use client'

import { useEffect, useRef } from 'react'
import type { WatchlistItem } from '@/hooks/useWatchlist'

// Map our symbols to TradingView's exchange:symbol format
const FUTURES_MAP: Record<string, string> = {
  NQ: 'CME_MINI:NQ1!', MNQ: 'CME_MINI:MNQ1!',
  ES: 'CME_MINI:ES1!', MES: 'CME_MINI:MES1!',
  YM: 'CBOT_MINI:YM1!', MYM: 'CBOT_MINI:MYM1!',
  RTY: 'CME_MINI:RTY1!',
  CL: 'NYMEX:CL1!', MCL: 'NYMEX:MCL1!',
  NG: 'NYMEX:NG1!',
  GC: 'COMEX:GC1!', MGC: 'COMEX:MGC1!',
  SI: 'COMEX:SI1!', SIL: 'COMEX:SIL1!',
  HG: 'COMEX:HG1!',
  ZC: 'CBOT:ZC1!', ZW: 'CBOT:ZW1!', ZS: 'CBOT:ZS1!',
  ZN: 'CBOT:ZN1!', ZB: 'CBOT:ZB1!',
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

function toTvSymbol(item: WatchlistItem): string {
  const s = item.symbol.toUpperCase()
  if (FUTURES_MAP[s]) return FUTURES_MAP[s]
  if (INDICES_MAP[s]) return INDICES_MAP[s]
  if (METALS_MAP[s]) return METALS_MAP[s]
  // 6-char forex pairs: EURUSD → FX:EURUSD
  if (s.length === 6 && /^[A-Z]{6}$/.test(s)) return `FX:${s}`
  // Crypto
  if (item.category === 'crypto') return `BINANCE:${s}USDT`
  // Stocks
  if (item.category === 'stocks') return `NASDAQ:${s}`
  return `FX:${s}`
}

interface Props {
  items: WatchlistItem[]
}

export function TradingViewMarketWidget({ items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const symbols = items
    .slice(0, 30) // TradingView widget limit
    .map(item => ({ s: toTvSymbol(item), d: item.symbol }))

  useEffect(() => {
    const container = containerRef.current
    if (!container || symbols.length === 0) return

    container.innerHTML = ''

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    container.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '1D',
      showSymbolLogo: true,
      isTransparent: true,
      showFloatingTooltip: false,
      width: '100%',
      height: Math.min(80 + symbols.length * 52, 600),
      locale: 'de_DE',
      tabs: [
        {
          title: 'Meine Watchlist',
          symbols,
          originalTitle: 'Meine Watchlist',
        },
      ],
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [JSON.stringify(symbols)]) // eslint-disable-line react-hooks/exhaustive-deps

  if (symbols.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full rounded-xl overflow-hidden"
    />
  )
}
