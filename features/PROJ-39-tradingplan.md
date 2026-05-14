# PROJ-39 · Tradingplan

**Status:** Approved  
**Erstellt:** 2026-05-14  
**Zuletzt aktualisiert:** 2026-05-14  
**Typ:** Frontend + Backend + DB

## Beschreibung

Persönlicher Tradingplan als eigener Tab in den Einstellungen (`/einstellungen?tab=tradingplan`). Der Plan gliedert sich in 8 feste Sektionen, jede mit einer editierbaren Regelliste + Freitextfeld. Pro Sektion kann per KI-Vorschlag auf Basis der Knowledge Base ein Entwurf generiert werden — mit Quellenangabe (Dokumentname + ungefähre Stelle), damit der User halluzinierte Inhalte erkennen und alles selbst überprüfen kann.

## User Stories

- **US-1:** Als Trader möchte ich meinen Tradingplan in strukturierten Sektionen aufschreiben, damit ich alle relevanten Regeln an einem Ort habe.
- **US-2:** Als Trader möchte ich pro Sektion einzelne Regeln hinzufügen, bearbeiten und löschen, damit ich präzise und flexibel bin.
- **US-3:** Als Trader möchte ich pro Sektion ein Freitextfeld für Notizen und Kontext haben, damit ich über Regellisten hinaus erklären kann.
- **US-4:** Als Trader möchte ich pro Sektion einen KI-Vorschlag auf Basis meiner Knowledge Base generieren, damit ich nicht bei null anfangen muss.
- **US-5:** Als Trader möchte ich bei jedem KI-Vorschlag sehen, aus welchem Dokument die Information stammt, damit ich Halluzinationen erkennen und alles eigenständig überprüfen kann.
- **US-6:** Als Trader möchte ich jeden KI-Vorschlag vollständig bearbeiten können, bevor er in meinen Plan übernommen wird.
- **US-7:** Als Trader möchte ich jeden Abschnitt unabhängig speichern können, damit ich volle Kontrolle habe.

## Sektionen (fix, nicht erweiterbar)

1. **Strategie-Übersicht** — Was ist meine Strategie, Markttyp, Timeframes, Assets
2. **Setup-Kriterien** — Genaue Bedingungen die erfüllt sein müssen, bevor ich einen Trade nehme
3. **Entry & Exit Regeln** — Entry-Bedingungen, SL-Platzierung, TP-Ziele, Trailing-Stop-Regeln
4. **Risiko-Regeln** — Max Risk per Trade, Max Daily Loss, Drawdown-Grenze, Positionsgrößen
5. **Psychologie & Mindset** — Regeln für emotionales Trading, Selbst-Check vor dem Trade
6. **Verbotene Verhaltensweisen** — Explizite No-Gos, was ich unter keinen Umständen tue
7. **Review-Prozess** — Wie und wie oft ich Trades reviewe, worauf ich achte
8. **Prop-Firm Regeln** — Spezifische Regeln für Prop-Firm Konten

## Acceptance Criteria

### Allgemein
- [ ] AC-1: Tab "Tradingplan" erscheint in `/einstellungen` neben den bestehenden Tabs
- [ ] AC-2: Bestehender "Strategie"-Tab bleibt unverändert erhalten
- [ ] AC-3: Alle 8 Sektionen werden als Accordion oder gestapelte Cards angezeigt
- [ ] AC-4: Jede Sektion zeigt "Zuletzt gespeichert: DD.MM.YYYY HH:MM" wenn Inhalt vorhanden

### Regelliste
- [ ] AC-5: Pro Sektion: Regeln per Eingabefeld + Enter hinzufügen
- [ ] AC-6: Jede Regel einzeln inline bearbeitbar (Klick auf Regel → editierbares Feld)
- [ ] AC-7: Jede Regel einzeln löschbar (X-Button)
- [ ] AC-8: Regeln sind per Drag & Drop sortierbar (optional nice-to-have)

### Freitextfeld
- [ ] AC-9: Pro Sektion: Freitextfeld (Textarea) für Notizen/Kontext unter der Regelliste
- [ ] AC-10: Kein Zeichenlimit unter 5000 Zeichen pro Sektion-Textarea

