import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const screenshotFile = formData.get('screenshot') as File | null
  const tradeJson = formData.get('trade') as string | null

  if (!screenshotFile || !tradeJson) {
    return NextResponse.json({ error: 'Screenshot und Trade-Daten erforderlich' }, { status: 400 })
  }

  const trade = JSON.parse(tradeJson)
  const imageBuffer = await screenshotFile.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')
  const mediaType = (screenshotFile.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || 'image/jpeg'

  // Vision route — Anthropic only (image analysis)
  const { data: aiSettings } = await supabase.from('user_ai_settings').select('api_key').eq('user_id', user.id).maybeSingle()
  const client = getAnthropicClient(aiSettings?.api_key)
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Image },
        },
        {
          type: 'text',
          text: `Du analysierst einen Trading-Chart-Screenshot für folgende Position:
- Asset: ${trade.asset}
- Richtung: ${trade.direction === 'long' ? 'LONG' : 'SHORT'}
- Entry: ${trade.entry_price}
- Stop Loss: ${trade.sl_price}
- Take Profit: ${trade.tp_price}

Aufgabe: Bestimme aus dem Chart, wie weit der Kurs maximal in die ${trade.direction === 'long' ? 'Long-Richtung (Hochpunkt)' : 'Short-Richtung (Tiefpunkt)'} gelaufen ist, nachdem der Trade eingegangen wurde.

Antworte im JSON-Format:
{
  "estimated_max_price": <Zahl oder null wenn nicht erkennbar>,
  "analysis": "<2-3 Sätze Beschreibung was du im Chart siehst und wie weit der Trade gelaufen ist>"
}`,
        },
      ],
    }],
  })

  try {
    const text = (message.content[0] as { type: string; text: string }).text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return NextResponse.json(result)
    }
    return NextResponse.json({ estimated_max_price: null, analysis: text })
  } catch {
    return NextResponse.json({ estimated_max_price: null, analysis: 'Analyse konnte nicht verarbeitet werden.' })
  }
}
