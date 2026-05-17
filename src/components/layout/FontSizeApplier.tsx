'use client'

import { useEffect } from 'react'

export const FONT_SIZE_MIN = 12
export const FONT_SIZE_MAX = 22
export const FONT_SIZE_DEFAULT = 16

export function getStoredFontSize(): number {
  if (typeof window === 'undefined') return FONT_SIZE_DEFAULT
  const stored = localStorage.getItem('nous-font-size')
  if (!stored) return FONT_SIZE_DEFAULT
  const num = parseInt(stored)
  if (!isNaN(num) && num >= FONT_SIZE_MIN && num <= FONT_SIZE_MAX) return num
  // legacy string values
  if (stored === 'sm') return 14
  if (stored === 'lg') return 18
  return FONT_SIZE_DEFAULT
}

export function applyFontSize(px: number) {
  document.documentElement.style.fontSize = `${px}px`
  // scale body base proportionally from default 14px at 16px html
  const base = Math.round(px * 14 / 16)
  document.documentElement.style.setProperty('--base-font-size', `${base}px`)
  localStorage.setItem('nous-font-size', String(px))
}

export function FontSizeApplier() {
  useEffect(() => {
    applyFontSize(getStoredFontSize())
  }, [])
  return null
}
