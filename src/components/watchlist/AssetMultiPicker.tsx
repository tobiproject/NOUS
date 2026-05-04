'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'

const CAT_LABELS: Record<string, string> = {
  futures: 'Futures',
  forex: 'Forex',
  crypto: 'Crypto',
  stocks: 'Aktien',
  indices: 'Indices',
  cfd: 'CFD',
  other: 'Sonstige',
}

interface Props {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function AssetMultiPicker({ value, onChange, placeholder = 'Asset hinzufügen…' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { activeAccount } = useAccountContext()
  const { items } = useWatchlist(activeAccount?.id)

  const filtered = search
    ? items.filter(i =>
        i.symbol.toLowerCase().includes(search.toLowerCase()) ||
        (i.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : items

  const available = filtered.filter(i => !value.includes(i.symbol))
  const categories = [...new Set(available.map(i => i.category))]

  const add = (symbol: string) => {
    if (!value.includes(symbol)) onChange([...value, symbol])
    setSearch('')
  }

  const remove = (symbol: string) => onChange(value.filter(s => s !== symbol))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search) {
      e.preventDefault()
      add(search.toUpperCase())
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(sym => (
            <Badge key={sym} variant="secondary" className="gap-1 text-xs">
              <span className="ticker">{sym}</span>
              <button type="button" onClick={() => remove(sym)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border-raw)',
              color: 'var(--fg-2)',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Suchen oder eingeben…"
              value={search}
              onValueChange={setSearch}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              {items.length === 0 ? (
                <div className="py-3 px-3 text-center text-xs" style={{ color: 'var(--fg-4)' }}>
                  Watchlist leer —{' '}
                  <a href="/watchlist" className="underline" style={{ color: 'var(--brand-blue)' }}>
                    Assets hinzufügen
                  </a>
                </div>
              ) : (
                <>
                  {search && !available.find(i => i.symbol === search.toUpperCase()) && (
                    <CommandGroup>
                      <CommandItem
                        value={`__free__${search}`}
                        onSelect={() => add(search.toUpperCase())}
                        className="text-sm"
                      >
                        <Plus className="mr-2 h-3.5 w-3.5 shrink-0" />
                        <span className="ticker">"{search.toUpperCase()}"</span>
                        <span className="ml-1 text-xs opacity-60">hinzufügen</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {available.length === 0 && !search && (
                    <div className="py-3 px-3 text-center text-xs" style={{ color: 'var(--fg-4)' }}>
                      Alle Watchlist-Assets bereits ausgewählt
                    </div>
                  )}
                  {categories.map(cat => (
                    <CommandGroup key={cat} heading={CAT_LABELS[cat] ?? cat}>
                      {available.filter(i => i.category === cat).map(item => (
                        <CommandItem
                          key={item.id}
                          value={item.symbol}
                          onSelect={() => add(item.symbol)}
                          className="text-sm gap-2"
                        >
                          <span className="ticker">{item.symbol}</span>
                          {item.name && (
                            <span className="text-xs opacity-50 truncate">{item.name}</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
