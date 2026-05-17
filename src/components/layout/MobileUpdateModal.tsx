'use client'

import { useState } from 'react'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import { getCurrentChangelog } from '@/lib/changelog'

const CURRENT = getCurrentChangelog()

export function MobileUpdateModal() {
  const update = useVersionCheck()
  const [dismissed, setDismissed] = useState(false)

  if (!update || dismissed) return null

  return (
    <div
      className="fixed inset-0 z-50 md:hidden flex items-end justify-center pb-24 px-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', maxWidth: 420 }}
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
          v{update.releaseVersion} · {CURRENT.date}
        </p>

        {/* Changes */}
        <div className="px-5 pb-4 space-y-2.5">
          {(update.features?.length ?? 0) > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand-blue)' }}>Neu</p>
              <div className="space-y-1">
                {(update.features ?? []).map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[12px] shrink-0 leading-relaxed font-semibold" style={{ color: 'var(--brand-blue)' }}>+</span>
                    <span className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(update.fixes?.length ?? 0) > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,180,60,0.85)' }}>Gefixt</p>
              <div className="space-y-1">
                {(update.fixes ?? []).map((c, i) => (
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
            onClick={() => { sessionStorage.setItem('nous-skip-inactivity-logout', '1'); window.location.reload() }}
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
