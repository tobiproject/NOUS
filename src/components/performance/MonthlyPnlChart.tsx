'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BarDataPoint } from '@/hooks/usePerformanceStats'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: BarDataPoint }>
  label?: string
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{d.label}</p>
      <p className={`mt-0.5 ${d.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        P&L: {d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(2)} €
      </p>
      {d.winRate !== null && (
        <p className="text-muted-foreground mt-0.5">Winrate: {d.winRate.toFixed(1)}%</p>
      )}
      <p className="text-muted-foreground mt-0.5">{d.tradeCount} Trades</p>
    </div>
  )
}

interface Props {
  data: BarDataPoint[]
}

export function MonthlyPnlChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monatliches P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
            Keine Daten für den gewählten Zeitraum
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Monatliches P&L (letzte 12 Monate)</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => {
                const [, m] = v.split('-')
                return m
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}€`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeOpacity={0.8} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
