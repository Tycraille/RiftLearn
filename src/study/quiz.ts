import { DOMAIN_INFO, DOMAINS, type Card, type Domain } from '../data/types'
import type { Translate } from '../i18n'

export type QuizKind = 'energy' | 'domain' | 'name-from-text' | 'name-from-image'

export interface QuizQuestion {
  kind: QuizKind
  card: Card
  /** prompt text */
  prompt: string
  /** image shown as the prompt */
  image?: string
  /** rules text shown as the prompt */
  text?: string
  options: string[]
  answerIndex: number
}

/**
 * Areas of a Riftbound card image that can give an answer away:
 * - `cost`: energy circle and power runes (top-left)
 * - `might`: might value (top-right)
 * - `banner`: type tag and name banner, tinted with the domain color
 * - `lower`: everything from the type tag down (name, rules text, flavour, footer)
 * - `domain-icons`: domain icon(s) in the footer (bottom-right)
 */
export type CardRegion = 'cost' | 'might' | 'banner' | 'lower' | 'domain-icons'

/** Regions hidden when the name of the card must be guessed from its image. */
export const NAME_REGIONS: readonly CardRegion[] = ['cost', 'might', 'lower']

/** Regions of the image to hide until the question is answered. */
export function hiddenRegions(kind: QuizKind): readonly CardRegion[] {
  switch (kind) {
    case 'energy':
      return ['cost']
    case 'domain':
      return ['cost', 'banner', 'domain-icons']
    case 'name-from-image':
      return NAME_REGIONS
    case 'name-from-text':
      return []
  }
}

export type Rng = () => number

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistinct<T>(pool: T[], n: number, rng: Rng, key: (t: T) => string, exclude: Set<string>): T[] {
  const out: T[] = []
  const seen = new Set(exclude)
  for (const item of shuffle(pool, rng)) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
    if (out.length === n) break
  }
  return out
}

/** Distractors: same type and domain with a close cost; then same type; then anything. */
function distractorCards(card: Card, pool: Card[], n: number, rng: Rng): Card[] {
  const others = pool.filter((c) => c.id !== card.id)
  const tiers = [
    others.filter((c) => c.type === card.type && c.domain === card.domain && Math.abs((c.energy ?? 0) - (card.energy ?? 0)) <= 1),
    others.filter((c) => c.type === card.type && c.domain === card.domain),
    others.filter((c) => c.type === card.type),
    others,
  ]
  const out: Card[] = []
  const seen = new Set<string>([card.name])
  for (const tier of tiers) {
    for (const c of pickDistinct(tier, n - out.length, rng, (c) => c.name, seen)) {
      out.push(c)
      seen.add(c.name)
    }
    if (out.length === n) break
  }
  return out
}

export function availableKinds(card: Card): QuizKind[] {
  const kinds: QuizKind[] = ['name-from-image']
  if (card.text) kinds.push('name-from-text')
  if (card.energy != null) kinds.push('energy')
  if (card.domain !== 'multi') kinds.push('domain')
  return kinds
}

export function makeQuestion(card: Card, pool: Card[], t: Translate, rng: Rng = Math.random, kind?: QuizKind): QuizQuestion {
  const kinds = availableKinds(card)
  const k = kind && kinds.includes(kind) ? kind : kinds[Math.floor(rng() * kinds.length)]

  switch (k) {
    case 'energy': {
      const answer = String(card.energy)
      const candidates = [...new Set(pool.map((c) => c.energy).filter((e): e is number => e != null && e !== card.energy))]
      const near = candidates.sort((a, b) => Math.abs(a - card.energy!) - Math.abs(b - card.energy!)).slice(0, 6)
      const wrong = shuffle(near, rng).slice(0, 3).map(String)
      while (wrong.length < 3) wrong.push(String(card.energy! + wrong.length + 1))
      return finish(k, card, t('quiz.energy', { name: card.name }), answer, wrong, rng, { image: card.imageUrl })
    }
    case 'domain': {
      const answer = DOMAIN_INFO[card.domain].label
      const wrong = shuffle(DOMAINS.filter((d): d is Domain => d !== card.domain && d !== 'multi'), rng)
        .slice(0, 3)
        .map((d) => DOMAIN_INFO[d].label)
      return finish(k, card, t('quiz.domain', { name: card.name }), answer, wrong, rng, { image: card.imageUrl })
    }
    case 'name-from-text': {
      const wrong = distractorCards(card, pool, 3, rng).map((c) => c.name)
      return finish(k, card, t('quiz.nameFromText'), card.name, wrong, rng, { text: card.textRich ?? card.text! })
    }
    case 'name-from-image':
    default: {
      const wrong = distractorCards(card, pool, 3, rng).map((c) => c.name)
      return finish('name-from-image', card, t('quiz.nameFromImage'), card.name, wrong, rng, { image: card.imageUrl })
    }
  }
}

function finish(
  kind: QuizKind,
  card: Card,
  prompt: string,
  answer: string,
  wrong: string[],
  rng: Rng,
  extra: { image?: string; text?: string },
): QuizQuestion {
  const options = shuffle([answer, ...wrong], rng)
  return { kind, card, prompt, options, answerIndex: options.indexOf(answer), ...extra }
}
