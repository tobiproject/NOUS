export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { PerformanceContent } from '@/components/performance/PerformanceContent'

export default function PerformancePage() {
  return (
    <Suspense fallback={
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1,2,3,4,5,6,7,8,9,10].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    }>
      <PerformanceContent />
    </Suspense>
  )
}
