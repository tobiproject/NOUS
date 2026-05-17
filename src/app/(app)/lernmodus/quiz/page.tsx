import { QuizSession } from '@/components/lernmodus/quiz/QuizSession'

export const metadata = { title: 'Quiz-Modus — NOUS' }

export default function QuizPage() {
  return (
    <div className="container mx-auto px-4 max-w-7xl py-6">
      <QuizSession />
    </div>
  )
}
