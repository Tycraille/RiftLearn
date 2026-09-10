import type { Card } from '../data/types'
import type { CardState, Settings } from '../db/schema'
import type { DayCounts } from '../db/repo'
import { isDue } from '../srs/scheduler'

export interface Queue {
  /** due cards (already seen), most overdue first */
  due: Card[]
  /** new cards, most played first (or in deck order), capped by the daily quota */
  fresh: Card[]
}

/** How new cards are introduced: by global play rate, or in the order of the deck's cards. */
export type NewOrder = 'play' | 'deck'

export interface QueueOptions {
  now?: Date
  newOrder?: NewOrder
}

export interface DeckCounts {
  due: number
  fresh: number
  learning: number
  mature: number
  total: number
}

export function buildQueue(
  cards: Card[],
  states: Map<string, CardState>,
  settings: Settings,
  today: DayCounts,
  { now = new Date(), newOrder = 'play' }: QueueOptions = {},
): Queue {
  const due: { card: Card; due: number }[] = []
  const fresh: Card[] = []
  for (const card of cards) {
    const s = states.get(card.id)
    if (!s || s.state === 0) fresh.push(card)
    else if (isDue(s, now)) due.push({ card, due: s.due })
  }
  due.sort((a, b) => a.due - b.due)
  if (newOrder === 'play') fresh.sort((a, b) => b.stats.play - a.stats.play)
  const newBudget = Math.max(0, settings.dailyNewLimit - today.newCount)
  const reviewBudget = Math.max(0, settings.dailyReviewLimit - today.reviewCount)
  return { due: due.slice(0, reviewBudget).map((d) => d.card), fresh: fresh.slice(0, newBudget) }
}

/** Interleaves one new card every `every` due cards. */
export function interleave(q: Queue, every = 3): Card[] {
  const out: Card[] = []
  const due = [...q.due]
  const fresh = [...q.fresh]
  while (due.length || fresh.length) {
    for (let i = 0; i < every && due.length; i++) out.push(due.shift()!)
    if (fresh.length) out.push(fresh.shift()!)
  }
  return out
}

export function deckCounts(cards: Card[], states: Map<string, CardState>, now = new Date()): DeckCounts {
  const c: DeckCounts = { due: 0, fresh: 0, learning: 0, mature: 0, total: cards.length }
  for (const card of cards) {
    const s = states.get(card.id)
    if (!s || s.state === 0) c.fresh++
    else {
      if (isDue(s, now)) c.due++
      if (s.state === 2 && s.scheduled_days >= 21) c.mature++
      else c.learning++
    }
  }
  return c
}
