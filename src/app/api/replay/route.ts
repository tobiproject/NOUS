import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const schema = z.object({
  account_id: z.string().uuid(),
  trade_id: z.string().uuid(),
  would_take: z.boolean(),
  reeval_sl: z.number().nullable().optional(),
  reeval_tp: z.number().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_id, trade_id, would_take, reeval_sl, reeval_tp } = parsed.data

  const { data: trade } = await supabase
    .from('trades')
    .select('*')
    .eq('id', trade_id)
    .eq('account_id', account_id)
    .eq('user_id', user.id)
    .single()

  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  const originalResult: number | null = trade.result_currency ?? null

  // Calculate re-eval result: if user provided reeval SL/TP, estimate P&L
  let reevalResult: number | null = null
  if (reeval_sl != null && reeval_tp != null && trade.entry_price && trade.lot_size) {
    const entry = trade.entry_price
    const direction = trade.direction

    // Compare entry vs original SL to get risk (1R)
    const originalRisk = trade.sl_price ? Math.abs(entry - trade.sl_price) : null
    const newRisk = Math.abs(entry - reeval_sl)

    if (originalRisk && originalRisk > 0 && newRisk > 0 && trade.result_currency != null) {
      // Scale original P&L proportionally by the change in SL distance
      const riskRatio = newRisk / originalRisk
      // If trade was a winner, use new TP to calculate reward
      const newReward = Math.abs(entry - reeval_tp)
      const newRR = newRisk > 0 ? newReward / newRisk : null
      if (newRR != null) {
        // Simple scaling: same win/loss status, different magnitude
        const wasWin = trade.outcome === 'win'
        reevalResult = wasWin
          ? Math.abs(trade.result_currency) * (newRR / (trade.rr_ratio ?? newRR))
          : -Math.abs(trade.result_currency) * riskRatio
      }
    }
  }

  const improvement = reevalResult != null && originalResult != null ? reevalResult - originalResult : null

  // Save evaluation
  await supabase.from('replay_evaluations').insert({
    trade_id,
    account_id,
    user_id: user.id,
    would_take,
    reeval_sl: reeval_sl ?? null,
    reeval_tp: reeval_tp ?? null,
    reeval_result: reevalResult,
    original_result: originalResult,
    evaluated_at: new Date().toISOString(),
  })

  // Track activity
  await supabase
    .from('learn_activity')
    .upsert(
      {
        account_id,
        user_id: user.id,
        activity_date: new Date().toISOString().split('T')[0],
        activity_type: 'replay',
      },
      { onConflict: 'account_id,user_id,activity_date,activity_type' }
    )

  return NextResponse.json({
    original_result: originalResult,
    reeval_result: reevalResult,
    improvement,
    would_have_been_better: improvement != null ? improvement > 0 : null,
  })
}
