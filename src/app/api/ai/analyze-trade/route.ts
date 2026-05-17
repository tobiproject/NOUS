import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { callAI } from '@/lib/ai-client'
import { TRADE_ANALYSIS_TOOL, buildTradePrompt } from '@/lib/ai-prompts'
import { getKnowledgeContext } from '@/lib/knowledge-context'
import { getTradingPlanContext } from '@/lib/trading-plan-context'

const BodySchema = z.object({
  trade_id: z.string().uuid(),
  account_id: z.string().uuid(),
})

async function runAnalysis(
  tradeId: string,
  accountId: string,
  userId: string,
  analysisId: string
) {
  const supabase = await createServerSupabaseClient()

  // Mark as processing
  await supabase
    .from('ai_analyses')
    .update({ status: 'processing' })
    .eq('id', analysisId)

  try {
    // Load trade
    const { data: trade, error: tradeErr } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single()
    if (tradeErr || !trade) throw new Error('Trade not found')

    // Load account stats (last 30 days)
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: recentTrades } = await supabase
      .from('trades')
      .select('outcome, result_currency, rr_ratio')
      .eq('account_id', accountId)
      .gte('traded_at', cutoff)

    const wins = (recentTrades ?? []).filter(t => t.outcome === 'win')
    const losses = (recentTrades ?? []).filter(t => t.outcome === 'loss')
    const decided = wins.length + losses.length
    const grossProfit = wins.reduce((s: number, t) => s + (t.result_currency ?? 0), 0)
    const grossLoss = Math.abs(losses.reduce((s: number, t) => s + (t.result_currency ?? 0), 0))
    const rrValues = (recentTrades ?? []).filter(t => t.rr_ratio !== null).map(t => t.rr_ratio as number)

    const accountStats = {
      winrate30d: decided > 0 ? Math.round((wins.length / decided) * 1000) / 10 : null,
      avgRR: rrValues.length > 0 ? Math.round((rrValues.reduce((s, v) => s + v, 0) / rrValues.length) * 100) / 100 : null,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : null,
    }

    // Load active trading rules
    const { data: rules } = await supabase
      .from('trading_rules')
      .select('rule_text')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order')

    const tradingRules = (rules ?? []).map(r => r.rule_text)

    // Load knowledge base context and trading plan in parallel
    const [knowledgeContext, tradingPlanContext] = await Promise.all([
      getKnowledgeContext(userId),
      getTradingPlanContext(userId),
    ])

    const systemParts = [knowledgeContext, tradingPlanContext].filter(Boolean)
    const systemPrompt = systemParts.join('\n\n---\n\n')

    // Call Claude with retry + exponential backoff
    type AnalysisResult = { score: number; errors: unknown; strengths: unknown; suggestions: unknown; summary: string }
    let lastError: Error | null = null
    let result: AnalysisResult | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      }
      try {
        const aiResponse = await callAI({
          userId,
          system: systemPrompt,
          messages: [{ role: 'user', content: buildTradePrompt(trade, accountStats, tradingRules) }],
          tool: TRADE_ANALYSIS_TOOL,
          maxTokens: 1024,
        })

        if (!aiResponse.toolResult) throw new Error('No tool result in response')
        result = aiResponse.toolResult as AnalysisResult
        lastError = null
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        await supabase
          .from('ai_analyses')
          .update({ retry_count: attempt + 1 })
          .eq('id', analysisId)
      }
    }

    if (!result || lastError) {
      await supabase
        .from('ai_analyses')
        .update({ status: 'failed', error_message: lastError?.message ?? 'Unknown error' })
        .eq('id', analysisId)
      return
    }

    // Save completed analysis
    await supabase
      .from('ai_analyses')
      .update({
        status: 'completed',
        score: result.score,
        errors: result.errors,
        strengths: result.strengths,
        suggestions: result.suggestions,
        summary: result.summary,
        full_response: result,
      })
      .eq('id', analysisId)
  } catch (err) {
    await supabase
      .from('ai_analyses')
      .update({ status: 'failed', error_message: err instanceof Error ? err.message : 'Unknown error' })
      .eq('id', analysisId)
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

  const { trade_id, account_id } = parsed.data

  // Verify trade belongs to user
  const { data: trade } = await supabase
    .from('trades')
    .select('id')
    .eq('id', trade_id)
    .eq('account_id', account_id)
    .single()
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // Upsert analysis row (reset if re-analyzing)
  const { data: existing } = await supabase
    .from('ai_analyses')
    .select('id, status')
    .eq('trade_id', trade_id)
    .eq('type', 'trade')
    .maybeSingle()

  let analysisId: string

  if (existing) {
    await supabase
      .from('ai_analyses')
      .update({ status: 'pending', retry_count: 0, error_message: null })
      .eq('id', existing.id)
    analysisId = existing.id
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('ai_analyses')
      .insert({ trade_id, user_id: user.id, account_id, type: 'trade' })
      .select('id')
      .single()
    if (insertErr || !inserted) {
      return NextResponse.json({ error: 'Failed to create analysis' }, { status: 500 })
    }
    analysisId = inserted.id
  }

  // Use after() to keep function alive until analysis completes
  after(() => runAnalysis(trade_id, account_id, user.id, analysisId).catch(console.error))

  return NextResponse.json({ id: analysisId, status: 'pending' })
}
