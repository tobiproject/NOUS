interface Props {
  actual: string | null
  forecast: string | null
}

function parseNumber(val: string | null): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? null : n
}

function isBetterThanForecast(actual: string, forecast: string): boolean | null {
  const a = parseNumber(actual)
  const f = parseNumber(forecast)
  if (a === null || f === null) return null
  return a > f
}

export function ActualValue({ actual, forecast }: Props) {
  if (!actual) {
    return <span className="text-xs tabular-nums" style={{ color: 'var(--fg-4)' }}>—</span>
  }

  const better = forecast ? isBetterThanForecast(actual, forecast) : null

  const color =
    better === true ? 'var(--long)' :
    better === false ? 'var(--short)' :
    'var(--fg-2)'

  return (
    <span className="text-xs font-medium tabular-nums" style={{ color }}>
      {actual}
    </span>
  )
}
