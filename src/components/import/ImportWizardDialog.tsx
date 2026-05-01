'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { Upload, ChevronRight, ChevronLeft, Check, AlertTriangle, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAccountContext } from '@/contexts/AccountContext'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawRow {
  [key: string]: string
}

const TRADEOS_FIELDS = [
  { key: 'traded_at', label: 'Datum & Uhrzeit', required: true },
  { key: 'asset', label: 'Asset (Symbol)', required: true },
  { key: 'direction', label: 'Richtung (buy/sell/long/short)', required: true },
  { key: 'entry_price', label: 'Entry-Preis', required: true },
  { key: 'sl_price', label: 'Stop Loss', required: false },
  { key: 'tp_price', label: 'Take Profit', required: false },
  { key: 'lot_size', label: 'Lot-Größe / Volume', required: true },
  { key: 'result_currency', label: 'Ergebnis (€/$)', required: true },
] as const

type NousKey = typeof TRADEOS_FIELDS[number]['key']

// Attempt to auto-detect column mapping for MT4/MT5 exports
function autoDetectMapping(headers: string[]): Record<NousKey, string> {
  const lower = headers.map(h => h.toLowerCase().trim())
  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const i = lower.findIndex(h => h.includes(p))
      if (i !== -1) return headers[i]
    }
    return ''
  }
  return {
    traded_at: find(['open time', 'open_time', 'opentime', 'time', 'date']),
    asset: find(['symbol', 'instrument', 'pair', 'asset']),
    direction: find(['type', 'direction', 'side', 'action']),
    entry_price: find(['open price', 'open_price', 'entry', 'openprice', 'price']),
    sl_price: find(['s/l', 'sl', 'stop loss', 'stoploss', 'stop_loss']),
    tp_price: find(['t/p', 'tp', 'take profit', 'takeprofit', 'take_profit']),
    lot_size: find(['size', 'volume', 'lots', 'lot', 'quantity', 'qty']),
    result_currency: find(['profit', 'pnl', 'p&l', 'result', 'net profit']),
  }
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepUpload({
  onParsed,
}: {
  onParsed: (headers: string[], rows: RawRow[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')

  const parse = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Nur CSV-Dateien erlaubt')
      return
    }
    setFileName(file.name)
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? []
        if (headers.length === 0) {
          toast.error('CSV hat keine erkennbaren Spalten')
          return
        }
        onParsed(headers, result.data)
      },
      error: () => toast.error('CSV konnte nicht gelesen werden'),
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parse(file)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-border'
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">CSV hier ablegen oder klicken</p>
        <p className="text-xs text-muted-foreground mt-1">MT4/MT5 Statement Export (.csv)</p>
        {fileName && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-400">
            <FileText className="h-3.5 w-3.5" />
            {fileName}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) parse(f) }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Unterstützte Formate: MT4/MT5 History Export, generische CSV mit Spalten-Mapping im nächsten Schritt.
      </p>
    </div>
  )
}

