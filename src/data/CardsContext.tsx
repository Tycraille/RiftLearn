import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Card, CardsFile } from './types'

interface CardsValue {
  file: CardsFile
  cards: Card[]
  byId: Map<string, Card>
}

const CardsCtx = createContext<CardsValue | null>(null)

export async function loadCardsFile(): Promise<CardsFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/cards.json`)
  if (!res.ok) throw new Error(`Impossible de charger cards.json (${res.status})`)
  return res.json()
}

export function CardsProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [file, setFile] = useState<CardsFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCardsFile().then(setFile, (e) => setError(String(e)))
  }, [])

  const value = useMemo<CardsValue | null>(() => {
    if (!file) return null
    return { file, cards: file.cards, byId: new Map(file.cards.map((c) => [c.id, c])) }
  }, [file])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!value) return <>{fallback ?? null}</>
  return <CardsCtx.Provider value={value}>{children}</CardsCtx.Provider>
}

export function useCards(): CardsValue {
  const v = useContext(CardsCtx)
  if (!v) throw new Error('useCards doit être utilisé sous CardsProvider')
  return v
}
