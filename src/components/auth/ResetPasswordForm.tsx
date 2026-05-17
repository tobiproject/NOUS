'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'

const emailSchema = z.object({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
})

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwörter stimmen nicht überein.',
    path: ['confirmPassword'],
  })

type EmailValues = z.infer<typeof emailSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export function ResetPasswordForm() {
  const { sendPasswordResetEmail, updatePassword } = useAuth()
  const [mode, setMode] = useState<'request' | 'set'>('request')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setMode('set')
    }
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onRequestReset(values: EmailValues) {
    setServerError(null)
    const { error } = await sendPasswordResetEmail(values.email)
    if (error) {
      setServerError('Fehler beim Senden der E-Mail. Bitte versuche es erneut.')
      return
    }
    setSuccess(true)
    setResendCooldown(60)
  }

  async function onSetPassword(values: PasswordValues) {
    setServerError(null)
    const { error } = await updatePassword(values.password)
    if (error) {
      setServerError('Passwort konnte nicht aktualisiert werden. Bitte fordere einen neuen Link an.')
      return
    }
    window.location.href = '/dashboard'
  }

  if (mode === 'set') {
    return (
      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onSetPassword)} className="space-y-4" noValidate>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={passwordForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Neues Passwort</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min. 8 Zeichen" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={passwordForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passwort bestätigen</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Passwort wiederholen" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={passwordForm.formState.isSubmitting}>
            {passwordForm.formState.isSubmitting ? 'Wird gespeichert…' : 'Passwort setzen'}
          </Button>
        </form>
      </Form>
    )
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <p className="text-sm text-green-400 font-medium">Reset-Link gesendet!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Bitte überprüfe dein Postfach und klicke auf den Link.
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full text-sm"
          disabled={resendCooldown > 0}
          onClick={() => {
            const email = emailForm.getValues('email')
            sendPasswordResetEmail(email)
            setResendCooldown(60)
          }}
        >
          {resendCooldown > 0 ? `Erneut senden (${resendCooldown}s)` : 'Erneut senden'}
        </Button>
        <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
          Zum Login →
        </Link>
      </div>
    )
  }

  return (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(onRequestReset)} className="space-y-4" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail-Adresse</FormLabel>
              <FormControl>
                <Input type="email" placeholder="deine@email.de" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
          {emailForm.formState.isSubmitting ? 'Wird gesendet…' : 'Reset-Link senden'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground underline underline-offset-4 hover:no-underline">
            Zurück zum Login
          </Link>
        </p>
      </form>
    </Form>
  )
}
