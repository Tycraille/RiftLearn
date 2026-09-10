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

export const TYPE_LABELS: Record<CardType, string> = {
  Unit: 'Unités',
  Spell: 'Sorts',
  Gear: 'Équipements',
  Rune: 'Runes',
  Battlefield: 'Champs de bataille',
}

export const SET_LABELS: Record<string, string> = {
  OGN: 'Origins',
  OGS: 'Origins Proving Grounds',
  UNL: 'Unleashed',
  SFD: 'Spiritforged',
  VEN: 'Vendetta',
}

export interface CardStats {
  /** % de decks jouant au moins une copie */
  play: number
  /** % de victoires des decks jouant la carte (null si < 50 parties) */
  win: number | null
  decks: number
  copies: number
  games: number
}

export interface Card {
  /** riftbound_id, ex. "ogn-045-298" */
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
  /** nombre de runes de domaine requises (coût coloré) */
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
