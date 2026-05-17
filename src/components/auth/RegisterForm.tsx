'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'

const schema = z
  .object({
    email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwörter stimmen nicht überein.',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function RegisterForm() {
  const { register } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { data, error } = await register(values.email, values.password)

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        setServerError('Diese E-Mail-Adresse ist bereits registriert.')
      } else {
        setServerError('Registrierung fehlgeschlagen. Bitte versuche es erneut.')
      }
      return
    }

    if (data.user) {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <p className="text-sm text-green-400 font-medium">Bestätigungs-E-Mail gesendet!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Bitte überprüfe dein Postfach und klicke auf den Bestätigungslink.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          E-Mail nicht erhalten?{' '}
          <button
            className="text-foreground underline underline-offset-4 hover:no-underline"
            onClick={() => setSuccess(false)}
          >
            Erneut senden
          </button>
        </p>
        <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
          Zum Login →
        </Link>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="deine@email.de"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Min. 8 Zeichen"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort bestätigen</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Konto wird erstellt…' : 'Konto erstellen'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Bereits registriert?{' '}
          <Link href="/login" className="text-foreground underline underline-offset-4 hover:no-underline">
            Einloggen
          </Link>
        </p>
      </form>
    </Form>
  )
}
