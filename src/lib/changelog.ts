export interface ChangelogEntry {
  version: string
  date: string
  features?: string[]
  fixes?: string[]
}

// Nur das aktuelle Release. Bei jedem Deploy via `npm run release` wird version automatisch hochgezählt.
// features/fixes hier manuell eintragen was neu ist — nur für dieses Release, keine Historie.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.1',
    date: '2026-05-11',
    fixes: [
      'Auto-Logout beim Beenden der App (synchrone Session-Löschung)',
      'Inaktivitäts-Logout nach 5 Minuten ohne Aktion',
    ],
  },
]

export function getCurrentChangelog(): ChangelogEntry {
  return CHANGELOG[0]
}
