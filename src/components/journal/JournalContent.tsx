'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTrades, type Trade, type TradeFilters, type TradesPage } from '@/hooks/useTrades'
import { useAccountContext } from '@/contexts/AccountContext'
import { TradeTable } from './TradeTable'
import { MobileTradeCard } from './MobileTradeCard'
import { TradeFilters as TradeFiltersBar } from './TradeFilters'
import { TradeFormSheet } from './TradeFormSheet'
import { TradeDetailSheet } from './TradeDetailSheet'
import { TradeDeleteDialog } from './TradeDeleteDialog'
import { useAiAnalysis } from '@/hooks/useAiAnalysis'
import { useMilestones } from '@/hooks/useMilestones'
import { MilestoneCelebration } from './MilestoneCelebration'
import { toast } from 'sonner'
import { ExportMenu } from '@/components/export/ExportMenu'
import { PdfReportButton } from '@/components/export/PdfReportButton'
import { ImportWizardDialog } from '@/components/import/ImportWizardDialog'

function paramsToFilters(params: URLSearchParams): TradeFilters {
  const filters: TradeFilters = {}
  const q = params.get('q'); if (q) filters.search = q
  const from = params.get('from'); if (from) filters.dateFrom = from
  const to = params.get('to'); if (to) filters.dateTo = to
  const dir = params.get('dir'); if (dir) filters.direction = dir as TradeFilters['direction']
  const outcome = params.get('outcome'); if (outcome) filters.outcome = outcome as TradeFilters['outcome']
  const setup = params.get('setup'); if (setup) filters.setupType = setup
  const strategy = params.get('strategy'); if (strategy) filters.strategy = strategy
  const emotion = params.get('emotion'); if (emotion) filters.emotion = emotion
  const assets = params.get('assets'); if (assets) filters.assets = assets.split(',')
  return filters
}

function filtersToParams(filters: TradeFilters, page: number): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.search) p.set('q', filters.search)
  if (filters.dateFrom) p.set('from', filters.dateFrom)
  if (filters.dateTo) p.set('to', filters.dateTo)
  if (filters.direction) p.set('dir', filters.direction)
  if (filters.outcome) p.set('outcome', filters.outcome)
  if (filters.setupType) p.set('setup', filters.setupType)
  if (filters.strategy) p.set('strategy', filters.strategy)
  if (filters.emotion) p.set('emotion', filters.emotion)
  if (filters.assets?.length) p.set('assets', filters.assets.join(','))
  if (page > 1) p.set('page', String(page))
  return p
}

