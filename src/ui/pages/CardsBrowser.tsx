import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCards } from '../../data/CardsContext'
import { CARD_TYPES, DOMAIN_INFO, DOMAINS, SET_LABELS } from '../../data/types'
import { normalizeName } from '../../decks/decklist'
import { useSettings, useStates } from '../hooks'
import { Cost, CardImage } from '../components/CardBits'
import { ModeTabs, useStudyMode } from './Decks'

type Sort = 'play' | 'win' | 'name' | 'energy'

export function CardsBrowser() {
  const { cards } = useCards()
  const settings = useSettings()
  const [mode, setMode] = useStudyMode()
  const states = useStates(mode)
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState('')
  const [type, setType] = useState('')
  const [set, setSet] = useState('')
  const [sort, setSort] = useState<Sort>('play')
  const [metaOnly, setMetaOnly] = useState(true)
  const [limit, setLimit] = useState(60)

  const list = useMemo(() => {
    const nq = normalizeName(q)
    let l = cards.filter(
      (c) =>
        (!metaOnly || c.stats.play >= settings.playRateThreshold) &&
        (!domain || c.domain === domain) &&
        (!type || c.type === type) &&
        (!set || c.set === set) &&
        (!nq || normalizeName(c.name).includes(nq) || (c.text ?? '').toLowerCase().includes(nq)),
    )
    l = [...l].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'energy') return (a.energy ?? 99) - (b.energy ?? 99) || b.stats.play - a.stats.play
      if (sort === 'win') return (b.stats.win ?? -1) - (a.stats.win ?? -1)
      return b.stats.play - a.stats.play
    })
    return l
  }, [cards, q, domain, type, set, sort, metaOnly, settings.playRateThreshold])

  const sets = useMemo(() => [...new Set(cards.map((c) => c.set))].sort(), [cards])

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Cartes</h1>
        <ModeTabs mode={mode} onChange={setMode} />
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input lg:col-span-2" placeholder="Rechercher (nom ou texte)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="">Tous domaines</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {DOMAIN_INFO[d].label}
            </option>
          ))}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous types</option>
          {CARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="input" value={set} onChange={(e) => setSet(e.target.value)}>
          <option value="">Tous sets</option>
          {sets.map((s) => (
            <option key={s} value={s}>
              {SET_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="play">Tri : taux de jeu</option>
          <option value="win">Tri : taux de victoire</option>
          <option value="energy">Tri : coût</option>
          <option value="name">Tri : nom</option>
        </select>
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={metaOnly} onChange={(e) => setMetaOnly(e.target.checked)} />
          Seulement ≥ {settings.playRateThreshold} % de taux de jeu
        </label>
        <span>{list.length} cartes</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.slice(0, limit).map((c) => {
          const s = states.get(c.id)
          const status = !s || s.state === 0 ? 'new' : s.state === 2 && s.scheduled_days >= 21 ? 'mature' : 'learning'
          const dot = status === 'mature' ? 'bg-good' : status === 'learning' ? 'bg-hard' : 'bg-line'
          return (
            <Link key={c.id} to={`/cards/${c.id}`} className="group panel overflow-hidden transition hover:border-accent">
              <CardImage card={c} className="rounded-none" />
              <div className="space-y-1 p-2">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} title={status} />
                  <span className="truncate text-sm font-medium">{c.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <Cost card={c} size="sm" />
                  <span>{c.stats.play.toFixed(1)} %</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      {list.length > limit && (
        <button className="btn-ghost w-full" onClick={() => setLimit((l) => l + 60)}>
          Afficher plus ({list.length - limit} restantes)
        </button>
      )}
    </div>
  )
}
