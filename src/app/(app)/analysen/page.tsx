export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalysenContent } from '@/components/ai/AnalysenContent'

function AnalysenSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

export default function AnalysenPage() {
  return (
    <Suspense fallback={<AnalysenSkeleton />}>
      <AnalysenContent />
    </Suspense>
  )
}