function StepMapping({
  headers,
  mapping,
  onChange,
}: {
  headers: string[]
  mapping: Record<NousKey, string>
  onChange: (mapping: Record<NousKey, string>) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ordne die CSV-Spalten den Trade-OS-Feldern zu. Pflichtfelder sind markiert.
      </p>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {TRADEOS_FIELDS.map(field => (
          <div key={field.key} className="flex items-center gap-3">
            <div className="w-48 shrink-0">
              <span className="text-sm">{field.label}</span>
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </div>
            <Select
              value={mapping[field.key] || '__none__'}
              onValueChange={v => onChange({ ...mapping, [field.key]: v === '__none__' ? '' : v })}
            >
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Spalte auswählen…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— nicht mappen —</SelectItem>
                {headers.map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepPreview({
  rows,
  mapping,
}: {
  rows: RawRow[]
  mapping: Record<NousKey, string>
}) {
  const preview = rows.slice(0, 10)
  const mappedFields = TRADEOS_FIELDS.filter(f => mapping[f.key])

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Erste 10 Zeilen — so werden deine Daten importiert:
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="text-xs w-full">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              {mappedFields.map(f => (
                <th key={f.key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {f.label.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0">
                {mappedFields.map(f => (
                  <td key={f.key} className="px-3 py-1.5 max-w-[120px] truncate text-muted-foreground">
                    {row[mapping[f.key]] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{rows.length} Zeilen gesamt</p>
    </div>
  )
}

interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

function StepSummary({ result, isLoading, progress }: {
  result: ImportResult | null
  isLoading: boolean
  progress: number
}) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm font-medium">Importiere Trades…</p>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
          <p className="text-xs text-muted-foreground mt-1">Importiert</p>
        </div>
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
          <p className="text-xs text-muted-foreground mt-1">Duplikate</p>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{result.errors}</p>
          <p className="text-xs text-muted-foreground mt-1">Fehler</p>
        </div>
      </div>
      {result.imported > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-3">
          <Check className="h-4 w-4 shrink-0" />
          {result.imported} Trade{result.imported !== 1 ? 's' : ''} erfolgreich importiert
        </div>
      )}
      {result.skipped > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {result.skipped} Duplikat{result.skipped !== 1 ? 'e' : ''} übersprungen (gleiche Zeit + Asset + Richtung + Entry)
        </div>
      )}
    </div>
  )
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

const STEPS = ['Upload', 'Mapping', 'Vorschau', 'Ergebnis'] as const

export function ImportWizardDialog({ open, onOpenChange, onImported }: Props) {
  const { activeAccount } = useAccountContext()
  const [step, setStep] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<Record<NousKey, string>>({
    traded_at: '', asset: '', direction: '', entry_price: '',
    sl_price: '', tp_price: '', lot_size: '', result_currency: '',
  })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleParsed = (h: string[], r: RawRow[]) => {
    setHeaders(h)
    setRows(r)
    setMapping(autoDetectMapping(h))
    setStep(1)
  }

  const requiredMapped = TRADEOS_FIELDS.filter(f => f.required).every(f => mapping[f.key])

  const handleImport = useCallback(async () => {
    if (!activeAccount) return
    setStep(3)
    setIsImporting(true)
    setProgress(0)
    setImportResult(null)

    try {
      const CHUNK = 100
      let imported = 0, skipped = 0, errors = 0
      const total = rows.length

      for (let i = 0; i < total; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const res = await fetch('/api/import/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: activeAccount.id, rows: chunk, mapping }),
        })
        const body = await res.json()
        if (res.ok) {
          imported += body.imported ?? 0
          skipped += body.skipped ?? 0
          errors += body.errors ?? 0
        } else {
          errors += chunk.length
        }
        setProgress(Math.min(((i + CHUNK) / total) * 100, 100))
      }

      setImportResult({ imported, skipped, errors })
      if (imported > 0) onImported()
    } catch {
      toast.error('Import fehlgeschlagen')
      setStep(2)
    } finally {
      setIsImporting(false)
    }
  }, [activeAccount, rows, mapping, onImported])

  const handleClose = () => {
    if (isImporting) return
    onOpenChange(false)
    // Reset after close animation
    setTimeout(() => {
      setStep(0)
      setHeaders([])
      setRows([])
      setImportResult(null)
      setProgress(0)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Trades importieren (CSV)</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                i <= step ? 'bg-primary' : 'bg-border/60'
              }`} />
              {i === STEPS.length - 1 && null}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Schritt {step + 1} von {STEPS.length}: <span className="font-medium text-foreground">{STEPS[step]}</span>
        </p>

        {/* Step content */}
        {step === 0 && <StepUpload onParsed={handleParsed} />}
        {step === 1 && (
          <StepMapping headers={headers} mapping={mapping} onChange={setMapping} />
        )}
        {step === 2 && (
          <StepPreview rows={rows} mapping={mapping} />
        )}
        {step === 3 && (
          <StepSummary result={importResult} isLoading={isImporting} progress={progress} />
        )}

        <DialogFooter className="gap-2">
          {step > 0 && step < 3 && !isImporting && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
            </Button>
          )}
          {step === 0 && (
            <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={!requiredMapped}>
              Vorschau <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleImport}>
              {rows.length} Trades importieren <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && !isImporting && (
            <Button onClick={handleClose}>
              <Check className="h-4 w-4 mr-1" /> Fertig
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
