'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WinrateDataPoint } from '@/hooks/usePerformanceStats'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: WinrateDataPoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{d.label}</p>
      <p className="text-emerald-400 mt-0.5">Winrate: {d.winRate.toFixed(1)}%</p>
      <p className="text-muted-foreground mt-0.5">{d.tradeCount} Trades</p>
    </div>
  )
}

function winrateColor(wr: number) {
  if (wr >= 60) return '#22c55e'
  if (wr >= 50) return '#84cc16'
  if (wr >= 40) return '#f59e0b'
  return '#ef4444'
}

interface WinrateBarChartProps {
  title: string
  data: WinrateDataPoint[]
  emptyMessage?: string
}

function WinrateBarChart({ title, data, emptyMessage }: WinrateBarChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
            {emptyMessage ?? 'Keine Daten'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartHeight = Math.max(180, data.length * 32 + 32)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 56, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={80}
              tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="winRate" radius={[0, 3, 3, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={winrateColor(d.winRate)} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="tradeCount"
                position="right"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => `${v}T`}
                style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface Props {
  byAsset: WinrateDataPoint[]
  bySetup: WinrateDataPoint[]
  byStrategy: WinrateDataPoint[]
}

export function WinrateCharts({ byAsset, bySetup, byStrategy }: Props) {
  return (
    <div className="space-y-4">
      <WinrateBarChart
        title="Winrate nach Asset (Top 10)"
        data={byAsset}
        emptyMessage="Keine Trades im gewählten Zeitraum"
      />
      <WinrateBarChart
        title="Winrate nach Setup-Typ"
        data={bySetup}
        emptyMessage="Keine Setup-Typen in den gefilterten Trades"
      />
      <WinrateBarChart
        title="Winrate nach Strategie"
        data={byStrategy}
        emptyMessage="Keine Strategien in den gefilterten Trades"
      />
    </div>
  )
}
