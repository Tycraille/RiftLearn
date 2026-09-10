import { describe, expect, it } from 'vitest'
import { decodeEntities, extractInlineVar, merge, normalizeName, riftboundIdFromImg, type CodexCard, type RiftdecksStat } from './merge'

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
