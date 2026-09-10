export type Lang = 'fr' | 'en'

/**
 * A message: either a plain template, or plural forms selected with `Intl.PluralRules`
 * on the numeric `n` parameter (`other` is the mandatory fallback).
 * Templates interpolate `{name}` placeholders.
 */
export type Entry = string | (Partial<Record<Intl.LDMLPluralRule, string>> & { other: string })

export type Params = Record<string, string | number>
