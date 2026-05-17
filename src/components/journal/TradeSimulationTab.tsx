'use client'

import { useState } from 'react'
import { Loader2, Upload, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Trade } from '@/hooks/useTrades'

interface Props {
  trade: Trade
}

export function TradeSimulationTab({ trade }: Props) {
  const [maxRunPrice, setMaxRunPrice] = useState('')
  const [trueRR, setTrueRR] = useState<number | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)

  const sl = trade.sl_price
  const entry = trade.entry_price

  const slDistance = trade.direction === 'long'
    ? entry - sl
    : sl - entry

  const calcTrueRR = (maxPrice: number) => {
    if (!maxPrice || slDistance <= 0) return null
    const favorable = trade.direction === 'long'
      ? maxPrice - entry
      : entry - maxPrice
    return Math.round((favorable / slDistance) * 100) / 100
  }

  const handlePriceChange = (val: string) => {
    setMaxRunPrice(val)
    const num = parseFloat(val)
    setTrueRR(isNaN(num) ? null : calcTrueRR(num))
  }

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
    setAiResult(null)
  }

  const analyzeWithAI = async () => {
    if (!screenshotFile) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const formData = new FormData()
      formData.append('screenshot', screenshotFile)
      formData.append('trade', JSON.stringify({
        direction: trade.direction,
        entry_price: entry,
        sl_price: sl,
        tp_price: trade.tp_price,
        asset: trade.asset,
      }))
      const res = await fetch('/api/ai/analyze-simulation', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setAiResult(data.analysis)
        if (data.estimated_max_price) {
          setMaxRunPrice(String(data.estimated_max_price))
          setTrueRR(calcTrueRR(data.estimated_max_price))
        }
      } else {
        setAiResult('Analyse fehlgeschlagen. Bitte gib den Preis manuell ein.')
      }
    } catch {
      setAiResult('Verbindungsfehler.')
    } finally {
      setAiLoading(false)
    }
  }

  const rrColor = trueRR === null ? 'var(--fg-3)'
    : trueRR >= (trade.rr_ratio ?? 0) ? 'var(--long)'
    : 'var(--short)'

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div
        className="rounded px-4 py-3 text-sm"
        style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}
      >
        Wie weit ist der Kurs nach deinem Entry in deine Richtung gelaufen, bevor er drehte?
        Damit siehst du das <strong style={{ color: 'var(--fg-1)' }}>wahre RRR</strong> — unabhängig davon, wo dein TP war.
      </div>

      {/* Reference data */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded px-3 py-2.5" style={{ background: 'var(--bg-3)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--fg-4)' }}>Entry</p>
          <p className="num text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{entry}</p>
        </div>
        <div className="rounded px-3 py-2.5" style={{ background: 'var(--bg-3)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--fg-4)' }}>Stop Loss</p>
          <p className="num text-sm font-semibold" style={{ color: 'var(--short)' }}>{sl}</p>
        </div>
        <div className="rounded px-3 py-2.5" style={{ background: 'var(--bg-3)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--fg-4)' }}>Geplant RRR</p>
          <p className="num text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
            {trade.rr_ratio !== null ? `1:${trade.rr_ratio}` : '—'}
          </p>
        </div>
      </div>

      {/* Manual input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-3)' }}>
          Max. Kurs-Bewegung {trade.direction === 'long' ? '(Hochpunkt)' : '(Tiefpunkt)'}
        </label>
        <Input
          type="number"
          step="any"
          placeholder={`Preis am ${trade.direction === 'long' ? 'Hoch' : 'Tief'}punkt`}
          value={maxRunPrice}
          onChange={e => handlePriceChange(e.target.value)}
          className="num"
        />
      </div>

      {/* Result */}
      {trueRR !== null && (
        <div
          className="rounded-lg p-5 text-center"
          style={{ background: 'var(--bg-3)', border: `1px solid var(--border-raw)` }}
        >
          <p className="eyebrow mb-1">Wahres RRR</p>
          <p className="text-4xl font-bold num" style={{ color: rrColor }}>
            1:{trueRR}
          </p>
          {trade.rr_ratio !== null && (
            <p className="text-xs mt-2" style={{ color: 'var(--fg-3)' }}>
              {trueRR > trade.rr_ratio
                ? `+${(trueRR - trade.rr_ratio).toFixed(2)}R über deinem geplanten TP — früh raus`
                : trueRR < trade.rr_ratio
                ? `Trade lief nicht bis zum geplanten TP (${trade.rr_ratio}R)`
                : 'Exakt am geplanten TP'}
            </p>
          )}
        </div>
      )}

      {/* AI screenshot analysis */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-3)' }}>
          KI-Analyse aus Screenshot
        </p>

        <label
          className="flex items-center gap-2 cursor-pointer rounded px-4 py-3 text-sm transition-colors"
          style={{
            background: 'var(--bg-3)',
            border: '1px dashed var(--border-raw)',
            color: 'var(--fg-2)',
          }}
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span>{screenshotFile ? screenshotFile.name : 'Chart-Screenshot hochladen…'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
        </label>

        {screenshotPreview && (
          <div className="rounded overflow-hidden" style={{ border: '1px solid var(--border-raw)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshotPreview} alt="Chart preview" className="w-full max-h-48 object-contain" />
          </div>
        )}

        {screenshotFile && (
          <Button
            onClick={analyzeWithAI}
            disabled={aiLoading}
            className="w-full h-8 text-[13px] font-semibold rounded"
            style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {aiLoading ? 'Analysiere…' : 'KI-Analyse starten'}
          </Button>
        )}

        {aiResult && (
          <div
            className="rounded px-4 py-3 text-sm"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', whiteSpace: 'pre-wrap' }}
          >
            {aiResult}
          </div>
        )}
      </div>
    </div>
  )
}
