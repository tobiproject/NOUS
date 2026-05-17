'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, MessageSquare, RotateCcw, Flame, Target, Brain, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLearnStats } from '@/hooks/useLearnStats'

export function LearnDashboard() {
  const { stats, isLoading, fetchStats } = useLearnStats()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lernmodus</h1>
        <p className="text-muted-foreground mt-1">
          Reflektiere deine Trades, trainiere dein Urteilsvermögen und werde ein besserer Trader.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Flame className="h-4 w-4 text-orange-400" />}
          label="Aktuelle Streak"
          value={isLoading ? null : `${stats?.streak ?? 0} Tage`}
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4 text-blue-400" />}
          label="Quizze diese Woche"
          value={isLoading ? null : String(stats?.quizzesThisWeek ?? 0)}
        />
        <StatCard
          icon={<Target className="h-4 w-4 text-green-400" />}
          label="Ø Match-Rate (30d)"
          value={
            isLoading
              ? null
              : stats?.matchRateLast30 != null
              ? `${Math.round(stats.matchRateLast30 * 100)}%`
              : '—'
          }
        />
        <StatCard
          icon={<Brain className="h-4 w-4 text-purple-400" />}
          label="Coach-Gespräche"
          value={isLoading ? null : String(stats?.coachConversations ?? 0)}
        />
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ModeCard
          href="/lernmodus/quiz"
          icon={<BookOpen className="h-6 w-6 text-blue-400" />}
          title="Quiz-Modus"
          description="Werde durch vergangene Trades gefragt. War das ein guter Einstieg? Schärfe dein Urteilsvermögen."
          cta="Quiz starten"
          color="blue"
        />
        <ModeCard
          href="/lernmodus/coach"
          icon={<MessageSquare className="h-6 w-6 text-purple-400" />}
          title="KI-Coach"
          description="Diskutiere einen Trade mit deinem persönlichen KI-Coach. Er stellt Fragen statt Antworten zu geben."
          cta="Coach öffnen"
          color="purple"
        />
        <ModeCard
          href="/lernmodus/replay"
          icon={<RotateCcw className="h-6 w-6 text-green-400" />}
          title="Trade-Replay"
          description="Evaluiere vergangene Trades neu. Hätte ein anderer SL/TP ein besseres Ergebnis gebracht?"
          cta="Replay starten"
          color="green"
        />
      </div>

      {/* Progress hint */}
      {!isLoading && stats && stats.totalQuizzes === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Starte deinen ersten Quiz um deinen Lernfortschritt zu tracken.
            </p>
            <Button asChild size="sm" className="ml-auto shrink-0">
              <Link href="/lernmodus/quiz">Quiz starten</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

function ModeCard({
  href,
  icon,
  title,
  description,
  cta,
  color,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  color: 'blue' | 'purple' | 'green'
}) {
  const borderMap = {
    blue: 'hover:border-blue-500/50',
    purple: 'hover:border-purple-500/50',
    green: 'hover:border-green-500/50',
  }

  return (
    <Card className={`transition-colors ${borderMap[color]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <Button asChild className="w-full" variant="outline">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
