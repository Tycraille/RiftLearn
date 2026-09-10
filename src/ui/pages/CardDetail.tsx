import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCards } from '../../data/CardsContext'
import { forgetCard, updateCustomDeck, createCustomDeck } from '../../db/repo'
import { db } from '../../db/schema'
import { formatInterval } from '../../srs/scheduler'
import { MODE_INFO, STUDY_MODES } from '../../study/modes'
import { useCustomDecks } from '../hooks'
import { CardBack, CardImage } from '../components/CardBits'

const STATE_LABEL = ['Nouvelle', 'Apprentissage', 'Révision', 'Réapprentissage']

export function CardDetail() {
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
        Carte introuvable. <Link to="/cards" className="underline">Retour</Link>
      </div>
    )

  const now = new Date()

  return (
    <div className="space-y-4">
      <Link to="/cards" className="text-sm text-muted hover:text-ink">
        ← Cartes
      </Link>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <CardImage card={card} className="mx-auto w-full max-w-[280px]" />
        <div className="panel p-4">
          <CardBack card={card} showImage={false} />
        </div>
      </div>

      <section className="panel p-4">
        <h2 className="label mb-2">Progression</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-normal">Mode</th>
              <th className="font-normal">État</th>
              <th className="font-normal">Prochaine</th>
              <th className="font-normal">Vues</th>
              <th className="font-normal">Oublis</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {STUDY_MODES.map((m) => {
              const s = states.find((x) => x.mode === m)
              return (
                <tr key={m} className="border-t border-line">
                  <td className="py-1.5">{MODE_INFO[m].short}</td>
                  <td>{s ? STATE_LABEL[s.state] : 'Nouvelle'}</td>
                  <td>{s && s.state !== 0 ? (s.due <= now.getTime() ? <span className="text-again">due</span> : `dans ${formatInterval(now, new Date(s.due))}`) : '—'}</td>
                  <td>{s?.reps ?? 0}</td>
                  <td>{s?.lapses ?? 0}</td>
                  <td className="text-right">
                    {s && (
                      <button className="text-xs text-muted hover:text-again" onClick={() => confirm('Remettre cette carte à zéro pour ce mode ?') && forgetCard(card.id, m)}>
                        oublier
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">{logs.length} révision{logs.length > 1 ? 's' : ''} au total.</p>
      </section>

      <section className="panel p-4">
        <h2 className="label mb-2">Ajouter à un paquet</h2>
        <div className="flex flex-wrap gap-2">
          {custom.map((d) => {
            const inDeck = d.cardIds.includes(card.id)
            return (
              <button
                key={d.id}
                className={`btn text-sm ${inDeck ? 'bg-good/20 text-good' : 'bg-panel-2 hover:bg-line'}`}
                onClick={() => updateCustomDeck(d.id!, { cardIds: inDeck ? d.cardIds.filter((x) => x !== card.id) : [...d.cardIds, card.id] })}
              >
                {inDeck ? '✓ ' : '+ '}
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
            <input className="input w-48" placeholder="Nouveau paquet…" value={newDeck} onChange={(e) => setNewDeck(e.target.value)} />
            <button className="btn-ghost text-sm" disabled={!newDeck.trim()}>
              Créer
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
