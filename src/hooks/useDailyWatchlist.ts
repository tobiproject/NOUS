'use client'

import { useCallback, useEffect, useState } from 'react'

export interface DailyWatchlistItem {
  id: string
  symbol: string
  date: string
  account_id: string
  created_at: string
}

export function useDailyWatchlist(accountId?: string | null, date?: string) {
  const [items, setItems] = useState<DailyWatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const today = date ?? new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    if (!accountId) { setItems([]); setLoading(false); return }
    setLoading(true)
    const res = await fetch(`/api/daily-watchlist?account_id=${accountId}&date=${today}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items ?? [])
    }
    setLoading(false)
  }, [accountId, today])

  useEffect(() => { load() }, [load])

  const addSymbol = useCallback(async (symbol: string) => {
    if (!accountId) return { error: 'Kein Konto ausgewählt' }
    const res = await fetch('/api/daily-watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, symbol, date: today }),
    })
    if (res.ok) {
      const data = await res.json()
      setItems(prev => [...prev, data.item])
      return { error: null }
    }
    const data = await res.json()
    return { error: data.error ?? 'Fehler beim Hinzufügen' }
  }, [accountId, today])

  const removeSymbol = useCallback(async (id: string) => {
    const res = await fetch(`/api/daily-watchlist/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const copyFromYesterday = useCallback(async () => {
    if (!accountId) return { error: 'Kein Konto ausgewählt', count: 0 }
    const res = await fetch('/api/daily-watchlist/copy-yesterday', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, today }),
    })
    const data = await res.json()
    if (res.ok) {
      await load()
      return { error: null, count: data.items?.length ?? 0 }
    }
    return { error: data.error ?? 'Fehler beim Übernehmen', count: 0 }
  }, [accountId, today, load])

  const todaySymbols = items.map(i => i.symbol)

  return { items, todaySymbols, loading, addSymbol, removeSymbol, copyFromYesterday, reload: load }
}
