import path from 'node:path'

export const RIFTDECKS_ORIGIN = 'https://riftdecks.com'

// ---- Types source -----------------------------------------------------------

export interface RiftdecksStat {
  name: string
  slug: string
  img: string
  full_img: string
  set: string
  domain: string
  type: string
  decks: number
  copies: number
  play: number
  games: number
  win: number | null
}

export interface RiftdecksTotals {
  total_decks: number
  total_cards: number
  cards_with_winrate: number
  avg_winrate: number
  median_play: number
  min_games: number
}

export interface CodexCard {
  id: string
  name: string
  riftbound_id: string
  public_code: string
  collector_number: number
  attributes: { energy: number | null; might: number | null; power: number | null }
  classification: { type: string; supertype: string | null; rarity: string; domain: string[] }
  text: { rich: string; plain: string; flavour: string | null }
  set: { set_id: string; label: string }
  media: { image_url: string; artist: string; accessibility_text: string }
  tags: string[]
  metadata: { clean_name: string; alternate_art: boolean; overnumbered: boolean; signature: boolean }
}

// ---- Type cible (miroir de src/data/types.ts) -------------------------------

export interface Card {
  id: string
  name: string
  slug: string
  set: string
  setLabel: string
  domain: string
  domains: string[]
  type: string
  rarity: string | null
  energy: number | null
  might: number | null
  power: number | null
  text: string | null
  textRich: string | null
  flavour: string | null
  imageUrl: string
  imageFallback: string
  tags: string[]
  stats: { play: number; win: number | null; decks: number; copies: number; games: number }
}

// ---- riftdecks --------------------------------------------------------------

export function extractInlineVar<T>(html: string, name: string): T {
  const re = new RegExp(`var ${name} = (.*?);\\s*\\n`, 's')
  const m = html.match(re)
  if (!m) throw new Error(`Variable ${name} introuvable dans la page`)
  return JSON.parse(m[1]) as T
}

// ---- Riftcodex --------------------------------------------------------------

function isBaseCard(c: CodexCard): boolean {
  return (
    !c.metadata.alternate_art &&
    !c.metadata.signature &&
    !c.metadata.overnumbered &&
    !c.riftbound_id.includes('*')
  )
}

// ---- Jointure ---------------------------------------------------------------

/** "Vi - Piltover Enforcer (Signature)" et "Vi, Piltover Enforcer" -> "vi, piltover enforcer" */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+-\s+/g, ', ')
    .trim()
}

/** Riftcodex renvoie parfois des entités HTML dans le texte brut ("[&gt;]", "&quot;"). */
export function decodeEntities(s: string | null): string | null {
  if (s == null) return s
  return s
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

export function riftboundIdFromImg(img: string): string {
  // "/img/cards/riftbound/OGN/ogn-045-298_cropped.png" -> "ogn-045-298"
  const base = path.posix.basename(img)
  return base.replace(/_(cropped|full)\.\w+$/, '')
}

export function merge(stats: RiftdecksStat[], codex: CodexCard[]): { cards: Card[]; unmatched: string[] } {
  const byId = new Map<string, CodexCard>()
  const byName = new Map<string, CodexCard>()
  for (const c of codex) {
    if (!isBaseCard(c)) continue
    byId.set(c.riftbound_id.toLowerCase(), c)
    byName.set(normalizeName(c.name), c)
  }

  const cards: Card[] = []
  const unmatched: string[] = []
  for (const s of stats) {
    const rawId = riftboundIdFromImg(s.img)
    // "unl-150a-219" (variante affichée par riftdecks) -> "unl-150-219"
    const id = rawId.replace(/^([a-z]+-\d+)[a-z]+(-\d+)$/, '$1$2')
    const c = byId.get(id) ?? byId.get(rawId) ?? byName.get(normalizeName(s.name))
    if (!c) unmatched.push(`${s.name} (${id})`)
    const domains = c ? c.classification.domain.map((d) => d.toLowerCase()) : [s.domain]
    cards.push({
      id,
      name: s.name,
      slug: s.slug,
      set: s.set,
      setLabel: c?.set.label ?? s.set,
      domain: s.domain,
      domains,
      type: s.type,
      rarity: c?.classification.rarity ?? null,
      energy: c?.attributes.energy ?? null,
      might: c?.attributes.might ?? null,
      power: c?.attributes.power ?? null,
      text: decodeEntities(c?.text.plain ?? null),
      textRich: decodeEntities(c?.text.rich ?? null),
      flavour: decodeEntities(c?.text.flavour ?? null),
      imageUrl: c?.media.image_url ?? RIFTDECKS_ORIGIN + s.full_img,
      imageFallback: RIFTDECKS_ORIGIN + s.full_img,
      tags: c?.tags ?? [],
      stats: { play: s.play, win: s.win, decks: s.decks, copies: s.copies, games: s.games },
    })
  }
  cards.sort((a, b) => b.stats.play - a.stats.play || a.name.localeCompare(b.name))
  return { cards, unmatched }
}

