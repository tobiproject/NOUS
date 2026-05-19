'use client'

import { useState } from 'react'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { useVersionCheck } from '@/hooks/useVersionCheck'

const CLIENT_RELEASE = process.env.NEXT_PUBLIC_RELEASE_VERSION ?? ''

export function UpdateBanner() {
  const update = useVersionCheck()
  const [dismissed, setDismissed] = useState(false)

  if (!update || dismissed) return null

  const changes = [...(update.features ?? []), ...(update.fixes ?? [])]

  return (
    // Centered modal overlay — desktop only
    <div className="fixed inset-0 z-[100] hidden md:flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={() => setDismissed(true)}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl p-6"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid rgba(0,196,255,0.4)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,196,255,0.15)',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.4)', background: 'var(--bg-3)' }}
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,196,255,0.15)' }}
          >
            <Sparkles className="h-5 w-5" style={{ color: 'var(--brand-blue)' }} />
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: '#fff' }}>
              NOUS {update.releaseVersion} verfügbar
            </p>
            {CLIENT_RELEASE && (
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Du nutzt noch Version {CLIENT_RELEASE}
              </p>
            )}
          </div>
        </div>

        {/* Change list */}
        {changes.length > 0 && (
          <ul className="space-y-2 mb-5">
            {changes.slice(0, 5).map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--brand-blue)' }} />
                {c}
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <button
          onClick={() => {
            localStorage.setItem('nous-skip-logout-ts', String(Date.now()))
            window.location.reload()
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand-blue)', color: '#fff' }}
        >
          <RefreshCw className="h-4 w-4" />
          Jetzt aktualisieren
        </button>

        <p className="text-center text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Oder klicke außerhalb, um es später zu tun
        </p>
      </div>
    </div>
  )
}
