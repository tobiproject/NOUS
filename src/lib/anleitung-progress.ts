export const ANLEITUNG_SECTION_IDS = [
  'erste-schritte',
  'journal',
  'dashboard',
  'ki-analyse',
  'risk',
  'performance',
  'knowledge-base',
  'wochenvorbereitung',
  'kalender',
  'benachrichtigungen',
  'einstellungen',
]

export const ANLEITUNG_STORAGE_KEY = 'nous-anleitung-read'
export const ANLEITUNG_DISMISSED_KEY = 'nous-anleitung-dismissed-count'

export function getAnleitungProgress(): { read: string[]; total: number; percent: number } {
  if (typeof window === 'undefined') return { read: [], total: ANLEITUNG_SECTION_IDS.length, percent: 0 }
  try {
    const raw = localStorage.getItem(ANLEITUNG_STORAGE_KEY)
    const all: string[] = raw ? JSON.parse(raw) : []
    const read = all.filter(id => ANLEITUNG_SECTION_IDS.includes(id))
    return {
      read,
      total: ANLEITUNG_SECTION_IDS.length,
      percent: Math.round((read.length / ANLEITUNG_SECTION_IDS.length) * 100),
    }
  } catch {
    return { read: [], total: ANLEITUNG_SECTION_IDS.length, percent: 0 }
  }
}

export function getAnleitungDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const count = parseInt(localStorage.getItem(ANLEITUNG_DISMISSED_KEY) ?? '0', 10)
    // Only dismissed if dismissed at the CURRENT section count — new sections reset it
    return count === ANLEITUNG_SECTION_IDS.length
  } catch {
    return false
  }
}

export function setAnleitungDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ANLEITUNG_DISMISSED_KEY, String(ANLEITUNG_SECTION_IDS.length))
}

export function clearAnleitungDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ANLEITUNG_DISMISSED_KEY)
}

export function markSectionRead(sectionId: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(ANLEITUNG_STORAGE_KEY)
    const all: string[] = raw ? JSON.parse(raw) : []
    if (!all.includes(sectionId)) {
      const updated = [...all, sectionId]
      localStorage.setItem(ANLEITUNG_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('anleitung-progress-changed'))
      syncProgressToServer(updated).catch(() => {})
    }
  } catch {}
}

export function setProgressFromServer(sections: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ANLEITUNG_STORAGE_KEY, JSON.stringify(sections))
    window.dispatchEvent(new CustomEvent('anleitung-progress-changed'))
  } catch {}
}

export async function syncProgressToServer(sections: string[]): Promise<void> {
  await fetch('/api/anleitung/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })
}

export async function fetchProgressFromServer(): Promise<string[]> {
  try {
    const res = await fetch('/api/anleitung/progress')
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.sections) ? data.sections : []
  } catch {
    return []
  }
}
