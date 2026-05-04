'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Trash2, Loader2, Check, Plus, ExternalLink, Brain, Bell, BellOff, Mail, Key, Bot, Archive, Info, Camera, X } from 'lucide-react'
import Link from 'next/link'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAccounts } from '@/hooks/useAccounts'
import { type Account } from '@/contexts/AccountContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AssetMultiPicker } from '@/components/watchlist/AssetMultiPicker'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountCreateDialog } from '@/components/accounts/AccountCreateDialog'
import { AccountDeleteDialog } from '@/components/accounts/AccountDeleteDialog'

interface Strategy {
  name: string
  description: string
  rules: string[]
  preferred_timeframes: string[]
  instruments: string[]
}

const EMPTY: Strategy = {
  name: 'Meine Strategie',
  description: '',
  rules: [],
  preferred_timeframes: [],
  instruments: [],
}

const EXAMPLE_STRATEGY: Strategy = {
  name: 'NQ/ES Momentum Breakout',
  description: 'Intraday Momentum-Strategie auf E-Mini Futures (NQ & ES). Ich trade ausschließlich in der ersten Handelsstunde (9:30–11:00 ET) und in der Nachmittagssession (14:00–16:00 ET). Einstiege erfolgen nach bestätigten Breakouts aus dem Opening Range oder nach Pullbacks an wichtige VWAP-Levels. Kein Trading gegen den Tagestrend.',
  rules: [
    'Kein Trade vor 9:45 ET — Opening-Volatilität abwarten',
    'Nur in Trendrichtung traden — H1 Trend bestimmt Bias für den Tag',
    'Entry nur nach Konsolidierung und Volumen-Bestätigung (kein Thin-Air-Entry)',
    'Stop Loss immer hinter letztem Swing High/Low — kein fester Pip-Stop',
    'Maximales Risiko pro Trade: 1% des Kontostands (ca. $100 bei $10k)',
    'Kein Trade nach 2 aufeinanderfolgenden Verlusten — Pause einlegen',
    'Nachrichten-Events (FOMC, NFP, CPI) meiden — 30min vor und nach',
    'Tagesgewinnlimit: +$300 — danach Bildschirm aus',
    'Tagesverlustlimit: -$200 — danach kein weiterer Trade',
  ],
  preferred_timeframes: ['5m', '15m', '1h'],
  instruments: ['NQ', 'ES'],
}

const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W']

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-5 space-y-3"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Tab: Profil ─────────────────────────────────────────────────────────────

