'use client'

import { useState } from 'react'
import { HardDriveDownload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  accountId: string
  accountName: string
}

export function FullExportButton({ accountId, accountName }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleExport() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/export/full?account_id=${accountId}`)
      if (!res.ok) throw new Error('Export fehlgeschlagen')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const today = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = url
      a.download = `nous-export-${today}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Vollständiger Export heruntergeladen')
    } catch {
      toast.error('Export fehlgeschlagen')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-muted-foreground hover:text-foreground"
      onClick={handleExport}
      disabled={isLoading}
      title={`Alle Daten von „${accountName}" als ZIP exportieren`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <HardDriveDownload className="h-3.5 w-3.5" />
      )}
      {isLoading ? 'Exportiere…' : 'Daten exportieren'}
    </Button>
  )
}
