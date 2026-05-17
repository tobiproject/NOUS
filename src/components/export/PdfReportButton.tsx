'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAccountContext } from '@/contexts/AccountContext'
import { createClient } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { computeKpi } from '@/lib/export-utils'

export function PdfReportButton() {
  const { activeAccount } = useAccountContext()
  const [isGenerating, setIsGenerating] = useState(false)
  const supabase = createClient()

  if (!activeAccount) return null

  async function generatePdf() {
    setIsGenerating(true)
    try {
      const now = new Date()
      const monthStart = startOfMonth(subMonths(now, 1))
      const monthEnd = endOfMonth(subMonths(now, 1))

      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', activeAccount!.id)
        .gte('traded_at', monthStart.toISOString())
        .lte('traded_at', monthEnd.toISOString())
        .order('traded_at', { ascending: false })

      if (error) throw error

      const tradeList = trades ?? []

      if (tradeList.length > 500) {
        toast.warning('Mehr als 500 Trades — Das kann einen Moment dauern…')
      }

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const monthLabel = format(monthStart, 'MMMM yyyy', { locale: de })
      const filename = `nous-report-${format(monthStart, 'yyyy-MM')}.pdf`

      // ── Title page ────────────────────────────────────────────────────────────
      doc.setFillColor(10, 10, 10)
      doc.rect(0, 0, 210, 297, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(28)
      doc.setFont('helvetica', 'bold')
      doc.text('NOUS', 20, 40)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(161, 161, 170)
      doc.text('Monatsbericht', 20, 52)

      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text(monthLabel, 20, 70)

      doc.setFontSize(12)
      doc.setTextColor(161, 161, 170)
      doc.text(`Konto: ${activeAccount!.name}`, 20, 82)
      doc.text(`Erstellt: ${format(now, 'dd.MM.yyyy HH:mm')}`, 20, 90)

      // ── KPI overview ──────────────────────────────────────────────────────────
      const kpi = computeKpi(tradeList as { outcome: string | null; result_currency: number | null }[])

      doc.addPage()
      doc.setFillColor(10, 10, 10)
      doc.rect(0, 0, 210, 297, 'F')

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('KPI Übersicht', 20, 25)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(161, 161, 170)
      doc.text(monthLabel, 20, 33)

      const kpiData = [
        ['Trades gesamt', String(kpi.totalTrades)],
        ['Winrate', `${kpi.winrate.toFixed(1)}%`],
        ['Gesamt P&L', `${kpi.totalPnl >= 0 ? '+' : ''}${kpi.totalPnl.toFixed(2)} €`],
        ['Ø P&L / Trade', `${kpi.avgPnl >= 0 ? '+' : ''}${kpi.avgPnl.toFixed(2)} €`],
        ['Bester Trade', `+${kpi.bestTrade.toFixed(2)} €`],
        ['Schlechtester Trade', `${kpi.worstTrade.toFixed(2)} €`],
      ]

      let y = 45
      for (const [label, value] of kpiData) {
        doc.setFillColor(24, 24, 27)
        doc.roundedRect(20, y, 80, 12, 2, 2, 'F')
        doc.roundedRect(108, y, 80, 12, 2, 2, 'F')

        doc.setTextColor(161, 161, 170)
        doc.setFontSize(9)
        doc.text(label, 25, y + 7.5)

        const isPositive = value.startsWith('+')
        const isNegative = value.startsWith('-') && value !== '-'
        doc.setTextColor(isPositive ? 52 : isNegative ? 248 : 255, isPositive ? 211 : isNegative ? 113 : 255, isPositive ? 153 : isNegative ? 113 : 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(value, 113, y + 7.5)
        doc.setFont('helvetica', 'normal')

        y += 16
      }

      // ── Top 5 Wins ────────────────────────────────────────────────────────────
      if (tradeList.length > 0) {
        const sorted = [...tradeList].sort((a, b) => (b.result_currency ?? 0) - (a.result_currency ?? 0))
        const top5Wins = sorted.slice(0, 5).filter(t => (t.result_currency ?? 0) > 0)
        const top5Losses = sorted.slice(-5).reverse().filter(t => (t.result_currency ?? 0) < 0)

        function renderTradeTable(
          doc: InstanceType<typeof jsPDF>,
          trades: typeof tradeList,
          title: string,
          startY: number
        ) {
          doc.setFontSize(13)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(255, 255, 255)
          doc.text(title, 20, startY)

          let y = startY + 8
          for (const t of trades) {
            const pnl = t.result_currency ?? 0
            const date = format(new Date(t.traded_at), 'dd.MM.yy')
            doc.setFillColor(24, 24, 27)
            doc.roundedRect(20, y, 168, 10, 1.5, 1.5, 'F')
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(161, 161, 170)
            doc.text(`${date}  ${t.asset}  ${t.direction?.toUpperCase() ?? ''}`, 24, y + 6.5)
            const pnlStr = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} €`
            doc.setTextColor(pnl >= 0 ? 52 : 248, pnl >= 0 ? 211 : 113, pnl >= 0 ? 153 : 113)
            doc.setFont('helvetica', 'bold')
            doc.text(pnlStr, 180, y + 6.5, { align: 'right' })
            doc.setFont('helvetica', 'normal')
            y += 13
          }
          return y
        }

        doc.addPage()
        doc.setFillColor(10, 10, 10)
        doc.rect(0, 0, 210, 297, 'F')

        let pageY = 25
        if (top5Wins.length > 0) {
          pageY = renderTradeTable(doc, top5Wins, 'Top 5 Gewinn-Trades', pageY) + 10
        }
        if (top5Losses.length > 0) {
          renderTradeTable(doc, top5Losses, 'Top 5 Verlust-Trades', pageY)
        }
      }

      // ── Footer on all pages ───────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(63, 63, 70)
        doc.text(`NOUS — ${activeAccount!.name} — ${monthLabel}`, 20, 290)
        doc.text(`${i} / ${pageCount}`, 190, 290, { align: 'right' })
      }

      doc.save(filename)
      toast.success(`PDF-Bericht gespeichert: ${filename}`)
    } catch (err) {
      console.error(err)
      toast.error('PDF-Generierung fehlgeschlagen')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={generatePdf}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {isGenerating ? 'Generiere PDF…' : 'PDF-Bericht'}
    </Button>
  )
}
