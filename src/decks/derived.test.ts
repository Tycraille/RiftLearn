import { describe, expect, it } from 'vitest'
import type { Card, Legend, LegendCardStat } from '../data/types'
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

describe('legend decks', () => {
  const stat = (id: string, presence: number): LegendCardStat => ({ id, presence, copies: 1, category: 'core' })
  const legend = (slug: string, name: string, decks: number, stats: LegendCardStat[]): Legend => ({ slug, name, decks, share: 1, cards: stats })
  const legends = [
    legend('yi-small', 'Master Yi, Wuju Bladesman', 150, [stat('a', 90)]),
    legend('kennen', 'Kennen, Heart of the Tempest', 1200, [stat('b', 30), stat('unknown', 95), stat('c', 99), stat('a', 20), stat('d', 19.9)]),
    legend('yi-big', 'Master Yi, the Wuju Master', 400, [stat('d', 5)]),
  ]
  const all = [...cards, mk('d', 'Gear', 0)]
  const legendDecks = (threshold: number, play = 5) =>
    deriveDecks(all, play, getI18n('en').t, [], legends, threshold).filter((d) => d.kind === 'legend')

  it('keeps cards at or above the presence threshold, by presence descending, skipping unknown ids', () => {
    const kennen = legendDecks(20).find((d) => d.id === 'legend:kennen')!
    expect(kennen).toMatchObject({ label: 'Kennen, Heart of the Tempest', legendDecks: 1200, newOrder: 'deck' })
    // 'c' is below the play-rate threshold but still belongs to the legend deck
    expect(kennen.cards.map((c) => c.id)).toEqual(['c', 'b', 'a'])
  })

  it('orders legends by deck count and drops empty decks', () => {
    expect(legendDecks(20).map((d) => d.id)).toEqual(['legend:kennen', 'legend:yi-small'])
    expect(legendDecks(5).map((d) => d.label)).toEqual([
      'Kennen, Heart of the Tempest',
      'Master Yi, the Wuju Master',
      'Master Yi, Wuju Bladesman',
    ])
  })

  it('does not depend on the play-rate threshold, nor changes the other decks', () => {
    expect(legendDecks(20, 0)).toEqual(legendDecks(20, 50))
    const others = (threshold: number) => deriveDecks(all, 5, getI18n('en').t, [], legends, threshold).filter((d) => d.kind !== 'legend')
    expect(others(5)).toEqual(others(90))
    expect(others(20)).toEqual(deriveDecks(all, 5, getI18n('en').t))
  })
})
