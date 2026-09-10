import Dexie, { type EntityTable } from 'dexie'
import type { StudyMode } from '../study/modes'

/** Miroir de ts-fsrs `Card`, sérialisable (dates en ISO/number) */
export interface CardState {
  /** `${cardId}:${mode}` */
  id: string
  cardId: string
  mode: StudyMode
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  /** 0 New, 1 Learning, 2 Review, 3 Relearning */
  state: 0 | 1 | 2 | 3
  last_review: number | null
}

export interface ReviewLog {
  id?: number
  cardId: string
  mode: StudyMode
  /** 1 Again, 2 Hard, 3 Good, 4 Easy */
  rating: 1 | 2 | 3 | 4
  /** état de la carte AVANT la révision */
  stateBefore: 0 | 1 | 2 | 3
  reviewedAt: number
  /** jour local YYYY-MM-DD, pour les agrégats */
  day: string
  /** ms passées sur la carte */
  elapsed: number
}

export interface CustomDeck {
  id?: number
  name: string
  cardIds: string[]
  createdAt: number
}

export interface Settings {
  id: 'main'
  /** seuil de taux de jeu (%) pour les paquets dérivés */
  playRateThreshold: number
  dailyNewLimit: number
  dailyReviewLimit: number
  enabledModes: StudyMode[]
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  playRateThreshold: 5,
  dailyNewLimit: 15,
  dailyReviewLimit: 200,
  enabledModes: ['image', 'name', 'quiz'],
}

export class RiftLearnDB extends Dexie {
  cardStates!: EntityTable<CardState, 'id'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  customDecks!: EntityTable<CustomDeck, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'riftlearn') {
    super(name)
    this.version(1).stores({
      cardStates: 'id, cardId, mode, [mode+due], [mode+state]',
      reviewLogs: '++id, cardId, mode, reviewedAt, day, [mode+day]',
      customDecks: '++id, name, createdAt',
      settings: 'id',
    })
  }
}

export const db = new RiftLearnDB()
