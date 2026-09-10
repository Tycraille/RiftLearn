import { describe, expect, it } from 'vitest'
import { emptyState, formatInterval, isDue, preview, Rating, schedule } from './scheduler'

const now = new Date('2026-09-10T10:00:00')

describe('scheduler', () => {
  it('une nouvelle carte n\'est pas due', () => {
    expect(isDue(emptyState('ogn-045-298', 'image', now), now)).toBe(false)
  })

  it('Again ramène la carte dans la journée', () => {
    const s = schedule(emptyState('x', 'image', now), Rating.Again, now)
    expect(s.state).toBe(1)
    expect(s.due - now.getTime()).toBeLessThan(60 * 60_000)
    expect(isDue(s, new Date(now.getTime() + 2 * 60 * 60_000))).toBe(true)
  })

  it('Good puis Good espace de plus en plus', () => {
    let s = schedule(emptyState('x', 'name', now), Rating.Good, now)
    const first = s.due - now.getTime()
    const t2 = new Date(s.due + 1000)
    s = schedule(s, Rating.Good, t2)
    const second = s.due - t2.getTime()
    expect(second).toBeGreaterThan(first)
    expect(s.reps).toBe(2)
  })

  it('Easy planifie plus loin que Good', () => {
    const p = preview(emptyState('x', 'quiz', now), now)
    expect(p[Rating.Easy].getTime()).toBeGreaterThan(p[Rating.Good].getTime())
    expect(p[Rating.Good].getTime()).toBeGreaterThan(p[Rating.Again].getTime())
  })

  it('formatInterval', () => {
    expect(formatInterval(now, new Date(now.getTime() + 10 * 60_000))).toBe('10 min')
    expect(formatInterval(now, new Date(now.getTime() + 3 * 86_400_000))).toBe('3 j')
    expect(formatInterval(now, new Date(now.getTime() + 65 * 86_400_000))).toBe('2 mois')
  })
})
