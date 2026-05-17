import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { format } from 'date-fns'
import { escapeCell } from '@/lib/export-utils'

const HEADERS_DE = [
  'ID', 'Konto-ID', 'Datum', 'Asset', 'Richtung', 'Entry', 'Stop-Loss', 'Take-Profit',
  'Lotgröße', 'Ergebnis (€)', 'Ergebnis (%)', 'RR-Ratio', 'Risiko (%)', 'Ergebnis',
  'Setup', 'Strategie', 'Marktphase', 'Tags', 'Emotion vorher', 'Emotion nachher',
  'News-Event', 'News-Name', 'News-Impact', 'News-Timing (min)', 'Notizen', 'Erstellt am',
]

const HEADERS_EN = [
  'ID', 'Account ID', 'Date', 'Asset', 'Direction', 'Entry', 'Stop Loss', 'Take Profit',
  'Lot Size', 'Result (€)', 'Result (%)', 'RR Ratio', 'Risk (%)', 'Outcome',
  'Setup', 'Strategy', 'Market Phase', 'Tags', 'Emotion Before', 'Emotion After',
  'News Event', 'News Name', 'News Impact', 'News Timing (min)', 'Notes', 'Created At',
]


function tradeToRow(trade: Record<string, unknown>): string {
  const cells = [
    trade.id,
    trade.account_id,
    trade.traded_at ? format(new Date(trade.traded_at as string), 'yyyy-MM-dd HH:mm:ss') : '',
    trade.asset,
    trade.direction,
    trade.entry_price,
    trade.sl_price,
    trade.tp_price,
    trade.lot_size,
    trade.result_currency,
    trade.result_percent,
    trade.rr_ratio,
    trade.risk_percent,
    trade.outcome,
    trade.setup_type,
    trade.strategy,
    trade.market_phase,
    Array.isArray(trade.tags) ? (trade.tags as string[]).join('; ') : trade.tags,
    trade.emotion_before,
    trade.emotion_after,
    trade.news_event_present,
    trade.news_event_name,
    trade.news_impact_level,
    trade.news_timing_minutes,
    trade.notes,
    trade.created_at ? format(new Date(trade.created_at as string), 'yyyy-MM-dd HH:mm:ss') : '',
  ]
  return cells.map(escapeCell).join(',')
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const lang = searchParams.get('lang') ?? 'de'
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  let query = supabase
    .from('trades')
    .select('*')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .order('traded_at', { ascending: false })

  if (dateFrom) query = query.gte('traded_at', dateFrom)
  if (dateTo) query = query.lte('traded_at', dateTo)

  const { data: trades, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = lang === 'en' ? HEADERS_EN : HEADERS_DE
  const rows = [
    headers.join(','),
    ...(trades ?? []).map(t => tradeToRow(t as Record<string, unknown>)),
  ]
  const csv = rows.join('\n')

  const filename = `nous-export-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
