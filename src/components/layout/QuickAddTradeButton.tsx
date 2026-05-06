'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

export function QuickAddTradeButton() {
  const pathname = usePathname()
  const router = useRouter()

  // Hide on journal page — it already has its own FAB
  if (pathname === '/journal') return null

  return (
    <button
      onClick={() => router.push('/journal?new=1')}
      className="md:hidden fixed z-40 rounded-full flex items-center justify-center active:scale-95 transition-transform"
      style={{
        bottom: 'calc(64px + env(safe-area-inset-bottom) + 12px)',
        right: '16px',
        width: 52,
        height: 52,
        background: 'var(--brand-blue)',
        color: '#fff',
        boxShadow: '0 4px 24px rgba(41,98,255,0.5)',
      }}
      aria-label="Trade erfassen"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
