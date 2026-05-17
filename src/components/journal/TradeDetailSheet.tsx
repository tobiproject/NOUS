'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Edit2, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react'
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
}

export function TradeDetailSheet({ trade, open, onOpenChange, onEdit, onDelete }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('detail')

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
        <DialogContent className="max-w-2xl w-full p-0 gap-0 flex flex-col max-h-[90vh] [&>button:last-child]:hidden">
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
              <Button variant="ghost" size="icon" onClick={() => onDelete(trade)}
                className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
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
              {(trade.screenshot_urls?.length > 0 || trade.chart_url) && (
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
                    {trade.screenshot_urls?.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {trade.screenshot_urls.map((url, i) => (
                          <button
                            key={url}
                            onClick={() => setLightboxUrl(url)}
                            className="relative aspect-video rounded-md overflow-hidden border border-border/60 hover:border-primary/50 transition-colors bg-muted"
                          >
                            <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="chart" className="flex-1 px-6 py-4 mt-0 flex flex-col overflow-hidden">
              <TradingViewChartTab
                asset={trade.asset}
                tradeId={trade.id}
                accountId={trade.account_id}
                isActive={activeTab === 'chart'}
              />
            </TabsContent>

            <TabsContent value="review" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <TradeReviewTab trade={trade} />
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
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-5xl p-0 bg-black border-border/60 [&>button]:hidden">
          <div className="relative">
            {lightboxUrl && (
              <img src={lightboxUrl} alt="Screenshot" className="w-full h-auto max-h-[88vh] object-contain" />
            )}
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
