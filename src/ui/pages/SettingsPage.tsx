import { useRef, useState } from 'react'
import { useCards } from '../../data/CardsContext'
import { exportAll, ImportError, importAll, parseExport, resetProgress, saveSettings } from '../../db/repo'
import { metaCards } from '../../decks/derived'
import { isLang, LANGUAGE_NAMES, LANGUAGES } from '../../i18n'
import { useT } from '../../i18n/I18nContext'
import { STUDY_MODES, type StudyMode } from '../../study/modes'
import { useSettings } from '../hooks'

export function SettingsPage() {
  const { t, lang, date } = useT()
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
      const summary = {
        file: f.name,
        cards: t('common.cards', { n: parsed.cardStates.length }),
        reviews: t('common.reviews', { n: parsed.reviewLogs.length }),
      }
      if (!confirm(t('settings.confirmImport', summary))) return
      await importAll(parsed)
      setMsg(t('settings.importDone'))
    } catch (e) {
      setMsg(t('settings.importFailed', { error: e instanceof ImportError ? t(e.key) : (e as Error).message }))
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>

      <section className="panel space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="font-medium" htmlFor="language">
            {t('settings.language')}
          </label>
          <select
            id="language"
            className="input max-w-48"
            value={lang}
            onChange={(e) => isLang(e.target.value) && saveSettings({ language: e.target.value })}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_NAMES[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="font-medium">{t('settings.threshold')}</label>
            <span className="text-sm text-muted">
              {t('settings.thresholdValue', { threshold: settings.playRateThreshold, cards: t('common.cards', { n: metaCount }) })}
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
          <p className="text-xs text-muted">{t('settings.thresholdHelp')}</p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="font-medium" htmlFor="legend-threshold">
              {t('settings.legendThreshold')}
            </label>
            <span className="text-sm text-muted">{t('settings.legendThresholdValue', { threshold: settings.legendPresenceThreshold })}</span>
          </div>
          <input
            id="legend-threshold"
            type="range"
            min={5}
            max={100}
            step={5}
            value={settings.legendPresenceThreshold}
            onChange={(e) => saveSettings({ legendPresenceThreshold: Number(e.target.value) })}
            className="mt-2 w-full accent-sky-400"
          />
          <p className="text-xs text-muted">{t('settings.legendThresholdHelp')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('settings.dailyNew')}</label>
            <input type="number" min={0} max={200} className="input mt-1" value={settings.dailyNewLimit} onChange={(e) => saveSettings({ dailyNewLimit: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div>
            <label className="label">{t('settings.dailyReviews')}</label>
            <input type="number" min={0} max={2000} className="input mt-1" value={settings.dailyReviewLimit} onChange={(e) => saveSettings({ dailyReviewLimit: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
        </div>
        <div>
          <label className="label">{t('settings.enabledModes')}</label>
          <div className="mt-2 space-y-1">
            {STUDY_MODES.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.enabledModes.includes(m)} onChange={() => toggleMode(m)} />
                <span className="font-medium">{t(`mode.${m}.label`)}</span>
                <span className="text-muted">— {t(`mode.${m}.description`)}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-medium">{t('settings.backup')}</h2>
        <p className="text-sm text-muted">{t('settings.backupHelp')}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={doExport}>
            {t('settings.export')}
          </button>
          <button className="btn-ghost" onClick={() => fileInput.current?.click()}>
            {t('settings.import')}
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <button
            className="btn-danger"
            onClick={async () => {
              if (confirm(t('settings.confirmReset'))) {
                await resetProgress()
                setMsg(t('settings.resetDone'))
              }
            }}
          >
            {t('settings.reset')}
          </button>
        </div>
        {msg && <p className="text-sm text-accent">{msg}</p>}
      </section>

      <section className="panel space-y-1 p-4 text-sm text-muted">
        <h2 className="font-medium text-ink">{t('settings.data')}</h2>
        <p>
          {t('settings.dataSummary', {
            cards: t('common.cards', { n: cards.length }),
            decks: file.totals.total_decks,
            date: date(file.generatedAt),
          })}
        </p>
        <p>
          {t('settings.sources')} <a className="underline" href={file.sources.stats} target="_blank" rel="noreferrer">riftdecks.com</a>{' '}
          {t('settings.sourcesStats')}{' '}
          <a className="underline" href="https://riftcodex.com" target="_blank" rel="noreferrer">riftcodex.com</a> {t('settings.sourcesCards')}{' '}
          <code>npm run import</code>.
        </p>
      </section>
    </div>
  )
}
