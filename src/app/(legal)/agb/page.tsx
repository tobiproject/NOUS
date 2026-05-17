export const metadata = { title: 'AGB – NOUS' }

export default function AgbPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-blue)' }}>Rechtliches</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg-1)' }}>Allgemeine Geschäftsbedingungen</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--fg-3)' }}>
          Stand: April 2026 (Platzhalter — wird vor Go-Live durch einen Rechtsanwalt finalisiert)
        </p>
      </div>

      {[
        {
          title: '§ 1 Geltungsbereich',
          text: `Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge, die zwischen der NOUS Trading GmbH (nachfolgend "NOUS" oder "Anbieter") und dem Nutzer über die Nutzung der Plattform nous.trading geschlossen werden.

Durch die Registrierung und Nutzung von NOUS erklärt der Nutzer sein Einverständnis mit diesen AGB.`
        },
        {
          title: '§ 2 Leistungsbeschreibung',
          text: `NOUS ist eine webbasierte SaaS-Plattform für Trader zur Erfassung, Analyse und Auswertung von Trades. Die Plattform umfasst je nach Tarif:

• Free Trial (14 Tage): Vollzugang zu allen Features
• Standard (€29/Monat): Journal, Dashboard, Performance, Risk Management, KI-Analyse
• Premium (€99/Monat): Alle Standard-Features plus Knowledge Base, Roadmap, Lernmodus, Watchlist

NOUS ist kein Finanzdienstleister und bietet keine Anlageberatung. Die Nutzung ersetzt keine professionelle Finanzberatung.`
        },
        {
          title: '§ 3 Vertragsschluss und Kündigung',
          text: `Der Vertrag kommt durch Registrierung und Auswahl eines Tarifs zustande. Monatsabonnements können jederzeit zum Ende des laufenden Abrechnungszeitraums gekündigt werden. Nach Kündigung bleibt der Zugang bis zum Ablauf der bezahlten Periode erhalten.`
        },
        {
          title: '§ 4 Preise und Zahlungsbedingungen',
          text: `Alle Preise verstehen sich in Euro und zzgl. der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt monatlich im Voraus per Kreditkarte oder SEPA-Lastschrift über den Zahlungsdienstleister Stripe.

Bei Zahlungsverzug behält sich NOUS vor, den Zugang zu eingeschränkten Features zu sperren.`
        },
        {
          title: '§ 5 Nutzerpflichten',
          text: `Der Nutzer verpflichtet sich:

• Keine falschen Daten bei der Registrierung anzugeben
• Den Zugang nicht an Dritte weiterzugeben
• Die Plattform nicht für rechtswidrige Zwecke zu nutzen
• Keine automatisierten Zugriffe (Scraping, Bots) durchzuführen`
        },
        {
          title: '§ 6 Datensicherung und Verfügbarkeit',
          text: `NOUS bemüht sich um eine Verfügbarkeit von 99% im Jahresdurchschnitt. Wartungsarbeiten werden nach Möglichkeit vorab angekündigt. NOUS haftet nicht für Datenverluste, die durch höhere Gewalt oder Fehler des Nutzers verursacht werden. Eine regelmäßige eigene Datensicherung über die Export-Funktion wird empfohlen.`
        },
        {
          title: '§ 7 Haftungsausschluss',
          text: `NOUS haftet nicht für:

• Handelsverluste oder entgangene Gewinne des Nutzers
• Schäden durch Fehlentscheidungen auf Basis von KI-Analysen
• Ausfälle oder Datenverluste durch Drittanbieter (Supabase, Vercel, Anthropic)
• Mittelbare oder Folgeschäden jeder Art

Die Haftung für grobe Fahrlässigkeit und Vorsatz bleibt unberührt.`
        },
        {
          title: '§ 8 Geistiges Eigentum',
          text: `Alle Rechte an der Plattform, dem Design, dem Code und den Inhalten liegen bei NOUS Trading GmbH. Der Nutzer erhält ein einfaches, nicht übertragbares Nutzungsrecht für die Dauer des Abonnements.`
        },
        {
          title: '§ 9 Anwendbares Recht',
          text: `Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für Kaufleute ist München.`
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
