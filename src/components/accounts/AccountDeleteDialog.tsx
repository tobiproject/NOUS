'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type Account } from '@/contexts/AccountContext'

interface AccountDeleteDialogProps {
  account: Account | null
  onClose: () => void
  onConfirm: (accountId: string) => Promise<void>
}

export function AccountDeleteDialog({ account, onClose, onConfirm }: AccountDeleteDialogProps) {
  const [confirmation, setConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isMatch = confirmation === account?.name

  async function handleConfirm() {
    if (!account || !isMatch) return
    setIsDeleting(true)
    try {
      await onConfirm(account.id)
      onClose()
    } finally {
      setIsDeleting(false)
      setConfirmation('')
    }
  }

  return (
    <AlertDialog open={!!account} onOpenChange={(o) => { if (!o) { onClose(); setConfirmation('') } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konto unwiderruflich löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Das Konto <strong className="text-foreground">{account?.name}</strong> und alle
            zugehörigen Trades werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="delete-confirm">
            Tippe <span className="font-mono text-foreground">{account?.name}</span> zur Bestätigung ein:
          </Label>
          <Input
            id="delete-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={account?.name}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmation('')}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isMatch || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
