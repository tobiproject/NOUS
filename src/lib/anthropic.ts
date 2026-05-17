import Anthropic from '@anthropic-ai/sdk'

// Used by legacy routes that pass the client directly.
// New routes should use callAI() from @/lib/ai-client instead.
export function getAnthropicClient(userApiKey?: string | null): Anthropic {
  const key = userApiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error(`Kein Anthropic API-Key gesetzt. Bitte in Einstellungen → KI-Provider eintragen oder ANTHROPIC_API_KEY in der Umgebung setzen.`)
  }
  return new Anthropic({ apiKey: key })
}
