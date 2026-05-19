export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardTestContent } from '@/components/dashboard/DashboardTestContent'

export default function DashboardTestPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>}>
      <DashboardTestContent />
    </Suspense>
  )
}
