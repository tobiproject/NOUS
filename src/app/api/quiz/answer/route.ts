import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/anthropic'

const schema = z.object({
  account_id: z.string().uuid(),
  session_id: z.string().uuid().nullable(),
  trade_id: z.string().uuid(),
  good_entry: z.enum(['yes', 'no', 'unsure']),
  setup_guess: z.string().max(200).optional().default(''),
  improvement_notes: z.string().max(1000).optional().default(''),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_id, session_id, trade_id, good_entry, setup_guess, improvement_notes } = parsed.data

  // Fetch the trade (verifies ownership)
  const { data: trade } = await supabase
    .from('trades')
    .select('*')
    .eq('id', trade_id)
    .eq('account_id', account_id)
    .eq('user_id', user.id)
    .single()

  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // Determine if correct: good_entry=yes → trade should be a win; no → loss
  const isCorrect =
    (good_entry === 'yes' && trade.outcome === 'win') ||
    (good_entry === 'no' && trade.outcome === 'loss') ||
    good_entry === 'unsure'

  // Generate AI comment
  let aiComment = ''
  try {
    const anthropic = getAnthropicClient()
    const tradeInfo = `Asset: ${trade.asset}, Richtung: ${trade.direction}, Entry: ${trade.entry_price}, SL: ${trade.sl_price}, TP: ${trade.tp_price}, Setup: ${trade.setup_type ?? 'unbekannt'}, Ergebnis: ${trade.outcome ?? 'unbekannt'}, P&L: ${trade.result_currency ?? 'unbekannt'}`
    const userAnswer = `Der Trader dachte: Guter Einstieg? ${good_entry}. Setup-Vermutung: "${setup_guess}". Verbesserungsidee: "${improvement_notes}".`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Du bist ein Trading-Coach. Kommentiere diesen Trade kurz (2-3 Sätze) auf Deutsch. Sei direkt und lehrreich.\n\nTrade: ${tradeInfo}\nAntwort des Traders: ${userAnswer}\n\nKommentar:`,
        },
      ],
    })
    aiComment = msg.content[0].type === 'text' ? msg.content[0].text : ''
  } catch {
    // AI comment is optional — don't fail the request
  }

  // Save answer
  await supabase.from('quiz_answers').insert({
    session_id,
    trade_id,
    account_id,
    user_id: user.id,
    good_entry,
    setup_guess,
    improvement_notes,
    ai_comment: aiComment,
    answered_at: new Date().toISOString(),
  })

  return NextResponse.json({ ai_comment: aiComment, is_correct: isCorrect })
}
