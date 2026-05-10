'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Upload, Loader2, TrendingUp, TrendingDown, AlertTriangle, Newspaper, ChevronDown, Sparkles, Bell } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { useTrades, type Trade, type CreateTradeInput } from '@/hooks/useTrades'
import { addReminder } from '@/components/layout/AnalysisReminderBanner'
import { AssetCombobox } from '@/components/watchlist/AssetCombobox'
import { useRiskConfig } from '@/hooks/useRiskConfig'
import { useWatchlist } from '@/hooks/useWatchlist'
import { calcRR, calcRiskPercent, calcResultPercent, calcOutcome, validateSLSide } from '@/lib/trade-calculations'
import { useAccountContext } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

function utcToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function nowDatetimeLocal(): string {
  return utcToDatetimeLocal(new Date().toISOString())
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  traded_at: z.string().min(1, 'Pflichtfeld'),
  asset: z.string().min(1, 'Pflichtfeld').max(50),
  direction: z.enum(['long', 'short'], { error: 'Pflichtfeld' }),
  entry_price: z.number({ error: 'Pflichtfeld' }).positive('Muss positiv sein'),
  sl_price: z.number({ error: 'Pflichtfeld' }).positive('Muss positiv sein'),
  tp_price: z.number({ error: 'Pflichtfeld' }).positive('Muss positiv sein'),
  lot_size: z.number({ error: 'Pflichtfeld' }).positive('Muss positiv sein'),
  result_currency: z.number({ error: 'Pflichtfeld' }),
  setup_type: z.string().optional(),
  strategy: z.string().optional(),
  market_phase: z.string().optional(),
  emotion_before: z.string().optional(),
  emotion_after: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000, 'Maximal 5000 Zeichen').optional(),
  chart_url: z.string().url('Keine gültige URL').max(500).optional().or(z.literal('')),
  news_event_present: z.enum(['yes', 'no', 'unknown']).optional(),
  news_event_name: z.string().max(100).optional(),
  news_impact_level: z.enum(['high', 'medium', 'low']).optional(),
  news_timing_minutes: z.number().int().optional(),
}).superRefine((data, ctx) => {
  if (data.entry_price && data.sl_price && data.sl_price === data.entry_price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SL muss sich vom Entry unterscheiden', path: ['sl_price'] })
  }
  if (data.entry_price && data.tp_price && data.tp_price === data.entry_price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TP muss sich vom Entry unterscheiden', path: ['tp_price'] })
  }
})

type FormValues = z.infer<typeof schema>

// ─── Live Calc Preview ───────────────────────────────────────────────────────

