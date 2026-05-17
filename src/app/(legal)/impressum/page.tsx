export const metadata = { title: 'Impressum – NOUS' }

export default function ImpressumPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-blue)' }}>Rechtliches</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg-1)' }}>Impressum</h1>
      </div>

      <section className="space-y-2 text-sm" style={{ color: 'var(--fg-2)' }}>
        <p className="font-semibold" style={{ color: 'var(--fg-1)' }}>Angaben gemäß § 5 TMG</p>
        <p>NOUS Trading GmbH<br />
        Musterstraße 42<br />
        80331 München<br />
        Deutschland</p>
      </section>

      <section className="space-y-2 text-sm" style={{ color: 'var(--fg-2)' }}>
        <p className="font-semibold" style={{ color: 'var(--fg-1)' }}>Vertreten durch</p>
        <p>Tobias Meier (Geschäftsführer)</p>
      </section>

      <section className="space-y-2 text-sm" style={{ color: 'var(--fg-2)' }}>
        <p className="font-semibold" style={{ color: 'var(--fg-1)' }}>Kontakt</p>
        <p>E-Mail: hello@nous.trading<br />
        Web: nous.trading</p>
      </section>

      <section className="space-y-2 text-sm" style={{ color: 'var(--fg-2)' }}>
        <p className="font-semibold" style={{ color: 'var(--fg-1)' }}>Handelsregister</p>
        <p>Registergericht: Amtsgericht München<br />
        Registernummer: HRB 000000 (Platzhalter — wird nach Eintragung aktualisiert)</p>
      </section>

      <section className="space-y-2 text-sm" style={{ color: 'var(--fg-2)' }}>
        <p className="font-semibold" style={{ color: 'var(--fg-1)' }}>Umsatzsteuer-ID</p>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br />
        DE000000000 (Platzhalter — wird nach Zuteilung ergänzt)</p>
      </section>

      <section className="space-y-2 text-sm" style={{ color: 'var(--fg-2)' }}>
        <p className="font-semibold" style={{ color: 'var(--fg-1)' }}>Haftung für Inhalte</p>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
          allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
          zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </section>

      <section className="space-y-2 text-sm" style={{ color: 'var(--fg-2)' }}>
        <p className="font-semibold" style={{ color: 'var(--fg-1)' }}>Kein Finanzberatungs-Disclaimer</p>
        <p>
          NOUS ist ein Werkzeug zur persönlichen Trading-Dokumentation und Analyse. Die Inhalte der Plattform
          stellen keine Anlageberatung, Finanzberatung oder Empfehlung zum Kauf oder Verkauf von
          Finanzinstrumenten dar. Trading ist mit erheblichem Risiko verbunden. Vergangene Performance
          ist kein verlässlicher Indikator für zukünftige Ergebnisse.
        </p>
      </section>

      <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Stand: April 2026 — Platzhalter, wird vor Go-Live mit echten Daten befüllt.</p>
    </div>
  )
}
