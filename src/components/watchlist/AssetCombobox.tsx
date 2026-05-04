'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'

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
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function AssetCombobox({ value, onChange, placeholder = 'Asset wählen…', disabled }: Props) {
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

  const categories = [...new Set(filtered.map(i => i.category))]

  const select = (symbol: string) => {
    onChange(symbol === value ? '' : symbol)
    setOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search) {
      const sym = search.toUpperCase()
      if (!filtered.find(i => i.symbol === sym)) {
        onChange(sym)
        setOpen(false)
        setSearch('')
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-9 text-sm font-normal"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border-raw)',
            color: value ? 'var(--fg-1)' : 'var(--fg-4)',
          }}
        >
          <span className="ticker truncate">{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
              <div className="py-5 px-3 text-center space-y-1">
                <Star className="h-4 w-4 mx-auto opacity-40" style={{ color: 'var(--fg-4)' }} />
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  Watchlist leer —{' '}
                  <a href="/watchlist" className="underline" style={{ color: 'var(--brand-blue)' }}>
                    Assets hinzufügen
                  </a>
                </p>
              </div>
            ) : (
              <>
                {search && !filtered.find(i => i.symbol === search.toUpperCase()) && (
                  <CommandGroup>
                    <CommandItem
                      value={`__free__${search}`}
                      onSelect={() => { onChange(search.toUpperCase()); setOpen(false); setSearch('') }}
                      className="text-sm"
                    >
                      <span className="ticker">"{search.toUpperCase()}"</span>
                      <span className="ml-1.5 text-xs opacity-60">eingeben</span>
                    </CommandItem>
                  </CommandGroup>
                )}
                {categories.map(cat => (
                  <CommandGroup key={cat} heading={CAT_LABELS[cat] ?? cat}>
                    {filtered.filter(i => i.category === cat).map(item => (
                      <CommandItem
                        key={item.id}
                        value={item.symbol}
                        onSelect={select}
                        className="text-sm gap-2"
                      >
                        <Check className={cn('h-3.5 w-3.5 shrink-0', value === item.symbol ? 'opacity-100' : 'opacity-0')} />
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
  )
}
