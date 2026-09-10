import { describe, expect, it } from 'vitest'
import type { Card } from '../data/types'
import { parseDecklist } from './decklist'

const mk = (id: string, name: string): Card =>
  ({ id, name, slug: id, set: 'OGN', setLabel: 'Origins', domain: 'calm', domains: ['calm'], type: 'Spell', rarity: null, energy: 1, might: null, power: 1, text: null, textRich: null, flavour: null, imageUrl: '', imageFallback: '', tags: [], stats: { play: 10, win: null, decks: 1, copies: 1, games: 1 } }) as Card

const cards = [mk('a', 'Defy'), mk('b', 'Vi, Peacekeeper'), mk('c', "Zhonya's Hourglass")]

describe('parseDecklist', () => {
  it('reconnaît les formats de quantité', () => {
    const r = parseDecklist('3 Defy\n2x Vi - Peacekeeper\nZhonya’s Hourglass x1\nDefy (1)', cards)
    expect(r.missing).toEqual([])
    expect(r.found.map((f) => [f.card.id, f.count])).toEqual([
      ['a', 4],
      ['b', 2],
      ['c', 1],
    ])
  })

  it('ignore en-têtes, commentaires et lignes vides, liste les inconnues', () => {
    const r = parseDecklist('# mon deck\nMain deck\n\n3 Defy\n1 Carte Inconnue\nBattlefields', cards)
    expect(r.found).toHaveLength(1)
    expect(r.missing).toEqual(['Carte Inconnue'])
  })
})