function CalcPreview({ values, accountBalance, maxRiskPct, currency, pointValue }: {
  values: Partial<Pick<FormValues, 'entry_price' | 'sl_price' | 'tp_price' | 'lot_size' | 'result_currency' | 'direction'>>
  accountBalance: number
  maxRiskPct?: number | null
  currency?: string
  pointValue?: number | null
}) {
  const rr = calcRR(values.entry_price, values.sl_price, values.tp_price)
  const risk = calcRiskPercent(values.entry_price, values.sl_price, values.lot_size, accountBalance, pointValue)
  const resultPct = calcResultPercent(values.result_currency, accountBalance)
  const outcome = calcOutcome(values.result_currency)
  const slWarning = values.direction && values.entry_price && values.sl_price
    ? validateSLSide(values.direction, values.entry_price, values.sl_price)
    : null
  const riskExceeded = risk !== null && maxRiskPct != null && risk > maxRiskPct
  const riskAmount = risk !== null ? Math.round(risk * accountBalance) / 100 : null
  const curr = currency ?? 'EUR'

  return (
    <div className="rounded-lg bg-muted/40 border border-border/60 p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">RR</p>
          <p className="text-lg font-bold tabular-nums">{rr !== null ? `1:${rr}` : '–'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Risk %</p>
          <p className={cn('text-lg font-bold tabular-nums', riskExceeded ? 'text-red-400' : 'text-amber-400')}>
            {risk !== null ? `${risk.toFixed(2)}%` : '–'}
          </p>
          {riskAmount !== null && (
            <p className="text-[11px] tabular-nums" style={{ color: 'var(--fg-4)' }}>
              {riskAmount.toFixed(2)} {curr}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Result %</p>
          <p className={cn(
            'text-lg font-bold tabular-nums',
            outcome === 'win' ? 'text-emerald-400' : outcome === 'loss' ? 'text-red-400' : outcome === 'breakeven' ? 'text-amber-400' : ''
          )}>
            {resultPct !== null ? `${resultPct >= 0 ? '+' : ''}${resultPct.toFixed(2)}%` : '–'}
          </p>
        </div>
      </div>
      {outcome && (
        <div className="flex justify-center">
          <Badge variant="outline" className={cn(
            outcome === 'win' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
            outcome === 'loss' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
            'bg-amber-500/15 text-amber-400 border-amber-500/30'
          )}>
            {outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Loss' : 'Breakeven'}
          </Badge>
        </div>
      )}
      {riskExceeded && (
        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Risk {risk!.toFixed(2)}% überschreitet dein Limit von {maxRiskPct}%</span>
        </div>
      )}
      {slWarning && (
        <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{slWarning}</span>
        </div>
      )}
      {pointValue && (
        <p className="text-[11px] text-center" style={{ color: 'var(--fg-4)' }}>
          Futures: ${pointValue}/Punkt
        </p>
      )}
    </div>
  )
}

// ─── Screenshot Upload ───────────────────────────────────────────────────────

interface ScreenshotFile {
  file: File
  preview: string
}

function ScreenshotSection({
  existingUrls,
  onRemoveExisting,
  newFiles,
  onAddFiles,
  onRemoveNew,
  disabled,
}: {
  existingUrls: string[]
  onRemoveExisting: (url: string) => void
  newFiles: ScreenshotFile[]
  onAddFiles: (files: ScreenshotFile[]) => void
  onRemoveNew: (index: number) => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const totalCount = existingUrls.length + newFiles.length

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (totalCount + files.length > 5) {
      toast.error('Maximal 5 Screenshots erlaubt')
      return
    }
    const valid = files.filter(f => {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
        toast.error(`${f.name}: Nur PNG, JPG, WEBP erlaubt`)
        return false
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: Maximal 10 MB`)
        return false
      }
      return true
    })
    const newEntries = valid.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    onAddFiles(newEntries)
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {existingUrls.map(url => (
          <div key={url} className="relative group w-24 h-16 rounded-md overflow-hidden border border-border/60 bg-muted">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveExisting(url)}
              disabled={disabled}
              className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {newFiles.map((sf, i) => (
          <div key={sf.preview} className="relative group w-24 h-16 rounded-md overflow-hidden border border-primary/40 bg-muted">
            <img src={sf.preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveNew(i)}
              disabled={disabled}
              className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {totalCount < 5 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="w-24 h-16 rounded-md border border-dashed border-border/60 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors bg-transparent"
          >
            <Upload className="h-4 w-4" />
            <span className="text-xs">Hinzufügen</span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{totalCount}/5 · PNG, JPG, WEBP · max. 10 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ─── Tag Input ───────────────────────────────────────────────────────────────

function TagInput({ value, onChange, disabled }: {
  value: string[]
  onChange: (tags: string[]) => void
  disabled: boolean
}) {
  const [inputValue, setInputValue] = useState('')

  const addTag = () => {
    const tag = inputValue.trim()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setInputValue('')
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addTag() }
          }}
          placeholder="Tag eingeben, Enter drücken…"
          disabled={disabled}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={disabled || !inputValue.trim()}>
          +
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} disabled={disabled} className="hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── News Event Section ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NewsEventSection({ form }: { form: any }) {
  const newsPresent = form.watch('news_event_present')
  const showDetails = newsPresent === 'yes'

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">News-Event</p>
      </div>
      <FormField
        control={form.control}
        name="news_event_present"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-muted-foreground">War ein News-Event aktiv?</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Nicht angegeben" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="yes">Ja</SelectItem>
                <SelectItem value="no">Nein</SelectItem>
                <SelectItem value="unknown">Nicht bekannt</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      {showDetails && (
        <div className="space-y-3 pt-1">
          <FormField
            control={form.control}
            name="news_event_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Event-Name</FormLabel>
                <FormControl>
                  <Input placeholder="z.B. NFP, FOMC, CPI…" className="h-8 text-sm" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="news_impact_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Impact</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">🔴 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="news_timing_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Timing</FormLabel>
                  <Select
                    onValueChange={v => field.onChange(Number(v))}
                    value={field.value !== undefined ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Zeitpunkt" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="-60">60 min vorher</SelectItem>
                      <SelectItem value="-30">30 min vorher</SelectItem>
                      <SelectItem value="-15">15 min vorher</SelectItem>
                      <SelectItem value="0">Während Event</SelectItem>
                      <SelectItem value="15">15 min danach</SelectItem>
                      <SelectItem value="30">30 min danach</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTrade: Trade | null
  setupSuggestions: string[]
  strategySuggestions: string[]
  onSuccess: (newTradeId?: string) => void
  onCompletionNeeded?: (tradeId: string, type: 'notes' | 'screenshot') => void
}

export function TradeFormSheet({
  open,
  onOpenChange,
  editingTrade,
  setupSuggestions,
  strategySuggestions,
  onSuccess,
  onCompletionNeeded,
}: Props) {
  const { activeAccount } = useAccountContext()
  const { createTrade, updateTrade, uploadScreenshot, isMutating } = useTrades()
  const { fetchRiskConfig } = useRiskConfig()
  const { items: watchlistItems } = useWatchlist(activeAccount?.id)
  const [maxRiskPct, setMaxRiskPct] = useState<number | null>(null)

  const [existingUrls, setExistingUrls] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<ScreenshotFile[]>([])
  const [notesRewriting, setNotesRewriting] = useState(false)
  const [reminderHours, setReminderHours] = useState<string>('none')

  const isEdit = !!editingTrade

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      traded_at: nowDatetimeLocal(),
      asset: '',
      direction: 'long',
      entry_price: undefined,
      sl_price: undefined,
      tp_price: undefined,
      lot_size: undefined,
      result_currency: undefined,
      setup_type: '',
      strategy: '',
      market_phase: '',
      emotion_before: '',
      emotion_after: '',
      tags: [],
      notes: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (open && editingTrade) {
      form.reset({
        traded_at: utcToDatetimeLocal(editingTrade.traded_at),
        asset: editingTrade.asset,
        direction: editingTrade.direction,
        entry_price: editingTrade.entry_price,
        sl_price: editingTrade.sl_price,
        tp_price: editingTrade.tp_price,
        lot_size: editingTrade.lot_size,
        result_currency: editingTrade.result_currency ?? undefined,
        setup_type: editingTrade.setup_type ?? '',
        strategy: editingTrade.strategy ?? '',
        market_phase: editingTrade.market_phase ?? '',
        emotion_before: editingTrade.emotion_before ?? '',
        emotion_after: editingTrade.emotion_after ?? '',
        tags: editingTrade.tags ?? [],
        notes: editingTrade.notes ?? '',
        news_event_present: editingTrade.news_event_present === true ? 'yes' : editingTrade.news_event_present === false ? 'no' : 'unknown',
        news_event_name: editingTrade.news_event_name ?? '',
        news_impact_level: editingTrade.news_impact_level ?? undefined,
        news_timing_minutes: editingTrade.news_timing_minutes ?? undefined,
        chart_url: editingTrade.chart_url ?? '',
      })
      setExistingUrls(editingTrade.screenshot_urls ?? [])
      setNewFiles([])
    } else if (open && !editingTrade) {
      form.reset({
        traded_at: nowDatetimeLocal(),
        asset: '',
        direction: 'long',
        entry_price: undefined,
        sl_price: undefined,
        tp_price: undefined,
        lot_size: undefined,
        result_currency: undefined,
        setup_type: '',
        strategy: '',
        market_phase: '',
        emotion_before: '',
        emotion_after: '',
        tags: [],
        notes: '',
      })
      setExistingUrls([])
      setNewFiles([])
    }
  }, [open, editingTrade, form])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => { newFiles.forEach(f => URL.revokeObjectURL(f.preview)) }
  }, [newFiles])

  // Load risk config when sheet opens
  useEffect(() => {
    if (!open || !activeAccount) return
    fetchRiskConfig().then(cfg => {
      setMaxRiskPct(cfg?.max_risk_per_trade_pct ?? null)
    })
  }, [open, activeAccount, fetchRiskConfig])

  const handleClose = useCallback(() => {
    if (form.formState.isDirty && !isMutating) {
      if (!confirm('Änderungen verwerfen?')) return
    }
    onOpenChange(false)
  }, [form.formState.isDirty, isMutating, onOpenChange])

  const onSubmit = async (values: FormValues) => {
    if (!activeAccount) return

    const input: CreateTradeInput = {
      traded_at: new Date(values.traded_at).toISOString(),
      asset: values.asset,
      direction: values.direction,
      entry_price: values.entry_price,
      sl_price: values.sl_price,
      tp_price: values.tp_price,
      lot_size: values.lot_size,
      result_currency: values.result_currency,
      setup_type: values.setup_type || undefined,
      strategy: values.strategy || undefined,
      market_phase: values.market_phase || undefined,
      tags: values.tags ?? [],
      emotion_before: values.emotion_before || undefined,
      emotion_after: values.emotion_after || undefined,
      notes: values.notes || undefined,
      chart_url: values.chart_url || null,
      screenshot_urls: existingUrls,
      news_event_present: values.news_event_present === 'yes' ? true : values.news_event_present === 'no' ? false : null,
      news_event_name: values.news_event_present === 'yes' ? (values.news_event_name || null) : null,
      news_impact_level: values.news_event_present === 'yes' ? (values.news_impact_level ?? null) : null,
      news_timing_minutes: values.news_event_present === 'yes' ? (values.news_timing_minutes ?? null) : null,
    }

    if (isEdit && editingTrade) {
      const { error } = await updateTrade(editingTrade.id, input)
      if (error) { toast.error('Fehler beim Speichern'); return }

      // Upload new files
      if (newFiles.length > 0) {
        const urls: string[] = [...existingUrls]
        for (const sf of newFiles) {
          const { url, error: uploadError } = await uploadScreenshot(editingTrade.id, sf.file)
          if (uploadError) toast.error(`${sf.file.name}: Upload fehlgeschlagen`)
          else if (url) urls.push(url)
        }
        if (urls.length !== existingUrls.length) {
          await updateTrade(editingTrade.id, { screenshot_urls: urls })
        }
      }

      toast.success('Trade gespeichert')
    } else {
      const { data: trade, error } = await createTrade(input)
      if (error || !trade) { toast.error('Fehler beim Erstellen'); return }

      // Upload screenshots after trade creation
      if (newFiles.length > 0) {
        const urls: string[] = []
        for (const sf of newFiles) {
          const { url, error: uploadError } = await uploadScreenshot(trade.id, sf.file)
          if (uploadError) toast.error(`${sf.file.name}: Upload fehlgeschlagen`)
          else if (url) urls.push(url)
        }
        if (urls.length > 0) {
          await updateTrade(trade.id, { screenshot_urls: urls })
        }
      }

      toast.success('Trade erfasst')

      // Save analysis reminder — localStorage (in-app banner) + DB (push notification)
      if (reminderHours !== 'none') {
        const dueAt = new Date(Date.now() + parseInt(reminderHours) * 3600_000).toISOString()
        addReminder({ tradeId: trade.id, asset: values.asset, direction: values.direction, dueAt })
        // Fire-and-forget: persist in DB so push cron can send the notification
        fetch('/api/notifications/analysis-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradeId: trade.id, asset: values.asset, direction: values.direction, dueAt }),
        }).catch(() => {})
        setReminderHours('none')
      }

      // Completion prompts (AC-9.7, AC-9.8)
      const missingNotes = !values.notes
      const missingScreenshot = existingUrls.length === 0 && newFiles.length === 0
      if (missingNotes || missingScreenshot) {
        onCompletionNeeded?.(trade.id, missingNotes ? 'notes' : 'screenshot')
      }
      onOpenChange(false)
      onSuccess(trade.id)
      return
    }

    onOpenChange(false)
    onSuccess()
  }

  const watchedValues = form.watch(['entry_price', 'sl_price', 'tp_price', 'lot_size', 'result_currency', 'direction', 'asset'])
  const liveValues = {
    entry_price: watchedValues[0],
    sl_price: watchedValues[1],
    tp_price: watchedValues[2],
    lot_size: watchedValues[3],
    result_currency: watchedValues[4],
    direction: watchedValues[5],
  }
  const liveAsset = watchedValues[6] as string | undefined
  const activeWatchlistItem = liveAsset
    ? watchlistItems.find(i => i.symbol === liveAsset.toUpperCase())
    : undefined
  const livePointValue = activeWatchlistItem?.point_value ?? null

  const notes = form.watch('notes') ?? ''

  const rewriteNotes = async () => {
    if (!notes.trim() || notesRewriting) return
    setNotesRewriting(true)
    try {
      const res = await fetch('/api/ai/rewrite-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (res.ok) {
        const { rewritten } = await res.json()
        form.setValue('notes', rewritten)
      } else {
        toast.error('Rewrite fehlgeschlagen')
      }
    } catch {
      toast.error('Rewrite fehlgeschlagen')
    } finally {
      setNotesRewriting(false)
    }
  }

  const numberField = (name: keyof FormValues, label: string, placeholder: string, allowNegative = false) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="any"
              min={allowNegative ? undefined : 0}
              placeholder={placeholder}
              {...field}
              value={field.value === undefined ? '' : String(field.value)}
              onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 flex flex-col max-h-[90vh] [&>button:last-child]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <span className="font-semibold text-base">{isEdit ? 'Trade bearbeiten' : 'Neuer Trade'}</span>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

              {/* ── Basisdaten ─────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Basisdaten</p>

                <FormField
                  control={form.control}
                  name="traded_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum & Uhrzeit</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="asset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <FormControl>
                          <AssetCombobox
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isMutating}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Richtung</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="long">
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Long
                              </span>
                            </SelectItem>
                            <SelectItem value="short">
                              <span className="flex items-center gap-1.5">
                                <TrendingDown className="h-3.5 w-3.5 text-red-400" /> Short
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Chart URL */}
                <FormField
                  control={form.control}
                  name="chart_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TradingView Chart-Link</FormLabel>
                      <FormControl>
                        <div
                          className="flex items-center gap-2 rounded-md px-3 h-9"
                          style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
                        >
                          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-4)' }}>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          <Input
                            {...field}
                            placeholder="https://www.tradingview.com/chart/…"
                            className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={isMutating}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Preise & Größe ─────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preise & Größe</p>
                <div className="grid grid-cols-2 gap-3">
                  {numberField('entry_price', 'Entry', '1.08500')}
                  {numberField('sl_price', 'Stop Loss', '1.08000')}
                  {numberField('tp_price', 'Take Profit', '1.09500')}
                  {numberField('lot_size', 'Lot-Größe', '0.10')}
                  {numberField('result_currency', 'Ergebnis (€)', '+150.00', true)}
                </div>

                {/* Live Preview */}
                <CalcPreview
                  values={liveValues}
                  accountBalance={activeAccount?.start_balance ?? 10000}
                  maxRiskPct={maxRiskPct}
                  currency={activeAccount?.currency}
                  pointValue={livePointValue}
                />
              </div>

              <Separator />

              {/* ── Analyse ───────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analyse</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="setup_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setup-Typ</FormLabel>
                        <FormControl>
                          <>
                            <Input list="setup-suggestions" placeholder="z.B. Breakout" {...field} />
                            <datalist id="setup-suggestions">
                              {setupSuggestions.map(s => <option key={s} value={s} />)}
                            </datalist>
                          </>
                        </FormControl>
                        {setupSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {setupSuggestions.slice(0, 3).map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => field.onChange(s)}
                                className="text-xs px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategie</FormLabel>
                        <FormControl>
                          <>
                            <Input list="strategy-suggestions" placeholder="z.B. ICT Concepts" {...field} />
                            <datalist id="strategy-suggestions">
                              {strategySuggestions.map(s => <option key={s} value={s} />)}
                            </datalist>
                          </>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="market_phase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marktphase</FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Marktphase auswählen…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="trend_bullish">Trend (bullish)</SelectItem>
                          <SelectItem value="trend_bearish">Trend (bearish)</SelectItem>
                          <SelectItem value="range">Range</SelectItem>
                          <SelectItem value="breakout">Breakout</SelectItem>
                          <SelectItem value="reversal">Reversal</SelectItem>
                          <SelectItem value="news_driven">News-driven</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* ── Emotionen & Tags ──────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emotionen & Tags</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="emotion_before"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emotion vor Trade</FormLabel>
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Auswählen…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="calm">Ruhig</SelectItem>
                            <SelectItem value="focused">Fokussiert</SelectItem>
                            <SelectItem value="nervous">Nervös</SelectItem>
                            <SelectItem value="impatient">Ungeduldig</SelectItem>
                            <SelectItem value="overconfident">Overconfident</SelectItem>
                            <SelectItem value="fomo">FOMO</SelectItem>
                            <SelectItem value="tired">Müde</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emotion_after"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emotion nach Trade</FormLabel>
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Auswählen…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="calm">Ruhig</SelectItem>
                            <SelectItem value="focused">Fokussiert</SelectItem>
                            <SelectItem value="nervous">Nervös</SelectItem>
                            <SelectItem value="impatient">Ungeduldig</SelectItem>
                            <SelectItem value="overconfident">Overconfident</SelectItem>
                            <SelectItem value="fomo">FOMO</SelectItem>
                            <SelectItem value="tired">Müde</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <TagInput value={field.value ?? []} onChange={field.onChange} disabled={isMutating} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* ── Notizen ───────────────────────────── */}
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notizen & Screenshots</p>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-between items-center">
                        <span>Notizen</span>
                        <div className="flex items-center gap-2">
                          {notes.length > 0 && (
                            <button
                              type="button"
                              onClick={rewriteNotes}
                              disabled={notesRewriting}
                              className="flex items-center gap-1 text-xs font-medium transition-colors"
                              style={{ color: notesRewriting ? 'var(--fg-4)' : 'var(--brand-blue)' }}
                              title="Notizen mit KI bereinigen (Wispr Flow)"
                            >
                              {notesRewriting
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Sparkles className="h-3 w-3" />
                              }
                              {notesRewriting ? 'Rewrite…' : 'Rewrite'}
                            </button>
                          )}
                          <span className={cn(
                            'text-xs tabular-nums',
                            notes.length > 4800 ? 'text-amber-400' : 'text-muted-foreground'
                          )}>
                            {notes.length}/5000
                          </span>
                        </div>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Trade-Analyse, Gedanken, Lernpunkte…"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── News-Event ────────────────────────── */}
                <NewsEventSection form={form} />

                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">Screenshots</p>
                  <ScreenshotSection
                    existingUrls={existingUrls}
                    onRemoveExisting={url => setExistingUrls(prev => prev.filter(u => u !== url))}
                    newFiles={newFiles}
                    onAddFiles={files => setNewFiles(prev => [...prev, ...files])}
                    onRemoveNew={idx => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                    disabled={isMutating}
                  />
                </div>

                {/* ── Nachanalyse-Erinnerung ─────────── */}
                {!isEdit && (
                  <div
                    className="flex items-center gap-3 rounded px-3 py-2.5"
                    style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}
                  >
                    <Bell className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--fg-3)' }} />
                    <p className="text-xs flex-1" style={{ color: 'var(--fg-2)' }}>
                      Nachanalyse erinnern in
                    </p>
                    <select
                      value={reminderHours}
                      onChange={e => setReminderHours(e.target.value)}
                      className="text-xs rounded px-2 py-1 border-0 outline-none cursor-pointer"
                      style={{
                        background: 'var(--bg-1)',
                        color: 'var(--fg-1)',
                        border: '1px solid var(--border-raw)',
                      }}
                    >
                      <option value="none">Keine</option>
                      <option value="1">1 Stunde</option>
                      <option value="4">4 Stunden</option>
                      <option value="8">8 Stunden</option>
                      <option value="24">1 Tag</option>
                      <option value="48">2 Tage</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ────────────────────────────── */}
            <div className="px-6 py-4 border-t border-border/60 flex gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isMutating} className="flex-1">
                Abbrechen
              </Button>
              <Button type="submit" disabled={isMutating || (form.formState.isDirty && !form.formState.isValid)} className="flex-1">
                {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? 'Speichern' : 'Erfassen'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
