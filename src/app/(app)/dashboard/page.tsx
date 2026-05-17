import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="space-y-5">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
