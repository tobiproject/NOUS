export const ANLEITUNG_SECTION_IDS = [
  'erste-schritte',
  'journal',
  'dashboard',
  'ki-analyse',
  'risk',
  'performance',
  'knowledge-base',
  'wochenvorbereitung',
  'benachrichtigungen',
  'einstellungen',
]

export const ANLEITUNG_STORAGE_KEY = 'nous-anleitung-read'

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

export function markSectionRead(sectionId: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(ANLEITUNG_STORAGE_KEY)
    const all: string[] = raw ? JSON.parse(raw) : []
    if (!all.includes(sectionId)) {
      all.push(sectionId)
      localStorage.setItem(ANLEITUNG_STORAGE_KEY, JSON.stringify(all))
      window.dispatchEvent(new CustomEvent('anleitung-progress-changed'))
    }
  } catch {}
}
