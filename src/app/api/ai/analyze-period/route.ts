import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { callAI } from '@/lib/ai-client'
import { PERIOD_ANALYSIS_TOOL, buildPeriodPrompt } from '@/lib/ai-prompts'
import { getKnowledgeContext } from '@/lib/knowledge-context'
import { getTradingPlanContext } from '@/lib/trading-plan-context'
import type { Trade } from '@/hooks/useTrades'

const BodySchema = z.object({
  account_id: z.string().uuid(),
  type: z.enum(['weekly', 'monthly']),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function runPeriodAnalysis(
  accountId: string,
  userId: string,
  type: 'weekly' | 'monthly',
  periodStart: string,
  periodEnd: string,
  analysisId: string
) {
  const supabase = await createServerSupabaseClient()

  await supabase.from('ai_analyses').update({ status: 'processing' }).eq('id', analysisId)

  try {
    // Load trades in period
    const { data: trades, error: tradeErr } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', accountId)
      .gte('traded_at', `${periodStart}T00:00:00Z`)
      .lte('traded_at', `${periodEnd}T23:59:59Z`)
      .order('traded_at', { ascending: true })

    if (tradeErr) throw new Error(tradeErr.message)
    if (!trades || trades.length === 0) {
      await supabase.from('ai_analyses').update({ status: 'failed', error_message: 'Keine Trades im Zeitraum' }).eq('id', analysisId)
      return
    }

    // Load previous period stats for monthly comparison
    let prevStats: { winRate: number | null; profitFactor: number | null; avgRR: number | null } | undefined

    if (type === 'monthly') {
      const prevEnd = new Date(periodStart)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(1)

      const { data: prevTrades } = await supabase
        .from('trades')
        .select('outcome, result_currency, rr_ratio')
        .eq('account_id', accountId)
        .gte('traded_at', `${prevStart.toISOString().split('T')[0]}T00:00:00Z`)
        .lte('traded_at', `${prevEnd.toISOString().split('T')[0]}T23:59:59Z`)

      if (prevTrades && prevTrades.length > 0) {
        const pw = prevTrades.filter(t => t.outcome === 'win')
        const pl = prevTrades.filter(t => t.outcome === 'loss')
        const pd = pw.length + pl.length
        const pgp = pw.reduce((s: number, t) => s + (t.result_currency ?? 0), 0)
        const pgl = Math.abs(pl.reduce((s: number, t) => s + (t.result_currency ?? 0), 0))
        const prr = prevTrades.filter(t => t.rr_ratio !== null).map(t => t.rr_ratio as number)
        prevStats = {
          winRate: pd > 0 ? Math.round((pw.length / pd) * 1000) / 10 : null,
          profitFactor: pgl > 0 ? Math.round((pgp / pgl) * 100) / 100 : pgp > 0 ? 999 : null,
          avgRR: prr.length > 0 ? Math.round((prr.reduce((s, v) => s + v, 0) / prr.length) * 100) / 100 : null,
        }
      }
    }

    // Load knowledge base and trading plan context in parallel
    const [knowledgeContext, tradingPlanContext] = await Promise.all([
      getKnowledgeContext(userId),
      getTradingPlanContext(userId),
    ])
    const systemPrompt = [knowledgeContext, tradingPlanContext].filter(Boolean).join('\n\n---\n\n')

    // Call Claude with retry
    let lastError: Error | null = null
    let result: unknown = null

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      try {
        const aiResponse = await callAI({
          userId,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: buildPeriodPrompt(type, periodStart, periodEnd, trades as Trade[], prevStats),
          }],
          tool: PERIOD_ANALYSIS_TOOL,
          maxTokens: 1500,
        })

        if (!aiResponse.toolResult) throw new Error('No tool result in response')
        result = aiResponse.toolResult
        lastError = null
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        await supabase.from('ai_analyses').update({ retry_count: attempt + 1 }).eq('id', analysisId)
      }
    }

    if (!result || lastError) {
      await supabase.from('ai_analyses').update({ status: 'failed', error_message: lastError?.message ?? 'Unknown error' }).eq('id', analysisId)
      return
    }

    await supabase.from('ai_analyses').update({
      status: 'completed',
      full_response: result,
    }).eq('id', analysisId)
  } catch (err) {
    await supabase.from('ai_analyses').update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    }).eq('id', analysisId)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { account_id, type, period_start, period_end } = parsed.data

  // Upsert — if one already exists for this period, reset it
  const { data: existing } = await supabase
    .from('ai_analyses')
    .select('id')
    .eq('user_id', user.id)
    .eq('account_id', account_id)
    .eq('type', type)
    .eq('period_start', period_start)
    .maybeSingle()

  let analysisId: string

  if (existing) {
    await supabase
      .from('ai_analyses')
      .update({ status: 'pending', retry_count: 0, error_message: null, full_response: null })
      .eq('id', existing.id)
    analysisId = existing.id
  } else {
    const { data: inserted, error } = await supabase
      .from('ai_analyses')
      .insert({ user_id: user.id, account_id, type, period_start, period_end })
      .select('id')
      .single()
    if (error || !inserted) return NextResponse.json({ error: 'Failed to create analysis' }, { status: 500 })
    analysisId = inserted.id
  }

  after(() => runPeriodAnalysis(account_id, user.id, type, period_start, period_end, analysisId).catch(console.error))

  return NextResponse.json({ id: analysisId, status: 'pending' })
}
