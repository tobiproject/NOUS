# NOUS — Design System (verbindlich)

> Dieses Dokument ist die einzige Quelle für alle Design-Entscheidungen.  
> Jeder Agent MUSS diese Regeln einhalten. Kein Abweichen ohne explizite User-Freigabe.

---

## Typografie

### Schriftarten

| Rolle | Font | Quelle | Verwendung |
|-------|------|--------|------------|
| **UI-Font** | Space Grotesk | Google Fonts | Alle UI-Texte, Labels, Buttons, Navigation |
| **Mono-Font** | JetBrains Mono | Google Fonts | Zahlen, Ticker, Prozentwerte, Code |

### Google Fonts Import
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

### Font-Größen & Gewichte

| Rolle | Größe | Gewicht | Klasse |
|-------|-------|---------|--------|
| Basis / Body | 13px | 400 | Standard |
| Labels / UI | 12px | 500 | Labels, Eyebrows |
| Subtext / Hints | 11px | 400 | Tertiärinfo |
| Heading 4 | 15px | 600 | Card-Titel |
| Heading 3 | 18px | 700 | Section-Titel |
| Heading 2 | 22px | 700 | Page-Titel |
| Metric / KPI | 22–26px | 700 | JetBrains Mono, tabular-nums |

### Rendering
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
font-feature-settings: 'cv11', 'ss01', 'ss03';
```

---

## Farben

### Hintergründe

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--bg-0` | `#0a0a0a` | Tiefster Grund, Modal-Overlays |
| `--bg-1` | `#0d0d0d` | Seiten-Hintergrund |
| `--bg-2` | `#111111` | Sidebar-Hintergrund |
| `--bg-3` | `#161616` | Cards, Panels |
| `--bg-4` | `#1e1e1e` | Hover-State, Dropdowns |
| `--bg-5` | `#272727` | Aktiv / Pressed |

### Text-Hierarchie

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--fg-1` | `#ffffff` | Primärtext |
| `--fg-2` | `#ffffff` | Sekundärtext |
| `--fg-3` | `#ffffff` | Tertiärtext |
| `--fg-4` | `#ffffff` | Alle Texte — komplett weiß, keine Graustufen |

### Semantische Farben

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--brand-orange` | `#ff8210` | Nur für: aktive Nav, Buttons (Border), Brand |
| `--brand-blue` | `#2962FF` | Workflow-Fortschritt, Info, Metric-Linie |
| `--long` | `#089981` | Gewinn, Long-Trade, positive Werte, Erfolg |
| `--short` | `#F23645` | Verlust, Short-Trade, negative Werte, Fehler |
| `--warn` | `#FF9800` | Achtung, ausstehende Zustände |

### Borders

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--border-raw` | `rgba(255,255,255,0.07)` | Standard-Border aller Cards/Panels |
| `--border-strong` | `rgba(255,255,255,0.12)` | Betonte Border, Fokus-Ring |

---

## Cards & Container

### Standard-Card
```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.07);
border-radius: 10px;
box-shadow:
  0 2px 8px rgba(0,0,0,0.6),
  0 8px 32px rgba(0,0,0,0.3),
  inset 0 1px 0 rgba(255,255,255,0.05);
```

### Glassmorphism (für Overlays, Modals, prominente Cards)
```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.12);
border-radius: 10px;
backdrop-filter: blur(16px) saturate(160%);
-webkit-backdrop-filter: blur(16px) saturate(160%);
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.10),
  0 4px 24px rgba(0,0,0,0.4);
```
> Glassmorphism braucht Farbgradienten im Seitenhintergrund (Orbs) — sonst nicht einsetzen.

### Border-Radius — überall einheitlich
**`10px`** — gilt für: Cards, Buttons, Inputs, Dropdowns, Sidebar-Elemente, Badges, alle Container.  
Ausnahme: Tooltips, kleine Tags → `6px`.

---

## Metric-Kacheln (KPI Cards)

Metric-Kacheln bekommen eine **farbige 2px Top-Linie** die den Inhalt semantisch kennzeichnet:

| Farbe | Token | Wann |
|-------|-------|------|
| Grün | `--long` | Positiver Wert (Profit, Win Rate > 50%) |
| Rot | `--short` | Negativer Wert (Verlust, Drawdown) |
| Blau | `--brand-blue` | Info / Status / Workflow |
| Orange | `--brand-orange` | Aktiv / Offen / Aktion erforderlich |

```css
border-top: 2px solid var(--long); /* oder short / brand-blue / brand-orange */
```

---

## Buttons

### Primary — Glas + Orange Border (1px, gedimmt)
```css
background: rgba(255, 130, 16, 0.06);
border: 1px solid rgba(255, 130, 16, 0.45);
color: #ff8210;
border-radius: 10px;
backdrop-filter: blur(12px);
transition: all 0.15s ease;
```
Hover:
```css
background: rgba(255, 130, 16, 0.12);
border-color: #ff8210;
```

### Secondary — Glas, weißliche Border
```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.12);
color: #a0a0a0;
border-radius: 10px;
backdrop-filter: blur(12px);
```
Hover: `background: rgba(255,255,255,0.08); color: #f0f0f0`

### Destructive — Glas + Rote Border
```css
background: rgba(242, 54, 69, 0.07);
border: 1px solid rgba(242, 54, 69, 0.45);
color: #F23645;
border-radius: 10px;
```

### Ghost — kein Hintergrund
```css
background: transparent;
border: 1px solid transparent;
color: #606060;
border-radius: 10px;
```
Hover: `background: rgba(255,255,255,0.05); color: #f0f0f0`

---

## Farb-Regeln (verbindlich)

1. **Orange** → nur für primäre Button-Border, aktive Nav-Items, Brand-Highlights. Niemals als Hintergrundfarbe.
2. **Blau** → Workflow-Status, Fortschritt, Info-Kacheln, sekundäre Aktionen.
3. **Grün / Rot** → ausschließlich für finanzielle Werte (Profit/Verlust, Long/Short).
4. **Kein Farbstich** → alle Hintergründe sind neutral-grau, null Hue.
5. **Metric-Kacheln** → immer mit farbiger Top-Linie, nie ohne.
6. **Border-Radius** → immer `10px`, keine Ausnahmen außer Tooltips/Tags (`6px`).
7. **Schrift** → immer Space Grotesk (UI) + JetBrains Mono (Zahlen). Niemals system-font oder andere Fonts einführen.

---

## Sidebar

- Hintergrund: `--bg-2` (`#111111`) — minimal dunkler als Content-Area
- Nav-Items: `font-weight: 900` (font-black), Space Grotesk
- Aktives Item: Orange (`--brand-orange`)
- Konto-Dropdown + Strategie-Dropdown: oben links, kleine Labels
- Workflow-Ring: Interpolation rot → blau → grün (0% = grau)
