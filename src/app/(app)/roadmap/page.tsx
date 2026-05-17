'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, RefreshCw, TrendingUp, AlertTriangle, Lightbulb,
  Target, Clock, Star, Zap, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Milestone {
  label: string
  achieved: boolean
  description: string
  trades_needed?: number | null
}

interface RoadmapData {
  level: 'Beginner' | 'Developing' | 'Consistent' | 'Profitabel'
  score: number
  level_description: string
  next_level: string | null
  journey_phase: number       // 1–6
  journey_phase_label: string
  journey_phase_description: string
  honest_assessment: string
  strengths: string[]
  weaknesses: string[]
  danger_zones: string[]
  next_milestone: string
  trades_to_next_milestone: number
  time_estimate: string
  narrative: string
  milestones: Milestone[]
}

const LEVELS = ['Beginner', 'Developing', 'Consistent', 'Profitabel'] as const

const LEVEL_COLORS: Record<string, string> = {
  Beginner:   '#F23645',
  Developing: '#FF9800',
  Consistent: '#2962FF',
  Profitabel: '#089981',
}

// Journey phases: x positions along the SVG path (viewBox 0 0 520 160)
const JOURNEY_PHASES = [
  { id: 1, label: 'Erste Erfolge',       x: 55,  y: 32,  desc: 'Euphorie & Anfängerglück' },
  { id: 2, label: 'Erster Einbruch',     x: 130, y: 72,  desc: 'Selbstzweifel beginnen'   },
  { id: 3, label: 'Der Tiefpunkt',       x: 218, y: 138, desc: 'Viele geben hier auf'      },
  { id: 4, label: 'Langsames Lernen',    x: 320, y: 102, desc: 'Echtes Verständnis wächst' },
  { id: 5, label: 'Konsistenz',          x: 405, y: 52,  desc: 'Beständig, aber noch nicht profitabel' },
  { id: 6, label: 'Profitabler Trader',  x: 475, y: 22,  desc: 'Reproduzierbar profitabel' },
]

// SVG bezier path through all 6 phase points
const JOURNEY_PATH = 'M 20,80 C 40,50 50,20 55,32 S 100,80 130,72 S 180,150 218,138 S 280,130 320,102 S 380,50 405,52 S 455,20 480,18'

