import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { useCards } from '../data/CardsContext'
import { db, DEFAULT_SETTINGS, type CardState, type Settings } from '../db/schema'
import { deriveDecks, type Deck } from '../decks/derived'
import type { StudyMode } from '../study/modes'

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('main'), [])
  return useMemo(() => ({ ...DEFAULT_SETTINGS, ...s, id: 'main' as const }), [s])
}

/** Map cardId -> état pour un mode (réactif). */
export function useStates(mode: StudyMode): Map<string, CardState> {
  const rows = useLiveQuery(() => db.cardStates.where('mode').equals(mode).toArray(), [mode])
  return useMemo(() => new Map((rows ?? []).map((r) => [r.cardId, r])), [rows])
}

export function useAllStates(): CardState[] {
  return useLiveQuery(() => db.cardStates.toArray(), []) ?? []
}

export function useCustomDecks() {
  return useLiveQuery(() => db.customDecks.orderBy('createdAt').toArray(), []) ?? []
}

export function useDecks(): Deck[] {
  const { cards } = useCards()
  const settings = useSettings()
  const custom = useCustomDecks()
  return useMemo(() => deriveDecks(cards, settings.playRateThreshold, custom), [cards, settings.playRateThreshold, custom])
}

export function useLogs() {
  return useLiveQuery(() => db.reviewLogs.orderBy('reviewedAt').toArray(), []) ?? []
}