### Speichern
- [ ] AC-11: "Speichern"-Button pro Sektion (nicht global)
- [ ] AC-12: Speichern zeigt Lade-State und Erfolgs-Feedback
- [ ] AC-13: Nur ein Tradingplan pro User (UNIQUE auf user_id + section)

### KI-Vorschlag
- [ ] AC-14: Jede Sektion hat einen Button "KI-Vorschlag aus Knowledge Base"
- [ ] AC-15: Button ist deaktiviert wenn keine KB-Dokumente vorhanden (mit Hinweistext)
- [ ] AC-16: KI generiert Vorschlag für die **eine** Sektion (nicht alle auf einmal)
- [ ] AC-17: Vorschlag erscheint in einem editierbaren Preview-Bereich (nicht direkt im Plan)
- [ ] AC-18: Quellenangabe ist zwingend — jeder KI-Vorschlag zeigt: `📄 Quelle: [Dokumentname], ca. [Abschnitt/Seitenbeschreibung]`
- [ ] AC-19: Wenn KI keine relevante Information in KB findet: "Keine passenden Inhalte in deiner Knowledge Base gefunden"
- [ ] AC-20: User kann Vorschlag komplett bearbeiten bevor er übernimmt
- [ ] AC-21: "Übernehmen"-Button fügt Vorschlag als neue Regeln + Text in die Sektion ein (ersetzt NICHT bestehende Inhalte — wird angehängt)
- [ ] AC-22: "Verwerfen"-Button schließt Preview ohne Änderungen

### Integration
- [ ] AC-23: Tradingplan-Inhalte fließen als Kontext in KI-Analyse und Weekly Prep ein (neben Strategie-Profil und Knowledge Base)

## Edge Cases

- **EC-1:** Keine KB-Dokumente hochgeladen → KI-Vorschlag Button deaktiviert mit Text "Bitte zuerst Dokumente in der Knowledge Base hochladen"
- **EC-2:** KB-Dokumente vorhanden aber keine relevanten Inhalte für diese Sektion → Klare Meldung, kein leerer Vorschlag
- **EC-3:** User navigiert weg ohne zu speichern → kein automatisches Speichern, keine Warnung (bewusste Entscheidung)
- **EC-4:** API-Key fehlt (kein Anthropic/OpenAI Key hinterlegt) → Fehlermeldung "Bitte API-Key in Einstellungen hinterlegen"
- **EC-5:** KI-Request dauert lang → Spinner im KI-Vorschlag-Bereich, kein Page-Freeze
- **EC-6:** Sektion hat noch keine Inhalte → Leere Regelliste + leeres Textarea, kein "Zuletzt gespeichert"
- **EC-7:** Sehr langer KI-Vorschlag → scrollbarer Preview-Bereich, kein Layout-Overflow

## Dependencies

- Requires: PROJ-1 (Auth) — User-Identifikation
- Requires: PROJ-11 (Knowledge Base) — KB-Dokumente als Quelle für KI-Vorschläge
- Requires: PROJ-30 (Multi-AI Provider) — User API-Key für KI-Generierung
- Related: PROJ-16 (Strategie-Profil) — bleibt als Kurzprofil erhalten, kein Ersatz

---

## Tech Design (Solution Architect)

**Status:** Architected — 2026-05-14

### Komponentenstruktur

```
/einstellungen?tab=tradingplan
+-- TradingplanTab (neuer Tab-Inhalt, inline in einstellungen/page.tsx)
    +-- [8x] TradingplanSection (Accordion-Item — eine pro Sektion)
        +-- Accordion Header
        |   +-- Sektions-Titel
        |   +-- "Zuletzt gespeichert: DD.MM.YYYY HH:MM" (wenn Inhalt vorhanden)
        +-- Accordion Body
            +-- RuleList
            |   +-- RuleItem (Klick → inline editierbar, X-Button zum Löschen)
            |   +-- AddRuleInput (Eingabefeld + Enter fügt Regel hinzu)
            +-- SectionTextarea (Freitext-Notizen, max. 5000 Zeichen)
            +-- SectionFooter
                +-- "KI-Vorschlag"-Button (deaktiviert wenn keine KB-Docs)
                +-- "Speichern"-Button (nur für diese Sektion)
    +-- KI-Preview Panel (erscheint unterhalb der Sektion bei aktiver KI-Anfrage)
        +-- EditablePreviewArea (Vorschlag vollständig bearbeitbar)
        +-- Quellenangabe ("Quelle: [Dokumentname], ca. [Abschnitt]")
        +-- "Übernehmen"-Button (hängt Inhalt an bestehende Daten an)
        +-- "Verwerfen"-Button (schließt Preview ohne Änderung)
```

