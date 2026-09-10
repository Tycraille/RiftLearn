import { DOMAIN_INFO, DOMAINS, type Card, type Domain } from '../data/types'

export type QuizKind = 'energy' | 'domain' | 'name-from-text' | 'name-from-image'

export interface QuizQuestion {
  kind: QuizKind
  card: Card
  /** énoncé (texte) */
  prompt: string
  /** image à afficher comme énoncé */
  image?: string
  /** texte d'effet à afficher comme énoncé */
  text?: string
  options: string[]
  answerIndex: number
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

/** Distracteurs : même type et domaine, coût proche ; puis même type ; puis n'importe quoi. */
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

export function makeQuestion(card: Card, pool: Card[], rng: Rng = Math.random, kind?: QuizKind): QuizQuestion {
  const kinds = availableKinds(card)
  const k = kind && kinds.includes(kind) ? kind : kinds[Math.floor(rng() * kinds.length)]

  switch (k) {
    case 'energy': {
      const answer = String(card.energy)
      const candidates = [...new Set(pool.map((c) => c.energy).filter((e): e is number => e != null && e !== card.energy))]
      const near = candidates.sort((a, b) => Math.abs(a - card.energy!) - Math.abs(b - card.energy!)).slice(0, 6)
      const wrong = shuffle(near, rng).slice(0, 3).map(String)
      while (wrong.length < 3) wrong.push(String(card.energy! + wrong.length + 1))
      return finish(k, card, `Quel est le coût en énergie de « ${card.name} » ?`, answer, wrong, rng, { image: card.imageUrl })
    }
    case 'domain': {
      const answer = DOMAIN_INFO[card.domain].label
      const wrong = shuffle(DOMAINS.filter((d): d is Domain => d !== card.domain && d !== 'multi'), rng)
        .slice(0, 3)
        .map((d) => DOMAIN_INFO[d].label)
      return finish(k, card, `Quel est le domaine de « ${card.name} » ?`, answer, wrong, rng, { image: card.imageUrl })
    }
    case 'name-from-text': {
      const wrong = distractorCards(card, pool, 3, rng).map((c) => c.name)
      return finish(k, card, 'Quelle carte a cet effet ?', card.name, wrong, rng, { text: card.text! })
    }
    case 'name-from-image':
    default: {
      const wrong = distractorCards(card, pool, 3, rng).map((c) => c.name)
      return finish('name-from-image', card, 'Quelle est cette carte ?', card.name, wrong, rng, { image: card.imageUrl })
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
