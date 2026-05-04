'use client'

import { useState } from 'react'
import { Plus, Trash2, Star, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWatchlist, type WatchlistItem } from '@/hooks/useWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'futures',  label: 'Futures' },
  { value: 'forex',    label: 'Forex' },
  { value: 'crypto',   label: 'Crypto' },
  { value: 'stocks',   label: 'Aktien' },
  { value: 'indices',  label: 'Indices' },
  { value: 'cfd',      label: 'CFD' },
  { value: 'other',    label: 'Sonstige' },
]

// CME standard contract specs
const CME_PRESETS: Record<string, { tick_size: number; tick_value: number; point_value: number; label: string }> = {
  NQ:  { tick_size: 0.25, tick_value: 5.00,   point_value: 20.00,   label: 'E-mini Nasdaq 100' },
  MNQ: { tick_size: 0.25, tick_value: 0.50,   point_value: 2.00,    label: 'Micro Nasdaq 100' },
  ES:  { tick_size: 0.25, tick_value: 12.50,  point_value: 50.00,   label: 'E-mini S&P 500' },
  MES: { tick_size: 0.25, tick_value: 1.25,   point_value: 5.00,    label: 'Micro S&P 500' },
  YM:  { tick_size: 1.00, tick_value: 5.00,   point_value: 5.00,    label: 'E-mini Dow' },
  MYM: { tick_size: 1.00, tick_value: 0.50,   point_value: 0.50,    label: 'Micro Dow' },
  RTY: { tick_size: 0.10, tick_value: 5.00,   point_value: 50.00,   label: 'E-mini Russell 2000' },
  CL:  { tick_size: 0.01, tick_value: 10.00,  point_value: 1000.00, label: 'Crude Oil' },
  MCL: { tick_size: 0.01, tick_value: 1.00,   point_value: 100.00,  label: 'Micro Crude Oil' },
  GC:  { tick_size: 0.10, tick_value: 10.00,  point_value: 100.00,  label: 'Gold' },
  MGC: { tick_size: 0.10, tick_value: 1.00,   point_value: 10.00,   label: 'Micro Gold' },
}

const QUICK_ADD: { symbol: string; name: string; category: string }[] = [
  { symbol: 'NQ',      name: 'Nasdaq 100 Futures',     category: 'futures' },
  { symbol: 'ES',      name: 'S&P 500 Futures',        category: 'futures' },
  { symbol: 'YM',      name: 'Dow Jones Futures',      category: 'futures' },
  { symbol: 'MNQ',     name: 'Micro Nasdaq 100',       category: 'futures' },
  { symbol: 'MES',     name: 'Micro S&P 500',          category: 'futures' },
  { symbol: 'MYM',     name: 'Micro Dow Jones',        category: 'futures' },
  { symbol: 'RTY',     name: 'Russell 2000 Futures',   category: 'futures' },
  { symbol: 'CL',      name: 'Crude Oil Futures',      category: 'futures' },
  { symbol: 'GC',      name: 'Gold Futures',           category: 'futures' },
  { symbol: 'EURUSD',  name: 'Euro / US Dollar',       category: 'forex' },
  { symbol: 'GBPUSD',  name: 'British Pound / USD',    category: 'forex' },
  { symbol: 'USDJPY',  name: 'US Dollar / Yen',        category: 'forex' },
  { symbol: 'AUDUSD',  name: 'Australian Dollar',      category: 'forex' },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar',    category: 'crypto' },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar',   category: 'crypto' },
  { symbol: 'SOL/USD', name: 'Solana / US Dollar',     category: 'crypto' },
  { symbol: 'SPX',     name: 'S&P 500 Index',          category: 'indices' },
  { symbol: 'NDX',     name: 'Nasdaq 100 Index',       category: 'indices' },
  { symbol: 'DAX',     name: 'DAX Index',              category: 'indices' },
  { symbol: 'DE40',    name: 'DAX CFD',                category: 'cfd' },
  { symbol: 'US100',   name: 'Nasdaq 100 CFD',         category: 'cfd' },
  { symbol: 'US500',   name: 'S&P 500 CFD',            category: 'cfd' },
]

