import { CARD_TYPES, DOMAIN_INFO, DOMAINS, SET_LABELS, TYPE_LABELS, type Card } from '../data/types'
import type { CustomDeck } from '../db/schema'

export type DeckKind = 'all' | 'domain' | 'type' | 'set' | 'custom'

export interface Deck {
  /** 'all' | 'domain:calm' | 'type:Unit' | 'set:OGN' | 'custom:12' */
  id: string
  kind: DeckKind
  label: string
  color?: string
  cards: Card[]
  customId?: number
}

/** Cartes retenues par le seuil de taux de jeu, triées par popularité. */
export function metaCards(cards: Card[], threshold: number): Card[] {
  return cards.filter((c) => c.stats.play >= threshold)
}

export function deriveDecks(allCards: Card[], threshold: number, custom: CustomDeck[] = []): Deck[] {
  const meta = metaCards(allCards, threshold)
  const decks: Deck[] = [{ id: 'all', kind: 'all', label: 'Toutes les cartes méta', cards: meta }]

  for (const d of DOMAINS) {
    const cards = meta.filter((c) => c.domain === d)
    if (cards.length) decks.push({ id: `domain:${d}`, kind: 'domain', label: DOMAIN_INFO[d].label, color: DOMAIN_INFO[d].color, cards })
  }
  for (const t of CARD_TYPES) {
    const cards = meta.filter((c) => c.type === t)
    if (cards.length) decks.push({ id: `type:${t}`, kind: 'type', label: TYPE_LABELS[t], cards })
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
  return decks
}

export function findDeck(decks: Deck[], id: string): Deck | undefined {
  return decks.find((d) => d.id === id)
}
