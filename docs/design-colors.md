# NOUS — Farben-Konzept (verbindlich)

## Hintergründe
| Token | Hex | Verwendung |
|-------|-----|------------|
| `--bg-0` | `#0a0a0a` | Tiefster Hintergrund, Modal-Overlays |
| `--bg-1` | `#111111` | Seiten-Hintergrund |
| `--bg-2` | `#1a1a1a` | Cards, Panels (primäre Container) |
| `--bg-3` | `#242424` | Elevated Cards, Dropdowns, Hover-State |
| `--bg-4` | `#2e2e2e` | Aktiver Hover, Pressed States |

## Text-Hierarchie
| Token | Hex | Verwendung |
|-------|-----|------------|
| `--fg-1` | `#e0e0e0` | Primärtext: Überschriften, wichtige Werte |
| `--fg-2` | `#b8b8b8` | Sekundärtext: Labels, beschreibende Texte |
| `--fg-3` | `#787878` | Tertiärtext: Hints, Zeitstempel |
| `--fg-4` | `#4f4f4f` | Sehr gedämpft: Platzhalter, inaktive Elemente |

## Semantische Farben
| Token | Hex | Verwendung |
|-------|-----|------------|
| `--brand-orange` | `#ff8210` | **Nur für**: Aktive Nav, primäre CTA-Buttons, Brand-Highlights |
| `--brand-blue` | `#2962FF` | Workflow-Fortschritt, abgeschlossene Schritte, sekundäre Aktionen, Info |
| `--long` | `#089981` | Gewinn, Long-Trade, positive Werte, Erfolg |
| `--short` | `#F23645` | Verlust, Short-Trade, negative Werte, Fehler |
| `--warn` | `#FF9800` | Achtung, ausstehende Zustände, neutrale Warnung |

## Borders
| Token | Hex | Verwendung |
|-------|-----|------------|
| `--border-raw` | `#282828` | Standard-Border aller Cards/Panels |
| `--border-strong` | `#383838` | Betonte Border, Fokus-Ring |

## Farb-Regeln (verbindlich)
1. **Orange** → nur für primäre Aktionen und Brand (aktive Nav, CTAs, Alerts die Aktion erfordern)
2. **Blau** → Status, Fortschritt, abgeschlossene Workflow-Schritte, Info-Anzeigen
3. **Niemals Orange für reine Information** — nur wenn der Nutzer etwas tun soll
4. **Grün/Rot** → ausschließlich finanziell (Gewinn/Verlust, Long/Short)
5. **Cards** → immer `--bg-2` mit `1px solid --border-raw` — kein abweichender Hintergrund
6. **Hover auf Cards/Buttons** → `--bg-3`
7. **Kein Blaustich** — alle Hintergründe sind neutral-grau (kein HSL-Farbstich)
