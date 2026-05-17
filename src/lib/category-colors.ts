export const CATEGORY_COLORS: Record<string, string> = {
  futures:     '#2962FF',
  forex:       '#089981',
  crypto:      '#F59E0B',
  indices:     '#EC4899',
  stocks:      '#6366F1',
  cfd:         '#8B5CF6',
  etf:         '#14B8A6',
  energy:      '#F97316',
  metals:      '#94A3B8',
  agriculture: '#84CC16',
  bonds:       '#0EA5E9',
  other:       '#6B7280',
}

export function getCategoryColor(category: string | null | undefined): string {
  return CATEGORY_COLORS[category ?? 'other'] ?? '#6B7280'
}
