export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JournalContent } from '@/components/journal/JournalContent'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Journal — NOUS',
}

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <JournalContent />
    </Suspense>
  )
}
