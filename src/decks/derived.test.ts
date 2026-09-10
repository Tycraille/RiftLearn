import { describe, expect, it } from 'vitest'
import type { Card } from '../data/types'
import { getI18n } from '../i18n'
import { deriveDecks } from './derived'

const mk = (id: string, type: Card['type'], play: number): Card =>
  ({ id, name: id, set: 'OGN', domain: 'calm', domains: ['calm'], type, stats: { play } }) as Card

const cards = [mk('a', 'Unit', 10), mk('b', 'Spell', 8), mk('c', 'Unit', 1)]

describe('deriveDecks', () => {
  it('labels built-in decks in the requested language', () => {
    const label = (lang: 'fr' | 'en', id: string) => deriveDecks(cards, 5, getI18n(lang).t).find((d) => d.id === id)?.label
    expect(label('fr', 'all')).toBe('Toutes les cartes méta')
    expect(label('en', 'all')).toBe('All meta cards')
    expect(label('fr', 'type:Unit')).toBe('Unités')
    expect(label('en', 'type:Spell')).toBe('Spells')
    // proper names are not translated
    expect(label('fr', 'domain:calm')).toBe('Calm')
    expect(label('fr', 'set:OGN')).toBe('Origins')
  })

  it('keeps only cards above the threshold and custom deck names as typed', () => {
    const decks = deriveDecks(cards, 5, getI18n('en').t, [{ id: 3, name: 'Mon deck', cardIds: ['c'], createdAt: 0 }])
    expect(decks[0].cards.map((c) => c.id)).toEqual(['a', 'b'])
    expect(decks.find((d) => d.id === 'custom:3')).toMatchObject({ label: 'Mon deck', cards: [cards[2]] })
  })
})
