import { afterEach, describe, expect, it, vi } from 'vitest'
import { legendsFromJson, loadLegends } from './legends'

const kennen = {
  slug: 'kennen-heart-of-the-tempest',
  name: 'Kennen, Heart of the Tempest',
  decks: 1216,
  share: 10,
  cards: [{ id: 'ven-156-166', presence: 99.67, copies: 3, category: 'core' }],
}

describe('legends', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads the legends of a legends.json', () => {
    expect(legendsFromJson({ generatedAt: 'x', source: 'y', minDecks: 100, legends: [kennen] })).toEqual([kennen])
  })
  it('yields an empty list for an invalid file', () => {
    expect(legendsFromJson(null)).toEqual([])
    expect(legendsFromJson({})).toEqual([])
    expect(legendsFromJson({ legends: 'nope' })).toEqual([])
    expect(legendsFromJson({ legends: [null, { slug: 'a' }, kennen] })).toEqual([kennen])
  })
  it('yields an empty list when the file is missing or not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })))
    expect(await loadLegends()).toEqual([])
    // Vite's dev server serves index.html for a missing public file.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<!doctype html><html></html>', { status: 200 })))
    expect(await loadLegends()).toEqual([])
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    expect(await loadLegends()).toEqual([])
  })
  it('loads legends.json when present', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ legends: [kennen] })))
    expect(await loadLegends()).toEqual([kennen])
  })
})
