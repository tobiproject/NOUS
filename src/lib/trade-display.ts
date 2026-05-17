import type { Trade } from '@/hooks/useTrades'

export function getPnlStyle(pnl: number | null): React.CSSProperties {
  if (pnl === null || pnl === 0) return { color: 'var(--fg-3)' }
  return { color: pnl > 0 ? 'var(--long)' : 'var(--short)' }
}

export function getDirectionColor(direction: Trade['direction']): string {
  return direction === 'long' ? 'var(--long)' : 'var(--short)'
}
