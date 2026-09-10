import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { useCards } from '../data/CardsContext'
import { db, DEFAULT_SETTINGS, type CardState, type Settings } from '../db/schema'
import { deriveDecks, type Deck } from '../decks/derived'
import { useT } from '../i18n/I18nContext'
import type { StudyMode } from '../study/modes'

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('main'), [])
  return useMemo(() => ({ ...DEFAULT_SETTINGS, ...s, id: 'main' as const }), [s])
}

/** Map cardId -> state for a mode (live). */
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
  const { t } = useT()
  return useMemo(() => deriveDecks(cards, settings.playRateThreshold, t, custom), [cards, settings.playRateThreshold, t, custom])
}

export function useLogs() {
  return useLiveQuery(() => db.reviewLogs.orderBy('reviewedAt').toArray(), []) ?? []
}
