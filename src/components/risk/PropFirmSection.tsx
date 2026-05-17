'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { usePropFirmRules, type PropFirmInput } from '@/hooks/usePropFirmRules'
import { useRiskMetrics } from '@/hooks/useRiskMetrics'
import { cn } from '@/lib/utils'

// Known prop-firm presets
const PRESETS: { label: string; data: Omit<PropFirmInput, 'account_size'> }[] = [
  { label: 'Funded Next Standard', data: { firm_name: 'Funded Next', max_daily_loss_pct: 5, max_total_drawdown_pct: 10, profit_target_pct: 15, trailing_drawdown: false } },
  { label: 'Funded Next Express',  data: { firm_name: 'Funded Next Express', max_daily_loss_pct: 5, max_total_drawdown_pct: 10, profit_target_pct: 25, trailing_drawdown: false } },
  { label: 'FTMO',                 data: { firm_name: 'FTMO', max_daily_loss_pct: 5, max_total_drawdown_pct: 10, profit_target_pct: 10, trailing_drawdown: false } },
  { label: 'TopstepTrader',        data: { firm_name: 'TopstepTrader', max_daily_loss_pct: 3, max_total_drawdown_pct: 6, profit_target_pct: null, trailing_drawdown: true } },
  { label: 'Apex Trader',          data: { firm_name: 'Apex Trader', max_daily_loss_pct: 3, max_total_drawdown_pct: 6, profit_target_pct: null, trailing_drawdown: false } },
  { label: 'E8 Funding',           data: { firm_name: 'E8 Funding', max_daily_loss_pct: 5, max_total_drawdown_pct: 8, profit_target_pct: 8, trailing_drawdown: false } },
]

interface ProgressBarProps {
  label: string
  used: number
  limit: number | null
  suffix?: string
  danger?: boolean
}

function ProgressBar({ label, used, limit, suffix = '%', danger }: ProgressBarProps) {
  if (!limit) return null
  const pct = Math.min((Math.abs(used) / limit) * 100, 100)
  const isWarning = pct >= 70
  const isDanger = pct >= 90 || danger
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--fg-3)' }}>{label}</span>
        <span style={{ color: isDanger ? 'var(--short)' : isWarning ? '#f59e0b' : 'var(--fg-3)' }}>
          {Math.abs(used).toFixed(2)}{suffix} / {limit}{suffix}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isDanger ? 'var(--short)' : isWarning ? '#f59e0b' : 'var(--long)',
          }}
        />
      </div>
    </div>
  )
}

