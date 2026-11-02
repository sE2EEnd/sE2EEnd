import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { History } from 'lucide-react'
import { getUnseenReleases, useWhatsNew, LAST_SEEN_STORAGE_KEY } from './useWhatsNew'
import type { ReleaseNote } from '../releaseNotes'

const note = (version: string): ReleaseNote => ({
  version,
  date: '2026-01-01',
  items: [{ id: `item-${version}`, icon: History }],
})

const notes = [note('1.3.0'), note('1.2.0'), note('1.1.0')]

describe('getUnseenReleases', () => {
  it('returns only the latest release when nothing was seen yet', () => {
    expect(getUnseenReleases(notes, null).map((n) => n.version)).toEqual(['1.3.0'])
  })

  it('returns nothing when the latest release was seen', () => {
    expect(getUnseenReleases(notes, '1.3.0')).toEqual([])
  })

  it('returns every release newer than the last seen one', () => {
    expect(getUnseenReleases(notes, '1.1.0').map((n) => n.version)).toEqual(['1.3.0', '1.2.0'])
  })

  it('falls back to the latest release when the seen version is no longer listed', () => {
    expect(getUnseenReleases(notes, '0.9.0').map((n) => n.version)).toEqual(['1.3.0'])
  })

  it('returns nothing when there are no release notes', () => {
    expect(getUnseenReleases([], null)).toEqual([])
  })
})

describe('useWhatsNew', () => {
  // Node's own (unconfigured) localStorage global shadows happy-dom's, so provide an in-memory one.
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    })
    return () => { vi.unstubAllGlobals() }
  })

  it('opens once for a new version and stays closed after being dismissed', () => {
    const first = renderHook(() => useWhatsNew(notes))
    expect(first.result.current.open).toBe(true)

    act(() => first.result.current.close())
    expect(first.result.current.open).toBe(false)
    expect(localStorage.getItem(LAST_SEEN_STORAGE_KEY)).toBe('1.3.0')

    const second = renderHook(() => useWhatsNew(notes))
    expect(second.result.current.open).toBe(false)
  })

  it('opens again when a newer release is added', () => {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, '1.2.0')
    const { result } = renderHook(() => useWhatsNew(notes))
    expect(result.current.open).toBe(true)
    expect(result.current.releases.map((n) => n.version)).toEqual(['1.3.0'])
  })

  it('can be reopened with the full history', () => {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, '1.3.0')
    const { result } = renderHook(() => useWhatsNew(notes))
    expect(result.current.open).toBe(false)

    act(() => result.current.showAll())
    expect(result.current.open).toBe(true)
    expect(result.current.releases).toEqual(notes)
  })
})