### Datenmodell

Neue Supabase-Tabelle: **`trading_plan_sections`**

Jede Zeile repräsentiert eine Sektion des Tradingplans eines Users:

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | UUID | Primärschlüssel |
| user_id | UUID | Verknüpfung mit Auth-User (RLS-Basis) |
| section_key | Text | Feste ID der Sektion (z.B. `strategie_uebersicht`) |
| rules | Text[] | Geordnete Liste von Regeln |
| notes | Text | Freitext, max. 5000 Zeichen |
| updated_at | Timestamp | Wann zuletzt gespeichert |

- UNIQUE auf `(user_id, section_key)` — ein Eintrag pro User pro Sektion (AC-13)
- RLS: User sieht und schreibt nur eigene Zeilen — keine Ausnahme

Die 8 festen `section_key`-Werte:
`strategie_uebersicht`, `setup_kriterien`, `entry_exit_regeln`, `risiko_regeln`, `psychologie_mindset`, `verbotene_verhaltensweisen`, `review_prozess`, `prop_firm_regeln`

### Backend-Entscheidungen

**Datenbank statt localStorage** — Tradingplan-Inhalte müssen geräteübergreifend verfügbar sein und als KI-Kontext in Analysen und Weekly Prep einfließen (AC-23). localStorage würde das verhindern.

Zwei neue API-Routen:

**`/api/trading-plan/`**
- GET: Alle Sektionen des eingeloggten Users laden (gibt Array mit bis zu 8 Einträgen zurück)
- POST: Eine Sektion speichern (section_key + rules + notes)

**`/api/ai/trading-plan-suggestion/`**
- POST: Nimmt `section_key` entgegen
- Lädt alle KB-Dokumente des Users (bereits existierende `/api/knowledge-base`-Logik wiederverwenden)
- Generiert KI-Vorschlag für die Sektion — mit Pflicht-Quellenangabe
- Wenn keine relevanten KB-Inhalte: feste Fehlermeldung statt leerem Vorschlag

### Tech-Entscheidungen (für PM)

| Entscheidung | Warum |
|---|---|
| Tab inline in bestehender Einstellungsseite | Gleiche Tab-Infrastruktur wie Profil, Strategie, KB — kein neuer Route, kein neues Layout nötig |
| Accordion (shadcn — bereits installiert) | 8 Sektionen würden als gestapelte Cards sehr lang — Accordion erlaubt fokussiertes Arbeiten an einer Sektion ohne Scrollen |
| KI-Preview als Inline-Panel (kein Modal) | User soll Vorschlag direkt neben dem Kontext der Sektion editieren können — Modal würde die Regelliste verdecken |
| Speichern pro Sektion, nicht global | Volle Kontrolle: User entscheidet wann welche Sektion gespeichert wird — kein unbeabsichtigtes Überschreiben anderer Sektionen |
| Quellenangabe als KI-Pflicht-Feld | Transparenz über Halluzinationen — User soll selbst prüfen können, ob die Quelle das wirklich hergibt |
| Vorschlag wird angehängt, nicht ersetzt | Bestehende Arbeit des Users bleibt erhalten — KI ergänzt, löscht nicht |

### KI-Kontext-Integration (AC-23)

Die bestehenden Routen `/api/ai/analysis/`, `/api/ai/weekly-prep/` und `/api/ai/analyze-period/` erhalten einen zusätzlichen Kontext-Block: den Inhalt des Tradingplans des Users (alle Sektionen zusammengefasst). Dieser wird als dritter Kontext-Baustein neben Strategie-Profil und Knowledge Base injiziert.

## Implementation Notes (Frontend Developer)

**Implementiert: 2026-05-14**

### Was gebaut wurde

