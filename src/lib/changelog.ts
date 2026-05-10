export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.1',
    date: '2026-05-10',
    changes: [
      'Wochenvorbereitung lädt jetzt korrekt',
      'Versionsanzeige in Sidebar zeigt Datum und Changelog',
      'Update-Erkennung funktioniert jetzt zuverlässig',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-10',
    changes: [
      'Profil-Sidebar öffnet jetzt von links mit Konto-Schnellwechsel',
      'Neue Anleitung-Seite mit Schritt-für-Schritt-Erklärungen',
      'Account-Typen: Eigenhandel & Fremdkapital nach Markt aufgeteilt',
      'Update-Banner zeigt jetzt was neu ist',
    ],
  },
]

// Returns exact match or falls back to the latest entry —
// since version now auto-increments per commit, always show the latest changelog.
export function getChangelogForVersion(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find(e => e.version === version) ?? CHANGELOG[0]
}
