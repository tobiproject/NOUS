# PROJ-39 · Tradingplan

**Status:** Planned  
**Erstellt:** 2026-05-14  
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
