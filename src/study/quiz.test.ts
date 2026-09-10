import { describe, expect, it } from 'vitest'
import type { Card } from '../data/types'
import { getI18n } from '../i18n'
import { availableKinds, hiddenRegions, makeQuestion, maskBoxes, NAME_REGIONS, type MaskBox, type QuizKind } from './quiz'

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

  it('masks the part of the image that gives the answer away, and only that part', () => {
    expect(hiddenRegions('energy')).toEqual(['cost'])
    // Power runes, type + name banner and footer icons are all colored by domain; rules text stays visible
    expect(hiddenRegions('domain')).toEqual(['cost', 'banner', 'domain-icons'])
    expect(hiddenRegions('name-from-image')).toEqual(NAME_REGIONS)
  })

  const covers = (boxes: readonly MaskBox[], x: number, y: number) =>
    boxes.some((b) => x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height)

  it('hides the name and both copies of the rules text of a landscape battlefield', () => {
    const boxes = maskBoxes(pool[5], NAME_REGIONS)
    // Measured on 1039×744 battlefield images, in % of the height: upside-down rules text along the
    // top edge ~6-20, type tag + name ~60-77 over the left ~60 % of the width, rules text ~78-90
    for (let x = 5; x <= 95; x += 5) {
      for (const y of [6, 10, 15, 20, 80, 85, 90]) expect(covers(boxes, x, y), `${x},${y}`).toBe(true)
    }
    for (let x = 3; x <= 60; x += 3) {
      for (const y of [60, 66, 72, 77]) expect(covers(boxes, x, y), `${x},${y}`).toBe(true)
    }
    // The illustration stays visible, including beside the name
    for (const [x, y] of [[50, 40], [20, 30], [80, 65], [90, 75]]) expect(covers(boxes, x, y), `${x},${y}`).toBe(false)
  })

  it('turns the battlefield masks with the fallback image, which shows it rotated to portrait', () => {
    const landscape = maskBoxes(pool[5], NAME_REGIONS)
    const rotated = maskBoxes(pool[5], NAME_REGIONS, { fallback: true })
    // Rotated a quarter turn: a point (x, y) of the landscape card is shown at (y, 100 - x)
    for (let x = 0; x <= 100; x += 2.5) {
      for (let y = 0; y <= 100; y += 2.5) expect(covers(rotated, y, 100 - x), `${x},${y}`).toBe(covers(landscape, x, y))
    }
  })

  it('keeps the portrait masks for the other card types', () => {
    expect(maskBoxes(pool[0], ['cost'])).toEqual([{ left: 0, top: 0, width: 21, height: 23 }])
    expect(maskBoxes(pool[0], NAME_REGIONS).some((b) => b.top < 15 && b.left < 50 && b.left + b.width > 50)).toBe(false)
  })

  it('writes the prompt in the requested language', () => {
    expect(makeQuestion(pool[0], pool, t, rng, 'energy').prompt).toBe('What is the energy cost of “Defy”?')
    expect(makeQuestion(pool[0], pool, getI18n('fr').t, rng, 'domain').prompt).toBe('Quel est le domaine de « Defy » ?')
  })
})