export function PropFirmSection() {
  const { rule, loading, saving, fetchRule, saveRule, deleteRule } = usePropFirmRules()
  const { fetchDailyMetrics, fetchDrawdown } = useRiskMetrics()

  const [editing, setEditing] = useState(false)
  const [dailyLossPct, setDailyLossPct] = useState(0)
  const [drawdownPct, setDrawdownPct] = useState(0)
  const [metricsLoaded, setMetricsLoaded] = useState(false)

  // Form state
  const [firmName, setFirmName] = useState('')
  const [accountSize, setAccountSize] = useState('')
  const [dailyLossLimit, setDailyLossLimit] = useState('')
  const [totalDrawdown, setTotalDrawdown] = useState('')
  const [profitTarget, setProfitTarget] = useState('')
  const [trailing, setTrailing] = useState(false)

  useEffect(() => {
    fetchRule()
  }, [fetchRule])

  useEffect(() => {
    if (!metricsLoaded) {
      Promise.all([fetchDailyMetrics(), fetchDrawdown()]).then(([metrics, dd]) => {
        if (metrics) {
          setDailyLossPct(Math.abs(metrics.dailyLossPct))
        }
        setDrawdownPct(Math.abs(dd))
        setMetricsLoaded(true)
      })
    }
  }, [fetchDailyMetrics, fetchDrawdown, metricsLoaded, rule?.account_size])

  const openEditor = (preset?: typeof PRESETS[0]) => {
    if (preset) {
      setFirmName(preset.data.firm_name)
      setDailyLossLimit(String(preset.data.max_daily_loss_pct ?? ''))
      setTotalDrawdown(String(preset.data.max_total_drawdown_pct ?? ''))
      setProfitTarget(String(preset.data.profit_target_pct ?? ''))
      setTrailing(preset.data.trailing_drawdown ?? false)
      setAccountSize(rule?.account_size ? String(rule.account_size) : '')
    } else if (rule) {
      setFirmName(rule.firm_name)
      setAccountSize(String(rule.account_size))
      setDailyLossLimit(String(rule.max_daily_loss_pct ?? ''))
      setTotalDrawdown(String(rule.max_total_drawdown_pct ?? ''))
      setProfitTarget(String(rule.profit_target_pct ?? ''))
      setTrailing(rule.trailing_drawdown)
    } else {
      setFirmName('')
      setAccountSize('')
      setDailyLossLimit('')
      setTotalDrawdown('')
      setProfitTarget('')
      setTrailing(false)
    }
    setEditing(true)
  }

  const handleSave = async () => {
    const result = await saveRule({
      firm_name: firmName,
      account_size: parseFloat(accountSize) || 100000,
      max_daily_loss_pct: dailyLossLimit ? parseFloat(dailyLossLimit) : null,
      max_total_drawdown_pct: totalDrawdown ? parseFloat(totalDrawdown) : null,
      profit_target_pct: profitTarget ? parseFloat(profitTarget) : null,
      trailing_drawdown: trailing,
    })
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Prop-Firm Regeln gespeichert')
      setEditing(false)
      setMetricsLoaded(false)
    }
  }

  const handleDelete = async () => {
    await deleteRule()
    toast.success('Prop-Firm Regeln entfernt')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm" style={{ color: 'var(--fg-4)' }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Lade Prop-Firm Regeln…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current rule display */}
      {rule && !editing && (
        <div
          className="rounded-lg p-4 space-y-4"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: 'var(--brand-blue)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{rule.firm_name}</p>
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  ${rule.account_size.toLocaleString()} Konto
                  {rule.trailing_drawdown && ' · Trailing Drawdown'}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => openEditor()}
                className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--fg-3)', background: 'var(--bg-4)' }}
              >
                Bearbeiten
              </button>
              <button onClick={handleDelete} className="p-1 rounded" style={{ color: 'var(--fg-4)' }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bars */}
          <div className="space-y-2.5">
            <ProgressBar
              label="Tagesverlust"
              used={dailyLossPct}
              limit={rule.max_daily_loss_pct}
              suffix="%"
              danger={dailyLossPct >= (rule.max_daily_loss_pct ?? 99)}
            />
            <ProgressBar
              label="Gesamtdrawdown"
              used={drawdownPct}
              limit={rule.max_total_drawdown_pct}
              suffix="%"
              danger={drawdownPct >= (rule.max_total_drawdown_pct ?? 99)}
            />
            {rule.profit_target_pct && (
              <ProgressBar
                label="Profit-Ziel"
                used={0}
                limit={rule.profit_target_pct}
                suffix="%"
              />
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div
          className="rounded-lg p-4 space-y-3"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}
        >
          {/* Presets */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--fg-4)' }}>Preset laden:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => openEditor(p)}
                  className="text-[11px] px-2 py-1 rounded"
                  style={{ background: 'var(--bg-4)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <p className="text-xs mb-1" style={{ color: 'var(--fg-4)' }}>Firma</p>
              <Input value={firmName} onChange={e => setFirmName(e.target.value)} placeholder="z.B. Funded Next" className="h-8 text-sm" />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--fg-4)' }}>Kontogröße ($)</p>
              <Input value={accountSize} onChange={e => setAccountSize(e.target.value)} placeholder="100000" className="h-8 text-sm" type="number" />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--fg-4)' }}>Tagesverlust-Limit (%)</p>
              <Input value={dailyLossLimit} onChange={e => setDailyLossLimit(e.target.value)} placeholder="5" className="h-8 text-sm" type="number" />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--fg-4)' }}>Max Drawdown (%)</p>
              <Input value={totalDrawdown} onChange={e => setTotalDrawdown(e.target.value)} placeholder="10" className="h-8 text-sm" type="number" />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--fg-4)' }}>Profit-Ziel (%)</p>
              <Input value={profitTarget} onChange={e => setProfitTarget(e.target.value)} placeholder="15" className="h-8 text-sm" type="number" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrailing(v => !v)}
              className={cn('w-8 h-4 rounded-full relative transition-colors')}
              style={{ background: trailing ? 'var(--brand-blue)' : 'var(--bg-4)' }}
            >
              <span
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                style={{ left: trailing ? '17px' : '2px' }}
              />
            </button>
            <span className="text-xs" style={{ color: 'var(--fg-3)' }}>Trailing Drawdown</span>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded" style={{ color: 'var(--fg-4)' }}>
              Abbrechen
            </button>
            <Button
              onClick={handleSave}
              disabled={saving || !firmName}
              className="h-7 px-3 text-xs rounded"
              style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Speichern
            </Button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!rule && !editing && (
        <button
          onClick={() => openEditor()}
          className="w-full text-sm py-2.5 rounded-lg border-dashed flex items-center justify-center gap-2 transition-colors"
          style={{
            border: '1px dashed var(--border-raw)',
            color: 'var(--fg-4)',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-2)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-4)')}
        >
          <Building2 className="h-3.5 w-3.5" />
          Prop-Firm Regeln hinterlegen
        </button>
      )}
    </div>
  )
}
