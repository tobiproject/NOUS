'use client'

import { useEffect } from 'react'

const SIZES = { sm: '13px', md: '14px', lg: '16px' } as const
export type FontSizeKey = keyof typeof SIZES

export function applyFontSize(key: FontSizeKey) {
  document.documentElement.style.setProperty('--base-font-size', SIZES[key])
  localStorage.setItem('nous-font-size', key)
  window.dispatchEvent(new CustomEvent('nous-font-size-changed'))
}

export function FontSizeApplier() {
  useEffect(() => {
    const stored = (localStorage.getItem('nous-font-size') ?? 'md') as FontSizeKey
    document.documentElement.style.setProperty('--base-font-size', SIZES[stored] ?? '14px')
  }, [])
  return null
}
