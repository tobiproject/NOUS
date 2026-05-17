'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronUp, ChevronDown, ChevronsUpDown, ImageIcon, TrendingUp, TrendingDown, Newspaper, CheckCircle2, X } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type { Trade, TradesPage } from '@/hooks/useTrades'
import { cn } from '@/lib/utils'

type SortKey = 'traded_at' | 'asset' | 'result_currency' | 'result_percent' | 'rr_ratio' | 'risk_percent'

interface Props {
  tradesPage: TradesPage | null
  isLoading: boolean
  onRowClick: (trade: Trade) => void
  onPageChange: (page: number) => void
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />
  return direction === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
    : <ChevronDown className="h-3.5 w-3.5 ml-1" />
}

function OutcomeBadge({ outcome }: { outcome: Trade['outcome'] }) {
  if (!outcome) return <span className="text-muted-foreground">–</span>
  const map = {
    win: { label: 'Win', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    loss: { label: 'Loss', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
    breakeven: { label: 'BE', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  }
  const { label, className } = map[outcome]
  return <Badge variant="outline" className={cn('text-xs px-1.5 py-0', className)}>{label}</Badge>
}

const EMOTION_ICONS: Record<string, string> = {
  calm: '😌', focused: '🎯', nervous: '😰', impatient: '😤',
  overconfident: '😎', fomo: '😱', tired: '😴',
}

export function TradeTable({ tradesPage, isLoading, onRowClick, onPageChange }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('traded_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [lightboxUrls, setLightboxUrls] = useState<string[] | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState(0)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedTrades = useMemo(() => {
    if (!tradesPage?.trades) return []
    return [...tradesPage.trades].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [tradesPage?.trades, sortKey, sortDir])

  const totalPages = tradesPage ? Math.ceil(tradesPage.total / tradesPage.pageSize) : 1
  const currentPage = tradesPage?.page ?? 1

  const SortHead = ({ colKey, label, className }: { colKey: SortKey; label: string; className?: string }) => (
    <TableHead
      className={cn('cursor-pointer select-none whitespace-nowrap', className)}
      onClick={() => handleSort(colKey)}
    >
      <span className="flex items-center">
        {label}
        <SortIcon active={sortKey === colKey} direction={sortDir} />
      </span>
    </TableHead>
  )

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (!tradesPage || tradesPage.trades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
        <p className="text-muted-foreground text-sm">
          {tradesPage ? 'Keine Trades gefunden. Filter anpassen oder neuen Trade erfassen.' : 'Noch keine Trades vorhanden.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {tradesPage.total} Trade{tradesPage.total !== 1 ? 's' : ''}
        {tradesPage.total > tradesPage.pageSize && ` · Seite ${currentPage} von ${totalPages}`}
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/60">
              <SortHead colKey="traded_at" label="Datum" />
              <SortHead colKey="asset" label="Asset" />
              <TableHead>Richtung</TableHead>
              <SortHead colKey="result_percent" label="%" className="text-right" />
              <SortHead colKey="result_currency" label="€" className="text-right hidden sm:table-cell" />
              <TableHead className="text-center">Ergebnis</TableHead>
              <TableHead className="text-center w-8" title="Screenshot">
                <ImageIcon className="h-3.5 w-3.5 inline-block" />
              </TableHead>
              <TableHead className="text-center w-8" title="Nachbereitung abgeschlossen">
                <CheckCircle2 className="h-3.5 w-3.5 inline-block" />
              </TableHead>
              <SortHead colKey="rr_ratio" label="RR" className="text-right hidden md:table-cell" />
              <TableHead className="hidden md:table-cell text-right">Entry</TableHead>
              <TableHead className="hidden md:table-cell text-right">Lots</TableHead>
              <TableHead className="hidden lg:table-cell text-right">SL</TableHead>
              <TableHead className="hidden lg:table-cell text-right">TP</TableHead>
              <TableHead className="hidden lg:table-cell">Setup</TableHead>
              <TableHead className="hidden xl:table-cell">Strategie</TableHead>
              <TableHead className="hidden md:table-cell text-center">Emotion</TableHead>
              <TableHead className="hidden sm:table-cell text-center w-8" title="News-Event">
                <Newspaper className="h-3.5 w-3.5 inline-block" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrades.map(trade => {
              const resultColor = trade.result_currency === null ? '' :
                trade.result_currency > 0.01 ? 'text-emerald-400' :
                trade.result_currency < -0.01 ? 'text-red-400' : 'text-amber-400'
              const emotionIcon = trade.emotion_before ? EMOTION_ICONS[trade.emotion_before] : null

              return (
                <TableRow
                  key={trade.id}
                  className="cursor-pointer border-border/40 hover:bg-muted/30 transition-colors"
                  onClick={() => onRowClick(trade)}
                >
                  <TableCell className="text-xs text-muted-foreground">
                    {format(parseISO(trade.traded_at), 'dd.MM.yy HH:mm')}
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-0">{trade.asset}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      'text-xs px-1.5 py-0 gap-0.5',
                      trade.direction === 'long'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border-red-500/30'
                    )}>
                      {trade.direction === 'long'
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {trade.direction === 'long' ? 'L' : 'S'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums text-sm font-medium', resultColor)}>
                    {trade.result_percent !== null
                      ? `${trade.result_percent >= 0 ? '+' : ''}${trade.result_percent.toFixed(2)}%`
                      : '–'}
                  </TableCell>
                  <TableCell className={cn('hidden sm:table-cell text-right tabular-nums text-sm font-medium', resultColor)}>
                    {trade.result_currency !== null
                      ? `${trade.result_currency >= 0 ? '+' : ''}${trade.result_currency.toFixed(2)}`
                      : '–'}
                  </TableCell>
                  <TableCell className="text-center">
                    <OutcomeBadge outcome={trade.outcome} />
                  </TableCell>
                  <TableCell
                    className="text-center w-8"
                    onClick={e => {
                      if ((trade.screenshot_urls?.length ?? 0) > 0) {
                        e.stopPropagation()
                        setLightboxUrls(trade.screenshot_urls)
                        setLightboxIdx(0)
                      }
                    }}
                  >
                    {(trade.screenshot_urls?.length ?? 0) > 0 ? (
                      <span
                        className="inline-flex items-center justify-center rounded p-0.5 transition-colors hover:bg-muted cursor-pointer"
                        title="Screenshot anzeigen"
                        style={{ color: 'var(--brand-blue)' }}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center opacity-20">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center w-8" title={trade.what_went_well ? 'Nachbereitung abgeschlossen' : 'Nachbereitung ausstehend'}>
                    {trade.what_went_well ? (
                      <CheckCircle2 className="h-3.5 w-3.5 inline-block text-emerald-400" />
                    ) : (
                      <span className="inline-block w-3.5 h-3.5 rounded-full border border-border/40" />
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-xs">
                    {trade.rr_ratio !== null ? `1:${trade.rr_ratio}` : '–'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-xs">
                    {trade.entry_price}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-xs">
                    {trade.lot_size}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums text-xs text-muted-foreground">
                    {trade.sl_price}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums text-xs text-muted-foreground">
                    {trade.tp_price}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[120px] truncate">
                    {trade.setup_type ?? '–'}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-xs text-muted-foreground max-w-[120px] truncate">
                    {trade.strategy ?? '–'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center text-base" title={trade.emotion_before ?? ''}>
                    {emotionIcon ?? '–'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center">
                    {trade.news_event_present === true && (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center',
                          trade.news_impact_level === 'high' ? 'text-red-400' :
                          trade.news_impact_level === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                        )}
                        title={trade.news_event_name ?? 'News-Event'}
                      >
                        <Newspaper className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Screenshot Lightbox */}
      <Dialog open={!!lightboxUrls} onOpenChange={open => { if (!open) setLightboxUrls(null) }}>
        <DialogContent className="max-w-5xl p-0 bg-black border-border/60 [&>button]:hidden">
          <div className="relative">
            {lightboxUrls && (
              <>
                <img
                  src={lightboxUrls[lightboxIdx]}
                  alt="Screenshot"
                  className="w-full h-auto max-h-[88vh] object-contain"
                />
                {lightboxUrls.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {lightboxUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxIdx(i)}
                        className={cn('w-2 h-2 rounded-full transition-colors', i === lightboxIdx ? 'bg-white' : 'bg-white/40')}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => setLightboxUrls(null)}
              className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={e => { e.preventDefault(); if (currentPage > 1) onPageChange(currentPage - 1) }}
                className={cn(currentPage <= 1 && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={e => { e.preventDefault(); onPageChange(page) }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={e => { e.preventDefault(); if (currentPage < totalPages) onPageChange(currentPage + 1) }}
                className={cn(currentPage >= totalPages && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
