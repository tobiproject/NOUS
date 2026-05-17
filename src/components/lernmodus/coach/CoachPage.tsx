'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Mic, MicOff, Brain, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface InsightCounts {
  total: number
  confirmed: number
  pending: number
}

export function CoachPage() {
  const { activeAccount } = useAccountContext()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [insightCounts, setInsightCounts] = useState<InsightCounts | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    setSpeechSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const fetchInsightCounts = useCallback(async () => {
    if (!activeAccount) return
    try {
      const res = await fetch(`/api/ai/coach-insights?account_id=${activeAccount.id}`)
      if (res.ok) {
        const data = await res.json()
        setInsightCounts(data.counts ?? null)
      }
    } catch {
      // non-blocking
    }
  }, [activeAccount])

  const loadConversation = useCallback(async () => {
    if (!activeAccount) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/ai/coach-chat?account_id=${activeAccount.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
        setConversationId(data.id ?? null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount])

  useEffect(() => {
    loadConversation()
    fetchInsightCounts()
  }, [loadConversation, fetchInsightCounts])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const handleSend = async () => {
    if (!input.trim() || !activeAccount || isStreaming) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch('/api/ai/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: activeAccount.id,
          conversation_id: conversationId,
          message: userMessage.content,
        }),
      })

      if (!res.ok || !res.body) {
        setIsStreaming(false)
        // Remove the optimistic user message on hard failure
        setMessages(prev => prev.filter((_, i) => i !== prev.length - 1))
        toast.error('Coach nicht erreichbar — bitte versuche es erneut.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '', created_at: new Date().toISOString() },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'conversation_id') {
                setConversationId(parsed.id)
              } else if (parsed.type === 'delta') {
                assistantContent += parsed.content
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent,
                  }
                  return updated
                })
              }
            } catch {
              assistantContent += data
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: assistantContent,
                }
                return updated
              })
            }
          }
        }
      }

      // Refresh insight counts after response (insights are extracted async)
      setTimeout(() => fetchInsightCounts(), 3000)
    } finally {
      setIsStreaming(false)
    }
  }

  const toggleSpeech = () => {
    if (!speechSupported) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'de-DE'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? `${prev} ${transcript}` : transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">KI-Coach</h1>
        <span className="text-sm text-muted-foreground ml-auto">
          {messages.length > 0 && `${messages.length} Nachrichten`}
        </span>
      </div>

      {/* Context Banner */}
      {insightCounts && insightCounts.total > 0 && (
        <div className="shrink-0 flex items-center gap-3 rounded-lg px-4 py-2.5 bg-muted/40 border border-border/60 text-sm">
          <Brain className="h-4 w-4 text-purple-400 shrink-0" />
          <span className="text-muted-foreground flex-1">
            <span className="text-foreground font-medium">{insightCounts.confirmed}</span> aktive Erkenntnisse
            {insightCounts.pending > 0 && (
              <>
                {' · '}
                <span className="text-amber-400 font-medium">{insightCounts.pending}</span> warten auf Bestätigung
              </>
            )}
          </span>
          {insightCounts.pending > 0 && (
            <Link href="/einstellungen?tab=coach-memory" className="shrink-0">
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-colors">
                <Clock className="h-3 w-3 mr-1" />
                Bestätigen
              </Badge>
            </Link>
          )}
          {insightCounts.pending === 0 && insightCounts.confirmed > 0 && (
            <Link href="/einstellungen?tab=coach-memory" className="shrink-0">
              <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-400 hover:bg-purple-500/10 cursor-pointer transition-colors">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verwalten
              </Badge>
            </Link>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Dein psychologischer Coach</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Schreib was dich beschäftigt — nach einem Trade, nach einem schwierigen Tag oder einfach wenn du über dein Trading nachdenken willst.
                    </p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
                <div className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs">KI</span>
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%]">
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t space-y-2">
            <div className="flex gap-2">
              <Textarea
                placeholder="Was beschäftigt dich heute?"
                rows={2}
                className="resize-none text-sm flex-1"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isStreaming}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                {speechSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant={isListening ? 'destructive' : 'outline'}
                    className="h-9 w-9 shrink-0"
                    onClick={toggleSpeech}
                    title={isListening ? 'Aufnahme stoppen' : 'Spracheingabe'}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-2 items-start', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs',
          isUser ? 'bg-primary/20' : 'bg-purple-500/20'
        )}
      >
        {isUser ? 'Du' : 'KI'}
      </div>
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed',
          isUser ? 'bg-primary/10 text-foreground' : 'bg-muted text-foreground'
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
