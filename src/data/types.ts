export const DOMAINS = ['body', 'calm', 'chaos', 'fury', 'mind', 'order', 'multi', 'colorless'] as const
export type Domain = (typeof DOMAINS)[number]

export const CARD_TYPES = ['Unit', 'Spell', 'Gear', 'Rune', 'Battlefield'] as const
export type CardType = (typeof CARD_TYPES)[number]

export const DOMAIN_INFO: Record<Domain, { label: string; color: string }> = {
  body: { label: 'Body', color: '#E87500' },
  calm: { label: 'Calm', color: '#488C38' },
  chaos: { label: 'Chaos', color: '#643D8A' },
  fury: { label: 'Fury', color: '#C8102E' },
  mind: { label: 'Mind', color: '#2D8BBA' },
  order: { label: 'Order', color: '#D4A017' },
  multi: { label: 'Multi', color: '#9A7BB0' },
  colorless: { label: 'Colorless', color: '#8A8F98' },
}

export const SET_LABELS: Record<string, string> = {
  OGN: 'Origins',
  OGS: 'Origins Proving Grounds',
  UNL: 'Unleashed',
  SFD: 'Spiritforged',
  VEN: 'Vendetta',
}

export interface CardStats {
  /** % of decks running at least one copy */
  play: number
  /** Match win rate of decks running the card (null when < 50 games) */
  win: number | null
  decks: number
  copies: number
  games: number
}

export interface Card {
  /** riftbound_id, e.g. "ogn-045-298" */
  id: string
  name: string
  slug: string
  set: string
  setLabel: string
  domain: Domain
  domains: string[]
  type: CardType
  rarity: string | null
  energy: number | null
  might: number | null
  /** Number of domain runes required (colored cost) */
  power: number | null
  text: string | null
  textRich: string | null
  flavour: string | null
  imageUrl: string
  imageFallback: string
  tags: string[]
  stats: CardStats
}

export interface CardsFile {
  generatedAt: string
  sources: { stats: string; cards: string }
  totals: {
    total_decks: number
    total_cards: number
    cards_with_winrate: number
    avg_winrate: number
    median_play: number
    min_games: number
  }
  cards: Card[]
}

/** riftdecks card category for a legend ("trap" has only been seen on the sideboard, which is not imported). */
export type LegendCardCategory = 'core' | 'flex' | 'fringe' | 'gem' | 'trap'

export interface LegendCardStat {
  /** Card id, always present in cards.json */
  id: string
  /** % of the legend's decks running the card */
  presence: number
  /** Average number of copies in the decks running it */
  copies: number
  category: LegendCardCategory
}

export interface Legend {
  /** riftdecks slug, the identifier (e.g. "master-yi-wuju-bladesman") */
  slug: string
  /** Full name, e.g. "Master Yi, Wuju Bladesman" */
  name: string
  decks: number
  /** Meta share, in % */
  share: number
  /** Main Deck and Battlefields cards, by presence descending */
  cards: LegendCardStat[]
}

export interface LegendsFile {
  generatedAt: string
  source: string
  minDecks: number
  /** By deck count descending */
  legends: Legend[]
}
