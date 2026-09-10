# RiftLearn

Web app (desktop and mobile browsers) to learn and review the most played **Riftbound TCG** cards, Anki-style: front/back flashcards, spaced repetition (FSRS), quizzes, and a progress dashboard.

## Features

- **Three study modes**: Image → name + effect, Name → effect + cost, Multiple-choice quiz. Each mode tracks its own progress per card.
- **Spaced repetition** with the FSRS algorithm (`ts-fsrs`), Again / Hard / Good / Easy grading with predicted intervals.
- **Automatic decks**: all meta cards, per domain, per type, per set. The play-rate threshold is adjustable.
- **Custom decks**: paste a decklist, or add cards one by one from their detail page.
- **Meta context** on the back of each card: play rate, win rate, average copies, number of decks.
- **Dashboard**: due cards per mode, day streak, 12-week heatmap, progress per domain and type.
- **Local progress** (IndexedDB) with JSON export / import to move between devices.
- Keyboard shortcuts on desktop: `Space` flip, `1`–`4` grade, `Esc` leave the session.

The UI is currently in French; a bilingual FR/EN interface is planned. Card names and rules text are always in English.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173. The dev server listens on all interfaces, so a phone on the same Wi-Fi can open `http://<your-pc-ip>:5173`.

## Refreshing card data

```bash
npm run import
```

The `scripts/import.ts` script:

1. reads the meta stats embedded in https://riftdecks.com/cards/stats (`var DATA = [...]`); the page sits behind Cloudflare, so the script falls back to Playwright (headless Chromium) when the direct fetch is refused;
2. fetches full card details (cost, rules text, image, rarity) from the open https://api.riftcodex.com API;
3. joins both sources on the `riftbound_id` (e.g. `ogn-045-298`) and writes `public/data/cards.json`.

First use of the Playwright fallback:

```bash
npx playwright install chromium
```

## Tests and build

```bash
npm test
npm run build
npm run lint
```

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and publishes the app to GitHub Pages on every push to `main` (enable *Settings → Pages → Source: GitHub Actions* in the repository). Routing uses a `HashRouter`, so the build works on any static host (Vercel, Netlify, …).

## Contributing workflow

Issues are filed on GitHub (bug and enhancement templates). Each issue is worked on in its own branch (`fix/<n>-<slug>` or `feat/<n>-<slug>`) from a dedicated git worktree, and lands through a pull request that must pass the CI workflow. See `CLAUDE.md` for the conventions, and the helper scripts:

```powershell
.\scripts\new-fix.ps1 -Issue 12    # create worktree + branch for issue #12
.\scripts\done-fix.ps1 -Issue 12   # clean up after the PR is merged
```

## Project layout

```
scripts/import.ts      data import (riftdecks + Riftcodex)
scripts/merge.ts       join and normalization (unit-tested)
public/data/cards.json generated data — never edit by hand
src/data/              types and JSON loading
src/db/                Dexie (IndexedDB): SRS states, review log, decks, settings
src/srs/               ts-fsrs wrapper
src/study/             modes, session queue, quiz generator
src/decks/             derived decks and decklist parser
src/ui/                React pages and components
```

Data sources: [riftdecks.com](https://riftdecks.com) (tournament stats) and [riftcodex.com](https://riftcodex.com) (card database). Fan project, not affiliated with Riot Games.
