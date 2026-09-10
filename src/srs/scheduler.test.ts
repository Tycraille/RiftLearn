import { describe, expect, it } from 'vitest'
import { getI18n } from '../i18n'
import { emptyState, formatInterval, isDue, preview, Rating, schedule } from './scheduler'

const now = new Date('2026-09-10T10:00:00')

describe('scheduler', () => {
  it('a new card is not due', () => {
    expect(isDue(emptyState('ogn-045-298', 'image', now), now)).toBe(false)
  })

  it('Again brings the card back within the day', () => {
    const s = schedule(emptyState('x', 'image', now), Rating.Again, now)
    expect(s.state).toBe(1)
    expect(s.due - now.getTime()).toBeLessThan(60 * 60_000)
    expect(isDue(s, new Date(now.getTime() + 2 * 60 * 60_000))).toBe(true)
  })

  it('Good then Good spaces out further each time', () => {
    let s = schedule(emptyState('x', 'name', now), Rating.Good, now)
    const first = s.due - now.getTime()
    const t2 = new Date(s.due + 1000)
    s = schedule(s, Rating.Good, t2)
    const second = s.due - t2.getTime()
    expect(second).toBeGreaterThan(first)
    expect(s.reps).toBe(2)
  })

  it('Easy schedules further than Good', () => {
    const p = preview(emptyState('x', 'quiz', now), now)
    expect(p[Rating.Easy].getTime()).toBeGreaterThan(p[Rating.Good].getTime())
    expect(p[Rating.Good].getTime()).toBeGreaterThan(p[Rating.Again].getTime())
  })

  it('formatInterval', () => {
    const fr = getI18n('fr').t
    const en = getI18n('en').t
    const after = (ms: number) => new Date(now.getTime() + ms)
    expect(formatInterval(now, after(20_000), fr)).toBe('< 1 min')
    expect(formatInterval(now, after(10 * 60_000), fr)).toBe('10 min')
    expect(formatInterval(now, after(3 * 86_400_000), fr)).toBe('3 j')
    expect(formatInterval(now, after(3 * 86_400_000), en)).toBe('3 d')
    expect(formatInterval(now, after(65 * 86_400_000), fr)).toBe('2 mois')
    expect(formatInterval(now, after(65 * 86_400_000), en)).toBe('2 mo')
    expect(formatInterval(now, after(365 * 86_400_000), fr)).toBe('1 an')
    expect(formatInterval(now, after(548 * 86_400_000), fr)).toBe('1,5 an')
    expect(formatInterval(now, after(730 * 86_400_000), fr)).toBe('2 ans')
    expect(formatInterval(now, after(548 * 86_400_000), en)).toBe('1.5 y')
  })
})
