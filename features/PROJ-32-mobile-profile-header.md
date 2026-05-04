# PROJ-32 — Mobile Profile Header & Avatar

**Status:** Planned  
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
