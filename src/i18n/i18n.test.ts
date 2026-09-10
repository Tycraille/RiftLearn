import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fr } from './fr'
import { detectLanguage, getI18n, isLang } from './index'
import type { Entry } from './types'

const forms = (e: Entry): string[] => (typeof e === 'string' ? [e] : Object.values(e))
const placeholders = (e: Entry): string[] => [...new Set(forms(e).flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort()

describe('i18n', () => {
  it('detects French from any fr* browser language, English otherwise', () => {
    expect(detectLanguage('fr')).toBe('fr')
    expect(detectLanguage('fr-CA')).toBe('fr')
    expect(detectLanguage('FR-fr')).toBe('fr')
    expect(detectLanguage('en-GB')).toBe('en')
    expect(detectLanguage('de-DE')).toBe('en')
    expect(detectLanguage('')).toBe('en')
  })

  it('validates language values', () => {
    expect(isLang('fr')).toBe(true)
    expect(isLang('en')).toBe(true)
    expect(isLang('de')).toBe(false)
    expect(isLang(undefined)).toBe(false)
  })

  it('both dictionaries have the same keys and the same placeholders', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(fr[key]))
    }
  })

  it('interpolates parameters', () => {
    expect(getI18n('fr').t('quiz.cost', { name: 'Defy' })).toBe('Quel est le coût de « Defy » ?')
    expect(getI18n('en').t('quiz.cost', { name: 'Defy' })).toBe('What is the cost of “Defy”?')
    // interpolated values are not re-interpreted as placeholders
    expect(getI18n('en').t('quiz.cost', { name: '{name}' })).toBe('What is the cost of “{name}”?')
  })

  it('selects plural forms with each language rules', () => {
    const fr = getI18n('fr').t
    const en = getI18n('en').t
    expect(fr('common.cards', { n: 0 })).toBe('0 carte')
    expect(fr('common.cards', { n: 1 })).toBe('1 carte')
    expect(fr('common.cards', { n: 2 })).toBe('2 cartes')
    expect(en('common.cards', { n: 0 })).toBe('0 cards')
    expect(en('common.cards', { n: 1 })).toBe('1 card')
    expect(en('common.cards', { n: 2 })).toBe('2 cards')
  })

  it('formats numbers and dates with the language locale', () => {
    expect(getI18n('fr').num(12.345, 1)).toBe('12,3')
    expect(getI18n('en').num(12.345, 1)).toBe('12.3')
    expect(getI18n('en').t('settings.thresholdValue', { threshold: 5.5, cards: '3 cards' })).toBe('≥ 5.5% → 3 cards')
    expect(getI18n('fr').t('settings.thresholdValue', { threshold: 5.5, cards: '3 cartes' })).toBe('≥ 5,5 % → 3 cartes')
    expect(getI18n('en').num(12345)).toBe('12,345')
    const d = new Date(2026, 8, 10)
    expect(getI18n('fr').date(d)).toBe('10/09/2026')
    expect(getI18n('en').date(d)).toBe('9/10/2026')
  })
})
