'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { DrawdownPhase } from '@/hooks/usePerformanceStats'

interface Props {
  phases: DrawdownPhase[]
}

export function DrawdownPhaseTable({ phases }: Props) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top-5 Drawdown-Phasen</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {phases.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Keine Drawdown-Phasen im gewählten Zeitraum
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="text-xs text-muted-foreground font-medium pl-0">Start</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Ende</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">Tiefpunkt</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right pr-0">Recovery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((p, i) => (
                <TableRow key={i} className="border-border/30 hover:bg-accent/30">
                  <TableCell className="text-sm py-2 pl-0 tabular-nums">{p.startDate}</TableCell>
                  <TableCell className="text-sm py-2 tabular-nums">{p.endDate}</TableCell>
                  <TableCell className="text-sm py-2 text-right tabular-nums">
                    <span className={p.peakPct > 10 ? 'text-red-400' : p.peakPct > 5 ? 'text-amber-400' : 'text-muted-foreground'}>
                      -{p.peakPct.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm py-2 text-right pr-0 text-muted-foreground tabular-nums">
                    {p.recoveryDays === null ? (
                      <span className="text-amber-400 text-xs">Offen</span>
                    ) : (
                      `${p.recoveryDays}T`
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
