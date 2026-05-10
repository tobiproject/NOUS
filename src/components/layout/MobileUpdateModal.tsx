'use client'

import { useState } from 'react'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import { CHANGELOG } from '@/lib/changelog'

export function MobileUpdateModal() {
  const update = useVersionCheck()
  const [dismissed, setDismissed] = useState(false)

  if (!update || dismissed) return null

  const entry = CHANGELOG[0]

  return (
    <div
      className="fixed inset-0 z-50 md:hidden flex items-end justify-center pb-24 px-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#1E2028', border: '1px solid rgba(255,255,255,0.12)', maxWidth: 420 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-blue)' }} />
            <span className="text-[15px] font-bold" style={{ color: '#fff' }}>Update verfügbar</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        <p className="px-5 pb-3 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          v{entry.version} · {entry.date}
        </p>

        {/* Changes */}
        <div className="px-5 pb-4 space-y-2.5">
          {entry.features && entry.features.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand-blue)' }}>Neu</p>
              <div className="space-y-1">
                {entry.features.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[12px] shrink-0 leading-relaxed font-semibold" style={{ color: 'var(--brand-blue)' }}>+</span>
                    <span className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {entry.fixes && entry.fixes.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,180,60,0.85)' }}>Gefixt</p>
              <div className="space-y-1">
                {entry.fixes.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[12px] shrink-0 leading-relaxed" style={{ color: 'rgba(255,180,60,0.7)' }}>~</span>
                    <span className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-4 pb-5">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-[15px] active:opacity-80 transition-opacity"
            style={{ background: 'var(--brand-blue)', color: '#fff' }}
          >
            <RefreshCw className="h-4 w-4" />
            Jetzt aktualisieren
          </button>
        </div>
      </div>
    </div>
  )
}
