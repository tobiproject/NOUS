'use client'

import { X, Loader2 } from 'lucide-react'
import type { DailyWatchlistItem } from '@/hooks/useDailyWatchlist'

interface Props {
  items: DailyWatchlistItem[]
  removingId: string | null
  onRemove: (id: string) => void
}

export function DailySymbolChips({ items, removingId, onRemove }: Props) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: 'rgba(8,153,129,0.12)',
            border: '1px solid rgba(8,153,129,0.4)',
            color: '#089981',
          }}
        >
          <span className="ticker">{item.symbol}</span>
          <button
            onClick={() => onRemove(item.id)}
            disabled={removingId === item.id}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label={`${item.symbol} entfernen`}
          >
            {removingId === item.id
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <X className="h-3 w-3" />
            }
          </button>
        </div>
      ))}
    </div>
  )
}
