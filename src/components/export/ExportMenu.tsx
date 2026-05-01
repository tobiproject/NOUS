'use client'

import { useState } from 'react'
import { Download, FileText, FileJson, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useAccountContext } from '@/contexts/AccountContext'
import type { TradeFilters } from '@/hooks/useTrades'

interface Props {
  filters?: TradeFilters
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function ExportMenu({ filters }: Props) {
  const { activeAccount } = useAccountContext()
  const [loadingCsvDe, setLoadingCsvDe] = useState(false)
  const [loadingCsvEn, setLoadingCsvEn] = useState(false)

  if (!activeAccount) return null

  async function downloadCsv(lang: 'de' | 'en') {
    const setter = lang === 'de' ? setLoadingCsvDe : setLoadingCsvEn
    setter(true)
    try {
      const params = new URLSearchParams({ account_id: activeAccount!.id, lang })
      if (filters?.dateFrom) params.set('from', filters.dateFrom)
      if (filters?.dateTo) params.set('to', filters.dateTo)

      const res = await fetch(`/api/export/csv?${params}`)
      if (!res.ok) throw new Error('Export fehlgeschlagen')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const today = new Date().toISOString().slice(0, 10)
      triggerDownload(url, `nous-export-${today}.csv`)
      URL.revokeObjectURL(url)
      toast.success('CSV-Export erfolgreich')
    } catch {
      toast.error('Export fehlgeschlagen')
    } finally {
      setter(false)
    }
  }

  const isLoading = loadingCsvDe || loadingCsvEn

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">CSV Export</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => downloadCsv('de')}
          disabled={loadingCsvDe}
          className="gap-2 cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          {loadingCsvDe ? 'Exportiere…' : 'CSV (Deutsch)'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => downloadCsv('en')}
          disabled={loadingCsvEn}
          className="gap-2 cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          {loadingCsvEn ? 'Exportiere…' : 'CSV (English)'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filter werden berücksichtigt
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
