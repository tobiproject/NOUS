'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { calculateTrade } from '@/lib/trade-calculations'
import { useAccountContext } from '@/contexts/AccountContext'

export interface Trade {
  id: string
  account_id: string
  user_id: string
  traded_at: string
  asset: string
  direction: 'long' | 'short'
  entry_price: number
  sl_price: number
  tp_price: number
  lot_size: number
  rr_ratio: number | null
  risk_percent: number | null
  result_currency: number | null
  result_percent: number | null
  outcome: 'win' | 'loss' | 'breakeven' | null
  setup_type: string | null
  strategy: string | null
  market_phase: string | null
  tags: string[]
  emotion_before: string | null
  emotion_after: string | null
  notes: string | null
  screenshot_urls: string[]
  chart_url: string | null
  review_notes: string | null
  max_run_price: number | null
  true_rr: number | null
  what_went_well: string | null
  what_to_improve: string | null
  lesson_learned: string | null
  news_event_present: boolean | null
  news_event_name: string | null
  news_impact_level: 'high' | 'medium' | 'low' | null
  news_timing_minutes: number | null
  emotional_checkin: string | null
  created_at: string
  updated_at: string
}

export interface TradeFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
  assets?: string[]
  direction?: 'long' | 'short'
  outcome?: 'win' | 'loss' | 'breakeven'
  setupType?: string
  strategy?: string
  emotion?: string
}

export interface CreateTradeInput {
  traded_at: string
  asset: string
  direction: 'long' | 'short'
  entry_price: number
  sl_price: number
  tp_price: number
  lot_size: number
  result_currency: number
  setup_type?: string
  strategy?: string
  market_phase?: string
  tags?: string[]
  emotion_before?: string
  emotion_after?: string
  notes?: string
  screenshot_urls?: string[]
  chart_url?: string | null
  news_event_present?: boolean | null
  news_event_name?: string | null
  news_impact_level?: 'high' | 'medium' | 'low' | null
  news_timing_minutes?: number | null
  emotional_checkin?: string
}

export interface TradesPage {
  trades: Trade[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 25

export function useTrades() {
  const { activeAccount } = useAccountContext()
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const supabase = createClient()

  const fetchTrades = useCallback(async (
    filters: TradeFilters = {},
    page = 1
  ): Promise<TradesPage> => {
    if (!activeAccount) return { trades: [], total: 0, page, pageSize: PAGE_SIZE }

    setIsLoading(true)
    try {
      let query = supabase
        .from('trades')
        .select('*', { count: 'exact' })
        .eq('account_id', activeAccount.id)

      if (filters.search) {
        query = query.or(
          `asset.ilike.%${filters.search}%,notes.ilike.%${filters.search}%,setup_type.ilike.%${filters.search}%`
        )
      }
      if (filters.dateFrom) query = query.gte('traded_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('traded_at', filters.dateTo)
      if (filters.direction) query = query.eq('direction', filters.direction)
      if (filters.outcome) query = query.eq('outcome', filters.outcome)
      if (filters.setupType) query = query.eq('setup_type', filters.setupType)
      if (filters.strategy) query = query.eq('strategy', filters.strategy)
      if (filters.emotion) {
        query = query.or(
          `emotion_before.eq.${filters.emotion},emotion_after.eq.${filters.emotion}`
        )
      }
      if (filters.assets?.length) query = query.in('asset', filters.assets)

      const from = (page - 1) * PAGE_SIZE
      const { data, error, count } = await query
        .order('traded_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      return { trades: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE }
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount, supabase])

  const createTrade = useCallback(async (input: CreateTradeInput) => {
    if (!activeAccount) return { error: new Error('Kein aktives Konto') }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Nicht eingeloggt') }

    const calc = calculateTrade({
      entryPrice: input.entry_price,
      slPrice: input.sl_price,
      tpPrice: input.tp_price,
      lotSize: input.lot_size,
      resultCurrency: input.result_currency,
      accountBalance: activeAccount.start_balance,
    })

    setIsMutating(true)
    try {
      const { data, error } = await supabase.from('trades').insert({
        ...input,
        account_id: activeAccount.id,
        user_id: user.id,
        rr_ratio: calc.rrRatio,
        risk_percent: calc.riskPercent,
        result_percent: calc.resultPercent,
        outcome: calc.outcome,
        tags: input.tags ?? [],
        screenshot_urls: input.screenshot_urls ?? [],
      }).select().single()

      if (!error) {
        const { count } = await supabase
          .from('trades')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('account_id', activeAccount.id)
        if (count && count % 10 === 0) {
          fetch('/api/ai/update-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: activeAccount.id }),
          }).catch(() => {})
        }
      }

      return { data, error }
    } finally {
      setIsMutating(false)
    }
  }, [activeAccount, supabase])

  const updateTrade = useCallback(async (id: string, input: Partial<CreateTradeInput>) => {
    if (!activeAccount) return { error: new Error('Kein aktives Konto') }

    const updates: Record<string, unknown> = { ...input }

    // Recalculate derived values if price fields changed
    if (input.entry_price !== undefined || input.sl_price !== undefined ||
        input.tp_price !== undefined || input.lot_size !== undefined ||
        input.result_currency !== undefined) {
      const { data: existing } = await supabase
        .from('trades').select('*').eq('id', id).single()

      if (existing) {
        const calc = calculateTrade({
          entryPrice: input.entry_price ?? existing.entry_price,
          slPrice: input.sl_price ?? existing.sl_price,
          tpPrice: input.tp_price ?? existing.tp_price,
          lotSize: input.lot_size ?? existing.lot_size,
          resultCurrency: input.result_currency ?? existing.result_currency,
          accountBalance: activeAccount.start_balance,
        })
        updates.rr_ratio = calc.rrRatio
        updates.risk_percent = calc.riskPercent
        updates.result_percent = calc.resultPercent
        updates.outcome = calc.outcome
      }
    }

    setIsMutating(true)
    try {
      const { data, error } = await supabase
        .from('trades').update(updates).eq('id', id).select().single()
      return { data, error }
    } finally {
      setIsMutating(false)
    }
  }, [activeAccount, supabase])

  const deleteTrade = useCallback(async (id: string) => {
    setIsMutating(true)
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id)
      return { error }
    } finally {
      setIsMutating(false)
    }
  }, [supabase])

  const uploadScreenshot = useCallback(async (
    tradeId: string,
    file: File
  ): Promise<{ url: string | null; error: Error | null }> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { url: null, error: new Error('Nicht eingeloggt') }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${tradeId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, file, { upsert: false })

    if (uploadError) return { url: null, error: uploadError }

    const { data } = supabase.storage.from('screenshots').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }, [supabase])

  const deleteScreenshot = useCallback(async (path: string) => {
    const { error } = await supabase.storage.from('screenshots').remove([path])
    return { error }
  }, [supabase])

  const getUniqueValues = useCallback(async (
    column: 'asset' | 'setup_type' | 'strategy'
  ): Promise<string[]> => {
    if (!activeAccount) return []
    const { data } = await supabase
      .from('trades')
      .select(column)
      .eq('account_id', activeAccount.id)
      .not(column, 'is', null)
    if (!data) return []
    const values = data.map((r) => (r as Record<string, unknown>)[column] as string).filter(Boolean)
    return [...new Set(values)].sort()
  }, [activeAccount, supabase])

  return {
    isLoading,
    isMutating,
    fetchTrades,
    createTrade,
    updateTrade,
    deleteTrade,
    uploadScreenshot,
    deleteScreenshot,
    getUniqueValues,
  }
}
