import { XMLParser } from 'fast-xml-parser'
import { createClient } from '@supabase/supabase-js'

const FEEDS = [
  'https://nfs.faireconomy.media/ff_calendar_thisweek.xml',
  'https://nfs.faireconomy.media/ff_calendar_nextweek.xml',
]

// Currency → country code mapping for flags
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP', CAD: 'CA',
  AUD: 'AU', NZD: 'NZ', CHF: 'CH', CNY: 'CN', HKD: 'HK',
  SGD: 'SG', NOK: 'NO', SEK: 'SE', DKK: 'DK', MXN: 'MX',
  BRL: 'BR', INR: 'IN', KRW: 'KR', ZAR: 'ZA', TRY: 'TR',
  ALL: 'INT',
}

function parseImpact(raw: string): 'High' | 'Medium' | 'Low' {
  const lower = raw?.toLowerCase() ?? ''
  if (lower.includes('high') || lower === '3') return 'High'
  if (lower.includes('medium') || lower === '2') return 'Medium'
  return 'Low'
}

// Forex Factory times are US/Eastern — convert to UTC with proper DST handling.
// Runs in Node.js/Vercel (UTC server timezone), uses Intl to auto-detect EDT vs EST.
function easternToUtc(dateStr: string, timeStr: string): string | null {
  const lowerTime = (timeStr ?? '').toLowerCase().trim()
  if (!lowerTime || lowerTime === 'all day' || lowerTime === 'tentative') return null

  try {
    // Parse the naive datetime — in Vercel production the server is UTC so this
    // gives us a UTC timestamp whose wall-clock value matches the FF datetime string.
    const naive = new Date(`${dateStr} ${timeStr}`)
    if (isNaN(naive.getTime())) return null

    // Use Intl to find what America/New_York shows for our naive UTC timestamp.
    // This correctly handles EDT (UTC-4, Apr-Nov) vs EST (UTC-5, Nov-Mar).
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(naive)

    const p: Record<string, string> = {}
    for (const part of parts) if (part.type !== 'literal') p[part.type] = part.value

    // Reconstruct what Eastern displays as a UTC-anchored timestamp
    const hr = p.hour === '24' ? '00' : p.hour
    const easternAsUtc = new Date(`${p.year}-${p.month}-${p.day}T${hr}:${p.minute}:${p.second}Z`)

    // offsetMs = how many ms Eastern is behind UTC at this date (e.g. 4h or 5h)
    const offsetMs = naive.getTime() - easternAsUtc.getTime()

    return new Date(naive.getTime() + offsetMs).toISOString()
  } catch {
    return null
  }
}

interface RawEvent {
  title: string
  country: string
  date: string
  time: string
  impact: string
  forecast: string
  previous: string
  actual: string
}

async function parseFeed(url: string): Promise<RawEvent[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NOUS-Trading-App/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`FF feed ${url} returned ${res.status}`)
  const xml = await res.text()

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  const parsed = parser.parse(xml)

  const items: RawEvent[] = []
  const channel = parsed?.weeklyevents?.event ?? parsed?.rss?.channel?.item ?? []
  const eventList = Array.isArray(channel) ? channel : [channel]

  for (const item of eventList) {
    if (!item) continue
    items.push({
      title: String(item.title ?? item.name ?? '').trim(),
      country: String(item.country ?? item.currency ?? '').trim().toUpperCase(),
      date: String(item.date ?? '').trim(),
      time: String(item.time ?? '').trim(),
      impact: String(item.impact ?? '').trim(),
      forecast: String(item.forecast ?? '').trim(),
      previous: String(item.previous ?? '').trim(),
      actual: String(item.actual ?? '').trim(),
    })
  }
  return items
}

export async function fetchAndStoreEconomicEvents(): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const allEvents: RawEvent[] = []
  for (const feed of FEEDS) {
    try {
      const events = await parseFeed(feed)
      allEvents.push(...events)
    } catch (err) {
      console.error(`Failed to fetch ${feed}:`, err)
    }
  }

  if (allEvents.length === 0) return

  const now = new Date().toISOString()
  const rows = allEvents
    .filter(e => e.title && e.country && e.date)
    .map(e => {
      const currency = e.country
      const countryCode = CURRENCY_TO_COUNTRY[currency] ?? currency.slice(0, 2)
      const ffEventId = `${e.date}_${currency}_${e.title.replace(/\s+/g, '_').toLowerCase()}`

      return {
        ff_event_id: ffEventId,
        date: e.date,
        time_utc: easternToUtc(e.date, e.time),
        currency,
        country_code: countryCode,
        impact: parseImpact(e.impact),
        title: e.title,
        actual: e.actual || null,
        forecast: e.forecast || null,
        previous: e.previous || null,
        last_fetched_at: now,
      }
    })

  // Upsert by ff_event_id — always overwrite actual values when present
  const chunkSize = 100
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await supabase
      .from('economic_events')
      .upsert(chunk, { onConflict: 'ff_event_id' })
  }
}
