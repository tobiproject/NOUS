export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AccountProvider } from '@/contexts/AccountContext'
import { AppSidebarClient } from '@/components/layout/AppSidebarClient'
import { BottomNav } from '@/components/layout/BottomNav'
import { MorningBriefing } from '@/components/layout/MorningBriefing'
import { AnalysisReminderBanner } from '@/components/layout/AnalysisReminderBanner'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AccountProvider>
      <MorningBriefing />
      <AnalysisReminderBanner />
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>
        <AppSidebarClient />
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="px-4 py-4 md:px-5 lg:px-6 lg:py-5 w-full pb-safe-nav md:pb-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </AccountProvider>
  )
}
