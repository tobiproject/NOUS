'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Star, Loader2, ChevronDown, ChevronUp, Check, Search, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWatchlist, type WatchlistItem } from '@/hooks/useWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'
import { searchAssets, type AssetEntry } from '@/lib/asset-database'
import { DailyWatchlistPanel } from '@/components/watchlist/DailyWatchlistPanel'

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORIES: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'futures',     label: 'Futures',      color: '#2962FF', bg: 'rgba(41,98,255,0.12)'   },
  { value: 'forex',       label: 'Forex',        color: '#089981', bg: 'rgba(8,153,129,0.12)'   },
  { value: 'crypto',      label: 'Crypto',       color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  { value: 'indices',     label: 'Indices',      color: '#EC4899', bg: 'rgba(236,72,153,0.12)'  },
  { value: 'stocks',      label: 'Aktien',       color: '#6366F1', bg: 'rgba(99,102,241,0.12)'  },
  { value: 'cfd',         label: 'CFD',          color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  { value: 'etf',         label: 'ETF',          color: '#14B8A6', bg: 'rgba(20,184,166,0.12)'  },
  { value: 'energy',      label: 'Energie',      color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  { value: 'metals',      label: 'Metalle',      color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  { value: 'agriculture', label: 'Landwirtschaft', color: '#84CC16', bg: 'rgba(132,204,22,0.12)' },
  { value: 'bonds',       label: 'Anleihen',     color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)'  },
  { value: 'other',       label: 'Sonstige',     color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
]

const FUTURES_LIKE = new Set(['futures', 'energy', 'metals', 'agriculture', 'bonds'])

const getCat = (value: string) =>
  CATEGORIES.find(c => c.value === value) ??
  { value, label: value, color: '#6B7280', bg: 'rgba(107,114,128,0.12)' }

// TradingView-style color palette
const COLOR_PRESETS = [
  '#F23645', '#FF6B35', '#F59E0B', '#22c55e', '#089981',
  '#2962FF', '#7C3AED', '#EC4899', '#06B6D4', '#ffffff',
  '#ff8210', '#4ade80', '#60a5fa', '#a78bfa', '#f87171',
]

// ─── CME Presets ──────────────────────────────────────────────────────────────

const CME_PRESETS: Record<string, { tick_size: number; tick_value: number; point_value: number; label: string }> = {
  // Indices
  NQ:  { tick_size: 0.25,      tick_value: 5.00,    point_value: 20.00,    label: 'E-mini Nasdaq 100' },
  MNQ: { tick_size: 0.25,      tick_value: 0.50,    point_value: 2.00,     label: 'Micro Nasdaq 100' },
  ES:  { tick_size: 0.25,      tick_value: 12.50,   point_value: 50.00,    label: 'E-mini S&P 500' },
  MES: { tick_size: 0.25,      tick_value: 1.25,    point_value: 5.00,     label: 'Micro S&P 500' },
  YM:  { tick_size: 1.00,      tick_value: 5.00,    point_value: 5.00,     label: 'E-mini Dow' },
  MYM: { tick_size: 1.00,      tick_value: 0.50,    point_value: 0.50,     label: 'Micro Dow' },
  RTY: { tick_size: 0.10,      tick_value: 5.00,    point_value: 50.00,    label: 'E-mini Russell 2000' },
  // Energy
  CL:  { tick_size: 0.01,      tick_value: 10.00,   point_value: 1000.00,  label: 'Crude Oil' },
  MCL: { tick_size: 0.01,      tick_value: 1.00,    point_value: 100.00,   label: 'Micro Crude Oil' },
  NG:  { tick_size: 0.001,     tick_value: 10.00,   point_value: 10000.00, label: 'Natural Gas' },
  RB:  { tick_size: 0.0001,    tick_value: 4.20,    point_value: 42000.00, label: 'RBOB Gasoline' },
  HO:  { tick_size: 0.0001,    tick_value: 4.20,    point_value: 42000.00, label: 'Heating Oil' },
  // Metals
  GC:  { tick_size: 0.10,      tick_value: 10.00,   point_value: 100.00,   label: 'Gold' },
  MGC: { tick_size: 0.10,      tick_value: 1.00,    point_value: 10.00,    label: 'Micro Gold' },
  SI:  { tick_size: 0.005,     tick_value: 25.00,   point_value: 5000.00,  label: 'Silver' },
  SIL: { tick_size: 0.0025,    tick_value: 12.50,   point_value: 2500.00,  label: 'Micro Silver' },
  HG:  { tick_size: 0.0005,    tick_value: 12.50,   point_value: 25000.00, label: 'Copper' },
  PL:  { tick_size: 0.10,      tick_value: 5.00,    point_value: 50.00,    label: 'Platinum' },
  PA:  { tick_size: 0.05,      tick_value: 5.00,    point_value: 100.00,   label: 'Palladium' },
  // Agriculture
  ZC:  { tick_size: 0.25,      tick_value: 12.50,   point_value: 50.00,    label: 'Corn' },
  ZW:  { tick_size: 0.25,      tick_value: 12.50,   point_value: 50.00,    label: 'Wheat' },
  ZS:  { tick_size: 0.25,      tick_value: 12.50,   point_value: 50.00,    label: 'Soybeans' },
  ZL:  { tick_size: 0.0001,    tick_value: 0.006,   point_value: 60.00,    label: 'Soybean Oil' },
  ZM:  { tick_size: 0.10,      tick_value: 10.00,   point_value: 100.00,   label: 'Soybean Meal' },
  KC:  { tick_size: 0.0005,    tick_value: 18.75,   point_value: 37500.00, label: 'Coffee C' },
  SB:  { tick_size: 0.0001,    tick_value: 11.20,   point_value: 112000.00,label: 'Sugar No. 11' },
  CC:  { tick_size: 1.00,      tick_value: 10.00,   point_value: 10.00,    label: 'Cocoa' },
  CT:  { tick_size: 0.0001,    tick_value: 5.00,    point_value: 50000.00, label: 'Cotton No. 2' },
  // Bonds
  ZN:  { tick_size: 0.015625,  tick_value: 15.625,  point_value: 1000.00,  label: '10-Year T-Note' },
  ZB:  { tick_size: 0.03125,   tick_value: 31.25,   point_value: 1000.00,  label: '30-Year T-Bond' },
  ZF:  { tick_size: 0.0078125, tick_value: 7.8125,  point_value: 1000.00,  label: '5-Year T-Note' },
  ZT:  { tick_size: 0.0078125, tick_value: 15.625,  point_value: 2000.00,  label: '2-Year T-Note' },
  UB:  { tick_size: 0.03125,   tick_value: 31.25,   point_value: 1000.00,  label: 'Ultra T-Bond' },
}

// ─── Search config ────────────────────────────────────────────────────────────

const SEARCH_TABS = [
  { id: 'all',         label: 'Alle' },
  { id: 'stocks',      label: 'Aktien' },
  { id: 'commodities', label: 'Geldmittel' },
  { id: 'futures',     label: 'Futures' },
  { id: 'forex',       label: 'Forex' },
  { id: 'crypto',      label: 'Krypto' },
  { id: 'indices',     label: 'Indizes' },
  { id: 'bonds',       label: 'Anleihen' },
  { id: 'etf',         label: 'ETF' },
  { id: 'cfd',         label: 'CFD' },
]

interface SearchResult { symbol: string; name: string; category: string; exchange: string }

// ─── Asset Search Picker ──────────────────────────────────────────────────────

function AssetSearchPicker({
  existingSymbols,
  onAdd,
}: {
  existingSymbols: Set<string>
  onAdd: (symbol: string, name: string, category: string, color?: string | null) => Promise<string | null>
}) {
  const [query, setQuery]           = useState('')
  const [activeTab, setActiveTab]   = useState('all')
  const [results, setResults]       = useState<SearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [adding, setAdding]         = useState<string | null>(null)
  const [focused, setFocused]       = useState(false)
  const [addError, setAddError]     = useState<string | null>(null)

  const inputRef    = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Debounced search — TradingView API with local fallback
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/symbol-search?q=${encodeURIComponent(query)}&tab=${activeTab}`)
        const data = await res.json()
        if (data.results?.length > 0) {
          setResults(data.results)
        } else {
          setResults(searchAssets(query, 15).map(a => ({ ...a, exchange: '' })))
        }
      } catch {
        setResults(searchAssets(query, 15).map(a => ({ ...a, exchange: '' })))
      }
      setSearching(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, activeTab])

  const doAdd = async (sym: string, name: string, cat: string, color: string | null) => {
    setAdding(sym)
    setAddError(null)
    try {
      const err = await onAdd(sym, name, cat, color)
      if (err) { setAddError(err); return }
      setQuery('')
      inputRef.current?.focus()
    } catch {
      setAddError('Verbindungsfehler')
    } finally {
      setAdding(null)
    }
  }

  const handleQuickAdd = (asset: SearchResult) => {
    if (existingSymbols.has(asset.symbol) || adding) return
    doAdd(asset.symbol, asset.name, asset.category, null)
  }

  const handleCustomAdd = () => {
    const sym = query.trim().toUpperCase()
    if (!sym || existingSymbols.has(sym) || adding) return
    doAdd(sym, '', 'other', null)
  }

  const showDropdown = focused && query.trim().length > 0
  const exactMatch   = results.some(r => r.symbol.toLowerCase() === query.trim().toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 h-10 transition-colors"
        style={{ background: 'var(--bg-1)', border: `1px solid ${focused ? 'var(--brand-blue)' : 'var(--border-strong)'}` }}
      >
        <Search className="h-4 w-4 shrink-0" style={{ color: focused ? 'var(--brand-blue)' : 'var(--fg-4)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Symbol, ISIN oder Name suchen…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--fg-1)' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && results.length > 0 && !existingSymbols.has(results[0].symbol)) handleQuickAdd(results[0])
            if (e.key === 'Escape') { setFocused(false) }
          }}
        />
        {searching && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: 'var(--fg-4)' }} />}
        {query && !searching && (
          <button onClick={() => setQuery('')} className="shrink-0 px-1 text-xs" style={{ color: 'var(--fg-4)' }}>✕</button>
        )}
      </div>

      {/* Dropdown panel */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-12 z-50 rounded-xl shadow-2xl"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-strong)' }}
        >
          {/* Header + tabs */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--fg-4)' }}>
              Symbolsuche
            </p>
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {SEARCH_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: activeTab === tab.id ? 'var(--fg-1)' : 'transparent',
                    color:      activeTab === tab.id ? 'var(--bg-1)' : 'var(--fg-4)',
                    border:     activeTab === tab.id ? 'none' : '1px solid var(--border-raw)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-52 overflow-y-auto" style={{ borderTop: '1px solid var(--border-raw)' }}>
            {results.map(asset => {
              const cat      = CATEGORIES.find(c => c.value === asset.category) ?? CATEGORIES[CATEGORIES.length - 1]
              const already  = existingSymbols.has(asset.symbol)
              const isAdding = adding === asset.symbol

              return (
                <div
                  key={asset.symbol}
                  className={`group/row flex items-center gap-3 px-3 py-2 transition-colors ${already ? 'cursor-default' : 'cursor-pointer'}`}
                  style={{ opacity: already ? 0.4 : 1 }}
                  onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = 'var(--bg-4)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  onClick={() => !already && !isAdding && handleQuickAdd(asset)}
                >
                  {/* Decorative flag icon showing category color */}
                  <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: cat.color }} />
                    ) : already ? (
                      <Check className="h-4 w-4" style={{ color: cat.color }} />
                    ) : (
                      <Flag className="h-4 w-4" style={{ color: cat.color, opacity: 0.6 }} />
                    )}
                  </div>

                  {/* Symbol */}
                  <span className="ticker text-sm font-bold w-[72px] shrink-0" style={{ color: already ? 'var(--fg-4)' : cat.color }}>
                    {asset.symbol}
                  </span>

                  {/* Name */}
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--fg-3)' }}>
                    {asset.name}
                  </span>

                  {/* Exchange */}
                  {asset.exchange && (
                    <span className="text-[10px] shrink-0 hidden sm:block" style={{ color: 'var(--fg-4)' }}>
                      {asset.exchange}
                    </span>
                  )}

                  {/* Category badge */}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: cat.bg, color: cat.color }}>
                    {cat.label}
                  </span>

                  {/* Quick-add + button on hover */}
                  {!already && !isAdding ? (
                    <span
                      className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold"
                      style={{ background: '#fff', color: '#000' }}
                    >
                      +
                    </span>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}
                </div>
              )
            })}

            {results.length === 0 && !searching && (
              <p className="px-4 py-3 text-xs" style={{ color: 'var(--fg-4)' }}>
                Keine Ergebnisse — unbekannte Symbole werden automatisch hinzugefügt.
              </p>
            )}
          </div>

          {/* Error feedback */}
          {addError && (
            <p className="px-4 py-2 text-xs" style={{ color: 'var(--short)', borderTop: '1px solid var(--border-raw)' }}>
              {addError}
            </p>
          )}

          {/* Custom add for truly unknown symbols */}
          {!exactMatch && query.trim() && (
            <button
              onClick={handleCustomAdd}
              disabled={existingSymbols.has(query.trim().toUpperCase()) || adding !== null}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ borderTop: results.length > 0 ? '1px solid var(--border-raw)' : 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {adding === query.trim().toUpperCase()
                ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: 'var(--brand-blue)' }} />
                : <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-blue)' }} />
              }
              <span className="ticker text-sm font-bold" style={{ color: 'var(--brand-blue)' }}>
                {query.trim().toUpperCase()}
              </span>
              <span className="text-xs" style={{ color: 'var(--fg-4)' }}>
                als benutzerdefiniertes Asset hinzufügen
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Flag Picker (color + category for watchlist rows) ────────────────────────

type WatchlistPatch = {
  tick_size?: number | null; tick_value?: number | null; point_value?: number | null
  color?: string | null; category?: string
}

function FlagPicker({ item, onUpdate }: { item: WatchlistItem; onUpdate: (p: WatchlistPatch) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [customCat, setCustomCat] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const cat = getCat(item.category)
  const flagColor = item.color ?? cat.color

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 flex items-center justify-center rounded transition-opacity hover:opacity-70"
        title="Farbe & Kategorie ändern"
      >
        <Flag className="h-4 w-4" style={{ color: flagColor }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-9 z-50 rounded-xl shadow-2xl p-3 space-y-3"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-strong)', width: 228 }}
        >
          {/* Color */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Farbe</p>
            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-125"
                  style={{ background: c, outline: item.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                  onClick={() => onUpdate({ color: c })}
                />
              ))}
              <button
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'var(--bg-4)', color: 'var(--fg-4)', border: '1px solid var(--border-raw)' }}
                onClick={() => onUpdate({ color: null })}
                title="Auto"
              >A</button>
            </div>
          </div>

          {/* Standard categories */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Kategorie</p>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => { onUpdate({ category: c.value }); setOpen(false) }}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded transition-all"
                  style={{
                    background: item.category === c.value ? c.color : c.bg,
                    color:      item.category === c.value ? '#fff' : c.color,
                    border:     `1px solid ${c.color}50`,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom category */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-4)' }}>Eigene Gruppe</p>
            <div className="flex gap-1.5">
              <input
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                placeholder="z.B. Meine Top-Picks"
                className="flex-1 text-xs px-2 py-1 rounded outline-none"
                style={{ background: 'var(--bg-1)', border: '1px solid var(--border-raw)', color: 'var(--fg-1)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customCat.trim()) {
                    onUpdate({ category: customCat.trim() })
                    setOpen(false)
                  }
                }}
              />
              <button
                onClick={() => { if (customCat.trim()) { onUpdate({ category: customCat.trim() }); setOpen(false) } }}
                className="text-xs px-2 py-1 rounded font-semibold shrink-0"
                style={{ background: 'var(--brand-blue)', color: '#fff' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Futures Tick Editor ──────────────────────────────────────────────────────

function FuturesTickEditor({ item, onSave }: {
  item: WatchlistItem
  onSave: (patch: { tick_size: number | null; tick_value: number | null; point_value: number | null }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [tickSize, setTickSize] = useState(String(item.tick_size ?? ''))
  const [tickValue, setTickValue] = useState(String(item.tick_value ?? ''))
  const [pointValue, setPointValue] = useState(String(item.point_value ?? ''))
  const [saving, setSaving] = useState(false)
  const preset = CME_PRESETS[item.symbol]

  const applyPreset = () => {
    if (!preset) return
    setTickSize(String(preset.tick_size))
    setTickValue(String(preset.tick_value))
    setPointValue(String(preset.point_value))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      tick_size: tickSize ? parseFloat(tickSize) : null,
      tick_value: tickValue ? parseFloat(tickValue) : null,
      point_value: pointValue ? parseFloat(pointValue) : null,
    })
    setSaving(false)
    setOpen(false)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors"
        style={{
          color: item.point_value ? '#2962FF' : 'var(--fg-4)',
          background: item.point_value ? 'rgba(41,98,255,0.1)' : 'transparent',
        }}
      >
        {item.point_value ? `$${item.point_value}/Pt` : 'Kontraktwert'}
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>

      {open && (
        <div className="mt-2 rounded-lg p-3 space-y-3" style={{ background: 'var(--bg-1)', border: '1px solid var(--border-raw)' }}>
          {preset && (
            <button onClick={applyPreset} className="text-[11px] px-2 py-1 rounded flex items-center gap-1"
              style={{ background: 'rgba(41,98,255,0.12)', color: '#2962FF' }}>
              <Check className="h-3 w-3" />
              CME-Standard: {preset.label} (${preset.point_value}/Pt)
            </button>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tick-Größe', val: tickSize, set: setTickSize, ph: '0.25' },
              { label: 'Tick-Wert ($)', val: tickValue, set: setTickValue, ph: '5.00' },
              { label: '$/Punkt', val: pointValue, set: setPointValue, ph: '20.00' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] mb-1" style={{ color: 'var(--fg-4)' }}>{f.label}</p>
                <Input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="h-7 text-xs" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--fg-4)' }}>Abbrechen</button>
            <Button onClick={handleSave} disabled={saving} className="h-7 px-3 text-xs rounded"
              style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Speichern'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Watchlist Row ────────────────────────────────────────────────────────────

function WatchlistRow({ item, onRemove, onUpdate, removing }: {
  item: WatchlistItem
  onRemove: () => void
  onUpdate: (patch: WatchlistPatch) => Promise<void>
  removing: boolean
}) {
  const cat = getCat(item.category)
  const symColor = item.color ?? cat.color

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
    >
      {/* Flag — click to change color + category */}
      <FlagPicker item={item} onUpdate={onUpdate} />

      {/* Symbol + name */}
      <div className="flex-1 min-w-0 flex items-center gap-2.5">
        <span className="ticker text-[13px] font-bold" style={{ color: symColor }}>
          {item.symbol}
        </span>
        {item.name && (
          <span className="text-[11px] truncate" style={{ color: 'var(--fg-4)' }}>
            {item.name}
          </span>
        )}
      </div>

      {/* Futures tick editor */}
      {FUTURES_LIKE.has(item.category) && (
        <FuturesTickEditor item={item} onSave={patch => onUpdate(patch)} />
      )}

      {/* Category badge — white label */}
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ background: cat.bg, color: 'var(--fg-1)' }}
      >
        {cat.label}
      </span>

      {/* Delete */}
      <button
        onClick={onRemove}
        disabled={removing}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--fg-4)' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--short)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-4)')}
      >
        {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const { activeAccount } = useAccountContext()
  const { items, loading, addItem, removeItem, updateItem } = useWatchlist(activeAccount?.id)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const existingSymbols = new Set(items.map(i => i.symbol))

  const handleAdd = async (sym: string, nm: string, cat: string, color?: string | null) => {
    const result = await addItem(sym, nm || undefined, cat, color)
    return result?.error ?? null
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    await removeItem(id)
    setRemovingId(null)
  }

  // Standard categories + any custom ones the user has created
  const grouped = (() => {
    const standard = CATEGORIES.map(cat => ({
      ...cat,
      items: items.filter(i => i.category === cat.value),
    })).filter(g => g.items.length > 0)

    const customNames = [...new Set(
      items
        .filter(i => !CATEGORIES.some(c => c.value === i.category))
        .map(i => i.category ?? 'other')
    )]
    const custom = customNames.map(name => ({
      value: name, label: name, color: '#6B7280', bg: 'rgba(107,114,128,0.12)',
      items: items.filter(i => i.category === name),
    }))

    return [...standard, ...custom]
  })()

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="eyebrow mb-1">Assets</div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg-1)' }}>
          Watchlist
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
          {activeAccount?.name} — Assets erscheinen im Journal, Tagesplan und Kalender.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="today">Heute</TabsTrigger>
        </TabsList>

        {/* ── Allgemeine Watchlist ── */}
        <TabsContent value="general" className="space-y-4">
          {/* Symbolsuche */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Symbolsuche</p>
            <AssetSearchPicker existingSymbols={existingSymbols} onAdd={handleAdd} />
          </div>

          {/* Watchlist items */}
          <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
                Deine Watchlist
                {items.length > 0 && (
                  <span className="ml-2 text-[11px] font-normal" style={{ color: 'var(--fg-4)' }}>
                    {items.length} Assets
                  </span>
                )}
              </p>
              {items.length > 0 && (
                <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
                  Fähnchen klicken → Farbe & Gruppe ändern
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm py-4" style={{ color: 'var(--fg-4)' }}>
                <Loader2 className="h-4 w-4 animate-spin" />Laden…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Star className="h-8 w-8 opacity-20" style={{ color: 'var(--fg-4)' }} />
                <p className="text-sm" style={{ color: 'var(--fg-4)' }}>Noch keine Assets — oben suchen und hinzufügen.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {grouped.map(group => (
                  <div key={group.value}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--fg-1)' }}>
                        {group.label}
                      </span>
                      <div className="flex-1 h-px" style={{ background: group.bg }} />
                      <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
                        {group.items.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.items.map(item => (
                        <WatchlistRow
                          key={item.id}
                          item={item}
                          removing={removingId === item.id}
                          onRemove={() => handleRemove(item.id)}
                          onUpdate={patch => updateItem(item.id, patch).then(() => {})}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


        </TabsContent>

        {/* ── Heutige Trading-Watchlist ── */}
        <TabsContent value="today">
          <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Heutige Trading-Watchlist</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
                Assets auf die du dich heute aktiv fokussierst — steuert Hervorhebungen im Wirtschaftskalender.
              </p>
            </div>
            <DailyWatchlistPanel accountId={activeAccount?.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
