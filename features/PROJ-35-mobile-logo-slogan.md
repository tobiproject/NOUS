# PROJ-35 — Mobile Header Logo mit Slogan

**Status:** In Review  
**Created:** 2026-05-04  
**Dependencies:** PROJ-31 (Mobile Responsive), PROJ-32 (Mobile Profile Header)

---

## Overview

Der mobile Header zeigt aktuell nur den Text "NOUS". Er soll durch das offizielle SVG-Logo mit Slogan "Turn data into decisions" ersetzt werden — größer und markanter als der aktuelle Wordmark.

---

## User Stories

1. Als Nutzer sehe ich auf Mobile oben links das NOUS-Logo mit dem Slogan, damit die App-Identität professionell und einheitlich wirkt.
2. Als Nutzer ist das Logo größer als der Greeting-Text ("Guten Morgen Tobi") auf der Seite.

---

## Acceptance Criteria

- [ ] SVG-Logo (bereitgestellt: NOUS + "Turn data into decisions") ist als `public/logo.svg` oder React-Komponente eingebunden
- [ ] Logo erscheint nur auf Mobile (md:hidden)
- [ ] Logo-Höhe: ca. 28–32px, Breite proportional
- [ ] Slogan ist lesbar aber dezenter als NOUS-Wordmark (kleinere Schrift, niedrigere Opacity)
- [ ] Auf Desktop ändert sich nichts (Sidebar bleibt unverändert)
- [ ] Logo ist nicht klickbar (kein Link)

---

## Edge Cases

- Sehr schmales Gerät (320px) → Logo skaliert nach unten, kein Overflow
- Slogan-Text bei kleinen Screens → ggf. ausblenden unter 360px Breite

---

## Tech Notes

- SVG wird bereinigt (viewBox korrekt, fill=currentColor für Theme-Kompatibilität)
- Als `<Image>` aus Next.js oder inline SVG-Komponente
- Ersetzt den aktuellen `<span>NOUS</span>` im MobileHeader

---

## QA Test Results — 2026-05-04

**Tester:** QA Engineer  
**Status: READY — alle Kernkriterien bestanden, 1 Low Bug**

### Acceptance Criteria

| # | Kriterium | Status |
|---|-----------|--------|
| 1 | SVG-Logo als public/logo/nous-logo-slogan.svg eingebunden | ✅ PASS |
| 2 | Logo erscheint nur auf Mobile (md:hidden) | ✅ PASS |
| 3 | Logo-Höhe: ca. 28–32px | ⚠️ LOW — Höhe ist 34px (leichte Abweichung) |
| 4 | Slogan lesbar, dezenter als Wordmark | ✅ PASS (im SVG integriert) |
| 5 | Auf Desktop ändert sich nichts | ✅ PASS |
| 6 | Logo ist nicht klickbar (kein Link) | ✅ PASS (nur `<Image>`, kein Link) |

**Bestanden: 5/6**

### Bugs

**LOW — Logo-Höhe 34px (Spec: 28–32px)**
- Datei: `src/components/layout/MobileHeader.tsx:29`
- Ist: `height={34}`, Spec sagt "ca. 28–32px"
- Auswirkung: Minimal, rein kosmetisch
