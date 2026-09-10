import { describe, expect, it } from 'vitest'
import type { Card } from '../data/types'
import { getI18n } from '../i18n'
import { availableKinds, costDistractors, hiddenRegions, makeQuestion, maskBoxes, NAME_REGIONS, type CardCost, type MaskBox, type QuizKind } from './quiz'

let seed = 42
const rng = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const { t } = getI18n('en')

const mk = (id: string, name: string, energy: number | null, domain: Card['domain'] = 'calm', type: Card['type'] = 'Spell', text: string | null = 'effet ' + id, power: number | null = 1, domains: string[] = [domain]): Card =>
  ({ id, name, slug: id, set: 'OGN', setLabel: 'Origins', domain, domains, type, rarity: null, energy, might: null, power, text, textRich: text, flavour: null, imageUrl: 'img-' + id, imageFallback: '', tags: [], stats: { play: 10, win: null, decks: 1, copies: 1, games: 1 } }) as Card

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
    const kinds: QuizKind[] = ['cost', 'domain', 'name-from-text', 'name-from-image']
    for (const kind of kinds) {
      const q = makeQuestion(pool[0], pool, t, rng, kind)
      expect(q.kind).toBe(kind)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options.map((o) => o.label)).size).toBe(4)
      expect(q.options[q.answerIndex].label).toBe(kind === 'cost' ? '1 energy, 1 Calm rune' : kind === 'domain' ? 'Calm' : 'Defy')
    }
  })

  it('a battlefield with no cost and no text only offers the image question', () => {
    expect(availableKinds(pool[5])).toEqual(['name-from-image', 'domain'])
    const q = makeQuestion(pool[5], pool, t, rng, 'cost')
    expect(['name-from-image', 'domain']).toContain(q.kind)
  })

  it('prefers distractors of the same type and domain', () => {
    const labels = makeQuestion(pool[0], pool, t, rng, 'name-from-text').options.map((o) => o.label)
    expect(labels).not.toContain('Scuttle Crab')
    expect(labels).not.toContain('Star Spring')
  })

  it('masks the part of the image that gives the answer away, and only that part', () => {
    expect(hiddenRegions('cost')).toEqual(['cost'])
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
    expect(makeQuestion(pool[0], pool, t, rng, 'cost').prompt).toBe('What is the cost of “Defy”?')
    expect(makeQuestion(pool[0], pool, getI18n('fr').t, rng, 'cost').prompt).toBe('Quel est le coût de « Defy » ?')
    expect(makeQuestion(pool[0], pool, getI18n('fr').t, rng, 'domain').prompt).toBe('Quel est le domaine de « Defy » ?')
  })

  describe('cost question', () => {
    const sprite = mk('sf', 'Sprite Fountain', 2, 'mind', 'Gear', 'x', 1)
    const discipline = mk('di', 'Discipline', 2, 'calm', 'Spell', 'x', null)
    const dance = mk('dd', 'Defiant Dance', 1, 'multi', 'Spell', 'x', 1, ['calm', 'chaos'])
    // Like the real pool, costs without rune dominate: 2 energy alone is far more common than 2 + 2 runes
    const costPool = [
      ...Array.from({ length: 40 }, (_, i) => mk('p' + i, 'Plain ' + i, 1 + (i % 4), 'calm', 'Spell', 'x', null)),
      ...Array.from({ length: 20 }, (_, i) => mk('r' + i, 'Rune ' + i, 1 + (i % 4), 'mind', 'Unit', 'x', 1)),
      mk('rr', 'Two runes', 2, 'mind', 'Unit', 'x', 2),
      sprite,
      discipline,
      dance,
    ]
    const key = (c: CardCost) => `${c.energy}/${c.power}`

    it('answers with the full cost, a missing power counting as no rune', () => {
      const s = makeQuestion(sprite, costPool, t, rng, 'cost')
      expect(s.options[s.answerIndex]).toEqual({ label: '2 energy, 1 Mind rune', cost: { energy: 2, power: 1 } })
      const d = makeQuestion(discipline, costPool, t, rng, 'cost')
      expect(d.options[d.answerIndex]).toEqual({ label: '2 energy', cost: { energy: 2, power: 0 } })
      const fr = makeQuestion(sprite, costPool, getI18n('fr').t, rng, 'cost')
      expect(fr.options[fr.answerIndex].label).toBe('2 énergie, 1 rune Mind')
    })

    it('draws every option in the domains of the card, a dual-domain rune being bicolor', () => {
      for (const card of [sprite, dance]) {
        const q = makeQuestion(card, costPool, t, rng, 'cost')
        const domain = card === dance ? 'Calm/Chaos' : 'Mind'
        for (const o of q.options) {
          expect(o.cost).toBeDefined()
          if (o.cost!.power) expect(o.label).toMatch(new RegExp(`, ${o.cost!.power} ${domain} runes?$`))
          else expect(o.label).not.toMatch(/rune/)
        }
      }
      const q = makeQuestion(dance, costPool, t, rng, 'cost')
      expect(q.options[q.answerIndex].label).toBe('1 energy, 1 Calm/Chaos rune')
    })

    it('offers three distinct, non-negative neighbours forming a 2×2 grid with the answer', () => {
      const answers: CardCost[] = [
        { energy: 0, power: 0 },
        { energy: 0, power: 1 },
        { energy: 1, power: 4 },
        { energy: 2, power: 0 },
        { energy: 2, power: 1 },
        { energy: 12, power: 4 },
      ]
      for (const answer of answers) {
        for (let n = 0; n < 50; n++) {
          const wrong = costDistractors(answer, costPool, rng)
          const all = [answer, ...wrong]
          expect(new Set(all.map(key)).size, key(answer)).toBe(4)
          for (const c of wrong) {
            expect(c.energy).toBeGreaterThanOrEqual(0)
            expect(c.power).toBeGreaterThanOrEqual(0)
            expect(c.power).toBeLessThanOrEqual(4)
            expect(Math.abs(c.energy - answer.energy)).toBeLessThanOrEqual(2)
            expect(Math.abs(c.power - answer.power)).toBeLessThanOrEqual(1)
          }
          // Each option shares its energy with exactly one other option, and its rune count with exactly one other
          for (const c of all) {
            expect(all.filter((o) => o !== c && o.energy === c.energy)).toHaveLength(1)
            expect(all.filter((o) => o !== c && o.power === c.power)).toHaveLength(1)
          }
        }
      }
    })

    it('tests the rune count: same energy with one rune more or less, the common cost first', () => {
      let plainTwo = 0
      for (let n = 0; n < 200; n++) {
        expect(costDistractors({ energy: 2, power: 0 }, costPool, rng).map(key)).toContain('2/1')
        if (costDistractors({ energy: 2, power: 1 }, costPool, rng).map(key).includes('2/0')) plainTwo++
      }
      expect(plainTwo).toBeGreaterThan(150)
    })

    it('still finds distractors when the pool knows no neighbouring cost', () => {
      for (const p of [[], [mk('z', 'Lonely', 9, 'calm', 'Spell', 'x', 3)]]) {
        const wrong = costDistractors({ energy: 0, power: 0 }, p, rng)
        expect(new Set(wrong.map(key)).size).toBe(3)
        expect(wrong.map(key)).toContain('0/1')
      }
      const q = makeQuestion(discipline, [discipline], t, rng, 'cost')
      expect(new Set(q.options.map((o) => o.label)).size).toBe(4)
    })
  })
})
