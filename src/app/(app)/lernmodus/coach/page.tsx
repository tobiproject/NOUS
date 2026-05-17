import { CoachPage } from '@/components/lernmodus/coach/CoachPage'

export const metadata = { title: 'KI-Coach — NOUS' }

export default function CoachRoute() {
  return (
    <div className="container mx-auto px-4 max-w-7xl py-6">
      <CoachPage />
    </div>
  )
}
