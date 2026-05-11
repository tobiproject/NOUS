'use client'

import { useEffect, useState } from 'react'

const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'
const CACHE_KEY = 'nous-update-available'

export interface UpdateInfo {
  buildId: string
  releaseVersion: string
  features: string[]
  fixes: string[]
}

export function useVersionCheck(): UpdateInfo | null {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (!parsed?.releaseVersion || parsed.buildId === CLIENT_BUILD_ID) {
          localStorage.removeItem(CACHE_KEY)
        } else {
          setUpdate(parsed as UpdateInfo)
        }
      }
    } catch {}

    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data.buildId && data.buildId !== CLIENT_BUILD_ID) {
          const info: UpdateInfo = {
            buildId: data.buildId,
            releaseVersion: data.releaseVersion,
            features: data.features ?? [],
            fixes: data.fixes ?? [],
          }
          setUpdate(info)
          localStorage.setItem(CACHE_KEY, JSON.stringify(info))
        } else {
          localStorage.removeItem(CACHE_KEY)
          setUpdate(null)
        }
      } catch {}
    }

    const t = setTimeout(check, 2_000)
    const i = setInterval(check, 60_000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [])

  return update
}
