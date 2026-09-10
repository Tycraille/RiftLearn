/**
 * Imports Riftbound card data.
 *
 *  1. Meta stats   : https://riftdecks.com/cards/stats  (`var DATA = [...]` array embedded in the page)
 *  2. Card details : https://api.riftcodex.com/cards    (open, paginated JSON API)
 *  3. Join on riftbound_id (e.g. "ogn-045-298") == basename of the riftdecks image
 *  4. Write public/data/cards.json
 *
 * Usage: npm run import
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  extractInlineVar,
  merge,
  type CodexCard,
  type RiftdecksStat,
  type RiftdecksTotals,
} from './merge.ts'

const STATS_URL = 'https://riftdecks.com/cards/stats'
const CODEX_URL = 'https://api.riftcodex.com/cards'
const OUT = path.resolve('public/data/cards.json')
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

async function fetchStatsHtml(): Promise<string> {
  const res = await fetch(STATS_URL, {
    headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
  })
  if (res.ok) return res.text()
  console.warn(`riftdecks answered ${res.status}, falling back to Playwright (headless Chromium)…`)
  return fetchStatsHtmlWithPlaywright()
}

async function fetchStatsHtmlWithPlaywright(): Promise<string> {
  let pw: typeof import('playwright')
  try {
    pw = await import('playwright')
  } catch {
    throw new Error(
      'Cloudflare blocks the direct fetch and Playwright is not installed.\n' +
        'Run: npm i -D playwright && npx playwright install chromium, then run npm run import again.',
    )
  }
  const browser = await pw.chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ userAgent: UA })
    await page.goto(STATS_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForFunction(() => document.documentElement.outerHTML.includes('var DATA = '), null, {
      timeout: 60_000,
    })
    return await page.content()
  } finally {
    await browser.close()
  }
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
  console.log('1/3  riftdecks stats…')
  const html = await fetchStatsHtml()
  const stats = extractInlineVar<RiftdecksStat[]>(html, 'DATA')
  const totals = extractInlineVar<RiftdecksTotals>(html, 'TOTALS')
  console.log(`     ${stats.length} cards, ${totals.total_decks} decks analyzed`)

  console.log('2/3  Riftcodex card details…')
  const codex = await fetchAllCodexCards()

  console.log('3/3  Join and write…')
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
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
