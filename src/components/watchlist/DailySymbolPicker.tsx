'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Loader2, Plus } from 'lucide-react'

interface Props {
  availableSymbols: string[]
  selectedSymbols: string[]
  adding: string | null
  onAdd: (symbol: string) => void
  disabled?: boolean
}

export function DailySymbolPicker({ availableSymbols, selectedSymbols, adding, onAdd, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const unselected = availableSymbols.filter(s => !selectedSymbols.includes(s))

  if (availableSymbols.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
        Füge zuerst Assets zur allgemeinen Watchlist hinzu.
      </p>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled || unselected.length === 0}
        className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
        style={{
          background: 'rgba(41,98,255,0.12)',
          border: '1px solid rgba(41,98,255,0.3)',
          color: '#2962FF',
        }}
      >
        <Plus className="h-4 w-4" />
        Symbol hinzufügen
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && unselected.length > 0 && (
        <div
          className="absolute left-0 top-11 z-50 rounded-xl shadow-2xl min-w-[160px] py-1"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-strong)' }}
        >
          {unselected.map(sym => (
            <button
              key={sym}
              onClick={() => { onAdd(sym); setOpen(false) }}
              disabled={adding === sym}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-[var(--bg-4)] disabled:opacity-50"
            >
              {adding === sym
                ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: '#089981' }} />
                : <span className="w-3.5 h-3.5 shrink-0" />
              }
              <span className="ticker" style={{ color: '#089981' }}>{sym}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
