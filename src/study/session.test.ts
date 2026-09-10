import { describe, expect, it } from 'vitest'
import type { Card } from '../data/types'
import type { CardState, Settings } from '../db/schema'
import { emptyState } from '../srs/scheduler'
import { buildQueue } from './session'

const mk = (id: string, play: number): Card => ({ id, name: id, stats: { play } }) as Card
const settings = { dailyNewLimit: 2, dailyReviewLimit: 10 } as Settings
const today = { newCount: 0, reviewCount: 0 }
const now = new Date('2026-09-11T12:00:00Z')

const seen = (id: string, dueOffsetDays: number): CardState => ({
  ...emptyState(id, 'image', now),
  state: 2,
  due: now.getTime() + dueOffsetDays * 86_400_000,
  scheduled_days: 3,
})

// Deck order (e.g. presence with a legend) differs from the global play-rate order
const deck = [mk('low-play', 1), mk('mid-play', 5), mk('high-play', 9), mk('due-a', 2), mk('due-b', 3)]
const states = new Map([
  ['due-a', seen('due-a', -1)],
  ['due-b', seen('due-b', -3)],
])

describe('buildQueue', () => {
  it('introduces new cards by global play rate by default', () => {
    expect(buildQueue(deck, states, settings, today, { now }).fresh.map((c) => c.id)).toEqual(['high-play', 'mid-play'])
  })

  it('keeps the deck order for new cards when the deck asks for it', () => {
    const q = buildQueue(deck, states, settings, today, { now, newOrder: 'deck' })
    expect(q.fresh.map((c) => c.id)).toEqual(['low-play', 'mid-play'])
    // due cards are still most overdue first
    expect(q.due.map((c) => c.id)).toEqual(['due-b', 'due-a'])
  })
})
