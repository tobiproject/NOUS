'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X, Sparkles } from 'lucide-react'

const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'
const CLIENT_RELEASE = process.env.NEXT_PUBLIC_RELEASE_VERSION ?? ''

export function UpdateBanner() {
  const [show, setShow] = useState(false)
  const [releaseVersion, setReleaseVersion] = useState('')
  const [changes, setChanges] = useState<string[]>([])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data.buildId && data.buildId !== CLIENT_BUILD_ID) {
          setReleaseVersion(data.releaseVersion ?? '')
          setChanges([...(data.features ?? []), ...(data.fixes ?? [])])
          setShow(true)
        }
      } catch {}
    }

    const t = setTimeout(check, 10_000)
    const i = setInterval(check, 5 * 60 * 1000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pt-4 pb-4"
      style={{
        background: '#14161C',
        borderTop: '1px solid rgba(255,130,16,0.35)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,130,16,0.15)' }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand-blue)' }} />
          </div>
          <div>
            <span className="text-[13px] font-bold" style={{ color: '#fff' }}>
              NOUS {releaseVersion} ist verfügbar
            </span>
            {CLIENT_RELEASE && (
              <span className="text-[12px] ml-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Du nutzt noch {CLIENT_RELEASE}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="flex items-center justify-center w-6 h-6 rounded shrink-0 transition-opacity active:opacity-60"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          aria-label="Schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Changelog */}
      {changes.length > 0 && (
        <ul className="mt-3 space-y-1.5 pl-9">
          {changes.slice(0, 4).map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--brand-blue)' }} />
              {c}
            </li>
          ))}
        </ul>
      )}

      {/* Action */}
      <div className="mt-4 pl-9">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 rounded text-[13px] font-semibold transition-opacity active:opacity-70"
          style={{ background: 'var(--brand-blue)', color: '#fff' }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Jetzt aktualisieren
        </button>
      </div>
    </div>
  )
}
