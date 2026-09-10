import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadLegends } from './legends'
import type { Card, CardsFile, Legend } from './types'

interface CardsValue {
  file: CardsFile
  cards: Card[]
  byId: Map<string, Card>
  /** Per-legend card stats (legends.json); empty when the file is missing or invalid */
  legends: Legend[]
}

const CardsCtx = createContext<CardsValue | null>(null)

export async function loadCardsFile(): Promise<CardsFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/cards.json`)
  if (!res.ok) throw new Error(`Failed to load cards.json (${res.status})`)
  return res.json()
}

export function CardsProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [data, setData] = useState<{ file: CardsFile; legends: Legend[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // loadLegends never rejects: a missing legends.json must not block the app.
    Promise.all([loadCardsFile(), loadLegends()]).then(
      ([file, legends]) => setData({ file, legends }),
      (e) => setError(String(e)),
    )
  }, [])

  const value = useMemo<CardsValue | null>(() => {
    if (!data) return null
    const { file, legends } = data
    return { file, cards: file.cards, byId: new Map(file.cards.map((c) => [c.id, c])), legends }
  }, [data])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!value) return <>{fallback ?? null}</>
  return <CardsCtx.Provider value={value}>{children}</CardsCtx.Provider>
}

export function useCards(): CardsValue {
  const v = useContext(CardsCtx)
  if (!v) throw new Error('useCards must be used within CardsProvider')
  return v
}
