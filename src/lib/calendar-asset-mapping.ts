// Static mapping: economic event types → tradeable symbols.
// No AI involved. Based on standard market correlations.
// Every entry here is verifiable — edit directly in this file if something is wrong.

export interface AssetMapping {
  keywords: string[]   // title substrings to match (case-insensitive, any one matches)
  currency?: string    // only match if event currency equals this
  symbols: string[]    // watchlist symbols affected
}

export const EVENT_ASSET_MAPPINGS: AssetMapping[] = [
  // ── US Labor Market ─────────────────────────────────────────────────────────
  {
    keywords: ['Non-Farm Payrolls', 'Nonfarm Payrolls', 'NFP'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'YM', 'MYM', 'RTY', 'GC', 'MGC', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD', 'DXY'],
  },
  {
    keywords: ['ADP Non-Farm', 'ADP Employment', 'ADP Nonfarm'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'GC', 'EURUSD', 'GBPUSD'],
  },
  {
    keywords: ['Unemployment Claims', 'Jobless Claims', 'Initial Claims', 'Continuing Claims'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'GC', 'EURUSD', 'GBPUSD'],
  },
  {
    keywords: ['JOLTS', 'Job Openings', 'Labor Turnover'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'EURUSD'],
  },
  {
    keywords: ['Unemployment Rate'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'EURUSD', 'GBPUSD', 'GC'],
  },
  // ── US Inflation ─────────────────────────────────────────────────────────────
  {
    keywords: ['CPI m/m', 'CPI y/y', 'Core CPI', 'Consumer Price Index'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'GC', 'MGC', 'EURUSD', 'GBPUSD', 'USDJPY', 'CL'],
  },
  {
    keywords: ['PCE Price Index', 'Core PCE', 'PCE'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'GC', 'EURUSD', 'GBPUSD'],
  },
  {
    keywords: ['PPI m/m', 'PPI y/y', 'Producer Price'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'GC', 'EURUSD'],
  },
  // ── Federal Reserve ──────────────────────────────────────────────────────────
  {
    keywords: ['FOMC', 'Federal Funds Rate', 'Fed Chair', 'Powell', 'Federal Reserve'],
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'YM', 'MYM', 'GC', 'MGC', 'CL', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'],
  },
  // ── US Growth & Activity ─────────────────────────────────────────────────────
  {
    keywords: ['GDP q/q', 'GDP m/m', 'GDP y/y', 'Gross Domestic Product'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'EURUSD', 'GBPUSD', 'GC'],
  },
  {
    keywords: ['ISM Manufacturing', 'ISM Services', 'ISM Non-Manufacturing'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ', 'CL'],
  },
  {
    keywords: ['Flash Manufacturing PMI', 'Flash Services PMI', 'Manufacturing PMI', 'Services PMI', 'Composite PMI'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ'],
  },
  {
    keywords: ['Retail Sales m/m', 'Core Retail Sales'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ'],
  },
  {
    keywords: ['CB Consumer Confidence', 'Michigan Consumer', 'Consumer Sentiment'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ'],
  },
  {
    keywords: ['Durable Goods', 'Core Durable Goods'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ'],
  },
  // ── US Housing ───────────────────────────────────────────────────────────────
  {
    keywords: ['Housing Starts', 'Building Permits', 'Existing Home Sales', 'New Home Sales', 'Pending Home Sales'],
    currency: 'USD',
    symbols: ['ES', 'MES', 'NQ', 'MNQ'],
  },
  // ── Energy ───────────────────────────────────────────────────────────────────
  {
    keywords: ['Crude Oil Inventories', 'EIA Crude', 'Oil Inventories', 'Cushing', 'Baker Hughes'],
    symbols: ['CL', 'MCL'],
  },
  {
    keywords: ['Natural Gas Storage', 'Natural Gas Inventories'],
    symbols: ['NG'],
  },
  // ── Bank of England ──────────────────────────────────────────────────────────
  {
    keywords: ['BOE', 'Bank of England', 'MPC Official Bank Rate', 'Official Bank Rate'],
    currency: 'GBP',
    symbols: ['GBPUSD', 'EURGBP', 'GBPJPY', 'GBPCHF', 'GBPCAD'],
  },
  {
    keywords: ['UK CPI', 'UK Inflation', 'UK GDP', 'UK Retail', 'Claimant Count', 'Average Earnings', 'UK PMI', 'UK Manufacturing'],
    currency: 'GBP',
    symbols: ['GBPUSD', 'EURGBP', 'GBPJPY'],
  },
  // ── ECB ──────────────────────────────────────────────────────────────────────
  {
    keywords: ['ECB', 'European Central Bank', 'Main Refinancing Rate', 'Lagarde', 'ECB Press Conference'],
    currency: 'EUR',
    symbols: ['EURUSD', 'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD'],
  },
  {
    keywords: ['German', 'Ifo', 'ZEW', 'Euro Zone CPI', 'Eurozone CPI', 'Euro Area CPI', 'Flash CPI', 'Eurozone GDP', 'Euro Area GDP'],
    currency: 'EUR',
    symbols: ['EURUSD', 'EURGBP', 'EURJPY'],
  },
  // ── Bank of Japan ────────────────────────────────────────────────────────────
  {
    keywords: ['BOJ', 'Bank of Japan', 'BoJ Policy Rate', 'Monetary Policy Statement'],
    currency: 'JPY',
    symbols: ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY'],
  },
  // ── Reserve Bank of Australia ─────────────────────────────────────────────
  {
    keywords: ['RBA', 'Reserve Bank of Australia', 'RBA Cash Rate', 'Cash Rate'],
    currency: 'AUD',
    symbols: ['AUDUSD', 'AUDJPY', 'EURAUD', 'GBPAUD'],
  },
  // ── SNB ──────────────────────────────────────────────────────────────────────
  {
    keywords: ['SNB', 'Swiss National Bank', 'SNB Policy Rate'],
    currency: 'CHF',
    symbols: ['USDCHF', 'EURCHF', 'GBPCHF'],
  },
  // ── Bank of Canada ───────────────────────────────────────────────────────────
  {
    keywords: ['BOC', 'Bank of Canada', 'Overnight Rate', 'BoC'],
    currency: 'CAD',
    symbols: ['USDCAD', 'CADJPY', 'EURCAD'],
  },
]

// Fallback: if no keyword match, use currency-based symbols
const CURRENCY_FALLBACK: Record<string, string[]> = {
  USD: ['EURUSD', 'GBPUSD', 'USDJPY', 'ES', 'NQ'],
  EUR: ['EURUSD', 'EURGBP', 'EURJPY'],
  GBP: ['GBPUSD', 'EURGBP', 'GBPJPY'],
  JPY: ['USDJPY', 'EURJPY', 'GBPJPY'],
  CAD: ['USDCAD', 'CADJPY'],
  AUD: ['AUDUSD', 'AUDJPY'],
  NZD: ['NZDUSD', 'NZDJPY'],
  CHF: ['USDCHF', 'EURCHF'],
  CNY: ['AUDUSD'],
}

/** All symbols typically affected by this event (ignores watchlist) */
export function getAffectedSymbols(title: string, currency: string): string[] {
  const titleLower = title.toLowerCase()
  for (const mapping of EVENT_ASSET_MAPPINGS) {
    if (mapping.currency && mapping.currency !== currency) continue
    if (mapping.keywords.some(k => titleLower.includes(k.toLowerCase()))) {
      return mapping.symbols
    }
  }
  return CURRENCY_FALLBACK[currency] ?? []
}

/** Returns only the symbols from the affected list that are in the user's watchlist */
export function getWatchlistMatches(title: string, currency: string, watchlistSymbols: string[]): string[] {
  const affected = getAffectedSymbols(title, currency)
  const upperWatchlist = new Set(watchlistSymbols.map(s => s.toUpperCase()))
  return affected.filter(s => upperWatchlist.has(s.toUpperCase()))
}
