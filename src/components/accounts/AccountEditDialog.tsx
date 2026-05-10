'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAccounts } from '@/hooks/useAccounts'
import { type Account } from '@/contexts/AccountContext'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD', 'BTC', 'USDT']

const ACCOUNT_TYPES_EIGENHANDEL = [
  { value: 'eigenhandel_futures',  label: 'Futures' },
  { value: 'eigenhandel_cfd',      label: 'CFD' },
  { value: 'eigenhandel_fx',       label: 'FX / Forex' },
  { value: 'eigenhandel_aktien',   label: 'Aktien' },
  { value: 'eigenhandel_optionen', label: 'Optionen' },
  { value: 'eigenhandel_krypto',   label: 'Krypto' },
  { value: 'eigenhandel_etf',      label: 'ETF' },
]

const ACCOUNT_TYPES_FREMDKAPITAL = [
  { value: 'fremdkapital_futures',  label: 'Futures' },
  { value: 'fremdkapital_cfd',      label: 'CFD' },
  { value: 'fremdkapital_fx',       label: 'FX / Forex' },
  { value: 'fremdkapital_aktien',   label: 'Aktien' },
  { value: 'fremdkapital_optionen', label: 'Optionen' },
  { value: 'fremdkapital_krypto',   label: 'Krypto' },
]

const schema = z.object({
  name:          z.string().min(1, 'Name ist erforderlich.').max(50, 'Max. 50 Zeichen.'),
  start_balance: z.number({ message: 'Bitte eine Zahl eingeben.' }).min(1, 'Startbalance muss mindestens 1 sein.'),
  currency:      z.string().min(1, 'Währung ist erforderlich.'),
  account_type:  z.string().optional(),
  broker:        z.string().optional(),
  description:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  account: Account
  trigger?: React.ReactNode
}

export function AccountEditDialog({ account, trigger }: Props) {
  const { updateAccount } = useAccounts()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          account.name,
      start_balance: account.start_balance,
      currency:      account.currency,
      account_type:  account.account_type ?? '',
      broker:        account.broker ?? '',
      description:   account.description ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name:          account.name,
        start_balance: account.start_balance,
        currency:      account.currency,
        account_type:  account.account_type ?? '',
        broker:        account.broker ?? '',
        description:   account.description ?? '',
      })
      setServerError(null)
    }
  }, [open, account, form])

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { error } = await updateAccount(account.id, values)
    if (error) {
      setServerError(error.message || 'Konto konnte nicht gespeichert werden.')
      return
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
            Bearbeiten
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konto bearbeiten</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kontoname *</FormLabel>
                  <FormControl>
                    <Input placeholder="z. B. FTMO Challenge" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Startbalance *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="10000"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Währung *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Währung" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konto-Typ <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Typ wählen…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Eigenhandel</SelectLabel>
                        {ACCOUNT_TYPES_EIGENHANDEL.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Fremdkapital (Prop Firm)</SelectLabel>
                        {ACCOUNT_TYPES_FREMDKAPITAL.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="broker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="z. B. FTMO, IC Markets" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Kurze Notiz zum Konto…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Wird gespeichert…' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
