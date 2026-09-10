import { describe, expect, it } from 'vitest'
import type { Card } from '../data/types'
import { getI18n } from '../i18n'
import { availableKinds, makeQuestion, type QuizKind } from './quiz'

let seed = 42
const rng = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const { t } = getI18n('en')

const mk = (id: string, name: string, energy: number | null, domain: Card['domain'] = 'calm', type: Card['type'] = 'Spell', text: string | null = 'effet ' + id): Card =>
  ({ id, name, slug: id, set: 'OGN', setLabel: 'Origins', domain, domains: [domain], type, rarity: null, energy, might: null, power: 1, text, textRich: text, flavour: null, imageUrl: 'img-' + id, imageFallback: '', tags: [], stats: { play: 10, win: null, decks: 1, copies: 1, games: 1 } }) as Card

const pool = [
  mk('a', 'Defy', 1),
  mk('b', 'Discipline', 2),
  mk('c', 'Charm', 3),
  mk('d', 'Gust', 1),
  mk('e', 'Scuttle Crab', 2, 'chaos', 'Unit'),
  mk('f', 'Star Spring', null, 'colorless', 'Battlefield', null),
]

describe('quiz', () => {
  it('produces 4 distinct options including the right answer, for every question kind', () => {
    const kinds: QuizKind[] = ['energy', 'domain', 'name-from-text', 'name-from-image']
    for (const kind of kinds) {
      const q = makeQuestion(pool[0], pool, t, rng, kind)
      expect(q.kind).toBe(kind)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options[q.answerIndex]).toBe(kind === 'energy' ? '1' : kind === 'domain' ? 'Calm' : 'Defy')
    }
  })

  it('a battlefield with no cost and no text only offers the image question', () => {
    expect(availableKinds(pool[5])).toEqual(['name-from-image', 'domain'])
    const q = makeQuestion(pool[5], pool, t, rng, 'energy')
    expect(['name-from-image', 'domain']).toContain(q.kind)
  })

  it('prefers distractors of the same type and domain', () => {
    const q = makeQuestion(pool[0], pool, t, rng, 'name-from-text')
    expect(q.options).not.toContain('Scuttle Crab')
    expect(q.options).not.toContain('Star Spring')
  })

  it('writes the prompt in the requested language', () => {
    expect(makeQuestion(pool[0], pool, t, rng, 'energy').prompt).toBe('What is the energy cost of “Defy”?')
    expect(makeQuestion(pool[0], pool, getI18n('fr').t, rng, 'domain').prompt).toBe('Quel est le domaine de « Defy » ?')
  })
})
