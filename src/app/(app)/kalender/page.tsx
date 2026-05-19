import type { Metadata } from 'next'
import { KalenderContent } from '@/components/calendar/KalenderContent'

export const metadata: Metadata = {
  title: 'Wirtschaftskalender — NOUS',
}

export default function KalenderPage() {
  return (
    <div className="space-y-1 pb-8">
      {/* Header */}
      <div className="pb-4">
        <div className="eyebrow mb-0.5">Makroökonomie</div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--fg-1)' }}
        >
          Wirtschaftskalender
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
          High-Impact Events · Zentralbanken · Makrodaten
        </p>
      </div>

      <KalenderContent />
    </div>
  )
}
