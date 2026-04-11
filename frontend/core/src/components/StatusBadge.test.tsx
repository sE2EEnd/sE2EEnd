import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge, { deleteReasonToStatus, type SendStatus } from './StatusBadge'

describe('StatusBadge', () => {
  const statuses: SendStatus[] = ['active', 'revoked', 'expired', 'exhausted', 'deleted']

  it.each(statuses)('renders without crashing for status "%s"', (status) => {
    render(<StatusBadge status={status} />)
    // i18n key is returned as-is by the mock (e.g. "common.active")
    expect(screen.getByText(`common.${status}`)).toBeInTheDocument()
  })

  it('renders a custom label when provided', () => {
    render(<StatusBadge status="active" label="Custom Label" />)
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
  })

  it('applies the correct status class for active', () => {
    const { container } = render(<StatusBadge status="active" />)
    expect(container.firstChild).toHaveClass('text-green-600')
  })

  it('applies the correct status class for revoked', () => {
    const { container } = render(<StatusBadge status="revoked" />)
    expect(container.firstChild).toHaveClass('text-gray-500')
  })

  it('applies the correct status class for expired', () => {
    const { container } = render(<StatusBadge status="expired" />)
    expect(container.firstChild).toHaveClass('text-orange-600')
  })

  it('applies the correct status class for exhausted', () => {
    const { container } = render(<StatusBadge status="exhausted" />)
    expect(container.firstChild).toHaveClass('text-red-600')
  })

  it('merges extra className prop', () => {
    const { container } = render(<StatusBadge status="active" className="my-extra-class" />)
    expect(container.firstChild).toHaveClass('my-extra-class')
  })
})

describe('deleteReasonToStatus', () => {
  it.each([
    ['EXPIRED',   'expired'],
    ['REVOKED',   'revoked'],
    ['EXHAUSTED', 'exhausted'],
    ['USER',      'deleted'],
    ['unknown',   'deleted'],
  ] as const)('maps "%s" → "%s"', (reason, expected) => {
    expect(deleteReasonToStatus(reason)).toBe(expected)
  })
})