function ProfilTab() {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setDisplayName(d.display_name ?? '')
        setAvatarUrl(d.avatar_url ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveName = useCallback(async () => {
    setNameSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    })
    setNameSaving(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }, [displayName])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Datei zu groß — max. 2 MB')
      return
    }
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setAvatarUrl(data.avatar_url)
      setPreview(null)
      toast.success('Profilbild gespeichert')
    } else {
      toast.error(data.error ?? 'Upload fehlgeschlagen')
      setPreview(null)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const removeAvatar = useCallback(async () => {
    setRemoving(true)
    const res = await fetch('/api/profile/avatar', { method: 'DELETE' })
    if (res.ok) {
      setAvatarUrl(null)
      toast.success('Profilbild entfernt')
    } else {
      toast.error('Entfernen fehlgeschlagen')
    }
    setRemoving(false)
  }, [])

  const initial = displayName?.[0]?.toUpperCase() ?? '?'
  const displayImg = preview ?? avatarUrl

  if (loading) return (
    <div className="space-y-4">
      {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Section title="Profilbild" subtitle="JPEG, PNG oder WebP — max. 2 MB">
        <div className="flex items-center gap-5">
          {/* Preview circle */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden text-2xl font-bold"
              style={{ background: 'rgba(41,98,255,0.18)', color: 'var(--brand-blue)' }}
            >
              {displayImg ? (
                <Image
                  src={displayImg}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : initial}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-8 px-4 text-[13px] font-semibold rounded gap-2"
              style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
            >
              <Camera className="h-3.5 w-3.5" />
              {avatarUrl ? 'Bild ändern' : 'Bild hochladen'}
            </Button>
            {avatarUrl && (
              <Button
                onClick={removeAvatar}
                disabled={removing}
                className="h-8 px-4 text-[13px] font-semibold rounded gap-2"
                style={{ background: 'transparent', color: 'rgba(255,80,80,0.8)', border: '1px solid rgba(255,80,80,0.25)' }}
              >
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Entfernen
              </Button>
            )}
          </div>
        </div>
      </Section>

      {/* Display name */}
      <Section title="Anzeigename" subtitle="Wie soll dich NOUS nennen? Wird für Begrüßungen und KI-Kontext verwendet.">
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="z.B. Tobi"
            className="flex-1"
          />
          <Button
            onClick={saveName}
            disabled={nameSaving}
            className="h-8 px-4 text-[13px] font-semibold rounded shrink-0"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
          >
            {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? <Check className="h-4 w-4" /> : 'Speichern'}
          </Button>
        </div>
      </Section>
    </div>
  )
}

// ─── Tab: Strategie ─────────────────────────────────────────────────────────

function StrategieTab() {
  const [strategy, setStrategy] = useState<Strategy>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/strategy').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([stratData, profileData]) => {
      if (stratData.strategy) {
        setStrategy({
          name: stratData.strategy.name || '',
          description: stratData.strategy.description || '',
          rules: stratData.strategy.rules || [],
          preferred_timeframes: stratData.strategy.preferred_timeframes || [],
          instruments: stratData.strategy.instruments || [],
        })
      }
      setDisplayName(profileData.display_name ?? '')
    }).finally(() => setLoading(false))
  }, [])

  const saveName = useCallback(async () => {
    setNameSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    })
    setNameSaving(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }, [displayName])

  const save = useCallback(async () => {
    setSaving(true)
    const res = await fetch('/api/strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }, [strategy])

  const addRule = () => {
    const r = newRule.trim()
    if (!r) return
    setStrategy(s => ({ ...s, rules: [...s.rules, r] }))
    setNewRule('')
  }

  const removeRule = (i: number) =>
    setStrategy(s => ({ ...s, rules: s.rules.filter((_, j) => j !== i) }))

  const toggleTF = (tf: string) =>
    setStrategy(s => ({
      ...s,
      preferred_timeframes: s.preferred_timeframes.includes(tf)
        ? s.preferred_timeframes.filter(t => t !== tf)
        : [...s.preferred_timeframes, tf],
    }))

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
          Definiere deine Trading-Strategie — die KI nutzt dieses Profil für alle Analysen.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => setStrategy(EXAMPLE_STRATEGY)}
            className="h-8 px-3 text-[13px] font-semibold rounded"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
          >
            Beispiel laden
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="h-8 px-4 text-[13px] font-semibold rounded"
            style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <Check className="h-4 w-4 mr-2" /> : null}
            {saved ? 'Gespeichert' : 'Speichern'}
          </Button>
        </div>
      </div>

      <Section title="Dein Profil" subtitle="Wird für personalisierte Begrüßungen und KI-Kontext verwendet">
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Wie soll dich NOUS nennen? z.B. Tobi"
            className="flex-1"
          />
          <Button
            onClick={saveName}
            disabled={nameSaving}
            className="h-8 px-4 text-[13px] font-semibold rounded shrink-0"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
          >
            {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? <Check className="h-4 w-4" /> : 'Speichern'}
          </Button>
        </div>
      </Section>

      <Section title="Strategie-Name">
        <Input
          value={strategy.name}
          onChange={e => setStrategy(s => ({ ...s, name: e.target.value }))}
          placeholder="z.B. Trend-Following mit Breakout-Entries"
        />
      </Section>

      <Section title="Beschreibung" subtitle="Kurze Zusammenfassung deines Ansatzes">
        <Textarea
          rows={4}
          value={strategy.description}
          onChange={e => setStrategy(s => ({ ...s, description: e.target.value }))}
          placeholder="Beschreibe deinen Trading-Stil, Ansatz und Philosophie…"
          className="resize-none"
        />
      </Section>

      <Section title="Trading-Regeln" subtitle="Konkrete Regeln, die dein Setup definieren">
        <div className="space-y-2">
          {strategy.rules.map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded px-3 py-2"
              style={{ background: 'var(--bg-3)' }}
            >
              <span className="num text-xs shrink-0 mt-0.5" style={{ color: 'var(--fg-4)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm flex-1" style={{ color: 'var(--fg-1)' }}>{rule}</span>
              <button onClick={() => removeRule(i)}>
                <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              placeholder="Neue Regel hinzufügen…"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRule())}
            />
            <Button
              type="button"
              onClick={addRule}
              className="h-8 px-3 shrink-0 rounded"
              style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Bevorzugte Timeframes">
        <div className="flex flex-wrap gap-2">
          {TIMEFRAME_OPTIONS.map(tf => {
            const active = strategy.preferred_timeframes.includes(tf)
            return (
              <button
                key={tf}
                onClick={() => toggleTF(tf)}
                className="num text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                style={{
                  background: active ? 'var(--brand-blue)' : 'var(--bg-3)',
                  color: active ? '#fff' : 'var(--fg-2)',
                  border: `1px solid ${active ? 'var(--brand-blue)' : 'var(--border-raw)'}`,
                }}
              >
                {tf}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Instrumente / Märkte" subtitle="Welche Assets tradest du? Aus deiner Watchlist wählen.">
        <AssetMultiPicker
          value={strategy.instruments}
          onChange={instruments => setStrategy(s => ({ ...s, instruments }))}
          placeholder="Asset aus Watchlist…"
        />
      </Section>
    </div>
  )
}

// ─── Tab: Konten ─────────────────────────────────────────────────────────────

function KontenTab() {
  const { accounts, activeAccount, isLoading, setActiveAccount, archiveAccount, deleteAccount } = useAccounts()
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  async function handleArchive(account: Account) {
    setArchiveError(null)
    const { error } = await archiveAccount(account.id)
    if (error) {
      setArchiveError(error.message)
    } else {
      toast.success(`„${account.name}" archiviert.`)
    }
  }

  async function handleDelete(accountId: string) {
    const { error } = await deleteAccount(accountId)
    if (error) {
      toast.error('Konto konnte nicht gelöscht werden.')
    } else {
      toast.success('Konto gelöscht.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
          {accounts.length}/10 Konten · Klick auf ein Konto, um es zu aktivieren.
        </p>
        <AccountCreateDialog />
      </div>

      {archiveError && (
        <Alert variant="destructive">
          <AlertDescription>{archiveError}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div
          className="rounded-lg border border-dashed p-12 text-center space-y-4"
          style={{ borderColor: 'var(--border-raw)' }}
        >
          <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Noch kein Konto angelegt.</p>
          <AccountCreateDialog
            trigger={
              <Button
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Erstes Konto erstellen
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              isActive={account.id === activeAccount?.id}
              onSelect={setActiveAccount}
              onArchive={handleArchive}
              onDelete={acc => setAccountToDelete(acc)}
            />
          ))}
        </div>
      )}

      <AccountDeleteDialog
        account={accountToDelete}
        onConfirm={handleDelete}
        onClose={() => setAccountToDelete(null)}
      />

      {/* Archive info */}
      {accounts.length > 0 && (
        <div className="flex items-start gap-2 rounded px-4 py-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
          <Archive className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--fg-4)' }} />
          <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
            Archivierte Konten werden aus dem aktiven Wechsler entfernt, aber alle Trades bleiben erhalten und können exportiert werden.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: KI & System ────────────────────────────────────────────────────────

function KiSystemTab() {
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiSaving, setAiSaving] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)
  const [notifEmail, setNotifEmail] = useState('')
  const [notifEmailEnabled, setNotifEmailEnabled] = useState(false)
  const [propFirmReminderEnabled, setPropFirmReminderEnabled] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const { permission, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()

  useEffect(() => {
    fetch('/api/ai-settings').then(r => r.json()).then(d => {
      setAiProvider(d.provider ?? 'anthropic')
      setAiApiKey(d.api_key ?? '')
    })
    fetch('/api/notifications/settings').then(r => r.json()).then(d => {
      setNotifEmailEnabled(d.email_enabled ?? false)
      setNotifEmail(d.email_address ?? '')
      setPropFirmReminderEnabled(d.prop_firm_reminder_enabled ?? false)
    })
  }, [])

  const saveAiSettings = useCallback(async () => {
    setAiSaving(true)
    await fetch('/api/ai-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: aiProvider, api_key: aiApiKey || null }),
    })
    setAiSaving(false)
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2500)
  }, [aiProvider, aiApiKey])

  const saveNotifSettings = useCallback(async () => {
    setNotifSaving(true)
    await fetch('/api/notifications/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_enabled: notifEmailEnabled,
        email_address: notifEmail,
        prop_firm_reminder_enabled: propFirmReminderEnabled,
      }),
    })
    setNotifSaving(false)
    toast.success('Einstellungen gespeichert')
  }, [notifEmailEnabled, notifEmail, propFirmReminderEnabled])

  const handlePushToggle = async () => {
    if (subscribed || permission === 'granted') {
      await unsubscribe()
      toast.success('Push-Benachrichtigungen deaktiviert')
    } else {
      const ok = await subscribe()
      if (ok) toast.success('Push-Benachrichtigungen aktiviert')
      else if (permission === 'denied') toast.error('Browser hat Benachrichtigungen blockiert — bitte in Browser-Einstellungen erlauben')
    }
  }

  const sendTestNotification = async () => {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('NOUS — Test', {
      body: 'Push-Benachrichtigungen funktionieren! Samstag & Sonntag erhältst du eine Erinnerung.',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'nous-test',
      data: { url: '/wochenvorbereitung' },
    } as NotificationOptions)
  }

  return (
    <div className="space-y-6">

      {/* KI-Provider */}
      <Section title="KI-Provider" subtitle="Eigenen API-Key hinterlegen — NOUS nutzt dann dein Konto statt des Server-Schlüssels.">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['anthropic', 'openai'] as const).map(p => (
              <button
                key={p}
                onClick={() => setAiProvider(p)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors"
                style={{
                  background: aiProvider === p ? 'var(--brand-blue)' : 'var(--bg-3)',
                  color: aiProvider === p ? '#fff' : 'var(--fg-3)',
                  border: `1px solid ${aiProvider === p ? 'var(--brand-blue)' : 'var(--border-raw)'}`,
                }}
              >
                <Bot className="h-3.5 w-3.5" />
                {p === 'anthropic' ? 'Claude (Anthropic)' : 'GPT-4o (OpenAI)'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
              {aiProvider === 'anthropic' ? 'Anthropic API-Key' : 'OpenAI API-Key'}
              {' '}— wird verschlüsselt in deiner DB-Row gespeichert, nur du kannst ihn lesen.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                <Input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder={aiProvider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={saveAiSettings}
                disabled={aiSaving}
                className="h-9 px-4 text-sm font-semibold rounded shrink-0"
                style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
              >
                {aiSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : aiSaved ? <Check className="h-3.5 w-3.5" /> : 'Speichern'}
              </Button>
            </div>
            {!aiApiKey && (
              <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                Kein eigener Key — NOUS nutzt den Server-Schlüssel (Shared Budget).
              </p>
            )}
            {aiProvider === 'anthropic' && (
              <div
                className="flex items-start gap-2 px-3 py-2 rounded text-xs"
                style={{ background: 'rgba(41,98,255,0.08)', borderLeft: '2px solid var(--brand-blue)' }}
              >
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--brand-blue)' }} />
                <p style={{ color: 'var(--fg-3)' }}>
                  Damit alle Funktionen verfügbar sind, lade dein Anthropic-Konto mit mindestens 5 € auf.{' '}
                  <a
                    href="https://console.anthropic.com/settings/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:opacity-80"
                    style={{ color: 'var(--brand-blue)' }}
                  >
                    Guthaben aufladen →
                  </a>
                </p>
              </div>
            )}
          </div>

          {aiProvider === 'anthropic' && (
            <div className="space-y-2">
              <div className="rounded px-4 py-3 flex items-start gap-3" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}>
                <Brain className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-blue)' }} />
                <div className="space-y-1">
                  <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                    Jede KI-Analyse kostet ca. <span style={{ color: 'var(--fg-1)' }}>$0.002–$0.01</span> — bei normalem Nutzungsverhalten unter <span style={{ color: 'var(--fg-1)' }}>$5/Monat</span>.
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warn)' }}>
                    Mindest-Aufladung: <span className="font-semibold">$5</span> — Anthropic aktiviert den Key erst ab diesem Betrag.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold hover:opacity-80"
                  style={{ background: 'var(--brand-blue)', color: '#fff' }}>
                  <ExternalLink className="h-3 w-3" /> Billing öffnen
                </Link>
                <Link href="https://console.anthropic.com/settings/usage" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold hover:opacity-80"
                  style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}>
                  <ExternalLink className="h-3 w-3" /> API Usage
                </Link>
              </div>
            </div>
          )}
          {aiProvider === 'openai' && (
            <Link href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold hover:opacity-80"
              style={{ background: 'var(--brand-blue)', color: '#fff' }}>
              <ExternalLink className="h-3 w-3" /> OpenAI Usage öffnen
            </Link>
          )}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Benachrichtigungen" subtitle="Erinnerungen für Wochenvorbereitung — samstags & sonntags 9:00 Uhr">
        <div className="space-y-4">
          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {(subscribed || permission === 'granted') ? (
                <Bell className="h-4 w-4" style={{ color: 'var(--long)' }} />
              ) : (
                <BellOff className="h-4 w-4" style={{ color: 'var(--fg-4)' }} />
              )}
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Browser Push</p>
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  {permission === 'denied'
                    ? 'Vom Browser blockiert — in Browser-Einstellungen erlauben'
                    : permission === 'unsupported'
                    ? 'Von diesem Browser nicht unterstützt'
                    : subscribed || permission === 'granted'
                    ? 'Aktiv — du erhältst Samstag & Sonntag eine Erinnerung'
                    : 'Einmalige Browser-Erlaubnis nötig'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {(subscribed || permission === 'granted') && (
                <Button
                  onClick={sendTestNotification}
                  className="h-8 px-3 text-xs font-semibold rounded"
                  style={{ background: 'var(--bg-3)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
                >
                  Test
                </Button>
              )}
              <Button
                onClick={handlePushToggle}
                disabled={pushLoading || permission === 'denied' || permission === 'unsupported'}
                className="h-8 px-3 text-xs font-semibold rounded"
                style={{
                  background: (subscribed || permission === 'granted') ? 'var(--bg-3)' : 'var(--brand-blue)',
                  color: (subscribed || permission === 'granted') ? 'var(--fg-2)' : '#fff',
                  border: (subscribed || permission === 'granted') ? '1px solid var(--border-raw)' : 'none',
                }}
              >
                {pushLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                  (subscribed || permission === 'granted') ? 'Deaktivieren' : 'Aktivieren'}
              </Button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-raw)' }} />

          {/* Prop-Firm Regelwerk Erinnerung */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4" style={{ color: propFirmReminderEnabled ? 'var(--brand-blue)' : 'var(--fg-4)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>Prop-Firm Regelwerk</p>
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  Mo–Fr um 09:00 Uhr — deine Regeln als Push-Erinnerung vor dem Trading
                </p>
              </div>
            </div>
            <button
              onClick={() => setPropFirmReminderEnabled(v => !v)}
              disabled={!(subscribed || permission === 'granted')}
              className="w-10 h-5 rounded-full transition-colors shrink-0 relative disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: propFirmReminderEnabled ? 'var(--brand-blue)' : 'var(--bg-4)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{ background: '#fff', left: propFirmReminderEnabled ? '22px' : '2px' }}
              />
            </button>
          </div>
          {propFirmReminderEnabled && !(subscribed || permission === 'granted') && (
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
              Browser Push muss erst aktiviert sein.
            </p>
          )}

          <div style={{ borderTop: '1px solid var(--border-raw)' }} />

          {/* Email */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4" style={{ color: notifEmailEnabled ? 'var(--brand-blue)' : 'var(--fg-4)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>E-Mail Erinnerung</p>
                <p className="text-xs" style={{ color: 'var(--fg-4)' }}>Benötigt einen konfigurierten Resend-Key (RESEND_API_KEY)</p>
              </div>
              <button
                onClick={() => setNotifEmailEnabled(v => !v)}
                className="w-10 h-5 rounded-full transition-colors shrink-0 relative"
                style={{ background: notifEmailEnabled ? 'var(--brand-blue)' : 'var(--bg-4)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{ background: '#fff', left: notifEmailEnabled ? '22px' : '2px' }}
                />
              </button>
            </div>
            {notifEmailEnabled && (
              <Input
                type="email"
                value={notifEmail}
                onChange={e => setNotifEmail(e.target.value)}
                placeholder="deine@email.de"
              />
            )}
          </div>

          <Button
            onClick={saveNotifSettings}
            disabled={notifSaving}
            className="h-8 px-3 text-xs font-semibold rounded"
            style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
          >
            {notifSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
            Speichern
          </Button>
        </div>
      </Section>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

function EinstellungenInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = (searchParams.get('tab') ?? 'strategie') as 'profil' | 'strategie' | 'konten' | 'ki'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/einstellungen?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="eyebrow mb-1">Konfiguration</div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}
        >
          Einstellungen
        </h1>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="strategie">Strategie</TabsTrigger>
          <TabsTrigger value="konten">Konten</TabsTrigger>
          <TabsTrigger value="ki">KI & System</TabsTrigger>
        </TabsList>

        <TabsContent value="profil">
          <ProfilTab />
        </TabsContent>

        <TabsContent value="strategie">
          <StrategieTab />
        </TabsContent>

        <TabsContent value="konten">
          <KontenTab />
        </TabsContent>

        <TabsContent value="ki">
          <KiSystemTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function EinstellungenPage() {
  return (
    <Suspense>
      <EinstellungenInner />
    </Suspense>
  )
}
