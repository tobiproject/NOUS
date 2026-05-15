'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useDailyWatchlist } from '@/hooks/useDailyWatchlist'
import { useWatchlist } from '@/hooks/useWatchlist'
import { DailySymbolChips } from './DailySymbolChips'
import { DailySymbolPicker } from './DailySymbolPicker'
import { CopyYesterdayBanner } from './CopyYesterdayBanner'

interface Props {
  accountId: string | null | undefined
}

export function DailyWatchlistPanel({ accountId }: Props) {
  const { items: generalItems } = useWatchlist(accountId)
  const { items, todaySymbols, loading, addSymbol, removeSymbol, copyFromYesterday } = useDailyWatchlist(accountId)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  const generalSymbols = generalItems.map(i => i.symbol)

  const handleAdd = async (symbol: string) => {
    setAdding(symbol)
    await addSymbol(symbol)
    setAdding(null)
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    await removeSymbol(id)
    setRemovingId(null)
  }

  if (!accountId) {
    return (
      <p className="text-sm" style={{ color: 'var(--fg-4)' }}>
        Wähle ein Konto aus, um die heutige Watchlist zu sehen.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm py-2" style={{ color: 'var(--fg-4)' }}>
        <Loader2 className="h-4 w-4 animate-spin" />Laden…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <CopyYesterdayBanner onCopy={copyFromYesterday} />
      )}

      {items.length > 0 && (
        <DailySymbolChips items={items} removingId={removingId} onRemove={handleRemove} />
      )}

      <DailySymbolPicker
        availableSymbols={generalSymbols}
        selectedSymbols={todaySymbols}
        adding={adding}
        onAdd={handleAdd}
      />

      {items.length === 0 && generalSymbols.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
          Wähle Assets aus deiner allgemeinen Watchlist für den heutigen Handelstag.
        </p>
      )}
    </div>
  )
}