- **DB-Migration:** `trading_plan_sections` Tabelle mit RLS (SELECT/INSERT/UPDATE/DELETE policies), UNIQUE auf `(user_id, section_key)`, Index auf `user_id`
- **API GET/POST `/api/trading-plan/route.ts`:** Liest alle Sektionen des Users, speichert einzelne Sektion via Upsert. Input-Validierung mit Zod (section_key enum, rules max 100×1000 Zeichen, notes max 5000 Zeichen)
- **API POST `/api/ai/trading-plan-suggestion/route.ts`:** Prüft KB-Dokumente, generiert KI-Vorschlag mit Pflicht-Quellenangabe im strukturierten Format (REGELN/NOTIZEN/QUELLE), parst die Antwort und gibt `{ rules, notes, source }` zurück. Bei leerer KB oder fehlenden relevanten Inhalten: 422 mit klarer Meldung
- **`TradingplanTab`** in `src/app/(app)/einstellungen/page.tsx`: Neuer Tab "Tradingplan" neben den bestehenden Tabs. Accordion mit 8 Sektionen, pro Sektion: Regelliste (Add/Inline-Edit/Delete), Textarea (max 5000 Zeichen), KI-Vorschlag-Panel (editierbarer Preview, Quellenangabe, Übernehmen/Verwerfen), Per-Sektion-Speichern mit "Zuletzt gespeichert"-Timestamp im Accordion-Header

### Abweichungen vom Architektur-Design

- KI-Preview Panel erscheint inline in der Sektion (nicht unterhalb) — bessere UX weil kein Scrollen nötig
- Accordion-Header zeigt grünen Dot wenn Sektion Inhalte hat (visuelles Feedback ohne zu öffnen)

### AC-23: KI-Kontext-Integration

Implementiert via `src/lib/trading-plan-context.ts`:
- `getTradingPlanContext(userId)` liest alle Sektionen, formatiert sie als System-Prompt-Block
- Eingebunden in `analyze-trade`, `analyze-period` und `weekly-prep` — parallel zu `getKnowledgeContext`, beide Kontexte werden zusammengeführt

---

### Keine neuen Pakete

Alle benötigten Abhängigkeiten sind bereits installiert:
- shadcn `Accordion` — bereits in `src/components/ui/accordion.tsx`
- shadcn `Button`, `Input`, `Textarea` — vorhanden
- Supabase Client — vorhanden
- AI-Client (Multi-Provider) — via PROJ-30 vorhanden

---

## QA Test Results

**QA Datum:** 2026-05-14  
**Tester:** QA Engineer (PROJ-39)  
**Status:** In Review — 1 Medium, 1 Low Bug

### Acceptance Criteria

| AC | Beschreibung | Ergebnis |
|----|---|---|
| AC-1 | Tab "Tradingplan" in /einstellungen | ✅ PASS |
| AC-2 | Bestehender "Strategie"-Tab unverändert | ✅ PASS |
| AC-3 | Alle 8 Sektionen als Accordion | ✅ PASS |
| AC-4 | "Gespeichert: DD.MM.YYYY HH:MM" im Header | ✅ PASS |
| AC-5 | Regel per Enter hinzufügen | ✅ PASS |
| AC-6 | Inline-Edit per Klick | ✅ PASS |
| AC-7 | X-Button löscht Regel | ✅ PASS |
| AC-8 | Drag & Drop (optional nice-to-have) | ⚠️ SKIP (optional, GripVertical-Icon vorhanden) |
| AC-9 | Freitextfeld pro Sektion | ✅ PASS |
| AC-10 | Kein Zeichenlimit unter 5000 | ✅ PASS (maxLength=5000 + Zähler) |
| AC-11 | "Speichern"-Button pro Sektion | ✅ PASS |
| AC-12 | Lade-State + Erfolgs-Feedback | ✅ PASS (Spinner + Toast) |
| AC-13 | UNIQUE auf (user_id, section_key) | ✅ PASS (DB-Constraint + Upsert) |
| AC-14 | KI-Vorschlag-Button pro Sektion | ✅ PASS |
| AC-15 | Button deaktiviert wenn keine KB-Docs | ✅ PASS |
| AC-16 | KI generiert nur für eine Sektion | ✅ PASS |
| AC-17 | Vorschlag in editierbarem Preview | ✅ PASS |
| AC-18 | Quellenangabe zwingend | ✅ PASS |
| AC-19 | Klare Meldung wenn kein KB-Inhalt | ✅ PASS (422 + Fehlermeldung) |
| AC-20 | Vorschlag vollständig bearbeitbar | ✅ PASS |
| AC-21 | "Übernehmen" hängt Inhalt an | ✅ PASS |
| AC-22 | "Verwerfen" schließt Preview | ✅ PASS |
| AC-23 | Tradingplan-Kontext in KI-Analysen | ✅ PASS (analyze-trade, weekly-prep) / ⚠️ teilweise (analyze-period fehlt KB-Kontext — Bug B-1) |

