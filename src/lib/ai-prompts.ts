import type Anthropic from '@anthropic-ai/sdk'
import type { Trade } from '@/hooks/useTrades'

type Tool = Anthropic.Tool

export const TRADE_ANALYSIS_TOOL = {
  name: 'analyze_trade',
  description: 'Strukturierte Analyse eines einzelnen Trades',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        description: 'Gesamtbewertung des Trades (1=sehr schlecht, 10=perfekt)',
      },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['Entry-Timing', 'Setup-Qualität', 'Risk-Management', 'Emotionale Entscheidung', 'News ignoriert', 'Regelverstoß'],
            },
            description: { type: 'string', maxLength: 200 },
          },
          required: ['category', 'description'],
        },
      },
      strengths: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', maxLength: 200 },
          },
          required: ['description'],
        },
      },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', maxLength: 200 },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['action', 'priority'],
        },
      },
      summary: {
        type: 'string',
        maxLength: 300,
        description: 'Gesamturteil in 1–2 Sätzen',
      },
    },
    required: ['score', 'errors', 'strengths', 'suggestions', 'summary'],
  },
} satisfies Tool

export const PERIOD_ANALYSIS_TOOL = {
  name: 'analyze_period',
  description: 'Strukturierte Wochen- oder Monatsanalyse',
  input_schema: {
    type: 'object' as const,
    properties: {
      pnl: { type: 'number', description: 'Gesamt P&L im Zeitraum' },
      trade_count: { type: 'integer' },
      win_rate: { type: 'number', description: 'Winrate 0–100' },
      top_errors: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            count: { type: 'integer' },
            description: { type: 'string', maxLength: 200 },
          },
          required: ['category', 'count', 'description'],
        },
      },
      top_strengths: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: { description: { type: 'string', maxLength: 200 } },
          required: ['description'],
        },
      },
      focus_next_period: {
        type: 'string',
        maxLength: 300,
        description: 'Konkreter Fokus / Maßnahme für die nächste Woche/Monat',
      },
      summary: {
        type: 'string',
        maxLength: 400,
        description: 'Gesamturteil über den Zeitraum',
      },
      // Monthly only
      vs_previous: {
        type: 'object',
        description: 'Vergleich zum Vormonat (nur für Monatsanalyse)',
        properties: {
          win_rate_delta: { type: 'number' },
          profit_factor_delta: { type: 'number' },
          avg_rr_delta: { type: 'number' },
        },
      },
      actions: {
        type: 'array',
        maxItems: 3,
        description: 'Konkrete Maßnahmen (nur für Monatsanalyse)',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', maxLength: 200 },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['action', 'priority'],
        },
      },
    },
    required: ['pnl', 'trade_count', 'win_rate', 'top_errors', 'top_strengths', 'focus_next_period', 'summary'],
  },
} satisfies Tool

export const PATTERN_ANALYSIS_TOOL = {
  name: 'analyze_patterns',
  description: 'Muster-Analyse über mehrere Trades',
  input_schema: {
    type: 'object' as const,
    properties: {
      patterns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['zeitbasiert', 'asset-basiert', 'emotionsbasiert', 'setup-basiert'],
            },
            insight: { type: 'string', maxLength: 300 },
            severity: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
            trade_count: { type: 'integer' },
          },
          required: ['type', 'insight', 'severity', 'trade_count'],
        },
      },
    },
    required: ['patterns'],
  },
} satisfies Tool

