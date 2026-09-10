import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { db, DEFAULT_SETTINGS } from '../db/schema'
import { getI18n, isLang, type I18n } from './index'

const I18nCtx = createContext<I18n>(getI18n(DEFAULT_SETTINGS.language))

/** Provides the translator for the language stored in settings (browser language by default). */
export function I18nProvider({ children }: { children: ReactNode }) {
  // null while IndexedDB is read, false when nothing is stored yet:
  // waiting avoids a flash of the browser language when another one was chosen
  const stored = useLiveQuery(async () => (await db.settings.get('main')) ?? false, [], null)
  const lang = stored && isLang(stored.language) ? stored.language : DEFAULT_SETTINGS.language

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  if (stored === null) return null
  return <I18nCtx.Provider value={getI18n(lang)}>{children}</I18nCtx.Provider>
}

export function useT(): I18n {
  return useContext(I18nCtx)
}
