'use client'

import { useEffect, useRef, useState } from 'react'
import { addWeeks, startOfWeek, endOfWeek, format } from 'date-fns'

interface TradingViewCalendarProps {
  countryFilter?: string
  height?: number
}

function getWeekDates(offset: number) {
  const base = addWeeks(new Date(), offset)
  return {
    from: format(startOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    to: format(endOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

export function TradingViewCalendar({
  countryFilter = 'us,eu,gb,jp,ca,au,nz,ch,cn,de,fr',
  height = 700,
}: TradingViewCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const { from, to } = getWeekDates(weekOffset)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    container.appendChild(widgetDiv)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    // Test: does TradingView support dateRange / from / to parameters?
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height,
      locale: 'de_DE',
      importanceFilter: '-1,0,1',
      countryFilter,
      dateRange: `${from}|${to}`,
      from,
      to,
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [countryFilter, height, from, to])

  const label = weekOffset === 0 ? 'Diese Woche' : weekOffset === 1 ? 'Nächste Woche' : weekOffset === -1 ? 'Letzte Woche' : `KW ${from.slice(0, 10)}`

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'var(--fg-2)' }}
        >
          ←
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: weekOffset === 0 ? 'var(--brand-blue)' : 'var(--bg-2)',
            border: '1px solid var(--border-1)',
            color: weekOffset === 0 ? '#fff' : 'var(--fg-2)',
          }}
        >
          Heute
        </button>
        <span className="text-sm font-medium px-2" style={{ color: 'var(--fg-1)' }}>{label}</span>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'var(--fg-2)' }}
        >
          →
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
        Test: Springt das Widget auf {from} – {to}?
      </p>

      {/* Widget */}
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full rounded-xl overflow-hidden"
        style={{ minHeight: height, border: '1px solid var(--border-1)' }}
      />
    </div>
  )
}
