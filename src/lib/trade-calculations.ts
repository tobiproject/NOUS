export interface TradeCalculationInput {
  entryPrice: number
  slPrice: number
  tpPrice: number
  lotSize: number
  resultCurrency: number
  accountBalance: number
}

export interface TradeCalculationResult {
  rrRatio: number | null
  riskPercent: number | null
  resultPercent: number | null
  outcome: 'win' | 'loss' | 'breakeven' | null
}

const BREAKEVEN_THRESHOLD = 0.01

export function calculateTrade(input: Partial<TradeCalculationInput>): TradeCalculationResult {
  const { entryPrice, slPrice, tpPrice, lotSize, resultCurrency, accountBalance } = input

  const rrRatio = calcRR(entryPrice, slPrice, tpPrice)
  const riskPercent = calcRiskPercent(entryPrice, slPrice, lotSize, accountBalance)
  const resultPercent = calcResultPercent(resultCurrency, accountBalance)
  const outcome = calcOutcome(resultCurrency)

  return { rrRatio, riskPercent, resultPercent, outcome }
}

export function calcRR(
  entry?: number,
  sl?: number,
  tp?: number
): number | null {
  if (!entry || !sl || !tp) return null
  const slDistance = Math.abs(entry - sl)
  if (slDistance === 0) return null
  const tpDistance = Math.abs(tp - entry)
  return Math.round((tpDistance / slDistance) * 100) / 100
}

export function calcRiskPercent(
  entry?: number,
  sl?: number,
  lotSize?: number,
  accountBalance?: number,
  pointValue?: number | null
): number | null {
  if (!entry || !sl || !lotSize || !accountBalance || accountBalance === 0) return null
  const slDistance = Math.abs(entry - sl)
  // For futures: risk = SL distance in points × point_value × contracts
  const riskAmount = pointValue ? slDistance * pointValue * lotSize : slDistance * lotSize
  return Math.round((riskAmount / accountBalance) * 10000) / 100
}

export function calcResultPercent(
  resultCurrency?: number,
  accountBalance?: number
): number | null {
  if (resultCurrency === undefined || resultCurrency === null) return null
  if (!accountBalance || accountBalance === 0) return null
  return Math.round((resultCurrency / accountBalance) * 10000) / 100
}

export function calcOutcome(
  resultCurrency?: number
): 'win' | 'loss' | 'breakeven' | null {
  if (resultCurrency === undefined || resultCurrency === null) return null
  if (Math.abs(resultCurrency) <= BREAKEVEN_THRESHOLD) return 'breakeven'
  return resultCurrency > 0 ? 'win' : 'loss'
}

export function validateSLSide(
  direction: 'long' | 'short',
  entry: number,
  sl: number
): string | null {
  if (direction === 'long' && sl >= entry) {
    return 'Bei einem Long-Trade muss der SL unter dem Entry liegen.'
  }
  if (direction === 'short' && sl <= entry) {
    return 'Bei einem Short-Trade muss der SL über dem Entry liegen.'
  }
  return null
}
