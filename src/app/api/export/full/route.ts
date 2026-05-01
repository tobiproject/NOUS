import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { format } from 'date-fns'
import { zipSync, strToU8 } from 'fflate'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = Array.isArray(v) ? v.join('; ') : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = keys.join(',')
  const body = rows.map(r => keys.map(k => escape(r[k])).join(','))
  return [header, ...body].join('\n')
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  // Verify the account belongs to this user
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Fetch all data in parallel
  const [tradesResult, accountsResult, analysesResult, riskResult] = await Promise.all([
    supabase.from('trades').select('*').eq('account_id', accountId).eq('user_id', user.id).order('traded_at'),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('ai_analyses').select('*').eq('account_id', accountId).eq('user_id', user.id).order('created_at'),
    supabase.from('risk_configs').select('*').eq('account_id', accountId).eq('user_id', user.id),
  ])

  if (tradesResult.error) return NextResponse.json({ error: tradesResult.error.message }, { status: 500 })

  const trades = tradesResult.data ?? []
  const accounts = accountsResult.data ?? []
  const analyses = analysesResult.data ?? []
  const riskConfigs = riskResult.data ?? []

  const tradesCsv = trades.length
    ? toCSV(trades as Record<string, unknown>[])
    : 'No trades exported'

  const files = {
    'trades.csv': strToU8(tradesCsv),
    'accounts.json': strToU8(JSON.stringify(accounts, null, 2)),
    'ai_analyses.json': strToU8(JSON.stringify(analyses, null, 2)),
    'risk_configs.json': strToU8(JSON.stringify(riskConfigs, null, 2)),
    'export-info.json': strToU8(JSON.stringify({
      exported_at: new Date().toISOString(),
      user_id: user.id,
      account_id: accountId,
      account_name: account.name,
      trade_count: trades.length,
    }, null, 2)),
  }

  const zipped = zipSync(files)
  const filename = `nous-export-${format(new Date(), 'yyyy-MM-dd')}.zip`

  return new NextResponse(Buffer.from(zipped), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
