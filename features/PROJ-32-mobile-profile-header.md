# PROJ-32 — Mobile Profile Header & Avatar

**Status:** Deployed  
**Created:** 2026-05-04  
**Dependencies:** PROJ-31 (Mobile Responsive), PROJ-1 (Auth)

---

## Overview

Das mobile Header-Element (oben in der App) erhält ein vollwertiges Profil-Icon mit Avatar. Ein Antippen öffnet ein Bottom Sheet mit Profil, Einstellungen, Über NOUS und Abmelden — analog zum bestehenden Mehr-Drawer.

Gleichzeitig wird der NOUS-Wordmark durch das offizielle SVG-Logo mit Slogan ersetzt.

---

## User Stories

1. Als Nutzer sehe ich oben links das NOUS-Logo mit dem Slogan "Turn data into decisions", damit ich die App-Identität klar erkenne.
2. Als Nutzer sehe ich oben rechts ein rundes Avatar-Icon mit meinem Profilbild oder meinen Initialen, damit ich sofort erkenne, welches Konto aktiv ist.
3. Als Nutzer kann ich ein eigenes Profilbild hochladen, das im Avatar-Kreis erscheint.
4. Als Nutzer tippe ich auf den Avatar und es öffnet sich ein Bottom Sheet mit: meinem Namen, Link zu Profil-Einstellungen, Link zu Konten, Link zu Über NOUS und einem Abmelden-Button.
5. Als Nutzer schließe ich das Sheet durch Wischen nach unten oder Tippen auf den Overlay.

---

## Acceptance Criteria

- [ ] NOUS-SVG-Logo mit Slogan erscheint auf Mobile im Header (md:hidden)
- [ ] Avatar-Kreis (34×34px, rund) zeigt Profilbild wenn vorhanden, sonst erste(n) Buchstaben des display_name
- [ ] Profilbild kann in den Einstellungen hochgeladen werden (Supabase Storage, max 2MB, JPEG/PNG/WebP)
- [ ] Bottom Sheet öffnet sich beim Antippen des Avatars mit Apple-style Gesture
- [ ] Bottom Sheet enthält: Name + E-Mail oben, dann: "Mein Profil", "Konten", "Über NOUS", "Abmelden"
- [ ] "Mein Profil" → /einstellungen?tab=profil
- [ ] "Konten" → /einstellungen?tab=konten
- [ ] "Über NOUS" → /about
- [ ] "Abmelden" → logout() mit Bestätigung
- [ ] Sheet schließt sich beim Navigieren automatisch
- [ ] Avatar-Bild wird gecacht (keine Flickering bei Navigation)

---

## Edge Cases

- Kein display_name gesetzt → zeigt E-Mail-Initiale
- Kein Profilbild → zeigt Initialen-Kreis (brand-blue Hintergrund)
- Upload schlägt fehl → Toast mit Fehlermeldung, altes Bild bleibt
- Sehr langer Name → truncate nach 1 Zeile
- Kein aktives Konto → "Konto anlegen" statt Kontoname

---

## Tech Notes

- Avatar in Supabase Storage: Bucket `avatars`, Pfad `{user_id}/avatar.{ext}`
- Public URL via Supabase CDN
- Bottom Sheet: gleiche GestureDrawer-Komponente wie BottomNav
- Neues DB-Feld: `profiles.avatar_url` (text, nullable)
- Logo-SVG: als React-Komponente oder `<Image>` aus `/public`

---

## QA Test Results — 2026-05-04

**Tester:** QA Engineer  
**Status: NOT READY — 1 High, 2 Medium, 1 Low bug**

### Acceptance Criteria

