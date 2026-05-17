'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAccountContext } from '@/contexts/AccountContext'

export interface RiskConfig {
  id: string
  account_id: string
  user_id: string
  max_daily_loss_pct: number | null
  max_daily_trades: number | null
  max_risk_per_trade_pct: number | null
  max_drawdown_pct: number | null
  updated_at: string
}

export interface RiskConfigInput {
  max_daily_loss_pct?: number | null
  max_daily_trades?: number | null
  max_risk_per_trade_pct?: number | null
  max_drawdown_pct?: number | null
}

export function useRiskConfig() {
  const { activeAccount } = useAccountContext()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const fetchRiskConfig = useCallback(async (): Promise<RiskConfig | null> => {
    if (!activeAccount) return null
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('risk_configs')
        .select('*')
        .eq('account_id', activeAccount.id)
        .maybeSingle()
      if (error) throw error
      return data
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount, supabase])

  const saveRiskConfig = useCallback(async (input: RiskConfigInput): Promise<{ data: RiskConfig | null; error: Error | null }> => {
    if (!activeAccount) return { data: null, error: new Error('Kein aktives Konto') }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Nicht eingeloggt') }

    setIsSaving(true)
    try {
      // Upsert: create if not exists, update if exists
      const { data, error } = await supabase
        .from('risk_configs')
        .upsert({
          account_id: activeAccount.id,
          user_id: user.id,
          max_daily_loss_pct: input.max_daily_loss_pct ?? null,
          max_daily_trades: input.max_daily_trades ?? null,
          max_risk_per_trade_pct: input.max_risk_per_trade_pct ?? null,
          max_drawdown_pct: input.max_drawdown_pct ?? null,
        }, { onConflict: 'account_id' })
        .select()
        .single()
      if (error) return { data: null, error }
      return { data, error: null }
    } finally {
      setIsSaving(false)
    }
  }, [activeAccount, supabase])

  return { isLoading, isSaving, fetchRiskConfig, saveRiskConfig }
}
