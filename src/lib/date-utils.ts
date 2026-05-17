function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getWeekRange(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, ...
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) - offsetWeeks * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: localDateStr(monday), end: localDateStr(sunday) }
}

export function getMonthRange(offsetMonths = 0): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() - offsetMonths
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return { start: localDateStr(first), end: localDateStr(last) }
}
