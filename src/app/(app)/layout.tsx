export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AccountProvider } from '@/contexts/AccountContext'
import { AppSidebarClient } from '@/components/layout/AppSidebarClient'
import { BottomNav } from '@/components/layout/BottomNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MorningBriefing } from '@/components/layout/MorningBriefing'
import { AnalysisReminderBanner } from '@/components/layout/AnalysisReminderBanner'
import { MobileUpdateModal } from '@/components/layout/MobileUpdateModal'
import { UpdateBanner } from '@/components/layout/UpdateBanner'
import { FontSizeApplier } from '@/components/layout/FontSizeApplier'
import { QuickAddTradeButton } from '@/components/layout/QuickAddTradeButton'
import { DesktopHeader } from '@/components/layout/DesktopHeader'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AccountProvider>
      <FontSizeApplier />
      <MorningBriefing />
      <AnalysisReminderBanner />
      <div className="flex flex-col h-screen overflow-hidden" style={{
        background: `
          radial-gradient(ellipse 55% 45% at 12% 25%, rgba(41,98,255,0.09) 0%, transparent 65%),
          radial-gradient(ellipse 45% 55% at 88% 75%, rgba(255,130,16,0.07) 0%, transparent 65%),
          radial-gradient(ellipse 35% 40% at 55% 90%, rgba(8,153,129,0.06) 0%, transparent 60%),
          #0a0a0a
        `
      }}>
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden min-h-0">
          <AppSidebarClient />
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            <DesktopHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 md:px-5 lg:px-6 lg:py-5 w-full pb-safe-nav md:pb-6 max-w-6xl mx-auto">
              {children}
            </div>
          </main>
          </div>
        </div>
      </div>
      <MobileUpdateModal />
      <UpdateBanner />
      <QuickAddTradeButton />
      <BottomNav />
    </AccountProvider>
  )
}
