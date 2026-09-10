import { useRef, useState } from 'react'
import { useCards } from '../../data/CardsContext'
import { exportAll, importAll, parseExport, resetProgress, saveSettings } from '../../db/repo'
import { metaCards } from '../../decks/derived'
import { MODE_INFO, STUDY_MODES, type StudyMode } from '../../study/modes'
import { useSettings } from '../hooks'

export function SettingsPage() {
  const settings = useSettings()
  const { cards, file } = useCards()
  const [msg, setMsg] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const metaCount = metaCards(cards, settings.playRateThreshold).length

  const toggleMode = (m: StudyMode) => {
    const next = settings.enabledModes.includes(m) ? settings.enabledModes.filter((x) => x !== m) : [...settings.enabledModes, m]
    if (!next.length) return
    saveSettings({ enabledModes: STUDY_MODES.filter((x) => next.includes(x)) })
  }

  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `riftlearn-${data.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (f: File) => {
    try {
      const parsed = parseExport(await f.text())
      if (!confirm(`Remplacer la progression locale par « ${f.name} » (${parsed.cardStates.length} cartes, ${parsed.reviewLogs.length} révisions) ?`)) return
      await importAll(parsed)
      setMsg('Progression importée.')
    } catch (e) {
      setMsg(`Import impossible : ${(e as Error).message}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Réglages</h1>

      <section className="panel space-y-4 p-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="font-medium">Seuil de taux de jeu</label>
            <span className="text-sm text-muted">
              ≥ {settings.playRateThreshold} % → {metaCount} cartes
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={0.5}
            value={settings.playRateThreshold}
            onChange={(e) => saveSettings({ playRateThreshold: Number(e.target.value) })}
            className="mt-2 w-full accent-sky-400"
          />
          <p className="text-xs text-muted">Une carte entre dans les paquets si elle est jouée dans au moins ce pourcentage des decks de tournoi.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nouvelles cartes / jour / mode</label>
            <input type="number" min={0} max={200} className="input mt-1" value={settings.dailyNewLimit} onChange={(e) => saveSettings({ dailyNewLimit: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div>
            <label className="label">Révisions max / jour / mode</label>
            <input type="number" min={0} max={2000} className="input mt-1" value={settings.dailyReviewLimit} onChange={(e) => saveSettings({ dailyReviewLimit: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
        </div>
        <div>
          <label className="label">Modes actifs</label>
          <div className="mt-2 space-y-1">
            {STUDY_MODES.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.enabledModes.includes(m)} onChange={() => toggleMode(m)} />
                <span className="font-medium">{MODE_INFO[m].label}</span>
                <span className="text-muted">— {MODE_INFO[m].description}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-medium">Sauvegarde</h2>
        <p className="text-sm text-muted">La progression est stockée dans ce navigateur. Exporte-la pour la transférer sur un autre appareil.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={doExport}>
            Exporter (JSON)
          </button>
          <button className="btn-ghost" onClick={() => fileInput.current?.click()}>
            Importer…
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <button
            className="btn-danger"
            onClick={async () => {
              if (confirm('Effacer toute la progression (états et historique) ? Les paquets personnalisés sont conservés.')) {
                await resetProgress()
                setMsg('Progression remise à zéro.')
              }
            }}
          >
            Remise à zéro
          </button>
        </div>
        {msg && <p className="text-sm text-accent">{msg}</p>}
      </section>

      <section className="panel space-y-1 p-4 text-sm text-muted">
        <h2 className="font-medium text-ink">Données</h2>
        <p>
          {cards.length} cartes · stats calculées sur {file.totals.total_decks.toLocaleString('fr-FR')} decks · import du {new Date(file.generatedAt).toLocaleDateString('fr-FR')}
        </p>
        <p>
          Sources : <a className="underline" href={file.sources.stats} target="_blank" rel="noreferrer">riftdecks.com</a> (stats) et{' '}
          <a className="underline" href="https://riftcodex.com" target="_blank" rel="noreferrer">riftcodex.com</a> (fiches). Pour rafraîchir : <code>npm run import</code>.
        </p>
      </section>
    </div>
  )
}
