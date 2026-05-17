export function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = Array.isArray(value) ? (value as unknown[]).join('; ') : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsvRow(values: unknown[]): string {
  return values.map(escapeCell).join(',')
}

export interface KpiSummary {
  totalTrades: number
  winrate: number
  totalPnl: number
  avgPnl: number
  bestTrade: number
  worstTrade: number
}

export function computeKpi(
  trades: { outcome: string | null; result_currency: number | null }[]
): KpiSummary {
  const decided = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const wins = decided.filter(t => t.outcome === 'win')
  const pnls = trades.map(t => t.result_currency ?? 0)
  return {
    totalTrades: trades.length,
    winrate: decided.length ? (wins.length / decided.length) * 100 : 0,
    totalPnl: pnls.reduce((a, b) => a + b, 0),
    avgPnl: trades.length ? pnls.reduce((a, b) => a + b, 0) / trades.length : 0,
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
  }
}
