import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskContent } from '@/components/risk/RiskContent'

export const dynamic = 'force-dynamic'

export default function RiskPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    }>
      <RiskContent />
    </Suspense>
  )
}
