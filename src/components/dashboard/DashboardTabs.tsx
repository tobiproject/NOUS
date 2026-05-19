'use client'

import { useState, useEffect, useMemo } from 'react'
import { BalanceCard } from './BalanceCard'
import { TradesSummaryCard } from './TradesSummaryCard'
import { RecentTradesCard } from './RecentTradesCard'
import type { TabKpiData } from './DashboardTabKpis'
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { Trade } from '@/hooks/useTrades'

type TabKey = 'today' | 'week' | 'month'

const STORAGE_KEY = 'dashboard_active_tab'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: 'Heute' },
  { key: 'week',  label: 'Woche' },
  { key: 'month', label: 'Monat' },
]

// ── Date helpers ───────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}
function weekStartISO() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}
function monthStartISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function yesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// ── KPI calculation ────────────────────────────────────────────────────────

function calcKpis(trades: Trade[], startBalance: number): TabKpiData {
  const pnl     = trades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const pnlPct  = startBalance > 0 ? (pnl / startBalance) * 100 : 0
  const decided = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const wins    = decided.filter(t => t.outcome === 'win')
  const winRate = decided.length > 0 ? (wins.length / decided.length) * 100 : null
  const rrTrades = trades.filter(t => t.rr_ratio !== null)
  const avgRR   = rrTrades.length > 0
    ? rrTrades.reduce((s, t) => s + t.rr_ratio!, 0) / rrTrades.length
    : null
  return {
    pnl:        Math.round(pnl * 100) / 100,
    pnlPct:     Math.round(pnlPct * 100) / 100,
    tradeCount: trades.length,
    winRate:    winRate !== null ? Math.round(winRate * 10) / 10 : null,
    avgRR:      avgRR   !== null ? Math.round(avgRR   * 100) / 100 : null,
  }
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  metrics:      DashboardMetrics
  startBalance: number
  onTradeClick: (trade: Trade) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardTabs({ metrics, startBalance, onTradeClick }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('today')

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as TabKey | null
      if (stored && TABS.some(t => t.key === stored)) setActiveTab(stored)
    } catch { /* localStorage unavailable */ }
  }, [])

  const handleTab = (tab: TabKey) => {
    setActiveTab(tab)
    try { localStorage.setItem(STORAGE_KEY, tab) } catch { /* ignore */ }
  }

  // ── Date boundaries ──────────────────────────────────────────────────────
  const today      = todayISO()
  const yesterday  = yesterdayISO()
  const weekStart  = weekStartISO()
  const monthStart = monthStartISO()

  // ── Filtered trades ──────────────────────────────────────────────────────
  const allTrades   = metrics.allTrades
  const todayTrades = useMemo(() => allTrades.filter(t => t.traded_at.startsWith(today)),          [allTrades, today])
  const weekTrades  = useMemo(() => allTrades.filter(t => t.traded_at.split('T')[0] >= weekStart), [allTrades, weekStart])
  const monthTrades = useMemo(() => allTrades.filter(t => t.traded_at.split('T')[0] >= monthStart),[allTrades, monthStart])

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const todayKpis = useMemo(() => calcKpis(todayTrades, startBalance), [todayTrades, startBalance])
  const weekKpis  = useMemo(() => calcKpis(weekTrades,  startBalance), [weekTrades,  startBalance])
  const monthKpis = useMemo(() => calcKpis(monthTrades, startBalance), [monthTrades, startBalance])

  // ── Equity curves (slice from metrics.equityCurve) ───────────────────────
  const todayCurve = useMemo(() => metrics.equityCurve.filter(p => p.date >= yesterday),   [metrics.equityCurve, yesterday])
  const weekCurve  = useMemo(() => metrics.equityCurve.filter(p => p.date >= weekStart),   [metrics.equityCurve, weekStart])
  const monthCurve = useMemo(() => metrics.equityCurve.filter(p => p.date >= monthStart),  [metrics.equityCurve, monthStart])

  // ── Current balance (cumulative across all trades) ───────────────────────
  const currentBalance = useMemo(() => {
    if (allTrades.length === 0) return startBalance
    return startBalance + allTrades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  }, [allTrades, startBalance])

  // ── Active tab data ───────────────────────────────────────────────────────
  const { kpis, curve, trades } = useMemo(() => {
    if (activeTab === 'today') return { kpis: todayKpis, curve: todayCurve, trades: todayTrades }
    if (activeTab === 'week')  return { kpis: weekKpis,  curve: weekCurve,  trades: weekTrades  }
    return                            { kpis: monthKpis, curve: monthCurve, trades: monthTrades }
  }, [activeTab, todayKpis, todayCurve, todayTrades, weekKpis, weekCurve, weekTrades, monthKpis, monthCurve, monthTrades])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Period tabs */}
      <div className="flex items-center gap-1.5">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className="dash-pill-tab"
              style={{
                background: isActive ? '#00C4FF' : 'rgba(255,255,255,0.06)',
                color:      isActive ? '#000'    : 'rgba(255,255,255,0.5)',
                boxShadow:  isActive ? '0 0 14px rgba(0,196,255,0.25)' : 'none',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Balance card */}
      <BalanceCard
        kpis={kpis}
        curve={curve}
        trades={trades}
        startBalance={startBalance}
        currentBalance={currentBalance}
        tab={activeTab}
      />

      {/* Summary + Recent trades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TradesSummaryCard trades={trades} />
        <RecentTradesCard
          trades={trades}
          onTradeClick={onTradeClick}
          emptyMessage={activeTab === 'today' ? 'Noch keine Trades heute' : activeTab === 'week' ? 'Keine Trades diese Woche' : 'Keine Trades diesen Monat'}
        />
      </div>
    </div>
  )
}