export function JournalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { activeAccount } = useAccountContext()
  const { fetchTrades, deleteTrade, getUniqueValues, isMutating } = useTrades()
  const { triggerAnalysis } = useAiAnalysis()
  const { checkMilestones } = useMilestones()
  const [milestone, setMilestone] = useState<number | null>(null)

  const [tradesPage, setTradesPage] = useState<TradesPage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [isFormOpen, setIsFormOpen] = useState(() => searchParams.get('new') === '1')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null)
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null)

  const [assetSuggestions, setAssetSuggestions] = useState<string[]>([])
  const [setupSuggestions, setSetupSuggestions] = useState<string[]>([])
  const [strategySuggestions, setStrategySuggestions] = useState<string[]>([])
  const activeToastCount = useRef(0)

  const currentPage = Number(searchParams.get('page') ?? '1')
  const filters = paramsToFilters(searchParams)

  // Load unique values for suggestions (once per account)
  useEffect(() => {
    if (!activeAccount) return
    Promise.all([
      getUniqueValues('asset'),
      getUniqueValues('setup_type'),
      getUniqueValues('strategy'),
    ]).then(([assets, setups, strategies]) => {
      setAssetSuggestions(assets)
      setSetupSuggestions(setups)
      setStrategySuggestions(strategies)
    })
  }, [activeAccount?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch trades when URL params or account changes
  useEffect(() => {
    if (!activeAccount) return
    setIsLoading(true)
    fetchTrades(filters, currentPage)
      .then(setTradesPage)
      .finally(() => setIsLoading(false))
  }, [searchParams.toString(), activeAccount?.id, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiltersChange = useCallback((newFilters: TradeFilters) => {
    const params = filtersToParams(newFilters, 1)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router])

  const handlePageChange = useCallback((page: number) => {
    const params = filtersToParams(filters, page)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, filters])

  const handleNewTrade = () => {
    setEditingTrade(null)
    setIsFormOpen(true)
  }

  const handleCompletionNeeded = useCallback((tradeId: string, type: 'notes' | 'screenshot') => {
    if (activeToastCount.current >= 3) return
    activeToastCount.current += 1
    const msg = type === 'notes'
      ? 'Kein Kommentar erfasst — Jetzt ergänzen?'
      : 'Kein Screenshot vorhanden — Jetzt hinzufügen?'
    setTimeout(() => {
      toast.warning(msg, {
        action: {
          label: 'Bearbeiten',
          onClick: () => {
            const t = tradesPage?.trades.find(x => x.id === tradeId)
            if (t) { setEditingTrade(t); setIsFormOpen(true) }
          },
        },
        onDismiss: () => { activeToastCount.current = Math.max(0, activeToastCount.current - 1) },
        onAutoClose: () => { activeToastCount.current = Math.max(0, activeToastCount.current - 1) },
      })
    }, 600)
  }, [tradesPage])

  const handleEditTrade = (trade: Trade) => {
    setDetailTrade(null)
    setEditingTrade(trade)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (trade: Trade) => {
    setDetailTrade(null)
    setDeletingTrade(trade)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingTrade) return
    const { error } = await deleteTrade(deletingTrade.id)
    if (!error) {
      setDeletingTrade(null)
      setRefreshKey(k => k + 1)
    }
  }

  const handleFormSuccess = (newTradeId?: string) => {
    setRefreshKey(k => k + 1)
    // Auto-trigger KI analysis for newly created trades (AC-4.1)
    if (newTradeId) {
      triggerAnalysis(newTradeId)
      // Check milestone after a short delay to let tradesPage refresh settle
      setTimeout(() => {
        fetchTrades({}, 1).then(p => {
          const hit = checkMilestones(p.total)
          if (hit) setMilestone(hit)
        })
      }, 800)
    }
    // Refresh suggestions after new trade
    if (activeAccount) {
      Promise.all([
        getUniqueValues('asset'),
        getUniqueValues('setup_type'),
        getUniqueValues('strategy'),
      ]).then(([assets, setups, strategies]) => {
        setAssetSuggestions(assets)
        setSetupSuggestions(setups)
        setStrategySuggestions(strategies)
      })
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
            <p className="text-muted-foreground text-sm">
              {activeAccount ? `Konto: ${activeAccount.name}` : 'Kein aktives Konto'}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <PdfReportButton />
            <ExportMenu filters={filters} />
            <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={!activeAccount} className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleNewTrade} disabled={!activeAccount} className="gap-2">
              <Plus className="h-4 w-4" />
              Neuer Trade
            </Button>
          </div>
        </div>

        {/* Filters */}
        <TradeFiltersBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          assetOptions={assetSuggestions}
          setupOptions={setupSuggestions}
          strategyOptions={strategySuggestions}
        />

        {/* Desktop table */}
        <div className="hidden md:block">
          <TradeTable
            tradesPage={tradesPage}
            isLoading={isLoading}
            onRowClick={setDetailTrade}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Mobile card list */}
        <div className="md:hidden">
          <MobileTradeCard
            trades={tradesPage?.trades ?? []}
            isLoading={isLoading}
            onCardClick={setDetailTrade}
          />
        </div>
      </div>

      <button
        onClick={handleNewTrade}
        disabled={!activeAccount}
        className="md:hidden fixed right-4 z-40 flex items-center justify-center rounded-full shadow-lg disabled:opacity-40 transition-opacity active:scale-95"
        style={{
          bottom: 'calc(5rem + env(safe-area-inset-bottom))',
          width: '56px',
          height: '56px',
          background: 'var(--fg-1)',
          color: 'var(--bg-0)',
        }}
        aria-label="Neuer Trade"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Form Sheet */}
      <TradeFormSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingTrade={editingTrade}
        setupSuggestions={setupSuggestions}
        strategySuggestions={strategySuggestions}
        onSuccess={handleFormSuccess}
        onCompletionNeeded={handleCompletionNeeded}
      />

      {/* Detail Sheet */}
      <TradeDetailSheet
        trade={detailTrade}
        open={!!detailTrade}
        onOpenChange={open => { if (!open) setDetailTrade(null) }}
        onEdit={handleEditTrade}
        onDelete={handleDeleteClick}
      />

      {/* Import Wizard */}
      <ImportWizardDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={() => setRefreshKey(k => k + 1)}
      />

      {/* Delete Dialog */}
      <TradeDeleteDialog
        open={!!deletingTrade}
        onOpenChange={open => { if (!open) setDeletingTrade(null) }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isMutating}
      />

      <MilestoneCelebration
        milestone={milestone}
        onClose={() => setMilestone(null)}
      />
    </>
  )
}