export function buildTradePrompt(trade: Trade, accountStats: {
  winrate30d: number | null
  avgRR: number | null
  profitFactor: number | null
}, tradingRules: string[]): string {
  const hasNotes = !!(trade.notes && trade.notes.trim().length > 0)
  const hasScreenshots = trade.screenshot_urls?.length > 0

  return `Du bist ein erfahrener Trading-Coach. Analysiere diesen Trade präzise und ehrlich. Keine Lobhudelei. Nur konkrete, umsetzbare Kritik und Lob.

## Kontext: Account-Performance (letzte 30 Tage)
- Winrate: ${accountStats.winrate30d !== null ? accountStats.winrate30d.toFixed(1) + '%' : 'Unbekannt'}
- Durchschnittliches RR: ${accountStats.avgRR !== null ? '1:' + accountStats.avgRR.toFixed(2) : 'Unbekannt'}
- Profit-Faktor: ${accountStats.profitFactor !== null ? accountStats.profitFactor.toFixed(2) : 'Unbekannt'}

## Nutzer-Trading-Regeln
${tradingRules.length > 0 ? tradingRules.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'Keine Regeln hinterlegt.'}

## Trade-Details
- Asset: ${trade.asset}
- Richtung: ${trade.direction === 'long' ? 'Long (Kauf)' : 'Short (Verkauf)'}
- Einstieg: ${trade.entry_price}
- Stop-Loss: ${trade.sl_price}
- Take-Profit: ${trade.tp_price}
- Lot-Größe: ${trade.lot_size}
- RR-Ratio: ${trade.rr_ratio !== null ? '1:' + trade.rr_ratio : 'Nicht berechnet'}
- Risiko %: ${trade.risk_percent !== null ? trade.risk_percent.toFixed(2) + '%' : 'Unbekannt'}
- Ergebnis: ${trade.result_currency !== null ? (trade.result_currency >= 0 ? '+' : '') + trade.result_currency.toFixed(2) + '€' : 'Unbekannt'} (${trade.outcome ?? 'unbekannt'})
- Handelszeitpunkt: ${trade.traded_at}
- Setup-Typ: ${trade.setup_type ?? 'Nicht angegeben'}
- Strategie: ${trade.strategy ?? 'Nicht angegeben'}
- Marktphase: ${trade.market_phase ?? 'Nicht angegeben'}
- Emotion vorher: ${trade.emotion_before ?? 'Nicht angegeben'}
- Emotion nachher: ${trade.emotion_after ?? 'Nicht angegeben'}
- Tags: ${trade.tags?.join(', ') ?? 'Keine'}
- Notizen: ${hasNotes ? trade.notes : 'Keine Notizen — nur numerische Analyse möglich'}
- Screenshots: ${hasScreenshots ? 'Vorhanden (nicht analysierbar in dieser Version)' : 'Keine'}

Analysiere den Trade und rufe analyze_trade auf.`
}

export function buildPeriodPrompt(
  type: 'weekly' | 'monthly',
  periodStart: string,
  periodEnd: string,
  trades: Trade[],
  prevPeriodStats?: { winRate: number | null; profitFactor: number | null; avgRR: number | null }
): string {
  const wins = trades.filter(t => t.outcome === 'win')
  const losses = trades.filter(t => t.outcome === 'loss')
  const decided = wins.length + losses.length
  const winRate = decided > 0 ? (wins.length / decided) * 100 : 0
  const grossProfit = wins.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result_currency ?? 0), 0))
  const totalPnl = trades.reduce((s, t) => s + (t.result_currency ?? 0), 0)

  const tradesSummary = trades.map(t =>
    `- ${t.traded_at.split('T')[0]} | ${t.asset} ${t.direction} | ${t.outcome ?? 'offen'} | ${t.result_currency !== null ? (t.result_currency >= 0 ? '+' : '') + t.result_currency.toFixed(2) + '€' : '?'} | Setup: ${t.setup_type ?? '-'} | Emotion: ${t.emotion_before ?? '-'}`
  ).join('\n')

  return `Du bist ein erfahrener Trading-Coach. Erstelle eine ehrliche ${type === 'weekly' ? 'Wochenanalyse' : 'Monatsanalyse'} für den Zeitraum ${periodStart} bis ${periodEnd}.

## Zusammenfassung
- Trades: ${trades.length} (${wins.length} Wins, ${losses.length} Losses, ${trades.length - decided} BE/offen)
- Winrate: ${winRate.toFixed(1)}%
- Gesamt P&L: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€
- Bruttogewinn: ${grossProfit.toFixed(2)}€ | Bruttoverlust: ${grossLoss.toFixed(2)}€
${prevPeriodStats ? `
## Vorperiode (Vergleich)
- Winrate: ${prevPeriodStats.winRate !== null ? prevPeriodStats.winRate.toFixed(1) + '%' : 'unbekannt'}
- Profit-Faktor: ${prevPeriodStats.profitFactor !== null ? prevPeriodStats.profitFactor.toFixed(2) : 'unbekannt'}
- Ø RR: ${prevPeriodStats.avgRR !== null ? '1:' + prevPeriodStats.avgRR.toFixed(2) : 'unbekannt'}` : ''}

## Alle Trades im Zeitraum
${tradesSummary}

Analysiere den Zeitraum und rufe analyze_period auf.`
}
