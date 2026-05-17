'use client'

import { useEffect, useRef } from 'react'

interface TradingViewCalendarProps {
  countryFilter?: string
  height?: number
}

export function TradingViewCalendar({
  countryFilter = 'us,eu,gb,jp,ca,au,nz,ch,cn,de,fr',
  height = 700,
}: TradingViewCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear any previous widget
    container.innerHTML = ''

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    container.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height,
      locale: 'de_DE',
      importanceFilter: '-1,0,1',
      countryFilter,
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [countryFilter, height])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full"
      style={{ minHeight: height }}
    />
  )
}
