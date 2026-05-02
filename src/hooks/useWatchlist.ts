'use client'

import { useCallback, useEffect, useState } from 'react'

export interface WatchlistItem {
  id: string
  symbol: string
  name: string | null
  category: string
  tick_size: number | null
  tick_value: number | null
  point_value: number | null
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/watchlist')
    if (res.ok) {
      const data = await res.json()
      const loaded = data.items ?? []
      setItems(loaded)
    }
    setLoading(false)
  }, [])

  // Sync flag + notify sidebar/bottomnav instantly on every items change
  useEffect(() => {
    if (loading) return
    const hasItems = items.length > 0
    localStorage.setItem('nous-watchlist-has-items', hasItems ? '1' : '0')
    window.dispatchEvent(new CustomEvent('watchlist-changed', { detail: { hasItems } }))
  }, [items, loading])

  useEffect(() => { load() }, [load])

  const addItem = useCallback(async (symbol: string, name?: string, category?: string) => {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name, category }),
    })
    if (res.ok) {
      const data = await res.json()
      setItems(prev => [...prev, data.item])
      return { error: null }
    }
    const data = await res.json()
    return { error: data.error ?? 'Fehler beim Hinzufügen' }
  }, [])

  const removeItem = useCallback(async (id: string) => {
    const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateItem = useCallback(async (
    id: string,
    patch: { tick_size?: number | null; tick_value?: number | null; point_value?: number | null }
  ) => {
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const data = await res.json()
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...data.item } : i))
      return { error: null }
    }
    const data = await res.json()
    return { error: data.error ?? 'Fehler beim Aktualisieren' }
  }, [])

  const symbols = items.map(i => i.symbol)

  return { items, symbols, loading, addItem, removeItem, updateItem, reload: load }
}
