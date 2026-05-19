'use client'

import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

const MESSAGES: Record<number, { emoji: string; title: string; body: string }> = {
  10:  { emoji: '🎯', title: '10 Trades!',  body: 'Du hast deinen ersten Zehner vollgemacht. Weiter so!' },
  30:  { emoji: '🔥', title: '30 Trades!',  body: 'Eine solide Datenbasis. Die KI-Analyse wird jetzt richtig gut.' },
  50:  { emoji: '⚡', title: '50 Trades!',  body: 'Halbzeit zur 100. Deine Muster werden sichtbar.' },
  100: { emoji: '💯', title: '100 Trades!', body: 'Dreistellig! Du bist kein Anfänger mehr.' },
  150: { emoji: '🚀', title: '150 Trades!', body: 'Profis dokumentieren. Du dokumentierst. Kein Zufall.' },
  200: { emoji: '👑', title: '200 Trades!', body: 'Top 1% der Trader, die ihr Journal führen.' },
  500: { emoji: '🏆', title: '500 Trades!', body: 'Legendär. Dieses Journal ist Gold wert.' },
}

interface Props {
  milestone: number | null
  onClose: () => void
}

export function MilestoneCelebration({ milestone, onClose }: Props) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!milestone || firedRef.current) return
    firedRef.current = true

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.7 },
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      })
    }

    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.2, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1, { spread: 120, startVelocity: 45 })

    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [milestone, onClose])

  if (!milestone) return null
  const msg = MESSAGES[milestone]
  if (!msg) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 rounded-xl p-5 shadow-2xl flex items-start gap-4 max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-raw)',
        boxShadow: '0 0 40px rgba(0,196,255,0.2)',
      }}
    >
      <span className="text-3xl leading-none mt-0.5">{msg.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: 'var(--fg-1)' }}>{msg.title}</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-3)' }}>{msg.body}</p>
      </div>
      <button
        onClick={onClose}
        className="text-xs shrink-0 mt-0.5"
        style={{ color: 'var(--fg-4)' }}
        aria-label="Schließen"
      >
        ✕
      </button>
    </div>
  )
}
