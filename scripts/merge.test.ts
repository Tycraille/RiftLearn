import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  decodeEntities, extractInlineVar, joinLegendStats, merge, normalizeName, parseLegendList, parseLegendStats,
  riftboundIdFromImg, selectLegends, type CodexCard, type RiftdecksStat,
} from './merge'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const stat = (over: Partial<RiftdecksStat>): RiftdecksStat => ({
  name: 'Defy', slug: 'defy', img: '/img/cards/riftbound/OGN/ogn-045-298_cropped.png', full_img: '/img/cards/riftbound/OGN/ogn-045-298_full.png',
  set: 'OGN', domain: 'calm', type: 'Spell', decks: 10, copies: 2.9, play: 39.9, games: 100, win: 51.6, ...over,
})
const codex = (over: Partial<CodexCard> & { riftbound_id: string; name: string }): CodexCard => ({
  id: 'x', public_code: '', collector_number: 1,
  attributes: { energy: 1, might: null, power: 1 },
  classification: { type: 'Spell', supertype: null, rarity: 'Common', domain: ['Calm'] },
  text: { rich: '<p>a</p>', plain: '[Deathknell][&gt;] &quot;a&quot;', flavour: null },
  set: { set_id: 'OGN', label: 'Origins' },
  media: { image_url: 'https://cdn/x.png', artist: '', accessibility_text: '' },
  tags: [], orientation: 'portrait',
  metadata: { clean_name: '', alternate_art: false, overnumbered: false, signature: false },
  ...over,
})

describe('merge', () => {
  it('extracts an inline JS variable', () => {
    expect(extractInlineVar<number[]>('foo\n  var DATA = [1,2];\n  var X = 1;\n', 'DATA')).toEqual([1, 2])
  })
  it('normalizes ids and names', () => {
    expect(riftboundIdFromImg('/img/cards/riftbound/UNL/unl-150a-219_cropped.png')).toBe('unl-150a-219')
    expect(normalizeName('Vi - Piltover Enforcer (Signature)')).toBe('vi, piltover enforcer')
    expect(decodeEntities('[&gt;] &quot;x&quot;')).toBe('[>] "x"')
  })
  it('joins by id, then by id without variant suffix, then by name; skips variants', () => {
    const cards = [
      codex({ riftbound_id: 'ogn-045-298', name: 'Defy' }),
      codex({ riftbound_id: 'unl-150-219', name: 'Vex - Apathetic' }),
      codex({ riftbound_id: 'unl-150*-219', name: 'Vex - Apathetic (Signature)', metadata: { clean_name: '', alternate_art: false, overnumbered: false, signature: true } }),
      codex({ riftbound_id: 'sfd-001-221', name: 'Foo' }),
    ]
    const { cards: out, unmatched } = merge(
      [stat({}), stat({ name: 'Vex, Apathetic', img: '/img/cards/riftbound/UNL/unl-150a-219_cropped.png', play: 5 }), stat({ name: 'Foo', img: '/x/zzz-001-001_cropped.png', play: 1 }), stat({ name: 'Nope', img: '/x/nop-000-000_cropped.png', play: 0 })],
      cards,
    )
    expect(unmatched).toEqual(['Nope (nop-000-000)'])
    expect(out.map((c) => c.id)).toEqual(['ogn-045-298', 'unl-150-219', 'zzz-001-001', 'nop-000-000'])
    expect(out[0].text).toBe('[Deathknell][>] "a"')
    expect(out[1].rarity).toBe('Common')
    expect(out[3].rarity).toBeNull()
  })
})

describe('riftdecks legends', () => {
  it('parses the legend list with slug, full name, deck count and share', () => {
    const legends = parseLegendList(fixture('legends.html'))
    expect(legends).toEqual([
      { slug: 'kennen-heart-of-the-tempest', name: 'Kennen, Heart of the Tempest', decks: 1216, share: 10 },
      { slug: 'master-yi-wuju-bladesman', name: 'Master Yi, Wuju Bladesman', decks: 1041, share: 8 },
      { slug: 'kaisa-daughter-of-the-void', name: "Kai'sa, Daughter of the Void", decks: 555, share: 4 },
      { slug: 'master-yi-wuju-master', name: 'Master Yi, Wuju Master', decks: 80, share: 0 },
    ])
  })
  it('keeps legends above the deck threshold, most played first', () => {
    const legends = [
      { slug: 'a', name: 'A', decks: 150, share: 1 },
      { slug: 'b', name: 'B', decks: 99, share: 0 },
      { slug: 'c', name: 'C', decks: 100, share: 1 },
      { slug: 'd', name: 'D', decks: 900, share: 7 },
    ]
    expect(selectLegends(legends, 100).map((l) => l.slug)).toEqual(['d', 'a', 'c'])
  })
  it('parses a stats page: category, presence, average copies, base card id', () => {
    const entries = parseLegendStats(fixture('legend-stats-main.html'))
    expect(entries).toEqual([
      { id: 'ven-156-166', name: 'Lightning Rush', presence: 99.67, copies: 3, category: 'core' },
      { id: 'ogn-183-298', name: 'Stacked Deck', presence: 98.03, copies: 3, category: 'core' },
      { id: 'unl-176-219', name: 'Vi, Peacekeeper', presence: 11.76, copies: 1.2, category: 'flex' },
      { id: 'ogn-230-298', name: 'Albus Ferros', presence: 0.08, copies: 3, category: 'fringe' },
      { id: 'ven-099-166', name: 'Tornado Warrior', presence: 6.09, copies: 2.2, category: 'gem' },
    ])
  })
  it('drops and reports unknown cards, dedupes ids and sorts by presence', () => {
    const entries = parseLegendStats(fixture('legend-stats-main.html'))
    const dup = { id: 'ogn-183-298', name: 'Stacked Deck', presence: 1, copies: 1, category: 'fringe' }
    const known = new Set(['ven-156-166', 'ogn-183-298', 'unl-176-219', 'ven-099-166'])
    const { cards, unmatched } = joinLegendStats([...entries, dup], known)
    expect(cards.map((c) => c.id)).toEqual(['ven-156-166', 'ogn-183-298', 'unl-176-219', 'ven-099-166'])
    expect(cards[1]).toEqual({ id: 'ogn-183-298', presence: 98.03, copies: 3, category: 'core' })
    expect(unmatched).toEqual(['Albus Ferros (ogn-230-298)'])
  })
})
