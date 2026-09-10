import { SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useCards } from '../../data/CardsContext'
import { CARD_TYPES, DOMAIN_INFO, DOMAINS, SET_LABELS } from '../../data/types'
import { normalizeName } from '../../decks/decklist'
import { useT } from '../../i18n/I18nContext'
import { useSettings, useStates } from '../hooks'
import { Cost, CardImage } from '../components/CardBits'
import type { CardLinkState } from './CardDetail'
import { activeFilterCount } from './cardFilters'
import { ModeTabs, useStudyMode } from './Decks'

type Sort = 'play' | 'win' | 'name' | 'energy'

export function CardsBrowser() {
  const { t, num } = useT()
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
  // Mobile filter panel: never persisted, closed on every arrival on the page.
  const [open, setOpen] = useState(false)

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
  const activeCount = useMemo(() => activeFilterCount({ domain, type, set, metaOnly }), [domain, type, set, metaOnly])

  function resetFilters() {
    setDomain('')
    setType('')
    setSet('')
    setMetaOnly(true)
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('nav.cards')}</h1>
        <ModeTabs mode={mode} onChange={setMode} />
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {/* Mobile: search + toggle on one line. From sm up the wrapper vanishes and the input is a grid item. */}
        <div className="flex gap-2 sm:contents">
          <input
            className="input min-w-0 flex-1 lg:col-span-2"
            placeholder={t('cards.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className="btn-ghost shrink-0 px-3 sm:hidden"
            aria-expanded={open}
            aria-controls="card-filters card-filters-meta"
            onClick={() => setOpen((o) => !o)}
          >
            <SlidersHorizontal size={16} className="shrink-0" aria-hidden />
            {t('cards.filters')}
            {activeCount > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-bg">{activeCount}</span>}
          </button>
        </div>
        {/* Collapsible on mobile, always shown from sm up. `contents` keeps the selects as grid items. */}
        <div id="card-filters" className={`${open ? 'contents' : 'hidden'} sm:contents`}>
          <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">{t('cards.allDomains')}</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_INFO[d].label}
              </option>
            ))}
          </select>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t('cards.allTypes')}</option>
            {CARD_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {t(`type.${ct}`)}
              </option>
            ))}
          </select>
          <select className="input" value={set} onChange={(e) => setSet(e.target.value)}>
            <option value="">{t('cards.allSets')}</option>
            {sets.map((s) => (
              <option key={s} value={s}>
                {SET_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="play">{t('cards.sort.play')}</option>
            <option value="win">{t('cards.sort.win')}</option>
            <option value="energy">{t('cards.sort.energy')}</option>
            <option value="name">{t('cards.sort.name')}</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <label id="card-filters-meta" className={`${open ? 'flex' : 'hidden'} items-center gap-2 sm:flex`}>
          <input type="checkbox" checked={metaOnly} onChange={(e) => setMetaOnly(e.target.checked)} />
          {t('cards.metaOnly', { threshold: settings.playRateThreshold })}
        </label>
        <div className="ml-auto flex items-center gap-3">
          {activeCount > 0 && (
            <button type="button" className="text-accent hover:underline" onClick={resetFilters}>
              {t('cards.resetFilters')}
            </button>
          )}
          <span>{t('common.cards', { n: list.length })}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.slice(0, limit).map((c) => {
          const s = states.get(c.id)
          const status = !s || s.state === 0 ? 'new' : s.state === 2 && s.scheduled_days >= 21 ? 'mature' : 'learning'
          const dot = status === 'mature' ? 'bg-good' : status === 'learning' ? 'bg-hard' : 'bg-line'
          return (
            <Link
              key={c.id}
              to={`/cards/${c.id}`}
              state={{ fromList: true } satisfies CardLinkState}
              className="group panel overflow-hidden transition hover:border-accent"
              // Safari does not focus links on click; the modal returns focus to this link on close.
              onClick={(e) => e.currentTarget.focus()}
            >
              <CardImage card={c} className="rounded-none" />
              <div className="space-y-1 p-2">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} title={t(`status.${status}`)} />
                  <span className="truncate text-sm font-medium">{c.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <Cost card={c} size="sm" />
                  <span>{t('common.percent', { n: num(c.stats.play, 1) })}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      {list.length > limit && (
        <button className="btn-ghost w-full" onClick={() => setLimit((l) => l + 60)}>
          {t('cards.showMore', { n: list.length - limit })}
        </button>
      )}
      {/* Card detail modal (child route /cards/:cardId), rendered in a portal. */}
      <Outlet />
    </div>
  )
}
