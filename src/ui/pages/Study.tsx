import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCards } from '../../data/CardsContext'
import type { Card } from '../../data/types'
import { countToday, getSettings, getStatesForMode, review } from '../../db/repo'
import type { CardState } from '../../db/schema'
import { findDeck } from '../../decks/derived'
import { emptyState, formatInterval, preview, Rating, type Grade } from '../../srs/scheduler'
import { MODE_INFO, STUDY_MODES, type StudyMode } from '../../study/modes'
import { makeQuestion, type QuizQuestion } from '../../study/quiz'
import { buildQueue, interleave } from '../../study/session'
import { useDecks } from '../hooks'
import { CardBack, CardImage, CardText, DomainBadge } from '../components/CardBits'

interface Item {
  card: Card
  state: CardState
}

interface Summary {
  reviewed: number
  again: number
  startedAt: number
}

export function Study() {
  const { deckId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const modeParam = params.get('mode') as StudyMode | null
  const mode: StudyMode = modeParam && STUDY_MODES.includes(modeParam) ? modeParam : 'image'
  const decks = useDecks()
  const deck = useMemo(() => findDeck(decks, decodeURIComponent(deckId)), [decks, deckId])
  const { cards: allCards } = useCards()

  const [queue, setQueue] = useState<Item[] | null>(null)
  const [summary, setSummary] = useState<Summary>({ reviewed: 0, again: 0, startedAt: Date.now() })
  const [flipped, setFlipped] = useState(false)
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)
  const shownAt = useRef(Date.now())
  const deckRef = useRef(deck)
  deckRef.current = deck
  const deckKey = deck?.id ?? null

  // Construction de la file : une fois par paquet/mode (le paquet est lu via une ref
  // pour ne pas relancer la session quand les compteurs se mettent à jour)
  useEffect(() => {
    const d = deckRef.current
    if (!d || d.id !== deckKey) return
    let cancelled = false
    ;(async () => {
      const [settings, states, today] = await Promise.all([getSettings(), getStatesForMode(mode), countToday(mode)])
      const q = buildQueue(d.cards, states, settings, today)
      const items = interleave(q).map((card) => ({ card, state: states.get(card.id) ?? emptyState(card.id, mode) }))
      if (!cancelled) {
        setQueue(items)
        setSummary({ reviewed: 0, again: 0, startedAt: Date.now() })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [deckKey, mode])

  const current = queue?.[0] ?? null
  const pool = deck?.cards.length && deck.cards.length >= 8 ? deck.cards : allCards

  // Nouvelle carte affichée : reset de l'état d'écran
  useEffect(() => {
    setFlipped(false)
    setChosen(null)
    shownAt.current = Date.now()
    if (current && mode === 'quiz') setQuestion(makeQuestion(current.card, pool))
    else setQuestion(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.card.id, mode])

  const grade = useCallback(
    async (g: Grade) => {
      if (!current) return
      const elapsed = Date.now() - shownAt.current
      const { after } = await review(current.card.id, mode, g, elapsed)
      setSummary((s) => ({ ...s, reviewed: s.reviewed + 1, again: s.again + (g === Rating.Again ? 1 : 0) }))
      setQueue((q) => {
        if (!q) return q
        const rest = q.slice(1)
        // Carte en (ré)apprentissage : on la représente plus tard dans la session
        if ((after.state === 1 || after.state === 3) && after.due - Date.now() < 30 * 60_000) {
          const pos = Math.min(rest.length, g === Rating.Again ? 3 : 6)
          rest.splice(pos, 0, { card: current.card, state: after })
        }
        return rest
      })
    },
    [current, mode],
  )

  const answerQuiz = useCallback(
    (i: number) => {
      if (!question || chosen != null) return
      setChosen(i)
    },
    [question, chosen],
  )

  const nextAfterQuiz = useCallback(() => {
    if (!question || chosen == null) return
    const correct = chosen === question.answerIndex
    const fast = Date.now() - shownAt.current < 4000
    grade(correct ? (fast ? Rating.Easy : Rating.Good) : Rating.Again)
  }, [question, chosen, grade])

  // Clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') return navigate('/decks')
      const isNext = e.key === ' ' || e.key === 'Enter' || e.code === 'Space'
      if (!current) return
      if (mode === 'quiz') {
        if (chosen == null && ['1', '2', '3', '4'].includes(e.key)) answerQuiz(Number(e.key) - 1)
        else if (chosen != null && isNext) {
          e.preventDefault()
          nextAfterQuiz()
        }
        return
      }
      if (!flipped && isNext) {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) as Grade)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, flipped, chosen, mode, grade, answerQuiz, nextAfterQuiz, navigate])

  if (!deck) return <Empty title="Paquet introuvable" />
  if (!queue) return <div className="p-8 text-center text-muted">Préparation de la session…</div>
  if (!current) return <Done deck={deck.label} mode={mode} summary={summary} />

  const remaining = queue.length
  const isNew = current.state.state === 0

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-3 py-3 md:px-6">
      <header className="mb-3 flex items-center justify-between text-sm text-muted">
        <Link to="/decks" className="hover:text-ink">
          ← {deck.label}
        </Link>
        <span>{MODE_INFO[mode].short}</span>
        <span>
          {isNew ? <span className="text-accent">nouvelle</span> : <span className="text-again">révision</span>} · {remaining} restante{remaining > 1 ? 's' : ''}
        </span>
      </header>

      <div className="flex-1">
        {mode === 'quiz' && question ? (
          <QuizView q={question} chosen={chosen} onChoose={answerQuiz} />
        ) : mode === 'image' ? (
          <div className="space-y-4">
            <CardImage card={current.card} hideName={!flipped} className="mx-auto w-full max-w-[320px] md:max-w-[360px]" />
            {flipped && (
              <div className="panel p-4">
                <CardBack card={current.card} showImage={false} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="panel p-6 text-center">
              <div className="text-2xl font-bold">{current.card.name}</div>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted">
                <span>{current.card.type}</span>
                <DomainBadge domain={current.card.domain} small />
              </div>
              {!flipped && <p className="mt-4 text-sm text-muted">Coût ? Effet ?</p>}
            </div>
            {flipped && (
              <div className="panel p-4">
                <CardBack card={current.card} />
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 mt-4 bg-bg/95 py-3 backdrop-blur" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        {mode === 'quiz' ? (
          <button className="btn-primary w-full py-3 text-base" disabled={chosen == null} onClick={nextAfterQuiz}>
            {chosen == null ? 'Choisis une réponse' : 'Suivant'} <kbd className="ml-2 hidden text-xs opacity-60 md:inline">Espace</kbd>
          </button>
        ) : !flipped ? (
          <button className="btn-primary w-full py-3 text-base" onClick={() => setFlipped(true)}>
            Retourner <kbd className="ml-2 hidden text-xs opacity-60 md:inline">Espace</kbd>
          </button>
        ) : (
          <GradeButtons state={current.state} onGrade={grade} />
        )}
      </footer>
    </div>
  )
}

function GradeButtons({ state, onGrade }: { state: CardState; onGrade: (g: Grade) => void }) {
  const [now] = useState(() => new Date())
  const p = useMemo(() => preview(state, now), [state, now])
  const defs: { g: Grade; label: string; cls: string }[] = [
    { g: Rating.Again, label: 'Encore', cls: 'bg-again/20 text-again hover:bg-again/30' },
    { g: Rating.Hard, label: 'Difficile', cls: 'bg-hard/20 text-hard hover:bg-hard/30' },
    { g: Rating.Good, label: 'Bien', cls: 'bg-good/20 text-good hover:bg-good/30' },
    { g: Rating.Easy, label: 'Facile', cls: 'bg-easy/20 text-easy hover:bg-easy/30' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {defs.map((d, i) => (
        <button key={d.g} onClick={() => onGrade(d.g)} className={`flex flex-col items-center rounded-lg py-2.5 transition active:scale-[0.97] ${d.cls}`}>
          <span className="font-semibold">{d.label}</span>
          <span className="text-xs opacity-80">{formatInterval(now, p[d.g])}</span>
          <kbd className="hidden text-[10px] opacity-50 md:inline">{i + 1}</kbd>
        </button>
      ))}
    </div>
  )
}

function QuizView({ q, chosen, onChoose }: { q: QuizQuestion; chosen: number | null; onChoose: (i: number) => void }) {
  const answered = chosen != null
  const hideName = q.kind === 'name-from-image'
  return (
    <div className="space-y-4">
      <div className="panel p-4 text-center text-lg font-semibold">{q.prompt}</div>
      {q.image && (q.kind !== 'name-from-text') && (
        <CardImage card={q.card} hideName={hideName && !answered} className="mx-auto w-full max-w-[260px]" />
      )}
      {q.text && (
        <div className="panel p-4">
          <CardText text={q.text} />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          let cls = 'bg-panel-2 hover:bg-line'
          if (answered) {
            if (i === q.answerIndex) cls = 'bg-good/25 text-good ring-2 ring-good'
            else if (i === chosen) cls = 'bg-again/25 text-again ring-2 ring-again'
            else cls = 'bg-panel-2 opacity-50'
          }
          return (
            <button key={i} disabled={answered} onClick={() => onChoose(i)} className={`rounded-lg px-4 py-3 text-left transition ${cls}`}>
              <kbd className="mr-2 hidden text-xs opacity-50 md:inline">{i + 1}</kbd>
              {opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="panel p-4">
          <CardBack card={q.card} showImage={q.kind === 'name-from-text'} />
        </div>
      )}
    </div>
  )
}

function Done({ deck, mode, summary }: { deck: string; mode: StudyMode; summary: Summary }) {
  const mins = Math.max(1, Math.round((Date.now() - summary.startedAt) / 60_000))
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">🎉</div>
      <h1 className="text-2xl font-bold">Session terminée</h1>
      <p className="text-muted">
        {deck} · {MODE_INFO[mode].label}
      </p>
      {summary.reviewed > 0 ? (
        <div className="grid w-full grid-cols-3 gap-2">
          <Stat label="Réponses" value={summary.reviewed} />
          <Stat label="Ratées" value={summary.again} />
          <Stat label="Minutes" value={mins} />
        </div>
      ) : (
        <p className="text-sm text-muted">Rien à réviser pour l'instant dans ce paquet. Reviens plus tard ou augmente le quota de nouvelles cartes dans les réglages.</p>
      )}
      <div className="flex gap-2">
        <Link to="/decks" className="btn-primary">
          Paquets
        </Link>
        <Link to="/" className="btn-ghost">
          Accueil
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

function Empty({ title }: { title: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-muted">{title}</p>
      <Link to="/decks" className="btn-ghost mt-4">
        Retour aux paquets
      </Link>
    </div>
  )
}
