// Shared utilities for workflow API routes (avoids duplication across 4 route files)

export function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function getLocalDateInfo(
  now: Date,
  tz: string
): { todayStr: string; hour: number; dayOfWeek: number } {
  try {
    // 'sv' locale reliably produces YYYY-MM-DD format
    const todayStr = now.toLocaleDateString('sv', { timeZone: tz })
    const hourStr = now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })
    const hour = parseInt(hourStr, 10) % 24
    // Derive day-of-week from local date string (noon avoids DST edge cases)
    const localDate = new Date(`${todayStr}T12:00:00`)
    return { todayStr, hour, dayOfWeek: localDate.getDay() }
  } catch {
    return {
      todayStr: now.toISOString().split('T')[0],
      hour: now.getUTCHours(),
      dayOfWeek: now.getUTCDay(),
    }
  }
}