function TraderJourneyCurve({ phase }: { phase: number }) {
  const current = JOURNEY_PHASES.find(p => p.id === phase) ?? JOURNEY_PHASES[0]

  return (
    <div className="rounded-lg p-5 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Zap className="h-3.5 w-3.5" style={{ color: 'var(--brand-blue)' }} />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>
          Deine Trading-Journey
        </p>
      </div>

      <svg viewBox="0 0 520 175" className="w-full" style={{ overflow: 'visible' }}>
        {/* Y-axis labels */}
        <text x="8" y="22" fontSize="9" fill="var(--fg-4)" textAnchor="middle">Hoch</text>
        <text x="8" y="145" fontSize="9" fill="var(--fg-4)" textAnchor="middle">Tief</text>

        {/* Grid lines (horizontal) */}
        {[30, 75, 120].map(y => (
          <line key={y} x1="20" y1={y} x2="500" y2={y} stroke="var(--border-raw)" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}

        {/* Danger zone shading around phase 3 */}
        <path
          d="M 160,155 C 175,155 200,160 218,160 S 255,155 280,155 L 280,10 L 160,10 Z"
          fill="rgba(242,54,69,0.04)"
        />
        <text x="220" y="10" fontSize="8" fill="rgba(242,54,69,0.5)" textAnchor="middle">Gefahrenzone</text>

        {/* Main journey path — muted background */}
        <path
          d={JOURNEY_PATH}
          fill="none"
          stroke="var(--border-raw)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Progress portion up to current phase — colored */}
        <path
          d={JOURNEY_PATH}
          fill="none"
          stroke={LEVEL_COLORS[phase <= 2 ? 'Beginner' : phase <= 3 ? 'Developing' : phase <= 4 ? 'Consistent' : 'Profitabel']}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="600"
          strokeDashoffset={600 - (phase / 6) * 490}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
          opacity="0.9"
        />

        {/* Phase dots */}
        {JOURNEY_PHASES.map(p => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.id === phase ? 7 : 4}
              fill={p.id <= phase
                ? (LEVEL_COLORS[p.id <= 2 ? 'Beginner' : p.id <= 3 ? 'Developing' : p.id <= 4 ? 'Consistent' : 'Profitabel'])
                : 'var(--bg-4)'}
              stroke={p.id === phase ? '#fff' : 'var(--border-raw)'}
              strokeWidth={p.id === phase ? 2 : 1}
            />
            {/* Pulse ring on current */}
            {p.id === phase && (
              <circle
                cx={p.x}
                cy={p.y}
                r={12}
                fill="none"
                stroke={LEVEL_COLORS[phase <= 2 ? 'Beginner' : phase <= 3 ? 'Developing' : phase <= 4 ? 'Consistent' : 'Profitabel']}
                strokeWidth="1"
                opacity="0.3"
              />
            )}
          </g>
        ))}

        {/* "Du bist hier" label */}
        <text
          x={current.x}
          y={current.y - 16}
          fontSize="9"
          fontWeight="600"
          fill="var(--fg-1)"
          textAnchor="middle"
        >
          Du bist hier
        </text>

        {/* Phase labels below the curve */}
        {JOURNEY_PHASES.map(p => (
          <text
            key={p.id}
            x={p.x}
            y={168}
            fontSize="8"
            fill={p.id === phase ? 'var(--fg-1)' : 'var(--fg-4)'}
            textAnchor="middle"
            fontWeight={p.id === phase ? '600' : '400'}
          >
            {p.id}. {p.label.split(' ')[0]}
          </text>
        ))}
      </svg>

      {/* Current phase callout */}
      <div
        className="rounded px-4 py-3 flex items-start gap-3"
        style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}
      >
        <span
          className="text-lg font-bold tabular-nums shrink-0"
          style={{ color: LEVEL_COLORS[phase <= 2 ? 'Beginner' : phase <= 3 ? 'Developing' : phase <= 4 ? 'Consistent' : 'Profitabel'], fontFamily: 'Manrope, sans-serif' }}
        >
          {phase}
        </span>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{current.label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{current.desc}</p>
        </div>
      </div>
    </div>
  )
}

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [hasStrategy, setHasStrategy] = useState(true)
  const [tradeCount, setTradeCount] = useState(0)
  const [isStale, setIsStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/ai/roadmap')
    const data = await res.json()
    setRoadmap(data.roadmap)
    setGeneratedAt(data.generated_at)
    setHasStrategy(data.has_strategy ?? true)
    setTradeCount(data.trade_count ?? 0)
    setIsStale(data.is_stale ?? false)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    setError(null)
    const res = await fetch('/api/ai/roadmap', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Fehler beim Generieren')
    } else {
      setRoadmap(data.roadmap)
      setGeneratedAt(new Date().toISOString())
      setHasStrategy(data.has_strategy ?? true)
      setTradeCount(data.trade_count ?? 0)
      setIsStale(false)
    }
    setGenerating(false)
  }

  const levelIndex = roadmap ? LEVELS.indexOf(roadmap.level) : -1
  const color = roadmap ? (LEVEL_COLORS[roadmap.level] ?? 'var(--brand-blue)') : 'var(--brand-blue)'

  return (
    <div className="space-y-6 max-w-2xl pb-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="eyebrow mb-1">KI-Analyse</div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}>
            Deine Trading-Roadmap
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
            Wo stehst du wirklich? Was kommt als Nächstes? Ungeschönte KI-Analyse.
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={generating}
          className="h-8 px-4 text-[13px] font-semibold rounded gap-2 shrink-0"
          style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
        >
          {generating
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysiere…</>
            : <><RefreshCw className="h-3.5 w-3.5" /> {roadmap ? 'Neu analysieren' : 'Jetzt analysieren'}</>
          }
        </Button>
      </div>

      {/* No strategy warning */}
      {!hasStrategy && (
        <Link
          href="/einstellungen"
          className="flex items-start gap-3 rounded-lg px-4 py-3 transition-opacity hover:opacity-80"
          style={{ background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.25)' }}
        >
          <BookOpen className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#FF9800' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#FF9800' }}>Keine Strategie angelegt</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
              Die KI kann dich deutlich besser coachen, wenn sie deine Regeln kennt. Jetzt Strategie anlegen →
            </p>
          </div>
        </Link>
      )}

      {/* Staleness banner */}
      {isStale && roadmap && (
        <button
          onClick={generate}
          disabled={generating}
          className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-opacity hover:opacity-80"
          style={{ background: 'rgba(41,98,255,0.08)', border: '1px solid rgba(41,98,255,0.25)' }}
        >
          <RefreshCw className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-blue)' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--brand-blue)' }}>Roadmap veraltet</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
              Neue Trades oder Strategie-Änderungen seit der letzten Analyse. Jetzt neu analysieren →
            </p>
          </div>
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(242,54,69,0.1)', color: 'var(--short)', border: '1px solid rgba(242,54,69,0.2)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8" style={{ color: 'var(--fg-4)' }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Lade Roadmap…</span>
        </div>
      ) : !roadmap ? (
        <div
          className="rounded-lg p-8 text-center space-y-3"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
        >
          <Star className="h-10 w-10 mx-auto opacity-20" style={{ color: 'var(--fg-4)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>Noch keine Roadmap generiert</p>
          <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
            Klicke auf "Jetzt analysieren" — du brauchst mindestens 5 geloggte Trades.
          </p>
          {tradeCount > 0 && (
            <p className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>
              {tradeCount} Trades vorhanden — genug für die Analyse.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Level + Score Card */}
          <div
            className="rounded-lg p-5 space-y-4"
            style={{ background: 'var(--bg-2)', border: `1px solid ${color}30` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ background: `${color}20`, color }}
                  >
                    {roadmap.level}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>{roadmap.level_description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold tabular-nums" style={{ color, fontFamily: 'Manrope, sans-serif' }}>
                  {roadmap.score}
                </p>
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>/ 100</p>
              </div>
            </div>

            {/* Level progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                {LEVELS.map((l, i) => (
                  <span
                    key={l}
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: i <= levelIndex ? color : 'var(--fg-4)' }}
                  >
                    {l}
                  </span>
                ))}
              </div>
              <div className="relative h-2 rounded-full" style={{ background: 'var(--bg-4)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(99, (levelIndex / (LEVELS.length - 1)) * 100 + (roadmap.score / 100) * (100 / (LEVELS.length - 1)))}%`,
                    background: color,
                  }}
                />
                {LEVELS.map((_, i) => i > 0 && (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-0.5"
                    style={{ left: `${(i / (LEVELS.length - 1)) * 100}%`, background: 'var(--bg-1)' }}
                  />
                ))}
              </div>
            </div>

            {/* Trade count */}
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-4)' }}>
              <span>{tradeCount} Trades geloggt</span>
              {roadmap.next_level && (
                <span>Nächste Stufe: <span style={{ color: 'var(--fg-2)' }}>{roadmap.next_level}</span></span>
              )}
            </div>
          </div>

          {/* Trader Journey Curve */}
          {roadmap.journey_phase && (
            <TraderJourneyCurve phase={roadmap.journey_phase} />
          )}

          {/* Honest Assessment — the hard truth */}
          <div
            className="rounded-lg p-5 space-y-2"
            style={{ background: 'rgba(242,54,69,0.05)', border: '1px solid rgba(242,54,69,0.15)' }}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--short)' }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--short)' }}>
                Die harte Wahrheit
              </p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-2)' }}>
              {roadmap.honest_assessment}
            </p>
          </div>

          {/* Narrative */}
          <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-3)' }}>{roadmap.narrative}</p>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--long)' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--long)' }}>Stärken</p>
              </div>
              <ul className="space-y-2">
                {(roadmap.strengths ?? []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-2)' }}>
                    <span className="shrink-0 mt-0.5" style={{ color: 'var(--long)' }}>✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--short)' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--short)' }}>Entwicklungsfelder</p>
              </div>
              <ul className="space-y-2">
                {(roadmap.weaknesses ?? []).map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-2)' }}>
                    <span className="shrink-0 mt-0.5" style={{ color: 'var(--short)' }}>→</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Danger Zones */}
          {(roadmap.danger_zones ?? []).length > 0 && (
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: 'rgba(255,152,0,0.05)', border: '1px solid rgba(255,152,0,0.2)' }}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" style={{ color: '#FF9800' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#FF9800' }}>
                  Fallstricke die vor dir liegen
                </p>
              </div>
              <ul className="space-y-2">
                {roadmap.danger_zones.map((z, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-2)' }}>
                    <span className="shrink-0 font-bold" style={{ color: '#FF9800' }}>⚠</span>
                    {z}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Step + Time + Trade Estimate */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg p-4 space-y-1.5 col-span-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" style={{ color: 'var(--brand-blue)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--brand-blue)' }}>Nächster Schritt</p>
              </div>
              <p className="text-xs" style={{ color: 'var(--fg-1)' }}>{roadmap.next_milestone}</p>
            </div>
            <div className="rounded-lg p-4 space-y-1.5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" style={{ color: 'var(--fg-3)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Trades bis Meilenstein</p>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--fg-1)', fontFamily: 'Manrope, sans-serif' }}>
                ~{roadmap.trades_to_next_milestone ?? '?'}
              </p>
            </div>
            <div className="rounded-lg p-4 space-y-1.5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" style={{ color: 'var(--fg-3)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Bis Profitabilität</p>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--fg-2)' }}>{roadmap.time_estimate}</p>
            </div>
          </div>

          {/* Milestones */}
          {(roadmap.milestones ?? []).length > 0 && (
            <div className="rounded-lg p-5 space-y-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" style={{ color: 'var(--brand-blue)' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>Meilensteine</p>
              </div>
              <div className="space-y-3">
                {roadmap.milestones.map((m, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                      style={{
                        background: m.achieved ? 'var(--long)' : 'var(--bg-4)',
                        border: m.achieved ? 'none' : '1px solid var(--border-raw)',
                      }}
                    >
                      {m.achieved && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', !m.achieved && 'opacity-60')} style={{ color: 'var(--fg-1)' }}>
                        {m.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--fg-4)' }}>{m.description}</p>
                    </div>
                    {m.trades_needed && !m.achieved && (
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-3)', color: 'var(--fg-4)' }}>
                        ~{m.trades_needed} Trades
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedAt && (
            <p className="text-xs text-center" style={{ color: 'var(--fg-4)' }}>
              Zuletzt analysiert: {new Date(generatedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
