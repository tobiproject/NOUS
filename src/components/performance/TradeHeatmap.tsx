'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { HeatmapCell } from '@/hooks/usePerformanceStats'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

type ColorMode = 'winrate' | 'profitFactor'

function cellColorClass(cell: HeatmapCell, mode: ColorMode): string {
  if (cell.tradeCount === 0) return 'bg-muted/20'
  if (cell.tradeCount < 3) return 'bg-muted/40 opacity-50'

  const value = mode === 'winrate' ? cell.winRate : cell.profitFactor
  if (value === null) return 'bg-muted/40'

  if (mode === 'winrate') {
    if (value >= 70) return 'bg-emerald-500/90'
    if (value >= 60) return 'bg-emerald-500/70'
    if (value >= 50) return 'bg-emerald-500/50'
    if (value >= 40) return 'bg-amber-500/50'
    if (value >= 30) return 'bg-red-500/50'
    return 'bg-red-500/70'
  } else {
    if (value >= 2.5) return 'bg-emerald-500/90'
    if (value >= 1.5) return 'bg-emerald-500/70'
    if (value >= 1.0) return 'bg-emerald-500/40'
    if (value >= 0.5) return 'bg-amber-500/50'
    return 'bg-red-500/60'
  }
}

interface TooltipState {
  cell: HeatmapCell
  x: number
  y: number
}

interface Props {
  cells: HeatmapCell[]
}

export function TradeHeatmap({ cells }: Props) {
  const [mode, setMode] = useState<ColorMode>('winrate')
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const hasData = cells.some(c => c.tradeCount > 0)

  const getCell = (weekday: number, hour: number) =>
    cells.find(c => c.weekday === weekday && c.hour === hour)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="text-base">Trade-Heatmap (Uhrzeit × Wochentag)</CardTitle>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setMode('winrate')}
            className={cn(
              'px-2.5 py-1 text-xs rounded-md transition-colors',
              mode === 'winrate'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            Winrate
          </button>
          <button
            onClick={() => setMode('profitFactor')}
            className={cn(
              'px-2.5 py-1 text-xs rounded-md transition-colors',
              mode === 'profitFactor'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            Profit-Faktor
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-2 relative overflow-x-auto">
        {!hasData ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Keine Trades im gewählten Zeitraum
          </div>
        ) : (
          <>
            {/* Hour header */}
            <div className="flex mb-1 ml-8">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="flex-1 text-center text-[9px] text-muted-foreground min-w-[20px]"
                  style={{ minWidth: 20 }}
                >
                  {h % 4 === 0 ? h : ''}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {WEEKDAYS.map((day, wi) => (
              <div key={wi} className="flex items-center mb-0.5">
                <div className="w-8 shrink-0 text-[10px] text-muted-foreground text-right pr-1.5">
                  {day}
                </div>
                {HOURS.map(h => {
                  const cell = getCell(wi, h)
                  return (
                    <div
                      key={h}
                      className={cn(
                        'flex-1 h-5 rounded-sm cursor-pointer transition-opacity hover:opacity-80 min-w-[20px]',
                        cell ? cellColorClass(cell, mode) : 'bg-muted/20'
                      )}
                      style={{ minWidth: 20 }}
                      onMouseEnter={e => cell && cell.tradeCount > 0 && setTooltip({
                        cell,
                        x: (e.currentTarget as HTMLElement).getBoundingClientRect().left,
                        y: (e.currentTarget as HTMLElement).getBoundingClientRect().top,
                      })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted/20" />
                <span>Keine Trades</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted/40 opacity-50" />
                <span>&lt;3 Trades (nicht signifikant)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-red-500/60" />
                <span>Schlecht</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-amber-500/50" />
                <span>Mittel</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
                <span>Gut</span>
              </div>
            </div>
          </>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-md pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y - 80 }}
          >
            <p className="font-medium text-foreground">
              {WEEKDAYS[tooltip.cell.weekday]}, {tooltip.cell.hour}:00 Uhr
            </p>
            <p className="text-muted-foreground mt-0.5">{tooltip.cell.tradeCount} Trades</p>
            {tooltip.cell.winRate !== null && (
              <p className="text-muted-foreground mt-0.5">Winrate: {tooltip.cell.winRate.toFixed(1)}%</p>
            )}
            {tooltip.cell.avgPnl !== null && (
              <p className={`mt-0.5 ${tooltip.cell.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Ø P&L: {tooltip.cell.avgPnl >= 0 ? '+' : ''}{tooltip.cell.avgPnl.toFixed(2)} €
              </p>
            )}
            {tooltip.cell.tradeCount < 3 && (
              <p className="text-amber-400 mt-0.5">⚠ Zu wenig Daten</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