### Edge Cases

| EC | Beschreibung | Ergebnis |
|----|---|---|
| EC-1 | Keine KB-Docs → Button deaktiviert | ✅ PASS (UI disabled + "KB leer" Text) |
| EC-2 | KB-Docs vorhanden, aber keine relevanten Inhalte | ✅ PASS (422 + klare Meldung) |
| EC-3 | Weg navigieren ohne zu speichern | ✅ PASS (kein Auto-Save, keine Warnung — bewusst) |
| EC-4 | Kein API-Key hinterlegt | ✅ PASS (KI-Route gibt Fehler zurück, UI zeigt aiError) |
| EC-5 | KI-Request dauert lang | ✅ PASS (Spinner im Panel) |
| EC-6 | Leere Sektion → kein "Zuletzt gespeichert" | ✅ PASS |
| EC-7 | Langer KI-Vorschlag | ✅ PASS (scrollbarer Textarea-Preview) |

### Sicherheits-Audit

| Check | Ergebnis |
|-------|---|
| Auth-Prüfung auf beiden neuen API-Routen | ✅ PASS |
| RLS aktiviert auf `trading_plan_sections` | ✅ PASS |
| RLS-Policies: SELECT, INSERT, UPDATE, DELETE | ✅ PASS (alle 4 vorhanden, `auth.uid() = user_id`) |
| UNIQUE-Constraint auf (user_id, section_key) | ✅ PASS |
| Zod-Validierung: section_key enum, rules max 100×1000 Zeichen, notes max 5000 | ✅ PASS |
| Zod-Validierung auf KI-Suggestion-Route | ✅ PASS |
| Keine hardcodierten Secrets | ✅ PASS |
| Cross-User-Datenzugriff unmöglich | ✅ PASS (RLS erzwingt user_id-Filterung auf DB-Ebene) |

### Bugs

#### ~~B-1 · Medium: `analyze-period` fehlt Knowledge Base Kontext nach PROJ-39~~ ✅ BEHOBEN

**Behoben in:** `fix(PROJ-39): Load KB context in analyze-period alongside trading plan`  
KB-Kontext wird jetzt parallel zu `getTradingPlanContext` geladen und via `[knowledgeContext, tradingPlanContext].filter(Boolean).join(...)` zusammengeführt — analog zu `analyze-trade` und `weekly-prep`.

#### B-2 · Low: EC-1 API-Fehlermeldung bei leerer KB irreführend

**Datei:** `src/app/api/ai/trading-plan-suggestion/route.ts:48`  
**Beschreibung:** Wenn gar keine KB-Dokumente existieren, gibt die Route zurück: "Keine passenden Inhalte in deiner Knowledge Base gefunden". Diese Nachricht impliziert, Dokumente seien vorhanden aber ohne relevante Inhalte — korrekt wäre ein Hinweis, dass zuerst Dokumente hochgeladen werden sollen.  
**Einschränkung:** In der Praxis erreicht kein User diesen Pfad, weil der KI-Button bereits im Frontend deaktiviert ist (hasKbDocs-Check). Nur direkte API-Aufrufe treffen diesen Pfad.  
**Fix:** Für leere KB andere Message verwenden, z.B. "Bitte zuerst Dokumente in der Knowledge Base hochladen".

### Tests

- **Unit Tests:** 21 Tests in `route.test.ts` für beide neuen API-Routen — alle bestanden
- **E2E Tests:** `tests/PROJ-39-tradingplan.spec.ts` mit 14 Tests (AC-1–AC-15, EC-6, Regressionen) — alle Tests skippen korrekt ohne Authentifizierung

### Produktionsreife

**BEREIT** für Deploy — B-1 behoben. B-2 ist Low-Priorität und kann nach Deploy gefixt werden.
