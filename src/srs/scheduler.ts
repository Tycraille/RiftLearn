import { createEmptyCard, fsrs, generatorParameters, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs'
import type { CardState } from '../db/schema'
import type { StudyMode } from '../study/modes'

export type { Grade }
export { Rating }

const params = generatorParameters({ enable_fuzz: true, request_retention: 0.9 })
const f = fsrs(params)

export function stateId(cardId: string, mode: StudyMode): string {
  return `${cardId}:${mode}`
}

export function emptyState(cardId: string, mode: StudyMode, now = new Date()): CardState {
  return toState(cardId, mode, createEmptyCard(now))
}

export function toFsrs(s: CardState): FsrsCard {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review == null ? undefined : new Date(s.last_review),
  }
}

export function toState(cardId: string, mode: StudyMode, c: FsrsCard): CardState {
  return {
    id: stateId(cardId, mode),
    cardId,
    mode,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as 0 | 1 | 2 | 3,
    last_review: c.last_review ? c.last_review.getTime() : null,
  }
}

/** Applique une note et renvoie le nouvel état. */
export function schedule(s: CardState, grade: Grade, now = new Date()): CardState {
  const { card } = f.next(toFsrs(s), now, grade)
  return toState(s.cardId, s.mode, card)
}

/** Prochaine échéance pour chaque note, pour l'affichage sous les boutons. */
export function preview(s: CardState, now = new Date()): Record<Grade, Date> {
  const p = f.repeat(toFsrs(s), now)
  return {
    [Rating.Again]: p[Rating.Again].card.due,
    [Rating.Hard]: p[Rating.Hard].card.due,
    [Rating.Good]: p[Rating.Good].card.due,
    [Rating.Easy]: p[Rating.Easy].card.due,
  }
}

export function isDue(s: CardState, now = new Date()): boolean {
  return s.state !== 0 && s.due <= now.getTime()
}

/** "Maîtrisée" = en Review avec un intervalle ≥ 21 jours (convention Anki "mature"). */
export function isMature(s: CardState): boolean {
  return s.state === 2 && s.scheduled_days >= 21
}

/** Formatage court d'un intervalle : "10 min", "3 j", "2 mois" */
export function formatInterval(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return '< 1 min'
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} j`
  const mo = Math.round(d / 30)
  if (mo < 12) return `${mo} mois`
  const y = (d / 365).toFixed(1).replace('.0', '')
  return `${y} an${Number(y) >= 2 ? 's' : ''}`
}

export function localDay(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
