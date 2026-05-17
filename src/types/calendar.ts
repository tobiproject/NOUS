export type ImpactLevel = 'High' | 'Medium' | 'Low'

export interface TradeIndicator {
  trade_id: string
  asset: string
  direction: 'long' | 'short'
  rr_ratio: number | null
  result_currency: number | null
  entry_time: string
}

export interface EconomicEvent {
  id: string
  ff_event_id: string
  date: string // 'YYYY-MM-DD'
  time_utc: string | null // ISO datetime UTC, null = all-day/TBD
  currency: string
  country_code: string
  impact: ImpactLevel
  title: string
  actual: string | null
  forecast: string | null
  previous: string | null
  last_fetched_at: string
  trade_indicator?: TradeIndicator | null
}

export interface CalendarFilters {
  impact: ImpactLevel[]
  currencies: string[]
}

export interface WeekEventsResponse {
  events: EconomicEvent[]
  week_start: string
  week_end: string
  fetched_at: string | null
}
