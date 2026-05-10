export interface ChangelogEntry {
  version: string
  date: string
  features?: string[]
  fixes?: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.1',
    date: '2026-05-10',
    fixes: [
      'Wochenvorbereitung lädt jetzt korrekt (Infinite-Loop gefixt)',
      'Update-Erkennung erkennt neue Versionen zuverlässig',
      'Versionsanzeige zeigt jetzt korrektes Datum',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-10',
    features: [
      'Profil-Sidebar öffnet von links mit Konto-Schnellwechsel',
      'Anleitung-Seite mit Schritt-für-Schritt-Erklärungen',
      'Account-Typen nach Markt aufgeteilt (FX, Futures, Aktien…)',
      'Update-Banner zeigt was neu ist',
    ],
  },
]

export function getChangelogForVersion(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find(e => e.version === version) ?? CHANGELOG[0]
}
