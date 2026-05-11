'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const didNavigate = useRef(false)

  // Wenn macOS-Autofill während der Animation bestätigt wird → sofort einloggen
  const tryAutoLogin = useCallback(async () => {
    if (didNavigate.current) return
    const email = emailRef.current?.value?.trim()
    const password = passwordRef.current?.value
    if (!email || !password) return

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && !didNavigate.current) {
      didNavigate.current = true
      router.replace('/dashboard')
    }
  }, [router])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    async function init() {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        didNavigate.current = true
        router.replace('/dashboard')
        return
      }

      const shown = sessionStorage.getItem('nous-splash-v4')
      if (shown) {
        didNavigate.current = true
        router.replace('/login')
        return
      }

      // Erste Session: nach Splash-Ende zu /login (wenn Autofill nicht gekickt hat)
      timer = setTimeout(() => {
        if (!didNavigate.current) {
          didNavigate.current = true
          router.replace('/login')
        }
      }, 5800)
    }

    init()
    return () => clearTimeout(timer)
  }, [router])

  // Autofill-Events auf dem versteckten Formular abhören
  useEffect(() => {
    const emailEl = emailRef.current
    const passEl = passwordRef.current
    if (!emailEl || !passEl) return

    const handleFill = () => {
      if (emailEl.value && passEl.value) tryAutoLogin()
    }

    emailEl.addEventListener('input', handleFill)
    emailEl.addEventListener('change', handleFill)
    passEl.addEventListener('input', handleFill)
    passEl.addEventListener('change', handleFill)

    return () => {
      emailEl.removeEventListener('input', handleFill)
      emailEl.removeEventListener('change', handleFill)
      passEl.removeEventListener('input', handleFill)
      passEl.removeEventListener('change', handleFill)
    }
  }, [tryAutoLogin])

  // Verstecktes Formular — für macOS/iOS Autofill sichtbar aber nicht für den User
  // Position fixed off-screen damit Safari es befüllen kann (opacity:0 blockiert Autofill)
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); tryAutoLogin() }}
      style={{ position: 'fixed', left: '-200%', top: '-200%', width: '1px', height: '1px' }}
      aria-hidden="true"
    >
      <input
        ref={emailRef}
        type="email"
        name="email"
        autoComplete="username email"
        tabIndex={-1}
      />
      <input
        ref={passwordRef}
        type="password"
        name="password"
        autoComplete="current-password"
        tabIndex={-1}
      />
      <button type="submit" tabIndex={-1}>Login</button>
    </form>
  )
}
