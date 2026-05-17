'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Github, Twitter } from 'lucide-react'

const VERSION = '1.0.0'
const YEAR = new Date().getFullYear()

export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-10">

      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Image src="/logo/nous-mark-white.svg" alt="NOUS" width={28} height={28} />
          <Image src="/logo/nous-wordmark-white.svg" alt="NOUS" width={72} height={18} />
        </div>
        <p className="text-sm font-medium tracking-widest uppercase" style={{ color: 'var(--brand-blue)' }}>
          More than a trading journal.
        </p>
        <h1 className="text-3xl font-bold leading-snug" style={{ color: 'var(--fg-1)' }}>
          Dein Trading-Betriebssystem.<br />
          Gebaut für Disziplin. Designed für Wachstum.
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--fg-3)' }}>
          NOUS ist nicht einfach ein weiteres Journal. Es ist das zentrale Gehirn hinter deinem Trading-Alltag —
          von der Wochenvorbereitung am Sonntagabend über die KI-gestützte Nachbereitung jedes einzelnen Trades
          bis hin zur systematischen Analyse deiner psychologischen Muster. Wer besser werden will, braucht
          Klarheit. NOUS gibt dir diese Klarheit.
        </p>
      </div>

      {/* Mission */}
      <div className="rounded-lg p-6 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand-blue)' }}>Mission</p>
        <p className="text-lg font-semibold leading-snug" style={{ color: 'var(--fg-1)' }}>
          Jeden Trader dazu bringen, seinen nächsten Trade besser zu machen als den letzten.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-3)' }}>
          Die meisten Trader scheitern nicht wegen fehlendem Wissen — sie scheitern, weil sie dieselben
          Fehler immer wieder machen, ohne es zu merken. NOUS macht diese Muster sichtbar.
          Durch konsequentes Logging, KI-Analyse und strukturierte Wochenvorbereitung entsteht
          ein Feedback-Loop, der dich Woche für Woche ein Stück besser macht.
        </p>
      </div>

      {/* Was NOUS ist */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Was NOUS kann</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { emoji: '📓', title: 'Trading Journal', desc: 'Trades erfassen, Emotionen tracken, Screenshots anhängen — alles an einem Ort.' },
            { emoji: '🧠', title: 'KI-Analyse', desc: 'Jeder Trade wird von Claude analysiert. Konkrete Patterns, Fehler, Verbesserungen.' },
            { emoji: '📊', title: 'Performance', desc: 'Win-Rate, Drawdown, Equity-Kurve, Heatmaps — deine Zahlen auf einen Blick.' },
            { emoji: '🛡️', title: 'Risk Management', desc: 'Prop-Firm-Grenzen, Tagesverlustlimits, automatische Warnungen.' },
            { emoji: '🗓️', title: 'Wochenvorbereitung', desc: 'Fokus-Assets, Ziele, KI-Marktbriefing — jeden Sonntag strukturiert vorbereitet.' },
            { emoji: '📚', title: 'Knowledge Base', desc: 'Lade deine WSI-Materialien hoch — die KI lernt deine spezifische Strategie.' },
          ].map(f => (
            <div key={f.title} className="rounded-lg p-4 space-y-1.5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{f.emoji}</span>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{f.title}</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-3)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Founder */}
      <div className="rounded-lg p-6 space-y-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Gründer</p>
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-bold"
            style={{ background: 'var(--brand-blue)', color: '#fff' }}
          >
            T
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Tobias Meier</p>
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Gründer & Entwickler</p>
            <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--fg-3)' }}>
              Trader und Entwickler aus Leidenschaft. NOUS wurde aus einem echten Problem heraus gebaut:
              zu viele Tools, zu wenig Klarheit, zu wenige datenbasierte Entscheidungen.
              Die Idee: ein Tool, das mitdenkt — nicht nur mitschreibt.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack & Version */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Tech-Stack</p>
        <div className="flex flex-wrap gap-2">
          {['Next.js 16', 'TypeScript', 'Supabase', 'Claude (Anthropic)', 'Tailwind CSS', 'shadcn/ui', 'Vercel'].map(t => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg-3)', color: 'var(--fg-3)', border: '1px solid var(--border-raw)' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4"
        style={{ borderTop: '1px solid var(--border-raw)' }}
      >
        <div className="space-y-0.5">
          <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Version {VERSION} · © {YEAR} NOUS Trading GmbH</p>
          <div className="flex gap-3 mt-1">
            <Link href="/impressum" className="text-xs hover:underline" style={{ color: 'var(--fg-4)' }}>Impressum</Link>
            <Link href="/datenschutz" className="text-xs hover:underline" style={{ color: 'var(--fg-4)' }}>Datenschutz</Link>
            <Link href="/agb" className="text-xs hover:underline" style={{ color: 'var(--fg-4)' }}>AGB</Link>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="https://twitter.com/nous_trading"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded transition-colors"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-3)', border: '1px solid var(--border-raw)' }}
          >
            <Twitter className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://github.com/nous-trading"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded transition-colors"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-3)', border: '1px solid var(--border-raw)' }}
          >
            <Github className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

    </div>
  )
}
