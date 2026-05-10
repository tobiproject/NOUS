import { NextResponse } from 'next/server'
import { fetchAndStoreEconomicEvents } from '@/lib/calendar-fetcher'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await fetchAndStoreEconomicEvents()
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/fetch-economic-events]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
