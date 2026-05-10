'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

const CLIENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'

export function UpdateBanner() {
  const [show, setShow] = useState(false)
  const [serverVersion, setServerVersion] = useState('')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data.version && data.version !== CLIENT_VERSION) {
          setServerVersion(data.version)
          setShow(true)
        }
      } catch {}
    }

    // First check after 10s (let page settle), then every 5 min
    const t = setTimeout(check, 10_000)
    const i = setInterval(check, 5 * 60 * 1000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-4 py-3"
      style={{
        background: '#1A1C22',
        borderTop: '1px solid rgba(255,130,16,0.4)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <RefreshCw className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-blue)' }} />
        <div className="min-w-0">
          <span className="text-[13px] font-semibold" style={{ color: '#fff' }}>
            Neues Update verfügbar
          </span>
          <span className="text-[13px] ml-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Version {serverVersion} ist bereit
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 rounded text-[13px] font-semibold transition-opacity active:opacity-70"
          style={{ background: 'var(--brand-blue)', color: '#fff' }}
        >
          Neu laden
        </button>
        <button
          onClick={() => setShow(false)}
          className="flex items-center justify-center w-7 h-7 rounded transition-opacity active:opacity-60"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
