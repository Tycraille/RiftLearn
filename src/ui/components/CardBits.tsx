import { useState, type CSSProperties } from 'react'
import { DOMAIN_INFO, type Card, type Domain } from '../../data/types'
import { useT } from '../../i18n/I18nContext'

// ---- Cost icons -------------------------------------------------------------

export function EnergyPip({ n, size = 'md' }: { n: number | string; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useT()
  const cls = size === 'lg' ? 'h-9 w-9 text-lg' : size === 'sm' ? 'h-4 w-4 text-[10px]' : 'h-6 w-6 text-xs'
  return (
    <span
      className={`inline-flex ${cls} items-center justify-center rounded-full bg-slate-200 font-bold text-slate-900 ring-2 ring-slate-500 align-middle`}
      title={t('card.energy', { n })}
    >
      {n}
    </span>
  )
}

const domainStyle = (d: string): CSSProperties => {
  if (d === 'rainbow' || d === 'multi')
    return { background: 'conic-gradient(#E87500,#488C38,#643D8A,#C8102E,#2D8BBA,#D4A017,#E87500)' }
  const info = DOMAIN_INFO[d as Domain]
  return { background: info ? info.color : '#8A8F98' }
}

export function RunePip({ domain, size = 'md' }: { domain: string; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useT()
  const cls = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'
  const label = domain === 'rainbow' ? t('card.runeAny') : t('card.rune', { domain: DOMAIN_INFO[domain as Domain]?.label ?? domain })
  return (
    <span
      className={`inline-block ${cls} rotate-45 rounded-[3px] ring-2 ring-slate-900/60 align-middle mx-0.5`}
      style={domainStyle(domain)}
      title={label}
      aria-label={label}
    />
  )
}

export function DomainBadge({ domain, small }: { domain: string; small?: boolean }) {
  const info = DOMAIN_INFO[domain as Domain]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 ${small ? 'py-0 text-[11px]' : 'py-0.5 text-xs'} font-medium`}
      style={{ borderColor: info?.color ?? '#8A8F98', color: info?.color ?? '#8A8F98' }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: info?.color ?? '#8A8F98' }} />
      {info?.label ?? domain}
    </span>
  )
}

/** Full cost: energy + domain runes. */
export function Cost({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  if (card.energy == null && !card.power) return <span className="text-muted text-sm">—</span>
  const runes: string[] = []
  if (card.power) {
    const ds = card.domains.length ? card.domains : [card.domain]
    for (let i = 0; i < card.power; i++) runes.push(ds[i % ds.length])
  }
  return (
    <span className="inline-flex items-center gap-1">
      {card.energy != null && <EnergyPip n={card.energy} size={size} />}
      {runes.map((d, i) => (
        <RunePip key={i} domain={d} size={size} />
      ))}
    </span>
  )
}

// ---- Card text with tokens --------------------------------------------------

const TOKEN = /(:rb_[a-z0-9_]+:|\[[A-Za-z ]+\]|\[>\])/g

/** Splits into lines: from HTML (<br />, <p>) when available, otherwise a heuristic on plain text. */
export function textLines(text: string): string[] {
  const src = text.includes('<')
    ? text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
    : text.replace(/\)(?=[A-Z[])/g, ')\n')
  return src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export function CardText({ text, className = '' }: { text: string | null; className?: string }) {
  const { t } = useT()
  if (!text) return <p className={`italic text-muted ${className}`}>{t('card.noText')}</p>
  const lines = textLines(text)
  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, li) => (
        <p key={li}>
          {line.split(TOKEN).map((part, i) => {
            if (!part) return null
            let m: RegExpMatchArray | null
            if ((m = part.match(/^:rb_energy_(\d+):$/))) return <EnergyPip key={i} n={m[1]} size="sm" />
            if ((m = part.match(/^:rb_rune_([a-z]+):$/))) return <RunePip key={i} domain={m[1]} size="sm" />
            if (part === ':rb_might:')
              return (
                <span key={i} className="inline-block font-bold text-orange-300 align-middle" title={t('card.might')}>
                  ⚔
                </span>
              )
            if (part === ':rb_exhaust:')
              return (
                <span key={i} className="inline-block text-sky-300 align-middle" title={t('card.exhaust')}>
                  ⟳
                </span>
              )
            if (part === '[>]') return <span key={i} className="mx-0.5 text-muted">›</span>
            if ((m = part.match(/^\[([A-Za-z ]+)\]$/)))
              return (
                <span key={i} className="rounded bg-panel-2 px-1.5 py-0.5 text-[0.85em] font-semibold text-sky-200">
                  {m[1]}
                </span>
              )
            if (part.startsWith('(') && part.endsWith(')')) return <span key={i} className="text-muted italic">{part}</span>
            return <span key={i}>{part}</span>
          })}
        </p>
      ))}
    </div>
  )
}

// ---- Image ------------------------------------------------------------------

export function CardImage({ card, className = '', hideName = false }: { card: Card; className?: string; hideName?: boolean }) {
  const { t } = useT()
  // The URL is derived from the current card; we only remember which card id failed on the CDN,
  // otherwise the image would stay stuck on the first card when the prop changes.
  const [failedId, setFailedId] = useState<string | null>(null)
  const src = failedId === card.id ? card.imageFallback : card.imageUrl
  return (
    <div className={`relative overflow-hidden rounded-[4.5%] bg-panel-2 ${className}`}>
      <img
        src={src}
        alt={hideName ? t('card.hiddenAlt') : card.name}
        loading="lazy"
        draggable={false}
        className="block h-auto w-full select-none"
        onError={() => failedId !== card.id && setFailedId(card.id)}
      />
      {hideName && (
        <>
          {/* Riftbound layout: cost top-left, might top-right,
              type + name banner around 52-64% of the height, rules text and flavour below. */}
          <div className="absolute left-0 top-0 h-[23%] w-[21%] bg-bg/95 backdrop-blur-md" />
          <div className="absolute right-0 top-0 h-[15%] w-[30%] bg-bg/95 backdrop-blur-md" />
          <div className="absolute inset-x-0 bottom-0 h-[49%] bg-bg/95 backdrop-blur-md" />
        </>
      )}
    </div>
  )
}

// ---- Meta stats -------------------------------------------------------------

export function MetaStats({ card, compact }: { card: Card; compact?: boolean }) {
  const { t, num } = useT()
  const s = card.stats
  const pct = (n: number) => t('common.percent', { n: num(n, 1) })
  const items: [string, string][] = [
    [t('stats.playRate'), pct(s.play)],
    [t('stats.winRate'), s.win == null ? '—' : pct(s.win)],
    [t('stats.avgCopies'), num(s.copies, 1)],
    [t('stats.decks'), num(s.decks)],
  ]
  return (
    <div className={`grid ${compact ? 'grid-cols-4 gap-1' : 'grid-cols-2 gap-2 sm:grid-cols-4'}`}>
      {items.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-panel-2 px-2 py-1.5 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted">{k}</div>
          <div className={`font-semibold ${compact ? 'text-sm' : ''}`}>{v}</div>
        </div>
      ))}
    </div>
  )
}

/** Full back side of a flashcard. */
export function CardBack({ card, showImage = true }: { card: Card; showImage?: boolean }) {
  const { t } = useT()
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">{card.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{card.type}</span>
            <span>·</span>
            <DomainBadge domain={card.domain} small />
            {card.domain === 'multi' && card.domains.map((d) => <DomainBadge key={d} domain={d} small />)}
            {card.rarity && (
              <>
                <span>·</span>
                <span>{card.rarity}</span>
              </>
            )}
            <span>·</span>
            <span>{card.setLabel}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Cost card={card} size="lg" />
          {card.might != null && (
            <span className="text-sm text-orange-300" title={t('card.might')}>
              ⚔ {card.might}
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-3">
          <CardText text={card.textRich ?? card.text} />
          {card.flavour && <p className="text-sm italic text-muted">{t('card.flavour', { text: card.flavour })}</p>}
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.tags.map((tag) => (
                <span key={tag} className="rounded bg-panel-2 px-1.5 py-0.5 text-[11px] text-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {showImage && <CardImage card={card} className="mx-auto w-full max-w-[200px] sm:max-w-none" />}
      </div>
      <MetaStats card={card} compact />
    </div>
  )
}
