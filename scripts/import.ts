/**
 * Imports Riftbound card data.
 *
 *  1. Meta stats   : https://riftdecks.com/cards/stats  (`var DATA = [...]` array embedded in the page)
 *  2. Card details : https://api.riftcodex.com/cards    (open, paginated JSON API)
 *  3. Join on riftbound_id (e.g. "ogn-045-298") == basename of the riftdecks image
 *  4. Write public/data/cards.json
 *  5. Legends      : https://riftdecks.com/legends, then /legends/<slug>/stats (Main Deck + Battlefields)
 *                    for every legend with at least MIN_LEGEND_DECKS decks
 *  6. Write public/data/legends.json (cards restricted to cards.json)
 *
 * Usage: npm run import
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Browser } from 'playwright'
import {
  RIFTDECKS_ORIGIN,
  extractInlineVar,
  joinLegendStats,
  merge,
  parseLegendList,
  parseLegendStats,
  selectLegends,
  type CodexCard,
  type Legend,
  type RiftdecksStat,
  type RiftdecksTotals,
} from './merge.ts'

const STATS_URL = 'https://riftdecks.com/cards/stats'
const LEGENDS_URL = 'https://riftdecks.com/legends'
const CODEX_URL = 'https://api.riftcodex.com/cards'
const OUT = path.resolve('public/data/cards.json')
const LEGENDS_OUT = path.resolve('public/data/legends.json')
/** Legends with fewer recorded decks are left out of legends.json. */
const MIN_LEGEND_DECKS = 100
/** riftdecks boards imported per legend (the sideboard is ignored). */
const LEGEND_BOARDS = ['main', 'battlefields'] as const
/** Pause between two riftdecks legend pages (about 50 pages per import). */
const LEGEND_PAGE_DELAY_MS = 1_000
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---- riftdecks (direct fetch, Playwright fallback when Cloudflare blocks it) ---

let browser: Browser | null = null

/** Fetches a riftdecks page; `readyMarker` is a string the page contains once fully rendered. */
async function fetchRiftdecksHtml(url: string, readyMarker: string): Promise<string> {
  if (!browser) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    })
    if (res.ok) return res.text()
    console.warn(`riftdecks answered ${res.status}, falling back to Playwright (headless Chromium)…`)
  }
  return fetchHtmlWithPlaywright(url, readyMarker)
}

async function fetchHtmlWithPlaywright(url: string, readyMarker: string): Promise<string> {
  if (!browser) {
    let pw: typeof import('playwright')
    try {
      pw = await import('playwright')
    } catch {
      throw new Error(
        'Cloudflare blocks the direct fetch and Playwright is not installed.\n' +
          'Run: npm i -D playwright && npx playwright install chromium, then run npm run import again.',
      )
    }
    browser = await pw.chromium.launch({ headless: true })
  }
  const page = await browser.newPage({ userAgent: UA })
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForFunction((marker) => document.documentElement.outerHTML.includes(marker), readyMarker, {
      timeout: 60_000,
    })
    return await page.content()
  } finally {
    await page.close()
  }
}

// ---- riftdecks legends ------------------------------------------------------

async function fetchLegends(knownIds: Set<string>): Promise<{ legends: Legend[]; unmatched: string[] }> {
  const all = parseLegendList(await fetchRiftdecksHtml(LEGENDS_URL, '/legends/constructed/'))
  const selected = selectLegends(all, MIN_LEGEND_DECKS)
  console.log(`     ${all.length} legends, ${selected.length} with at least ${MIN_LEGEND_DECKS} decks`)

  const legends: Legend[] = []
  const unmatched: string[] = []
  for (const [i, summary] of selected.entries()) {
    process.stdout.write(`\r  legend ${i + 1}/${selected.length} ${summary.slug}`.padEnd(70))
    const entries = []
    for (const board of LEGEND_BOARDS) {
      const url = `${RIFTDECKS_ORIGIN}/legends/${summary.slug}/stats?board=${board}`
      await sleep(LEGEND_PAGE_DELAY_MS)
      const stats = parseLegendStats(await fetchRiftdecksHtml(url, 'card-stats-grid'))
      if (!stats.length) console.warn(`\n     no card stats found on ${url}`)
      entries.push(...stats)
    }
    const joined = joinLegendStats(entries, knownIds)
    unmatched.push(...joined.unmatched.map((u) => `${summary.slug}: ${u}`))
    legends.push({ ...summary, cards: joined.cards })
  }
  process.stdout.write('\n')
  return { legends, unmatched }
}

// ---- Riftcodex --------------------------------------------------------------

async function fetchAllCodexCards(): Promise<CodexCard[]> {
  const all: CodexCard[] = []
  let page = 1
  let pages = 1
  do {
    const url = `${CODEX_URL}?page=${page}&size=100`
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Riftcodex ${url} → ${res.status}`)
    const body = (await res.json()) as { items: CodexCard[]; pages: number; total: number }
    all.push(...body.items)
    pages = body.pages
    process.stdout.write(`\r  Riftcodex page ${page}/${pages} (${all.length}/${body.total})`)
    page++
    if (page <= pages) await new Promise((r) => setTimeout(r, 150))
  } while (page <= pages)
  process.stdout.write('\n')
  return all
}

// ---- Main -------------------------------------------------------------------

async function main() {
  console.log('1/4  riftdecks stats…')
  const html = await fetchRiftdecksHtml(STATS_URL, 'var DATA = ')
  const stats = extractInlineVar<RiftdecksStat[]>(html, 'DATA')
  const totals = extractInlineVar<RiftdecksTotals>(html, 'TOTALS')
  console.log(`     ${stats.length} cards, ${totals.total_decks} decks analyzed`)

  console.log('2/4  Riftcodex card details…')
  const codex = await fetchAllCodexCards()

  console.log('3/4  Join and write…')
  const { cards, unmatched } = merge(stats, codex)
  const out = {
    generatedAt: new Date().toISOString(),
    sources: { stats: STATS_URL, cards: CODEX_URL },
    totals,
    cards,
  }
  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(out), 'utf8')

  const pct = ((unmatched.length / stats.length) * 100).toFixed(1)
  console.log(`     ${cards.length} cards written to ${path.relative(process.cwd(), OUT)}`)
  console.log(`     ${unmatched.length} without Riftcodex details (${pct}%)`)
  if (unmatched.length) console.log('     ' + unmatched.slice(0, 20).join('\n     '))

  console.log('4/4  riftdecks legend card stats…')
  const legendData = await fetchLegends(new Set(cards.map((c) => c.id)))
  const legendsOut = {
    generatedAt: new Date().toISOString(),
    source: LEGENDS_URL,
    minDecks: MIN_LEGEND_DECKS,
    legends: legendData.legends,
  }
  await writeFile(LEGENDS_OUT, JSON.stringify(legendsOut), 'utf8')
  console.log(`     ${legendData.legends.length} legends written to ${path.relative(process.cwd(), LEGENDS_OUT)}`)
  console.log(`     ${legendData.unmatched.length} legend card stats not in cards.json (dropped)`)
  if (legendData.unmatched.length) console.log('     ' + legendData.unmatched.join('\n     '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => browser?.close())
