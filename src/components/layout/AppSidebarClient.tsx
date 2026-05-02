'use client'

import dynamic from 'next/dynamic'

// ssr:false prevents dnd-kit's module-level ID counter from mismatching
// between server (shared across requests) and client (resets per page load)
const AppSidebar = dynamic(
  () => import('@/components/layout/AppSidebar').then(m => ({ default: m.AppSidebar })),
  { ssr: false }
)

export function AppSidebarClient() {
  return <AppSidebar />
}
