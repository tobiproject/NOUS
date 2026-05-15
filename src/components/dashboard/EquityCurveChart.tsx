'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { EquityPoint } from '@/hooks/useDashboardMetrics'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: EquityPoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{point.date}</p>
      <p className="text-muted-foreground mt-0.5">
        Balance: <span className="text-foreground font-medium">{point.balance.toFixed(2)} €</span>
      </p>
      {point.delta !== null && (
        <p className={cn('mt-0.5', point.delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {point.delta >= 0 ? '+' : ''}{point.delta.toFixed(2)} € vs. Vortag
        </p>
      )}
    </div>
  )
}

interface Props {
  allPoints: EquityPoint[]
  startBalance: number
}

export function EquityCurveChart({ allPoints, startBalance }: Props) {
  const hasData = allPoints.length >= 2
  const isProfit = allPoints.length > 0 && allPoints[allPoints.length - 1].balance >= startBalance

  const yMin = allPoints.length > 0
    ? Math.min(...allPoints.map(p => p.balance), startBalance) * 0.995
    : startBalance * 0.99
  const yMax = allPoints.length > 0
    ? Math.max(...allPoints.map(p => p.balance), startBalance) * 1.005
    : startBalance * 1.01

  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Equity Curve</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            {allPoints.length === 0
              ? 'Noch keine Trades — erfasse deinen ersten Trade.'
              : 'Mehr Trades nötig für die Kurve.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={allPoints} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={d => {
                  const [, m, day] = d.split('-')
                  return `${day}.${m}`
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={startBalance}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={isProfit ? 'hsl(var(--chart-2, 142 76% 36%))' : 'hsl(var(--destructive))'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isProfit ? '#22c55e' : '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