// ─── Futures Row with inline tick editor ─────────────────────────────────────

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
    <div className="w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded transition-colors"
        style={{
          color: item.point_value ? 'var(--brand-blue)' : 'var(--fg-4)',
          background: item.point_value ? 'rgba(41,98,255,0.1)' : 'transparent',
        }}
      >
        {item.point_value ? `$${item.point_value}/Pt` : 'Kontraktwert'}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div
          className="mt-2 rounded-lg p-3 space-y-3"
          style={{ background: 'var(--bg-1)', border: '1px solid var(--border-raw)' }}
        >
          {preset && (
            <button
              onClick={applyPreset}
              className="text-[11px] px-2 py-1 rounded flex items-center gap-1"
              style={{ background: 'rgba(41,98,255,0.12)', color: 'var(--brand-blue)' }}
            >
              <Check className="h-3 w-3" />
              CME-Standard laden ({preset.label}: ${preset.point_value}/Pt)
            </button>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] mb-1" style={{ color: 'var(--fg-4)' }}>Tick-Größe</p>
              <Input
                value={tickSize}
                onChange={e => setTickSize(e.target.value)}
                placeholder="0.25"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: 'var(--fg-4)' }}>Tick-Wert ($)</p>
              <Input
                value={tickValue}
                onChange={e => setTickValue(e.target.value)}
                placeholder="5.00"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: 'var(--fg-4)' }}>$/Punkt</p>
              <Input
                value={pointValue}
                onChange={e => setPointValue(e.target.value)}
                placeholder="20.00"
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--fg-4)' }}
            >
              Abbrechen
            </button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-7 px-3 text-xs rounded"
              style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Speichern'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const { activeAccount } = useAccountContext()
  const { items, loading, addItem, removeItem, updateItem } = useWatchlist(activeAccount?.id)
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('futures')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const existingSymbols = new Set(items.map(i => i.symbol))

  const handleAdd = async (sym?: string, nm?: string, cat?: string) => {
    const s = (sym ?? symbol).trim().toUpperCase()
    const raw = nm ?? name.trim()
    const n = raw || undefined
    const c = cat ?? category
    if (!s) return
    setAdding(true)
    setError(null)
    const result = await addItem(s, n, c)
    if (result.error === null) {
      setSymbol('')
      setName('')
    } else {
      setError(result.error)
    }
    setAdding(false)
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    await removeItem(id)
    setRemovingId(null)
  }

  // Group items by category preserving CATEGORIES order
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.value),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <div className="eyebrow mb-1">Verwaltung</div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}
        >
          Watchlist
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
          Deine gehandelten Assets — überall im Journal, Tagesplan und Einstellungen verfügbar.
        </p>
      </div>

      {/* Quick Add Popular */}
      <Section title="Schnell hinzufügen" subtitle="Beliebte Instrumente — klicken zum Hinzufügen">
        <div className="flex flex-wrap gap-2">
          {QUICK_ADD.map(q => {
            const already = existingSymbols.has(q.symbol)
            return (
              <button
                key={q.symbol}
                onClick={() => !already && handleAdd(q.symbol, q.name, q.category)}
                disabled={already || adding}
                className={cn(
                  'ticker text-xs px-2.5 py-1.5 rounded transition-colors',
                  already
                    ? 'opacity-40 cursor-default'
                    : 'cursor-pointer'
                )}
                style={{
                  background: already ? 'var(--bg-3)' : 'var(--bg-3)',
                  color: already ? 'var(--fg-4)' : 'var(--fg-1)',
                  border: `1px solid ${already ? 'transparent' : 'var(--border-raw)'}`,
                }}
                title={q.name}
              >
                {already ? '✓ ' : ''}{q.symbol}
              </button>
            )
          })}
        </div>
      </Section>

      {/* Custom Add */}
      <Section title="Asset hinzufügen" subtitle="Eigenes Symbol manuell eintragen">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              placeholder="Symbol, z.B. USDCAD"
              className="ticker uppercase flex-1 h-9"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            />
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name (optional)"
              className="flex-1 h-9"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => handleAdd()}
              disabled={adding || !symbol.trim()}
              className="h-9 px-3 shrink-0 rounded"
              style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          {error && (
            <p className="text-xs" style={{ color: 'var(--short)' }}>{error}</p>
          )}
        </div>
      </Section>

      {/* Current Watchlist */}
      <Section
        title={`Deine Watchlist${items.length > 0 ? ` (${items.length})` : ''}`}
        subtitle="Sortiert nach Kategorie — Futures zeigen Kontraktwert für Risikocalc"
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-4)' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Star className="h-8 w-8 opacity-20" style={{ color: 'var(--fg-4)' }} />
            <p className="text-sm" style={{ color: 'var(--fg-4)' }}>
              Noch keine Assets — oben hinzufügen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(group => (
              <div key={group.value}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--fg-4)' }}
                >
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="rounded px-3 py-2"
                      style={{ background: 'var(--bg-3)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="ticker text-sm font-semibold"
                            style={{ color: 'var(--fg-1)' }}
                          >
                            {item.symbol}
                          </span>
                          {item.name && (
                            <span className="text-xs" style={{ color: 'var(--fg-4)' }}>
                              {item.name}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="rounded p-1 transition-colors"
                          style={{ color: 'var(--fg-4)' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--short)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-4)')}
                        >
                          {removingId === item.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>

                      {/* Futures tick editor */}
                      {item.category === 'futures' && (
                        <div className="mt-1.5">
                          <FuturesTickEditor
                            item={item}
                            onSave={patch => updateItem(item.id, patch).then(() => {})}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-5 space-y-3"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
