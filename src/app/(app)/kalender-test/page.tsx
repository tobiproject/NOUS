import type { Metadata } from 'next'
import { TradingViewCalendar } from './TradingViewCalendar'

export const metadata: Metadata = {
  title: 'Kalender Test — NOUS',
}

export default function KalenderTestPage() {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="eyebrow mb-0.5">Test-Seite</div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}
        >
          TradingView Widget — Vorschau
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
          Hier kannst du sehen, wie das TradingView Kalender-Widget in der App aussieht.
        </p>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg px-4 py-3 text-sm"
        style={{
          background: 'rgba(41, 98, 255, 0.08)',
          border: '1px solid rgba(41, 98, 255, 0.2)',
          color: 'var(--fg-2)',
        }}
      >
        <strong style={{ color: 'var(--brand-blue)' }}>Was du hier siehst:</strong> Das offizielle TradingView
        Economic Calendar Widget — alle Währungspaare, Wichtigkeitsstufen, deutschsprachig.
        Klick auf ein Event, um Details zu sehen. Scrollen und filtern funktioniert direkt im Widget.
      </div>

      {/* Widget */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-1)' }}
      >
        <TradingViewCalendar
          countryFilter="us,eu,gb,jp,ca,au,nz,ch,cn,de,fr"
          height={750}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2 text-sm" style={{ color: 'var(--fg-4)' }}>
        <p>Länderkürzel im Widget: us=USD, eu=EUR, gb=GBP, jp=JPY, ca=CAD, au=AUD, nz=NZD, ch=CHF, cn=CNY</p>
        <p>Im echten Kalender würde die Liste automatisch nach deiner Watchlist gefiltert.</p>
      </div>
    </div>
  )
}
