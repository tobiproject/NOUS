import { NextRequest, NextResponse } from 'next/server'

const TV_SEARCH_TYPE: Record<string, string> = {
  stocks: 'stock',
  futures: 'futures',
  commodities: 'futures',
  forex: 'forex',
  crypto: 'crypto',
  indices: 'index',
  bonds: 'bond',
  etf: 'fund',
  cfd: 'cfd',
}

function mapCategory(type: string, exchange: string, description: string): string {
  const desc = description.toLowerCase()
  const exch = exchange.toUpperCase()
  switch (type) {
    case 'stock': case 'dr': case 'structured': return 'stocks'
    case 'forex': return 'forex'
    case 'crypto': return 'crypto'
    case 'index': return 'indices'
    case 'fund': return 'etf'
    case 'bond': return 'bonds'
    case 'cfd': return 'cfd'
    case 'futures': {
      if (exch === 'COMEX' || desc.match(/gold|silver|copper|platinum|palladium|aluminum/)) return 'metals'
      if (desc.match(/crude|oil|brent|wti|natural gas|gasoline|heating oil/) || (exch === 'NYMEX' && desc.match(/oil|gas/))) return 'energy'
      if (exch === 'CBOT' || desc.match(/corn|wheat|soy|sugar|coffee|cocoa|cotton|oat|rice|cattle|hog|lumber/)) return 'agriculture'
      if (desc.match(/treasury|t-note|t-bond|bund|bobl|schatz|gilt|oat|btp/)) return 'bonds'
      return 'futures'
    }
    default: return 'other'
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const tab = req.nextUrl.searchParams.get('tab') ?? 'all'
  if (!q.trim()) return NextResponse.json({ results: [] })

  const tvType = TV_SEARCH_TYPE[tab] ?? ''

  try {
    const url = new URL('https://symbol-search.tradingview.com/symbol_search/v3/')
    url.searchParams.set('text', q)
    url.searchParams.set('hl', '0')
    url.searchParams.set('exchange', '')
    url.searchParams.set('lang', 'de')
    url.searchParams.set('search_type', tvType)
    url.searchParams.set('domain', 'production')
    url.searchParams.set('sort_by_country', 'US')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(`TV ${res.status}`)

    const data = await res.json()
    const raw: Record<string, string>[] = (data.symbols ?? []).slice(0, 25)

    const results = raw.map(s => {
      const sym = (s.symbol ?? '').replace(/\d+!$/, '')
      return {
        symbol: sym,
        name: s.description ?? '',
        category: mapCategory(s.type ?? '', s.exchange ?? '', s.description ?? ''),
        exchange: s.exchange ?? '',
      }
    }).filter(r => r.symbol)

    const filtered = tab === 'commodities'
      ? results.filter(r => ['metals', 'energy', 'agriculture'].includes(r.category))
      : results

    return NextResponse.json({ results: filtered })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
