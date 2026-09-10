import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CARD_TYPES, DOMAIN_INFO, DOMAINS, type Card } from '../../data/types'
import type { CardState, ReviewLog } from '../../db/schema'
import { useT } from '../../i18n/I18nContext'
import { isDue, localDay } from '../../srs/scheduler'
import { STUDY_MODES, type StudyMode } from '../../study/modes'
import { useAllStates, useDecks, useLogs, useSettings } from '../hooks'
import { ModeTabs, useStudyMode } from './Decks'

export function Dashboard() {
  const { t } = useT()
  const decks = useDecks()
  const settings = useSettings()
  const states = useAllStates()
  const logs = useLogs()
  const [mode, setMode] = useStudyMode()
  const meta = decks[0]?.cards ?? []

  const now = new Date()
  const today = localDay(now)
  const byMode = useMemo(() => {
    const m = new Map<StudyMode, Map<string, CardState>>()
    for (const s of states) {
      if (!m.has(s.mode)) m.set(s.mode, new Map())
      m.get(s.mode)!.set(s.cardId, s)
    }
    return m
  }, [states])

  const dueByMode = STUDY_MODES.map((m) => {
    const st = byMode.get(m) ?? new Map<string, CardState>()
    let due = 0
    let fresh = 0
    for (const c of meta) {
      const s = st.get(c.id)
      if (!s || s.state === 0) fresh++
      else if (isDue(s, now)) due++
    }
    return { mode: m, due, fresh }
  }).filter((x) => settings.enabledModes.includes(x.mode))

  const { streak, days } = useMemo(() => computeActivity(logs, new Date()), [logs])
  const todayCount = days.get(today) ?? 0
  const best = dueByMode.find((x) => x.due > 0) ?? dueByMode.find((x) => x.fresh > 0) ?? dueByMode[0]
  const modeStates = byMode.get(mode) ?? new Map<string, CardState>()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-accent">Rift</span>Learn
          </h1>
          <p className="text-sm text-muted">{t('dashboard.metaCount', { n: meta.length, threshold: settings.playRateThreshold })}</p>
        </div>
        {best && (
          <Link to={`/study/all?mode=${best.mode}`} className="btn-primary">
            {t('dashboard.studyNow')}
          </Link>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {dueByMode.map((x) => (
          <Link key={x.mode} to={`/study/all?mode=${x.mode}`} className="panel p-4 transition hover:border-accent">
            <div className="label">{t(`mode.${x.mode}.label`)}</div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-again">{x.due}</span>
              <span className="text-sm text-muted">{t('dashboard.due')}</span>
              <span className="text-xl font-semibold text-accent">{Math.min(x.fresh, settings.dailyNewLimit)}</span>
              <span className="text-sm text-muted">{t('dashboard.new')}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="panel flex flex-col justify-center p-4 text-center sm:w-40">
          <div className="text-4xl font-bold">{streak}</div>
          <div className="text-xs text-muted">{t('dashboard.streak', { n: streak })}</div>
          <div className="mt-2 text-sm">
            <span className="font-semibold">{todayCount}</span> <span className="text-muted">{t('dashboard.today')}</span>
          </div>
        </div>
        <div className="panel overflow-x-auto p-4">
          <div className="label mb-2">{t('dashboard.lastWeeks')}</div>
          <Heatmap days={days} now={now} />
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="label">{t('dashboard.progressTitle')}</h2>
          <ModeTabs mode={mode} onChange={setMode} />
        </div>
        <Breakdown cards={meta} states={modeStates} groups={DOMAINS.map((d) => ({ key: d, label: DOMAIN_INFO[d].label, color: DOMAIN_INFO[d].color, match: (c: Card) => c.domain === d }))} />
        <Breakdown cards={meta} states={modeStates} groups={CARD_TYPES.map((type) => ({ key: type, label: t(`type.${type}`), match: (c: Card) => c.type === type }))} />
        <div className="flex gap-4 text-xs text-muted">
          <span>
            <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-good" />
            {t('status.matureLegend')}
          </span>
          <span>
            <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-hard" />
            {t('status.learning')}
          </span>
          <span>
            <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-line" />
            {t('status.new')}
          </span>
        </div>
      </section>
    </div>
  )
}

function computeActivity(logs: ReviewLog[], now: Date) {
  const days = new Map<string, number>()
  for (const l of logs) days.set(l.day, (days.get(l.day) ?? 0) + 1)
  let streak = 0
  const d = new Date(now)
  if (!days.has(localDay(d))) d.setDate(d.getDate() - 1) // the current day does not break the streak
  while (days.has(localDay(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return { streak, days }
}

function Heatmap({ days, now }: { days: Map<string, number>; now: Date }) {
  const { t, date } = useT()
  const weeks = 12
  const end = new Date(now)
  const start = new Date(end)
  start.setDate(end.getDate() - (weeks * 7 - 1) - ((end.getDay() + 6) % 7))
  const cells: { day: string; date: Date; n: number }[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = localDay(d)
    cells.push({ day: k, date: new Date(d), n: days.get(k) ?? 0 })
  }
  const max = Math.max(1, ...cells.map((c) => c.n))
  const cols: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7))
  return (
    <div className="flex gap-1">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-1">
          {col.map((c) => {
            const level = c.n === 0 ? 0 : Math.ceil((c.n / max) * 4)
            const bg = ['bg-panel-2', 'bg-accent/30', 'bg-accent/50', 'bg-accent/75', 'bg-accent'][level]
            return (
              <div
                key={c.day}
                className={`h-3 w-3 rounded-sm ${bg}`}
                title={t('dashboard.heatmapCell', { day: date(c.date), reviews: t('common.reviews', { n: c.n }) })}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Breakdown({
  cards,
  states,
  groups,
}: {
  cards: Card[]
  states: Map<string, CardState>
  groups: { key: string; label: string; color?: string; match: (c: Card) => boolean }[]
}) {
  const { t } = useT()
  return (
    <div className="space-y-1.5">
      {groups.map((g) => {
        const list = cards.filter(g.match)
        if (!list.length) return null
        let mature = 0
        let learning = 0
        for (const c of list) {
          const s = states.get(c.id)
          if (!s || s.state === 0) continue
          if (s.state === 2 && s.scheduled_days >= 21) mature++
          else learning++
        }
        const fresh = list.length - mature - learning
        const pct = (n: number) => `${(n / list.length) * 100}%`
        return (
          <div key={g.key} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 truncate" style={{ color: g.color }}>
              {g.label}
            </span>
            <div className="flex h-3 flex-1 overflow-hidden rounded bg-line">
              <div className="bg-good" style={{ width: pct(mature) }} />
              <div className="bg-hard" style={{ width: pct(learning) }} />
            </div>
            <span className="w-24 shrink-0 text-right text-xs text-muted">
              {t('dashboard.breakdown', { mature, total: list.length, fresh })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
