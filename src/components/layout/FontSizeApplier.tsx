'use client'

import { useEffect } from 'react'

// html font-size scales all rem-based Tailwind classes (text-sm, text-xs, etc.)
// --base-font-size scales body text that inherits without a Tailwind class
const SIZES = {
  sm: { html: '14px', base: '13px' },
  md: { html: '16px', base: '14px' },
  lg: { html: '18px', base: '16px' },
} as const

export type FontSizeKey = keyof typeof SIZES

export function applyFontSize(key: FontSizeKey) {
  const s = SIZES[key]
  document.documentElement.style.fontSize = s.html
  document.documentElement.style.setProperty('--base-font-size', s.base)
  localStorage.setItem('nous-font-size', key)
}

export function FontSizeApplier() {
  useEffect(() => {
    const stored = (localStorage.getItem('nous-font-size') ?? 'md') as FontSizeKey
    const s = SIZES[stored] ?? SIZES.md
    document.documentElement.style.fontSize = s.html
    document.documentElement.style.setProperty('--base-font-size', s.base)
  }, [])
  return null
}
