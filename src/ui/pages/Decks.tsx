import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCards } from '../../data/CardsContext'
import { createCustomDeck, deleteCustomDeck } from '../../db/repo'
import { parseDecklist } from '../../decks/decklist'
import type { Deck, DeckKind } from '../../decks/derived'
import { useT } from '../../i18n/I18nContext'
import { STUDY_MODES, type StudyMode } from '../../study/modes'
import { deckCounts } from '../../study/session'
import { useDecks, useSettings, useStates } from '../hooks'

const SECTIONS: DeckKind[] = ['all', 'custom', 'legend', 'domain', 'type', 'set']

export function useStudyMode(): [StudyMode, (m: StudyMode) => void] {
  const settings = useSettings()
  const [mode, setMode] = useState<StudyMode>(() => {
    try {
      const m = localStorage.getItem('riftlearn:mode') as StudyMode | null
      if (m && STUDY_MODES.includes(m)) return m
    } catch {
      /* ignore */
    }
    return 'image'
  })
  const effective = settings.enabledModes.includes(mode) ? mode : (settings.enabledModes[0] ?? 'image')
  return [
    effective,
    (m) => {
      setMode(m)
      try {
        localStorage.setItem('riftlearn:mode', m)
      } catch {
        /* ignore */
      }
    },
  ]
}

export function ModeTabs({ mode, onChange }: { mode: StudyMode; onChange: (m: StudyMode) => void }) {
  const { t } = useT()
  const settings = useSettings()
  return (
    <div className="inline-flex rounded-lg bg-panel-2 p-1">
      {STUDY_MODES.filter((m) => settings.enabledModes.includes(m)).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1.5 text-sm ${mode === m ? 'bg-accent text-bg font-semibold' : 'text-muted hover:text-ink'}`}
          title={t(`mode.${m}.label`)}
        >
          {t(`mode.${m}.short`)}
        </button>
      ))}
    </div>
  )
}

export function Decks() {
  const { t } = useT()
  const decks = useDecks()
  const settings = useSettings()
  const [mode, setMode] = useStudyMode()
  const states = useStates(mode)
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.decks')}</h1>
          <p className="text-sm text-muted">
            {t('decks.subtitle', { threshold: settings.playRateThreshold })} ·{' '}
            <Link to="/settings" className="underline">{t('decks.changeThreshold')}</Link>
          </p>
        </div>
        <ModeTabs mode={mode} onChange={setMode} />
      </header>

      {SECTIONS.map((kind) => {
        const list = decks.filter((d) => d.kind === kind)
        if (!list.length && kind !== 'custom') return null
        return (
          <section key={kind} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="label">{t(`decks.section.${kind}`)}</h2>
              {kind === 'custom' && (
                <button className="btn-ghost text-sm" onClick={() => setCreating((v) => !v)}>
                  {creating ? t('common.close') : t('decks.newDeck')}
                </button>
              )}
            </div>
            {kind === 'custom' && creating && <NewDeckForm onDone={() => setCreating(false)} />}
            {kind === 'custom' && !list.length && !creating && <p className="text-sm text-muted">{t('decks.noCustom')}</p>}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((d) => (
                <DeckTile key={d.id} deck={d} mode={mode} states={states} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function DeckTile({ deck, mode, states }: { deck: Deck; mode: StudyMode; states: ReturnType<typeof useStates> }) {
  const { t } = useT()
  const c = useMemo(() => deckCounts(deck.cards, states), [deck.cards, states])
  const pct = c.total ? Math.round(((c.total - c.fresh) / c.total) * 100) : 0
  return (
    <div className="panel flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {deck.color && <span className="h-3 w-3 rounded-full" style={{ background: deck.color }} />}
          <div>
            <div className="font-semibold">{deck.label}</div>
            {deck.legendDecks != null && <div className="text-xs text-muted">{t('decks.legendDecks', { n: deck.legendDecks })}</div>}
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted">{t('common.cards', { n: c.total })}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-panel-2">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-3">
          <span className="text-again">{t('decks.due', { n: c.due })}</span>
          <span className="text-accent">{t('decks.new', { n: c.fresh })}</span>
          <span className="text-good">{t('decks.mature', { n: c.mature })}</span>
        </div>
        {deck.kind === 'custom' && deck.customId != null && (
          <button
            className="text-muted hover:text-again"
            onClick={() => confirm(t('decks.confirmDelete', { name: deck.label })) && deleteCustomDeck(deck.customId!)}
            title={t('common.delete')}
            aria-label={t('common.delete')}
          >
            <X size={16} className="shrink-0" aria-hidden />
          </button>
        )}
      </div>
      <Link to={`/study/${encodeURIComponent(deck.id)}?mode=${mode}`} className={`${c.due + c.fresh ? 'btn-primary' : 'btn-ghost'} mt-1 text-sm`}>
        {t('decks.study')}
      </Link>
    </div>
  )
}

function NewDeckForm({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const { cards } = useCards()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const parsed = useMemo(() => (text.trim() ? parseDecklist(text, cards) : null), [text, cards])
  const canSave = name.trim() && parsed && parsed.found.length > 0

  return (
    <div className="panel space-y-3 p-4">
      <div>
        <label className="label">{t('decks.form.name')}</label>
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('decks.form.namePlaceholder')} />
      </div>
      <div>
        <label className="label">{t('decks.form.decklist')}</label>
        <textarea className="input mt-1 h-40 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={'3 Defy\n2 Star-Crossed\n1 Zhonya\'s Hourglass'} />
      </div>
      {parsed && (
        <div className="text-sm">
          <span className="text-good">{t('decks.form.recognized', { n: parsed.found.length })}</span>
          {parsed.missing.length > 0 && (
            <span className="text-again">
              {' · '}
              {t('decks.form.unknown', {
                n: parsed.missing.length,
                names: parsed.missing.slice(0, 5).join(', ') + (parsed.missing.length > 5 ? '…' : ''),
              })}
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={!canSave}
          onClick={async () => {
            await createCustomDeck(name.trim(), parsed!.found.map((f) => f.card.id))
            onDone()
          }}
        >
          {t('common.create')}
        </button>
        <button className="btn-ghost" onClick={onDone}>
          {t('common.cancel')}
        </button>
      </div>
      <p className="text-xs text-muted">{t('decks.form.hint')}</p>
    </div>
  )
}
