import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { History } from 'lucide-react'
import WhatsNewDialog from './WhatsNewDialog'

const releases = [
  { version: '1.3.0', date: '2026-01-01', items: [{ id: 'sendHistory', icon: History }] },
]

describe('WhatsNewDialog', () => {
  it('renders each release item with its translation keys', () => {
    render(<WhatsNewDialog open releases={releases} onClose={vi.fn()} />)
    expect(screen.getByText('whatsNew.title')).toBeInTheDocument()
    expect(screen.getByText('whatsNew.items.sendHistory.title')).toBeInTheDocument()
    expect(screen.getByText('whatsNew.items.sendHistory.description')).toBeInTheDocument()
  })

  it('calls onClose when dismissed', () => {
    const onClose = vi.fn()
    render(<WhatsNewDialog open releases={releases} onClose={onClose} />)
    fireEvent.click(screen.getByText('whatsNew.close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
