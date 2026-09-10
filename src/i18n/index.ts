/**
 * Minimal i18n layer: typed dictionaries, `{param}` interpolation, plural forms through
 * `Intl.PluralRules`, locale-aware number and date formatting.
 * Pure module (no React, no Dexie) so that non-UI code can take a `Translate` function.
 */
import { en } from './en'
import { fr, type MessageKey } from './fr'
import type { Entry, Lang, Params } from './types'

export type { Lang, MessageKey, Params }

export const LANGUAGES: readonly Lang[] = ['fr', 'en']

/** Native language names, shown untranslated in the language selector. */
export const LANGUAGE_NAMES: Record<Lang, string> = { fr: 'Français', en: 'English' }

const DICTIONARIES: Record<Lang, Record<MessageKey, Entry>> = { fr, en }
const LOCALES: Record<Lang, string> = { fr: 'fr-FR', en: 'en-US' }

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.includes(value as Lang)
}

/** `fr*` → French, anything else (or unknown) → English. */
export function detectLanguage(browserLanguage = typeof navigator === 'undefined' ? undefined : navigator.language): Lang {
  return browserLanguage?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export type Translate = (key: MessageKey, params?: Params) => string

export interface I18n {
  lang: Lang
  locale: string
  t: Translate
  /** Locale-aware number; `digits` fixes the number of decimals. */
  num: (n: number, digits?: number) => string
  date: (d: Date | number | string) => string
}

function createI18n(lang: Lang): I18n {
  const locale = LOCALES[lang]
  const dict = DICTIONARIES[lang]
  const plurals = new Intl.PluralRules(locale)
  const formats = new Map<number | undefined, Intl.NumberFormat>()

  const num = (n: number, digits?: number) => {
    let f = formats.get(digits)
    if (!f) {
      f = new Intl.NumberFormat(locale, digits == null ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits })
      formats.set(digits, f)
    }
    return f.format(n)
  }

  const t: Translate = (key, params = {}) => {
    const entry = dict[key]
    const template =
      typeof entry === 'string' ? entry : ((typeof params.n === 'number' ? entry[plurals.select(params.n)] : undefined) ?? entry.other)
    // Single pass: interpolated values are never re-scanned for placeholders
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const v = params[name]
      if (v == null) return match
      return typeof v === 'number' ? num(v) : v
    })
  }

  const date = (d: Date | number | string) => new Date(d).toLocaleDateString(locale)

  return { lang, locale, t, num, date }
}

const cache = new Map<Lang, I18n>()

/** Returns a (cached, hence referentially stable) translator for a language. */
export function getI18n(lang: Lang): I18n {
  let i = cache.get(lang)
  if (!i) {
    i = createI18n(lang)
    cache.set(lang, i)
  }
  return i
}
