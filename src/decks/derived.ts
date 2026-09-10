import { CARD_TYPES, DOMAIN_INFO, DOMAINS, SET_LABELS, type Card, type Legend } from '../data/types'
import type { CustomDeck } from '../db/schema'
import type { Translate } from '../i18n'
import type { NewOrder } from '../study/session'

export type DeckKind = 'all' | 'domain' | 'type' | 'set' | 'custom' | 'legend'

export interface Deck {
  /** 'all' | 'domain:calm' | 'type:Unit' | 'set:OGN' | 'custom:12' | 'legend:kennen-heart-of-the-tempest' */
  id: string
  kind: DeckKind
  label: string
  color?: string
  cards: Card[]
  customId?: number
  /** Order in which a session introduces new cards; global play rate when absent */
  newOrder?: NewOrder
  /** Legend decks: number of recorded decks for the legend */
  legendDecks?: number
}

/** Cards above the play-rate threshold, sorted by popularity. */
export function metaCards(cards: Card[], threshold: number): Card[] {
  return cards.filter((c) => c.stats.play >= threshold)
}

/**
 * One deck per legend: its cards present in at least `threshold` % of the legend's decks, by presence
 * descending, legends by number of recorded decks. Empty decks are dropped.
 */
export function deriveLegendDecks(legends: Legend[], byId: Map<string, Card>, threshold: number): Deck[] {
  const decks: Deck[] = []
  for (const l of [...legends].sort((a, b) => b.decks - a.decks)) {
    const cards = l.cards
      .filter((s) => s.presence >= threshold)
      .sort((a, b) => b.presence - a.presence)
      .map((s) => byId.get(s.id))
      .filter((c): c is Card => !!c)
    if (cards.length) decks.push({ id: `legend:${l.slug}`, kind: 'legend', label: l.name, cards, newOrder: 'deck', legendDecks: l.decks })
  }
  return decks
}

export function deriveDecks(
  allCards: Card[],
  threshold: number,
  t: Translate,
  custom: CustomDeck[] = [],
  legends: Legend[] = [],
  legendThreshold = 0,
): Deck[] {
  const meta = metaCards(allCards, threshold)
  const decks: Deck[] = [{ id: 'all', kind: 'all', label: t('decks.all'), cards: meta }]

  for (const d of DOMAINS) {
    const cards = meta.filter((c) => c.domain === d)
    if (cards.length) decks.push({ id: `domain:${d}`, kind: 'domain', label: DOMAIN_INFO[d].label, color: DOMAIN_INFO[d].color, cards })
  }
  for (const type of CARD_TYPES) {
    const cards = meta.filter((c) => c.type === type)
    if (cards.length) decks.push({ id: `type:${type}`, kind: 'type', label: t(`type.${type}`), cards })
  }
  const sets = [...new Set(meta.map((c) => c.set))].sort()
  for (const s of sets) {
    decks.push({ id: `set:${s}`, kind: 'set', label: SET_LABELS[s] ?? s, cards: meta.filter((c) => c.set === s) })
  }

  const byId = new Map(allCards.map((c) => [c.id, c]))
  for (const cd of custom) {
    const cards = cd.cardIds.map((id) => byId.get(id)).filter((c): c is Card => !!c)
    decks.push({ id: `custom:${cd.id}`, kind: 'custom', label: cd.name, cards, customId: cd.id })
  }
  decks.push(...deriveLegendDecks(legends, byId, legendThreshold))
  return decks
}

export function findDeck(decks: Deck[], id: string): Deck | undefined {
  return decks.find((d) => d.id === id)
}
