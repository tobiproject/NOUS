'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface TradingRule {
  id: string
  user_id: string
  rule_text: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export function useTradingRules() {
  const supabase = createClient()

  const fetchRules = useCallback(async (): Promise<TradingRule[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase
      .from('trading_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
    return data ?? []
  }, [supabase])

  const createRule = useCallback(async (ruleText: string): Promise<TradingRule | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: maxRow } = await supabase
      .from('trading_rules')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextOrder = maxRow ? maxRow.sort_order + 1 : 0
    const { data } = await supabase
      .from('trading_rules')
      .insert({ user_id: user.id, rule_text: ruleText, sort_order: nextOrder })
      .select()
      .single()
    return data
  }, [supabase])

  const updateRule = useCallback(async (id: string, updates: Partial<Pick<TradingRule, 'rule_text' | 'is_active'>>): Promise<void> => {
    await supabase.from('trading_rules').update(updates).eq('id', id)
  }, [supabase])

  const deleteRule = useCallback(async (id: string): Promise<void> => {
    await supabase.from('trading_rules').delete().eq('id', id)
  }, [supabase])

  return { fetchRules, createRule, updateRule, deleteRule }
}
