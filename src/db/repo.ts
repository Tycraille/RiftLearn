/**
 * Point d'accès unique aux données de progression.
 * Toute l'UI passe par ici ; c'est aussi le point d'accroche d'une future synchro cloud.
 */
import { db, DEFAULT_SETTINGS, type CardState, type CustomDeck, type ReviewLog, type Settings } from './schema'
import { emptyState, localDay, schedule, stateId, type Grade } from '../srs/scheduler'
import type { StudyMode } from '../study/modes'

// ---- Réglages ---------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('main')
  return { ...DEFAULT_SETTINGS, ...s, id: 'main' }
}

export async function saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch, id: 'main' as const }
  await db.settings.put(next)
  return next
}

// ---- États SRS --------------------------------------------------------------

export async function getStatesForMode(mode: StudyMode): Promise<Map<string, CardState>> {
  const rows = await db.cardStates.where('mode').equals(mode).toArray()
  return new Map(rows.map((r) => [r.cardId, r]))
}

export async function getAllStates(): Promise<CardState[]> {
  return db.cardStates.toArray()
}

export async function getState(cardId: string, mode: StudyMode): Promise<CardState | undefined> {
  return db.cardStates.get(stateId(cardId, mode))
}

export interface ReviewResult {
  before: CardState
  after: CardState
}

/** Enregistre une réponse : met à jour l'état FSRS et journalise la révision. */
export async function review(
  cardId: string,
  mode: StudyMode,
  grade: Grade,
  elapsed: number,
  now = new Date(),
): Promise<ReviewResult> {
  return db.transaction('rw', db.cardStates, db.reviewLogs, async () => {
    const before = (await db.cardStates.get(stateId(cardId, mode))) ?? emptyState(cardId, mode, now)
    const after = schedule(before, grade, now)
    await db.cardStates.put(after)
    await db.reviewLogs.add({
      cardId,
      mode,
      rating: grade as 1 | 2 | 3 | 4,
      stateBefore: before.state,
      reviewedAt: now.getTime(),
      day: localDay(now),
      elapsed,
    })
    return { before, after }
  })
}

export interface DayCounts {
  /** cartes nouvelles introduites aujourd'hui (première révision) */
  newCount: number
  /** révisions de cartes déjà vues aujourd'hui */
  reviewCount: number
}

export async function countToday(mode: StudyMode, now = new Date()): Promise<DayCounts> {
  const logs = await db.reviewLogs.where('[mode+day]').equals([mode, localDay(now)]).toArray()
  let newCount = 0
  let reviewCount = 0
  for (const l of logs) {
    if (l.stateBefore === 0) newCount++
    else reviewCount++
  }
  return { newCount, reviewCount }
}

export async function getLogs(): Promise<ReviewLog[]> {
  return db.reviewLogs.orderBy('reviewedAt').toArray()
}

export async function getLogsForCard(cardId: string): Promise<ReviewLog[]> {
  return db.reviewLogs.where('cardId').equals(cardId).sortBy('reviewedAt')
}

/** Remet une carte à zéro pour un mode (ou tous). */
export async function forgetCard(cardId: string, mode?: StudyMode): Promise<void> {
  if (mode) await db.cardStates.delete(stateId(cardId, mode))
  else await db.cardStates.where('cardId').equals(cardId).delete()
}

// ---- Paquets personnalisés --------------------------------------------------

export async function listCustomDecks(): Promise<CustomDeck[]> {
  return db.customDecks.orderBy('createdAt').toArray()
}

export async function createCustomDeck(name: string, cardIds: string[]): Promise<number> {
  return db.customDecks.add({ name, cardIds: [...new Set(cardIds)], createdAt: Date.now() }) as Promise<number>
}

export async function updateCustomDeck(id: number, patch: Partial<Pick<CustomDeck, 'name' | 'cardIds'>>): Promise<void> {
  if (patch.cardIds) patch = { ...patch, cardIds: [...new Set(patch.cardIds)] }
  await db.customDecks.update(id, patch)
}

export async function deleteCustomDeck(id: number): Promise<void> {
  await db.customDecks.delete(id)
}

// ---- Export / import / reset ------------------------------------------------

export interface ExportFile {
  app: 'riftlearn'
  version: 1
  exportedAt: string
  settings: Settings
  cardStates: CardState[]
  reviewLogs: Omit<ReviewLog, 'id'>[]
  customDecks: Omit<CustomDeck, 'id'>[]
}

export async function exportAll(): Promise<ExportFile> {
  const [settings, cardStates, reviewLogs, customDecks] = await Promise.all([
    getSettings(),
    db.cardStates.toArray(),
    db.reviewLogs.toArray(),
    db.customDecks.toArray(),
  ])
  return {
    app: 'riftlearn',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    cardStates,
    reviewLogs: reviewLogs.map(({ id: _id, ...l }) => l),
    customDecks: customDecks.map(({ id: _id, ...d }) => d),
  }
}

export function parseExport(json: string): ExportFile {
  const data = JSON.parse(json) as Partial<ExportFile>
  if (data.app !== 'riftlearn' || data.version !== 1) throw new Error("Ce fichier n'est pas un export RiftLearn v1.")
  if (!Array.isArray(data.cardStates) || !Array.isArray(data.reviewLogs)) throw new Error('Export incomplet.')
  return data as ExportFile
}

/** Remplace toute la progression locale par le contenu du fichier. */
export async function importAll(file: ExportFile): Promise<void> {
  await db.transaction('rw', db.settings, db.cardStates, db.reviewLogs, db.customDecks, async () => {
    await Promise.all([db.settings.clear(), db.cardStates.clear(), db.reviewLogs.clear(), db.customDecks.clear()])
    await db.settings.put({ ...DEFAULT_SETTINGS, ...file.settings, id: 'main' })
    await db.cardStates.bulkPut(file.cardStates)
    await db.reviewLogs.bulkAdd(file.reviewLogs)
    await db.customDecks.bulkAdd(file.customDecks ?? [])
  })
}

export async function resetProgress(): Promise<void> {
  await db.transaction('rw', db.cardStates, db.reviewLogs, async () => {
    await db.cardStates.clear()
    await db.reviewLogs.clear()
  })
}
