'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Edit2, Trash2, TrendingUp, TrendingDown, X, Crop, Loader2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RRSimulator } from '@/components/risk/RRSimulator'
import { TradeAnalysisTab } from '@/components/ai/TradeAnalysisTab'
import { TradeSimulationTab } from './TradeSimulationTab'
import { TradeReviewTab } from './TradeReviewTab'
import { TradingViewChartTab } from './TradingViewChartTab'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Trade } from '@/hooks/useTrades'

const EMOTION_LABELS: Record<string, string> = {
  calm: 'Ruhig', focused: 'Fokussiert', nervous: 'Nervös',
  impatient: 'Ungeduldig', overconfident: 'Overconfident', fomo: 'FOMO', tired: 'Müde',
}

const MARKET_PHASE_LABELS: Record<string, string> = {
  trend_bullish: 'Trend (bullish)', trend_bearish: 'Trend (bearish)',
  range: 'Range', breakout: 'Breakout', reversal: 'Reversal', news_driven: 'News-driven',
}

function OutcomeBadge({ outcome }: { outcome: Trade['outcome'] }) {
  if (!outcome) return null
  const map = {
    win: { label: 'Win', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    loss: { label: 'Loss', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
    breakeven: { label: 'BE', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  }
  const { label, className } = map[outcome]
  return <Badge variant="outline" className={className}>{label}</Badge>
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '–'}</p>
    </div>
  )
}

interface Props {
  trade: Trade | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (trade: Trade) => void
  onDelete: (trade: Trade) => void
  onScreenshotsChanged?: (tradeId: string, urls: string[]) => void
}

export function TradeDetailSheet({ trade, open, onOpenChange, onEdit, onDelete, onScreenshotsChanged }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('detail')
  const [localScreenshots, setLocalScreenshots] = useState<string[]>(trade?.screenshot_urls ?? [])
  const [cropMode, setCropMode] = useState(false)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const lightboxImgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setLocalScreenshots(trade?.screenshot_urls ?? [])
  }, [trade?.id])

  const handleScreenshotAdded = (url: string) => {
    setLocalScreenshots(prev => {
      const newUrls = [...prev, url]
      if (trade) onScreenshotsChanged?.(trade.id, newUrls)
      return newUrls
    })
    setActiveTab('detail')
  }

  const closeLightbox = () => {
    setLightboxUrl(null)
    setCropMode(false)
    setCropRect(null)
    setCropStart(null)
  }

  const deleteScreenshot = useCallback(async (url: string) => {
    if (!trade) return
    setIsProcessing(true)
    const supabase = createClient()
    const pathMatch = url.match(/\/storage\/v1\/object\/public\/screenshots\/(.+)/)
    if (pathMatch) await supabase.storage.from('screenshots').remove([pathMatch[1]])
    const newUrls = localScreenshots.filter(u => u !== url)
    await supabase.from('trades').update({ screenshot_urls: newUrls }).eq('id', trade.id)
    setLocalScreenshots(newUrls)
    onScreenshotsChanged?.(trade.id, newUrls)
    closeLightbox()
    setIsProcessing(false)
    toast.success('Screenshot gelöscht')
  }, [localScreenshots, trade]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveCrop = useCallback(async () => {
    if (!cropRect || !lightboxUrl || !lightboxImgRef.current || !trade) return
    setIsProcessing(true)
    try {
      const resp = await fetch(lightboxUrl)
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const img = new Image()
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = blobUrl })
      const rendered = lightboxImgRef.current.getBoundingClientRect()
      const sx = img.naturalWidth / rendered.width
      const sy = img.naturalHeight / rendered.height
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(cropRect.w * sx)
      canvas.height = Math.round(cropRect.h * sy)
      canvas.getContext('2d')!.drawImage(img, Math.round(cropRect.x * sx), Math.round(cropRect.y * sy), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(blobUrl)
      const croppedBlob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(), 'image/png'))
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error()
      const path = `${user.id}/${trade.id}/${Date.now()}_cropped.png`
      await supabase.storage.from('screenshots').upload(path, croppedBlob, { contentType: 'image/png' })
      const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(path)
      const pathMatch = lightboxUrl.match(/\/storage\/v1\/object\/public\/screenshots\/(.+)/)
      if (pathMatch) await supabase.storage.from('screenshots').remove([pathMatch[1]])
      const newUrls = [...localScreenshots.filter(u => u !== lightboxUrl), publicUrl]
      await supabase.from('trades').update({ screenshot_urls: newUrls }).eq('id', trade.id)
      setLocalScreenshots(newUrls)
      onScreenshotsChanged?.(trade.id, newUrls)
      closeLightbox()
      toast.success('Screenshot zugeschnitten ✓')
    } catch {
      toast.error('Zuschneiden fehlgeschlagen')
    } finally {
      setIsProcessing(false)
    }
  }, [cropRect, lightboxUrl, localScreenshots, trade]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!trade) return null

  const directionIcon = trade.direction === 'long'
    ? <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
    : <TrendingDown className="h-3.5 w-3.5 inline mr-1" />

  const resultColor = trade.result_currency === null ? '' : trade.result_currency > 0
    ? 'text-emerald-400' : trade.result_currency < 0 ? 'text-red-400' : 'text-amber-400'

  return (
    <>
      {/* Centered trade detail modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 flex flex-col max-h-[90vh] [&>button:last-child]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{trade.asset}</span>
              <Badge variant="outline" className={trade.direction === 'long'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30'}>
                {directionIcon}{trade.direction === 'long' ? 'Long' : 'Short'}
              </Badge>
              <OutcomeBadge outcome={trade.outcome} />
              <span className="text-xs text-muted-foreground ml-1">
                {format(parseISO(trade.traded_at), 'dd. MMMM yyyy, HH:mm', { locale: de })}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" onClick={() => onEdit(trade)} className="h-8 w-8">
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border/60 mx-1" />
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-4 mb-0 w-auto self-start shrink-0">
              <TabsTrigger value="detail">Details</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="review">Nachbereitung</TabsTrigger>
              <TabsTrigger value="ki">KI-Analyse</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="simulator">RR-Simulator</TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="flex-1 overflow-y-auto px-6 py-4 space-y-5 mt-0">
              {/* Result highlight */}
              <div className="rounded-lg bg-card border border-border/60 p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Ergebnis</p>
                  <p className={`text-xl font-bold tabular-nums ${resultColor}`}>
                    {trade.result_currency !== null
                      ? `${trade.result_currency >= 0 ? '+' : ''}${trade.result_currency.toFixed(2)} €`
                      : '–'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Result %</p>
                  <p className={`text-xl font-bold tabular-nums ${resultColor}`}>
                    {trade.result_percent !== null
                      ? `${trade.result_percent >= 0 ? '+' : ''}${trade.result_percent.toFixed(2)}%`
                      : '–'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">RR</p>
                  <p className="text-xl font-bold tabular-nums">
                    {trade.rr_ratio !== null ? `1:${trade.rr_ratio}` : '–'}
                  </p>
                </div>
              </div>

              {/* Price details */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Preise & Größe</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Entry" value={trade.entry_price} />
                  <Field label="Lot-Größe" value={trade.lot_size} />
                  <Field label="Stop Loss" value={trade.sl_price} />
                  <Field label="Risk %" value={trade.risk_percent !== null ? `${trade.risk_percent.toFixed(2)}%` : null} />
                  <Field label="Take Profit" value={trade.tp_price} />
                </div>
              </div>

              <Separator />

              {/* Analysis */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Analyse</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Setup-Typ" value={trade.setup_type} />
                  <Field label="Strategie" value={trade.strategy} />
                  <Field label="Marktphase" value={trade.market_phase ? MARKET_PHASE_LABELS[trade.market_phase] ?? trade.market_phase : null} />
                </div>
              </div>

              {/* Emotions */}
              {(trade.emotion_before || trade.emotion_after) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Emotionen</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Vor dem Trade" value={trade.emotion_before ? EMOTION_LABELS[trade.emotion_before] ?? trade.emotion_before : null} />
                      <Field label="Nach dem Trade" value={trade.emotion_after ? EMOTION_LABELS[trade.emotion_after] ?? trade.emotion_after : null} />
                    </div>
                  </div>
                </>
              )}

              {/* Tags */}
              {trade.tags?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {trade.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {trade.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Notizen</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{trade.notes}</p>
                  </div>
                </>
              )}

              {/* Screenshots & Chart Link */}
              {(localScreenshots.length > 0 || trade.chart_url) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Screenshots & Chart
                    </p>
                    {trade.chart_url && (
                      <a
                        href={trade.chart_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded px-3 py-2 transition-colors group"
                        style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}
                      >
                        <span className="text-xs flex-1 truncate" style={{ color: 'var(--fg-2)' }}>
                          TradingView Chart öffnen
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>↗</span>
                      </a>
                    )}
                    {localScreenshots.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {localScreenshots.map((url, i) => (
                          <div key={url} className="relative group aspect-video rounded-md overflow-hidden border border-border/60 bg-muted">
                            <button onClick={() => setLightboxUrl(url)} className="w-full h-full">
                              <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                            <div
                              className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-1 px-1.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
                            >
                              <button
                                onClick={e => { e.stopPropagation(); setLightboxUrl(url); setCropMode(true) }}
                                className="flex items-center justify-center w-6 h-6 rounded"
                                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
                                title="Zuschneiden"
                              >
                                <Crop className="h-3 w-3" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); deleteScreenshot(url) }}
                                className="flex items-center justify-center w-6 h-6 rounded"
                                style={{ background: 'rgba(239,68,68,0.3)', color: '#f87171' }}
                                title="Löschen"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Delete trade — danger zone */}
              <div className="pt-1">
                <Separator className="mb-4" />
                <button
                  onClick={() => onDelete(trade)}
                  className="w-full text-sm py-2 rounded-lg text-center transition-colors"
                  style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  Trade löschen
                </button>
              </div>
            </TabsContent>

            <TabsContent value="chart" className="flex-1 px-6 py-4 mt-0 flex flex-col overflow-hidden">
              <TradingViewChartTab
                asset={trade.asset}
                tradeId={trade.id}
                chartUrl={trade.chart_url}
                isActive={activeTab === 'chart'}
                onScreenshotAdded={handleScreenshotAdded}
              />
            </TabsContent>

            <TabsContent value="review" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <TradeReviewTab trade={trade} screenshots={localScreenshots} />
            </TabsContent>

            <TabsContent value="ki" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <TradeAnalysisTab
                tradeId={trade.id}
                accountId={trade.account_id}
                isActive={activeTab === 'ki'}
              />
            </TabsContent>

            <TabsContent value="simulation" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <TradeSimulationTab trade={trade} />
            </TabsContent>

            <TabsContent value="simulator" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <RRSimulator trade={trade} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Screenshot lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-5xl p-0 border-border/60 [&>button]:hidden flex flex-col" style={{ background: '#111' }}>

          {/* Top bar — always outside the image */}
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {cropMode ? (
              <span className="text-sm font-medium text-white/70">Bereich mit der Maus auswählen</span>
            ) : (
              <span className="text-sm font-medium text-white/70">Screenshot</span>
            )}
            <button
              onClick={closeLightbox}
              className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Image area */}
          <div className="relative flex-1 min-h-0" style={{ lineHeight: 0 }}>
            {lightboxUrl && (
              <img
                ref={lightboxImgRef}
                src={lightboxUrl}
                alt="Screenshot"
                className="w-full h-auto object-contain select-none"
                style={{ maxHeight: 'calc(90vh - 110px)', display: 'block' }}
                draggable={false}
              />
            )}

            {/* Crop drag overlay */}
            {cropMode && lightboxUrl && (
              <div
                className="absolute inset-0"
                style={{ cursor: 'crosshair' }}
                onMouseDown={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setCropStart({ x: e.clientX - r.left, y: e.clientY - r.top })
                  setCropRect(null)
                }}
                onMouseMove={e => {
                  if (!cropStart) return
                  const r = e.currentTarget.getBoundingClientRect()
                  const x2 = e.clientX - r.left, y2 = e.clientY - r.top
                  setCropRect({ x: Math.min(cropStart.x, x2), y: Math.min(cropStart.y, y2), w: Math.abs(x2 - cropStart.x), h: Math.abs(y2 - cropStart.y) })
                }}
                onMouseUp={() => setCropStart(null)}
              >
                {cropRect && cropRect.w > 5 && cropRect.h > 5 && (
                  <div
                    className="absolute border-2 border-white pointer-events-none"
                    style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Bottom action bar — always outside the image */}
          <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {cropMode ? (
              <>
                <button
                  onClick={saveCrop}
                  disabled={!cropRect || cropRect.w < 10 || isProcessing}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-40 transition-opacity"
                  style={{ background: 'var(--brand-blue)', color: '#fff' }}
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Crop size={13} />}
                  Zuschnitt speichern
                </button>
                <button
                  onClick={() => { setCropMode(false); setCropRect(null) }}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCropMode(true)}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
                >
                  <Crop size={13} /> Zuschneiden
                </button>
                <button
                  onClick={() => lightboxUrl && deleteScreenshot(lightboxUrl)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Löschen
                </button>
              </>
            )}
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
