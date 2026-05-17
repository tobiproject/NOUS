'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DrawdownPoint } from '@/hooks/usePerformanceStats'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: DrawdownPoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{d.date}</p>
      <p className="text-red-400 mt-0.5">Drawdown: -{d.drawdownPct.toFixed(2)}%</p>
    </div>
  )
}

interface Props {
  data: DrawdownPoint[]
  currentDrawdown: number
}

export function DrawdownChart({ data, currentDrawdown }: Props) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Drawdown-Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Keine Drawdown-Daten vorhanden
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxDd = Math.max(...data.map(d => d.drawdownPct), 0)
  const yMax = maxDd > 0 ? maxDd * 1.1 : 5

  const ddColor = currentDrawdown > 10 ? '#ef4444' : currentDrawdown > 5 ? '#f59e0b' : '#22c55e'

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Drawdown-Verlauf</CardTitle>
        <div className="text-sm font-semibold" style={{ color: ddColor }}>
          Aktuell: -{currentDrawdown.toFixed(2)}%
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={d => {
                const [, m, day] = d.split('-')
                return `${day}.${m}`
              }}
            />
            <YAxis
              domain={[0, yMax]}
              reversed
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `-${v}%`}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Area
              type="monotone"
              dataKey="drawdownPct"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#ddGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-6 h-px border-t border-dashed border-amber-500" />
            <span>5% Warnstufe</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-px border-t border-dashed border-red-500" />
            <span>10% Kritisch</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
