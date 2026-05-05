'use client'

import { Archive, Trash2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { type Account } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'
import { FullExportButton } from '@/components/export/FullExportButton'
import { AccountEditDialog } from './AccountEditDialog'

interface AccountCardProps {
  account: Account
  isActive: boolean
  onSelect: (account: Account) => void
  onArchive: (account: Account) => void
  onDelete: (account: Account) => void
}

export function AccountCard({ account, isActive, onSelect, onArchive, onDelete }: AccountCardProps) {
  return (
    <Card
      className={cn(
        'relative transition-colors cursor-pointer hover:bg-accent/50',
        isActive && 'ring-1 ring-primary'
      )}
      onClick={() => onSelect(account)}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(account)}
    >
      {isActive && (
        <div className="absolute top-3 right-3">
          <Check className="h-4 w-4 text-primary" aria-label="Aktives Konto" />
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 pr-6">
          <span className="truncate">{account.name}</span>
          <Badge variant="outline" className="shrink-0 text-xs">
            {account.currency}
          </Badge>
        </CardTitle>
        {account.broker && (
          <p className="text-xs text-muted-foreground">{account.broker}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Startbalance</p>
          <p className="text-lg font-semibold tabular-nums">
            {account.start_balance.toLocaleString('de-DE', {
              style: 'currency',
              currency: account.currency,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {account.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{account.description}</p>
        )}

        <div className="flex gap-2 pt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <AccountEditDialog account={account} />
          <FullExportButton accountId={account.id} accountName={account.name} />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => onArchive(account)}
            aria-label={`Konto ${account.name} archivieren`}
          >
            <Archive className="h-3.5 w-3.5" />
            Archivieren
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => onDelete(account)}
            aria-label={`Konto ${account.name} löschen`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Löschen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
