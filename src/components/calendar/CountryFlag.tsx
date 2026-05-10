interface Props {
  countryCode: string
  currency: string
}

// Convert country code to flag emoji
function toFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode === 'INT' || countryCode === 'EU') {
    return countryCode === 'EU' ? '🇪🇺' : '🌐'
  }
  const codePoints = [...countryCode.toUpperCase()].map(
    c => 0x1F1E6 - 65 + c.charCodeAt(0)
  )
  return String.fromCodePoint(...codePoints)
}

export function CountryFlag({ countryCode, currency }: Props) {
  return (
    <span className="flex items-center gap-1 shrink-0">
      <span className="text-sm leading-none">{toFlagEmoji(countryCode)}</span>
      <span className="text-xs font-mono font-medium" style={{ color: 'var(--fg-2)' }}>
        {currency}
      </span>
    </span>
  )
}