| # | Kriterium | Status |
|---|-----------|--------|
| 1 | NOUS-SVG-Logo mit Slogan erscheint auf Mobile im Header (md:hidden) | ✅ PASS |
| 2 | Avatar-Kreis (34×34px, rund) zeigt Profilbild / Initialen | ✅ PASS (zeigt Initialen aus account name) |
| 3 | Profilbild kann hochgeladen werden (Supabase Storage, max 2MB) | ❌ FAIL — nicht implementiert |
| 4 | Bottom Sheet öffnet sich beim Antippen des Avatars | ✅ PASS |
| 5 | Sheet enthält: Name + E-Mail, "Mein Profil", "Konten", "Über NOUS", "Abmelden" | ❌ FAIL — "Mein Profil" fehlt, zeigt "Einstellungen" |
| 6 | "Mein Profil" → /einstellungen?tab=profil | ❌ FAIL — Link geht zu /einstellungen (kein Tab) |
| 7 | "Konten" → /einstellungen?tab=konten | ✅ PASS |
| 8 | "Über NOUS" → /about | ✅ PASS |
| 9 | "Abmelden" → logout() mit Bestätigung | ❌ FAIL — kein Bestätigungs-Dialog, direkt logout() |
| 10 | Sheet schließt sich beim Navigieren automatisch | ✅ PASS (onClick={onClose}) |
| 11 | Avatar-Bild wird gecacht (keine Flickering) | N/A — kein Profilbild implementiert |

**Bestanden: 6/10 (11 nicht anwendbar)**

### Bugs

**HIGH — Avatar-Upload nicht implementiert**
- Spec: Upload zu Supabase Storage Bucket `avatars`, max 2MB, JPEG/PNG/WebP
- Ist: Kein Upload-Feld in Einstellungen; `profiles.avatar_url` DB-Feld fehlt; immer Initialen-Anzeige
- Schritte: /einstellungen öffnen → kein Profilbild-Upload vorhanden

**MEDIUM — "Mein Profil" fehlt, falscher Link**
- Spec: Menüpunkt "Mein Profil" → /einstellungen?tab=profil
- Ist: Menüpunkt heißt "Einstellungen" und zeigt auf /einstellungen (kein ?tab=profil)
- Datei: `src/components/layout/ProfileSheet.tsx:26`

**LOW — Kein Logout-Bestätigungs-Dialog**
- Spec: "Abmelden → logout() mit Bestätigung"
- Ist: Direktes logout() ohne Bestätigung
- Datei: `src/components/layout/ProfileSheet.tsx:20-23`

**LOW — Initialen-Quelle ist account name statt display_name**
- Spec: "zeigt erste(n) Buchstaben des display_name"
- Ist: Initialen aus `activeAccount.name` (Kontoname), Fallback auf E-Mail-Initial
- Datei: `src/components/layout/MobileHeader.tsx:12`

---

## QA Re-Test — 2026-05-04 (nach Fixes)

**Fixes geprüft:**
- ✅ FIXED — "Mein Profil" → /einstellungen?tab=profil (war "Einstellungen" → /einstellungen)
- ✅ FIXED — Logout-Bestätigungs-Dialog via AlertDialog implementiert
- ✅ FIXED — Initialen jetzt aus display_name via /api/profile (MobileHeader + ProfileSheet)
- ✅ FIXED — Avatar-Upload implementiert (POST + DELETE `/api/profile/avatar`, Supabase Storage Bucket `avatars`, `profiles.avatar_url` DB-Feld, Upload-UI in `/einstellungen?tab=profil`)

**Status: APPROVED — alle Bugs behoben**

| # | Kriterium | Status |
|---|-----------|--------|
| 3 | Profilbild hochladen (Supabase Storage, max 2MB) | ✅ PASS (gefixt) |
| 5 | Sheet: "Mein Profil" vorhanden | ✅ PASS (gefixt) |
| 6 | "Mein Profil" → /einstellungen?tab=profil | ✅ PASS (gefixt) |
| 9 | Abmelden mit Bestätigung | ✅ PASS (gefixt) |
| 2 | Initialen aus display_name | ✅ PASS (gefixt) |

## Deployment

- **Production URL:** https://www.getnous.de
- **Deployed:** 2026-05-04
- **Vercel:** Auto-deployed via push to main

---

## Implementation Notes

- `src/app/api/profile/avatar/route.ts` — POST upload (FormData, 2MB limit, JPEG/PNG/WebP), DELETE remove
- `src/app/api/profile/route.ts` — GET already returns `avatar_url`
- `src/app/(app)/einstellungen/page.tsx` — ProfilTab has upload UI with preview, "Bild hochladen"/"Bild ändern", "Entfernen" button
- `src/components/layout/MobileHeader.tsx` — fetches and displays avatar from `/api/profile`
- `src/components/layout/ProfileSheet.tsx` — renders avatar in sheet header
- Supabase: `profiles.avatar_url` TEXT NULLABLE, `avatars` bucket (public) with per-user RLS policies
