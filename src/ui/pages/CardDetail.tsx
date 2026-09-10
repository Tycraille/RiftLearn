import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCards } from '../../data/CardsContext'
import { forgetCard, updateCustomDeck, createCustomDeck } from '../../db/repo'
import { db } from '../../db/schema'
import { useT } from '../../i18n/I18nContext'
import { formatInterval } from '../../srs/scheduler'
import { STUDY_MODES } from '../../study/modes'
import { useCustomDecks } from '../hooks'
import { CardBack, CardImage } from '../components/CardBits'

export function CardDetail() {
  const { t } = useT()
  const { cardId = '' } = useParams()
  const { byId } = useCards()
  const card = byId.get(cardId)
  const states = useLiveQuery(() => db.cardStates.where('cardId').equals(cardId).toArray(), [cardId]) ?? []
  const logs = useLiveQuery(() => db.reviewLogs.where('cardId').equals(cardId).toArray(), [cardId]) ?? []
  const custom = useCustomDecks()
  const [newDeck, setNewDeck] = useState('')

  if (!card)
    return (
      <div className="p-8 text-center text-muted">
        {t('cardDetail.notFound')} <Link to="/cards" className="underline">{t('common.back')}</Link>
      </div>
    )

  const now = new Date()

  return (
    <div className="space-y-4">
      <Link to="/cards" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} className="shrink-0" aria-hidden />
        {t('nav.cards')}
      </Link>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <CardImage card={card} className="mx-auto w-full max-w-[280px]" />
        <div className="panel p-4">
          <CardBack card={card} showImage={false} />
        </div>
      </div>

      <section className="panel p-4">
        <h2 className="label mb-2">{t('cardDetail.progress')}</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-normal">{t('cardDetail.col.mode')}</th>
              <th className="font-normal">{t('cardDetail.col.state')}</th>
              <th className="font-normal">{t('cardDetail.col.next')}</th>
              <th className="font-normal">{t('cardDetail.col.reps')}</th>
              <th className="font-normal">{t('cardDetail.col.lapses')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {STUDY_MODES.map((m) => {
              const s = states.find((x) => x.mode === m)
              return (
                <tr key={m} className="border-t border-line">
                  <td className="py-1.5">{t(`mode.${m}.short`)}</td>
                  <td>{t(`cardState.${s?.state ?? 0}`)}</td>
                  <td>
                    {s && s.state !== 0
                      ? s.due <= now.getTime()
                        ? <span className="text-again">{t('cardDetail.due')}</span>
                        : t('cardDetail.in', { interval: formatInterval(now, new Date(s.due), t) })
                      : '—'}
                  </td>
                  <td>{s?.reps ?? 0}</td>
                  <td>{s?.lapses ?? 0}</td>
                  <td className="text-right">
                    {s && (
                      <button className="text-xs text-muted hover:text-again" onClick={() => confirm(t('cardDetail.confirmForget')) && forgetCard(card.id, m)}>
                        {t('cardDetail.forget')}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">{t('cardDetail.totalReviews', { reviews: t('common.reviews', { n: logs.length }) })}</p>
      </section>

      <section className="panel p-4">
        <h2 className="label mb-2">{t('cardDetail.addToDeck')}</h2>
        <div className="flex flex-wrap gap-2">
          {custom.map((d) => {
            const inDeck = d.cardIds.includes(card.id)
            return (
              <button
                key={d.id}
                className={`btn inline-flex items-center gap-1 text-sm ${inDeck ? 'bg-good/20 text-good' : 'bg-panel-2 hover:bg-line'}`}
                onClick={() => updateCustomDeck(d.id!, { cardIds: inDeck ? d.cardIds.filter((x) => x !== card.id) : [...d.cardIds, card.id] })}
              >
                {inDeck ? <Check size={16} className="shrink-0" aria-hidden /> : <Plus size={16} className="shrink-0" aria-hidden />}
                {d.name}
              </button>
            )
          })}
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newDeck.trim()) return
              await createCustomDeck(newDeck.trim(), [card.id])
              setNewDeck('')
            }}
          >
            <input className="input w-48" placeholder={t('cardDetail.newDeckPlaceholder')} value={newDeck} onChange={(e) => setNewDeck(e.target.value)} />
            <button className="btn-ghost text-sm" disabled={!newDeck.trim()}>
              {t('common.create')}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
