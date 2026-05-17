export const metadata = { title: 'Datenschutz – NOUS' }

export default function DatenschutzPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-blue)' }}>Rechtliches</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg-1)' }}>Datenschutzerklärung</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--fg-3)' }}>
          Letzte Aktualisierung: April 2026 (Platzhalter — wird vor Go-Live finalisiert)
        </p>
      </div>

      {[
        {
          title: '1. Verantwortlicher',
          text: `NOUS Trading GmbH, Musterstraße 42, 80331 München, Deutschland.
Kontakt: hello@nous.trading`
        },
        {
          title: '2. Welche Daten wir speichern',
          text: `Wir speichern ausschließlich Daten, die du aktiv eingibst oder die für den Betrieb der Plattform technisch notwendig sind:

• Authentifizierungsdaten (E-Mail-Adresse, verschlüsseltes Passwort)
• Trade-Daten: Alle Informationen, die du beim Erfassen eines Trades eingibst
• Screenshots und Chartlinks, die du hochlädst
• Konten und Strategie-Einstellungen
• KI-Analysen, die auf Basis deiner Trades generiert werden
• Optional: Push-Notification-Subscription (Browser-seitig generierter Token)
• Optional: Eigener API-Schlüssel (verschlüsselt in deiner Datenbankzeile)

Wir speichern keine Cookies für Tracking-Zwecke, keine Browserdaten und keine Verhaltensdaten.`
        },
        {
          title: '3. Zweck der Datenverarbeitung',
          text: `Deine Daten werden ausschließlich verwendet, um dir die NOUS-Plattform bereitzustellen:

• Authentifizierung und Kontoverwaltung
• Anzeige deiner Trades, Statistiken und KI-Analysen
• Berechnung von Risikoparametern
• Versand von Push-Benachrichtigungen (nur wenn aktiviert)
• KI-Analyse über Anthropic API (nur deine Trade-Daten, anonymisiert als Prompt)

Eine Weitergabe deiner Daten an Dritte zu Werbezwecken findet nicht statt.`
        },
        {
          title: '4. Technische Infrastruktur',
          text: `Wir nutzen folgende Drittanbieter für den Betrieb:

• Supabase (Datenbank & Auth): Daten werden auf EU-Servern (eu-west-1) gespeichert. Datenschutzinfos: supabase.com/privacy
• Vercel (Hosting): Edge-Computing in Europa. Datenschutzinfos: vercel.com/legal/privacy-policy
• Anthropic (KI-Analyse): Deine Trade-Daten werden als API-Prompt übermittelt und nicht für Modelltraining verwendet. Datenschutzinfos: anthropic.com/privacy`
        },
        {
          title: '5. Deine Rechte (DSGVO)',
          text: `Du hast folgende Rechte bezüglich deiner gespeicherten Daten:

• Auskunft (Art. 15 DSGVO): Welche Daten wir über dich haben
• Berichtigung (Art. 16 DSGVO): Korrektur falscher Daten
• Löschung (Art. 17 DSGVO): Vollständige Löschung deines Kontos und aller Daten
• Datenportabilität (Art. 20 DSGVO): Export aller deiner Daten als CSV/JSON (verfügbar in Einstellungen → Konten → Daten exportieren)

Anfragen an: hello@nous.trading`
        },
        {
          title: '6. Datenlöschung',
          text: `Du kannst dein Konto jederzeit in den Einstellungen löschen. Alle personenbezogenen Daten werden innerhalb von 30 Tagen unwiderruflich gelöscht. Backups werden innerhalb von 90 Tagen überschrieben.`
        },
        {
          title: '7. Sicherheit',
          text: `Wir setzen folgende Sicherheitsmaßnahmen ein:

• TLS/HTTPS-Verschlüsselung für alle Übertragungen
• Row Level Security (RLS) auf Datenbankebene: Jeder Nutzer sieht nur seine eigenen Daten
• Passwörter werden gesalted und gehasht (Supabase Auth)
• Eigene API-Schlüssel werden verschlüsselt gespeichert`
        },
      ].map(section => (
        <section key={section.title} className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{section.title}</p>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--fg-3)' }}>{section.text}</p>
        </section>
      ))}
    </div>
  )
}
