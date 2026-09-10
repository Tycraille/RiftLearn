import type { Card } from '../data/types'

export interface ParsedDecklist {
  found: { card: Card; count: number }[]
  missing: string[]
}

/** "Vi - Peacekeeper (UNL)" / "Vi, Peacekeeper" -> "vi, peacekeeper" */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const HEADER = /^(main ?deck|deck|legend|champion|battlefields?|runes?|sideboard|side|units?|spells?|gear|total)\b/i

/**
 * Recognized line formats:
 *   3 Defy · 3x Defy · x3 Defy · Defy x3 · Defy ×3 · Defy (3) · Defy
 * Blank lines, comments (# or //) and section headers are ignored.
 */
export function parseDecklist(text: string, cards: Card[]): ParsedDecklist {
  const index = new Map<string, Card>()
  for (const c of cards) index.set(normalizeName(c.name), c)

  const found = new Map<string, { card: Card; count: number }>()
  const missing: string[] = []

  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue
    if (HEADER.test(line) && !index.has(normalizeName(line))) continue

    let count = 1
    let m: RegExpMatchArray | null
    if ((m = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i))) {
      count = Number(m[1])
      line = m[2]
    } else if ((m = line.match(/^[x×]\s*(\d+)\s+(.+)$/i))) {
      count = Number(m[1])
      line = m[2]
    } else if ((m = line.match(/^(.+?)\s+[x×]\s*(\d+)$/i))) {
      line = m[1]
      count = Number(m[2])
    } else if ((m = line.match(/^(.+?)\s*\((\d+)\)$/))) {
      line = m[1]
      count = Number(m[2])
    }

    const key = normalizeName(line)
    const card = index.get(key)
    if (!card) {
      missing.push(line.trim())
      continue
    }
    const prev = found.get(card.id)
    if (prev) prev.count += count
    else found.set(card.id, { card, count })
  }

  return { found: [...found.values()], missing }
}
