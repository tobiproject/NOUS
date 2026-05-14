import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildSystemPrompt } from '@/lib/coach-system-prompt'
import { getCoachContext } from '@/lib/coach-context'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIToolSchema {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface AICompleteResult {
  text: string | null
  toolResult: Record<string, unknown> | null
}

// Fetches the user's stored API key from DB.
async function getUserApiKey(userId: string): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
      .from('user_ai_settings')
      .select('api_key')
      .eq('user_id', userId)
      .maybeSingle()
    return data?.api_key ?? null
  } catch {
    return null
  }
}

function resolveAnthropicKey(userKey: string | null): string {
  const key = userKey || process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('Kein Anthropic API-Key konfiguriert. Bitte in Einstellungen → API Key hinterlegen.')
  return key
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'

// ─── Core Anthropic call ─────────────────────────────────────────────────────

async function callAnthropic(params: {
  apiKey: string
  system: string
  messages: AIMessage[]
  tool?: AIToolSchema
  maxTokens?: number
}): Promise<AICompleteResult> {
  const client = new Anthropic({ apiKey: params.apiKey })

  if (params.tool) {
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: params.messages,
      tools: [params.tool as Anthropic.Tool],
      tool_choice: { type: 'tool', name: params.tool.name },
    })
    const toolBlock = response.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
    return { text: null, toolResult: (toolBlock?.input as Record<string, unknown>) ?? null }
  }

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: params.maxTokens ?? 2048,
    system: params.system,
    messages: params.messages,
  })

  const textBlock = response.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined
  return { text: textBlock?.text ?? null, toolResult: null }
}

// ─── Public interface ────────────────────────────────────────────────────────

/**
 * Hauptfunktion für alle KI-Aufrufe in NOUS.
 *
 * - Lädt automatisch den User-API-Key
 * - Stellt den Coach-Basis-Prompt voran
 * - Injiziert das Coach-Profil des Nutzers (sofern vorhanden)
 *
 * `system` sollte NUR den route-spezifischen Kontext enthalten.
 */
export async function callAI(params: {
  userId: string
  accountId?: string | null
  system: string
  messages: AIMessage[]
  tool?: AIToolSchema
  maxTokens?: number
  /** true = system-param wird unverändert genutzt (Legacy/interne Routen) */
  rawSystem?: boolean
}): Promise<AICompleteResult> {
  const [userKey, coachContext] = await Promise.all([
    getUserApiKey(params.userId),
    params.rawSystem ? Promise.resolve('') : getCoachContext(params.userId, params.accountId),
  ])

  const apiKey = resolveAnthropicKey(userKey)

  let system: string
  if (params.rawSystem) {
    system = params.system
  } else {
    const routeContext = coachContext
      ? `${coachContext}\n\n${params.system}`
      : params.system
    system = buildSystemPrompt(routeContext)
  }

  return callAnthropic({ apiKey, system, messages: params.messages, tool: params.tool, maxTokens: params.maxTokens })
}

// Für Streaming-Routen (calendar-event-analysis) die direkt einen Anthropic-Client brauchen.
export async function getAnthropicClient(userId: string): Promise<{ client: Anthropic; model: string }> {
  const userKey = await getUserApiKey(userId)
  const apiKey = resolveAnthropicKey(userKey)
  return { client: new Anthropic({ apiKey }), model: DEFAULT_MODEL }
}

// Backwards-compatible helper — für Routen die noch keinen userId haben.
export function getAnthropicClientDirect(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey: key })
}
