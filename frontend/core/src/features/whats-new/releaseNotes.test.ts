import { describe, it, expect } from 'vitest'
import { releaseNotes } from './releaseNotes'
import en from '@/locales/en/translation.json'
import fr from '@/locales/fr/translation.json'

type Items = Record<string, { title?: string; description?: string }>

describe('releaseNotes', () => {
  it('has unique versions with valid dates', () => {
    const versions = releaseNotes.map((n) => n.version)
    expect(new Set(versions).size).toBe(versions.length)
    for (const note of releaseNotes) {
      expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(note.date).getTime())).toBe(false)
    }
  })

  it.each([['en', en.whatsNew.items], ['fr', fr.whatsNew.items]] as [string, Items][])(
    'has a title and description in %s for every item',
    (_, items) => {
      for (const item of releaseNotes.flatMap((n) => n.items)) {
        expect(items[item.id]?.title, item.id).toBeTruthy()
        expect(items[item.id]?.description, item.id).toBeTruthy()
      }
    },
  )
})
