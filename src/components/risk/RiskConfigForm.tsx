'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { RiskConfig } from '@/hooks/useRiskConfig'

const schema = z.object({
  max_daily_loss_pct: z.number().positive('Muss > 0').max(100).optional(),
  max_daily_trades: z.number().int('Muss eine ganze Zahl sein').positive('Muss > 0').max(999).optional(),
  max_risk_per_trade_pct: z.number().positive('Muss > 0').max(100).optional(),
  max_drawdown_pct: z.number().positive('Muss > 0').max(100).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  config: RiskConfig | null
  isSaving: boolean
  onSave: (values: FormValues) => Promise<void>
}

export function RiskConfigForm({ config, isSaving, onSave }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      max_daily_loss_pct: undefined,
      max_daily_trades: undefined,
      max_risk_per_trade_pct: undefined,
      max_drawdown_pct: undefined,
    },
  })

  useEffect(() => {
    if (config) {
      form.reset({
        max_daily_loss_pct: config.max_daily_loss_pct ?? undefined,
        max_daily_trades: config.max_daily_trades ?? undefined,
        max_risk_per_trade_pct: config.max_risk_per_trade_pct ?? undefined,
        max_drawdown_pct: config.max_drawdown_pct ?? undefined,
      })
    }
  }, [config, form])

  const handleSubmit = async (values: FormValues) => {
    await onSave(values)
    toast.success('Risk-Konfiguration gespeichert')
  }

  const numField = (
    name: keyof FormValues,
    label: string,
    placeholder: string,
    unit = '%'
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            <span>{label}</span>
            <span className="text-xs text-muted-foreground font-normal">{unit} — leer = kein Limit</span>
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder={placeholder}
                className="pr-8"
                value={field.value === undefined ? '' : String(field.value)}
                onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {unit}
              </span>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Risk-Limits konfigurieren</CardTitle>
        <CardDescription>
          Alle Felder sind optional. Leere Felder deaktivieren das jeweilige Limit.
          Limits gelten pro Konto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {numField('max_daily_loss_pct', 'Max. Daily Loss', 'z.B. 5')}
              {numField('max_daily_trades', 'Max. Daily Trades', 'z.B. 3', 'Trades')}
              {numField('max_risk_per_trade_pct', 'Max. Risk / Trade', 'z.B. 2')}
              {numField('max_drawdown_pct', 'Max. Drawdown', 'z.B. 10')}
            </div>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Speichern…</>
                : <><Save className="h-4 w-4" /> Speichern</>
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
