'use client'

import { useState } from 'react'
import { Loader2, ArrowDownToLine } from 'lucide-react'

interface Props {
  onCopy: () => Promise<{ error: string | null; count: number }>
}

export function CopyYesterdayBanner({ onCopy }: Props) {
  const [copying, setCopying] = useState(false)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handle = async () => {
    setCopying(true)
    setMsg(null)
    const result = await onCopy()
    setCopying(false)
    if (result.error) {
      setMsg(result.error)
    } else if (result.count === 0) {
      setMsg('Keine Einträge von gestern gefunden.')
    } else {
      setDone(true)
    }
  }

  if (done) return null

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
      style={{ background: 'rgba(41,98,255,0.07)', border: '1px dashed rgba(41,98,255,0.3)' }}
    >
      <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
        Noch keine Auswahl für heute — von gestern übernehmen?
      </p>
      <div className="flex items-center gap-3 shrink-0">
        {msg && <span className="text-xs" style={{ color: 'var(--fg-4)' }}>{msg}</span>}
        <button
          onClick={handle}
          disabled={copying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: 'rgba(41,98,255,0.15)', color: '#2962FF', border: '1px solid rgba(41,98,255,0.3)' }}
        >
          {copying
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ArrowDownToLine className="h-3.5 w-3.5" />
          }
          Übernehmen
        </button>
      </div>
    </div>
  )
}
