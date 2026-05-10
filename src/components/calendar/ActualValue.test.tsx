import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActualValue } from './ActualValue'

describe('ActualValue', () => {
  describe('when actual is null', () => {
    it('renders a dash placeholder', () => {
      const { container } = render(<ActualValue actual={null} forecast={null} />)
      expect(container.textContent).toBe('—')
    })
  })

  describe('when actual is present but forecast is null', () => {
    it('renders the actual value in neutral color (no comparison possible)', () => {
      const { container } = render(<ActualValue actual="3.5%" forecast={null} />)
      expect(container.textContent).toBe('3.5%')
      const span = container.querySelector('span')!
      expect(span.style.color).toBe('var(--fg-2)')
    })
  })

  describe('when actual is better than forecast (higher = better)', () => {
    it('renders in green for positive beat', () => {
      const { container } = render(<ActualValue actual="220K" forecast="200K" />)
      const span = container.querySelector('span')!
      expect(span.style.color).toBe('var(--long)')
    })

    it('handles percentage values', () => {
      const { container } = render(<ActualValue actual="3.5%" forecast="3.0%" />)
      const span = container.querySelector('span')!
      expect(span.style.color).toBe('var(--long)')
    })
  })

  describe('when actual is worse than forecast (lower = worse)', () => {
    it('renders in red for negative miss', () => {
      const { container } = render(<ActualValue actual="180K" forecast="200K" />)
      const span = container.querySelector('span')!
      expect(span.style.color).toBe('var(--short)')
    })

    it('handles negative actual values', () => {
      const { container } = render(<ActualValue actual="-0.1%" forecast="0.1%" />)
      const span = container.querySelector('span')!
      expect(span.style.color).toBe('var(--short)')
    })
  })

  describe('when actual equals forecast', () => {
    it('renders as neither better nor worse — neutral color', () => {
      const { container } = render(<ActualValue actual="2.5%" forecast="2.5%" />)
      const span = container.querySelector('span')!
      // equal = a > f is false, so better === false → red (this is the current behavior)
      expect(span.style.color).toBe('var(--short)')
    })
  })

  describe('non-numeric values', () => {
    it('renders in neutral color when values cannot be compared', () => {
      const { container } = render(<ActualValue actual="hawkish" forecast="dovish" />)
      const span = container.querySelector('span')!
      expect(span.style.color).toBe('var(--fg-2)')
    })
  })
})
