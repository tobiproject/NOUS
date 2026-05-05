'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAccountContext, type Account } from '@/contexts/AccountContext'

export interface CreateAccountInput {
  name: string
  start_balance: number
  currency: string
  broker?: string
  description?: string
  account_type?: string
}

const ACCOUNT_LIMIT = 10

export function useAccounts() {
  const { accounts, activeAccount, isLoading, setActiveAccount, refreshAccounts } = useAccountContext()
  const [isMutating, setIsMutating] = useState(false)
  const supabase = createClient()

  async function createAccount(input: CreateAccountInput) {
    if (accounts.length >= ACCOUNT_LIMIT) {
      return { error: new Error(`Maximal ${ACCOUNT_LIMIT} Konten erlaubt.`) }
    }

    setIsMutating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: new Error('Nicht eingeloggt') }

      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: input.name,
        start_balance: input.start_balance,
        currency: input.currency,
        broker: input.broker || null,
        description: input.description || null,
        account_type: input.account_type || null,
      })

      if (!error) await refreshAccounts()
      return { error }
    } finally {
      setIsMutating(false)
    }
  }

  async function archiveAccount(accountId: string) {
    const activeCount = accounts.filter((a) => !a.is_archived).length
    if (activeCount <= 1) {
      return { error: new Error('Mindestens ein aktives Konto muss vorhanden sein.') }
    }

    setIsMutating(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ is_archived: true })
        .eq('id', accountId)

      if (!error) await refreshAccounts()
      return { error }
    } finally {
      setIsMutating(false)
    }
  }

  async function updateAccount(accountId: string, input: Partial<CreateAccountInput>) {
    setIsMutating(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: input.name,
          start_balance: input.start_balance,
          currency: input.currency,
          broker: input.broker ?? null,
          description: input.description ?? null,
          account_type: input.account_type ?? null,
        })
        .eq('id', accountId)

      if (!error) await refreshAccounts()
      return { error }
    } finally {
      setIsMutating(false)
    }
  }

  async function deleteAccount(accountId: string) {
    setIsMutating(true)
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', accountId)
      if (!error) await refreshAccounts()
      return { error }
    } finally {
      setIsMutating(false)
    }
  }

  return {
    accounts,
    activeAccount,
    isLoading,
    isMutating,
    setActiveAccount,
    createAccount,
    updateAccount,
    archiveAccount,
    deleteAccount,
  }
}
