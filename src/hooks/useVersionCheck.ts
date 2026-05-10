'use client'

import { useEffect, useState } from 'react'

const CLIENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'
const CACHE_KEY = 'nous-update-available'

export interface UpdateInfo {
  version: string
  changes: string[]
}

export function useVersionCheck(): UpdateInfo | null {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as UpdateInfo
        // Clear stale cache if user already has this version (reloaded)
        if (parsed.version === CLIENT_VERSION) {
          localStorage.removeItem(CACHE_KEY)
        } else {
          setUpdate(parsed)
        }
      }
    } catch {}

    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data.version && data.version !== CLIENT_VERSION) {
          const info: UpdateInfo = { version: data.version, changes: data.changes ?? [] }
          setUpdate(info)
          localStorage.setItem(CACHE_KEY, JSON.stringify(info))
        } else {
          // User is on latest version — clear any stale update notification
          localStorage.removeItem(CACHE_KEY)
          setUpdate(null)
        }
      } catch {}
    }

    const t = setTimeout(check, 10_000)
    const i = setInterval(check, 5 * 60 * 1000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [])

  return update
}
