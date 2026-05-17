'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase'

export interface Account {
  id: string
  user_id: string
  name: string
  broker: string | null
  currency: string
  start_balance: number
  description: string | null
  account_type: string | null
  is_archived: boolean
  created_at: string
}

interface AccountContextValue {
  accounts: Account[]
  activeAccount: Account | null
  isLoading: boolean
  setActiveAccount: (account: Account) => void
  refreshAccounts: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

const ACTIVE_ACCOUNT_KEY = 'trade_os_active_account'

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const refreshAccounts = useCallback(async () => {
    const [accountsResult, profileResult] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('last_active_account_id')
        .single(),
    ])

    if (accountsResult.error || !accountsResult.data) return

    const data = accountsResult.data
    setAccounts(data)

    // Priority: localStorage (fastest) → DB (cross-device) → first account
    const localId = localStorage.getItem(ACTIVE_ACCOUNT_KEY)
    const dbId = profileResult.data?.last_active_account_id
    const resolvedId = localId || dbId
    const resolved = data.find((a) => a.id === resolvedId)

    if (resolved) {
      setActiveAccountState(resolved)
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, resolved.id)
    } else if (data.length > 0) {
      setActiveAccountState(data[0])
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, data[0].id)
    }
  }, [supabase])

  useEffect(() => {
    setIsLoading(true)
    refreshAccounts().finally(() => setIsLoading(false))
  }, [refreshAccounts])

  const setActiveAccount = useCallback((account: Account) => {
    setActiveAccountState(account)
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id)
    // Sync to DB for cross-device persistence (fire-and-forget)
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('profiles')
        .update({ last_active_account_id: account.id })
        .eq('id', data.user.id)
        .then(() => {})
    })
  }, [supabase])

  return (
    <AccountContext.Provider value={{ accounts, activeAccount, isLoading, setActiveAccount, refreshAccounts }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccountContext() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccountContext must be used within AccountProvider')
  return ctx
}
