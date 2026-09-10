# RiftLearn — project conventions

RiftLearn is an Anki-style web app to learn the most played Riftbound TCG cards: React + Vite +
TypeScript + Tailwind v4, progress stored in IndexedDB (Dexie), spaced repetition with `ts-fsrs`.
Static site, deployed to GitHub Pages from `main`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | dev server on http://localhost:5173 (listens on all interfaces) |
| `npm test` | unit tests (Vitest) |
| `npm run build` | full typecheck (`tsc -b`) + production build |
| `npm run lint` | oxlint (a few known fast-refresh warnings are acceptable) |
| `npm run import` | regenerates `public/data/cards.json` from the internet — **never run it while working an issue** |

## Layout

```
scripts/import.ts, merge.ts   data import and join (merge.ts is unit-tested)
public/data/cards.json        generated — never edit by hand
src/data/                     Card types, JSON loading (CardsContext)
src/db/schema.ts, repo.ts     Dexie schema; repo.ts is the only write path for progress data
src/srs/scheduler.ts          ts-fsrs wrapper: schedule, preview, isDue, isMature
src/study/                    modes.ts, session.ts (queue + quotas), quiz.ts (MCQ generator)
src/decks/                    derived.ts (deck derivation), decklist.ts (parser)
src/ui/                       App.tsx, hooks.ts, components/CardBits.tsx, pages/*.tsx
```

One SRS state per card **and per mode** (`cardStates` key `<cardId>:<mode>`). Keep it that way.

## Language policy

- Everything visible on the repository is in **English**: code, comments, tests, commits, issues,
  pull requests, documentation.
- UI strings are currently **French** (the author reviews in French). Do not translate them ad hoc;
  a bilingual FR/EN interface is tracked as an enhancement issue.
- Card names and rules text are always English (source data).

## Working an issue (Coder role)

You are in a dedicated git worktree on branch `fix/<n>-<slug>` (bug) or `feat/<n>-<slug>`
(enhancement), created with `scripts/new-fix.ps1`. Steps:

1. `gh issue view <n>` and read it fully. Add the `in-progress` label:
   `gh issue edit <n> --add-label in-progress`.
2. Reproduce first: a failing unit test when the behavior is testable outside the UI, otherwise
   in the browser (`npm run dev -- --port 51<nn>` to avoid clashing with other worktrees).
3. Fix at the root cause, not at the symptom. Keep the change scoped to the issue.
4. Add or adapt a unit test when the logic lives outside React components.
5. `npm test` and `npm run build` must pass. Run `npm run lint`.
6. Commit in English, subject `Fix <what> (#<n>)` or `Add <what> (#<n>)`, body explaining cause
   and fix. A `Co-Authored-By` trailer is fine.
7. `git push -u origin <branch>` then
   `gh pr create --base main --title "<subject> (#<n>)" --body "<cause, fix, verification>\n\nCloses #<n>"`.
8. Comment on the issue with the PR link. Do not merge: the maintainer reviews and merges.

Never:

- push to `main`, force-push, or rebase a branch that already has a PR;
- edit `.github/workflows/deploy.yml`, run `npm run import`, or modify `public/data/cards.json`;
- work on another issue in the same branch, or merge your own PR.

## Specifying a feature (PO role)

Run `/po <idea>` (project command in `.claude/commands/po.md`): the session studies the idea
against the code and open issues, asks the maintainer the decisions that matter, proposes a
scoped specification with acceptance criteria, and files an `enhancement` issue only after an
explicit go.

## Filing defects (QA role)

The QA brief lives in `qa/BRIEF-QA.md` (untracked, local only). If that file is missing, say so
and stop: do not invent a test plan. Issues are written in English and use the repository labels:
`bug` / `enhancement`, `qa`, `severity:*`, `area:*`.
