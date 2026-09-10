import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { countToday, createCustomDeck, exportAll, getState, ImportError, importAll, listCustomDecks, parseExport, resetProgress, review, saveSettings, getSettings } from './repo'
import { detectLanguage } from '../i18n'
import { Rating } from '../srs/scheduler'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('repo', () => {
  it('review creates a state and a log, countToday separates new from review', async () => {
    const now = new Date('2026-09-10T10:00:00')
    const r = await review('ogn-045-298', 'image', Rating.Good, 1200, now)
    expect(r.before.state).toBe(0)
    expect(r.after.reps).toBe(1)
    expect(await getState('ogn-045-298', 'image')).toMatchObject({ cardId: 'ogn-045-298', mode: 'image' })
    expect(await countToday('image', now)).toEqual({ newCount: 1, reviewCount: 0 })

    await review('ogn-045-298', 'image', Rating.Good, 800, new Date(now.getTime() + 60_000))
    expect(await countToday('image', now)).toEqual({ newCount: 1, reviewCount: 1 })
    // another mode does not count
    expect(await countToday('name', now)).toEqual({ newCount: 0, reviewCount: 0 })
  })

  it('export / reset / import restores progress', async () => {
    await review('a', 'name', Rating.Easy, 100)
    await createCustomDeck('Mon deck', ['a', 'b', 'a'])
    await saveSettings({ playRateThreshold: 12 })
    const file = await exportAll()
    expect(file.cardStates).toHaveLength(1)
    expect(file.customDecks[0].cardIds).toEqual(['a', 'b'])

    await resetProgress()
    expect(await getState('a', 'name')).toBeUndefined()

    await importAll(JSON.parse(JSON.stringify(file)))
    expect(await getState('a', 'name')).toMatchObject({ reps: 1 })
    expect((await listCustomDecks())[0].name).toBe('Mon deck')
    expect((await getSettings()).playRateThreshold).toBe(12)
  })

  it('language defaults to the browser language and is persisted in settings', async () => {
    expect((await getSettings()).language).toBe(detectLanguage())
    await saveSettings({ language: 'fr' })
    expect((await getSettings()).language).toBe('fr')
    await saveSettings({ language: 'en' })
    expect((await db.settings.get('main'))?.language).toBe('en')
  })

  it('parseExport rejects bad files with a translatable error', () => {
    const keyOf = (json: string) => {
      try {
        parseExport(json)
      } catch (e) {
        return e instanceof ImportError ? e.key : String(e)
      }
      return null
    }
    expect(keyOf('not json')).toBe('import.invalidJson')
    expect(keyOf('null')).toBe('import.notRiftlearn')
    expect(keyOf('{"app":"other","version":1}')).toBe('import.notRiftlearn')
    expect(keyOf('{"app":"riftlearn","version":1,"cardStates":[]}')).toBe('import.incomplete')
    expect(keyOf('{"app":"riftlearn","version":1,"cardStates":[],"reviewLogs":[]}')).toBeNull()
  })
})
