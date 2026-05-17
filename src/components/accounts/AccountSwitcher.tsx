'use client'

import { ChevronDown, Plus, Archive } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccounts } from '@/hooks/useAccounts'
import Link from 'next/link'

export function AccountSwitcher() {
  const { accounts, activeAccount, isLoading, setActiveAccount } = useAccounts()

  if (isLoading) {
    return <Skeleton className="h-9 w-40" />
  }

  if (!activeAccount) {
    return (
      <Link href="/einstellungen?tab=konten">
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Konto anlegen
        </Button>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 max-w-[200px]"
          aria-label="Aktives Konto wechseln"
        >
          <span className="truncate">{activeAccount.name}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {activeAccount.currency}
          </Badge>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onSelect={() => setActiveAccount(account)}
            className="flex items-center justify-between gap-2 cursor-pointer"
            aria-current={account.id === activeAccount.id ? 'true' : undefined}
          >
            <span className="truncate">{account.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{account.currency}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/einstellungen?tab=konten" className="flex items-center gap-2 cursor-pointer">
            <Archive className="h-4 w-4" />
            Konten verwalten
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
