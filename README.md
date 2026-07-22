# The First Night *(codename DRIFT)*

A mobile-web survival game. You crash in the Bermuda Triangle and wash ashore at dusk
with nothing. The island keeps turning while you are gone.

**Play:** open the URL on a phone. No install, no store, no account.

Canon lives in [`/docs/`](docs/) — the charter, the ops protocol, and the four living
documents (state, decisions log, cycle log, codex). **Read [`docs/drift_state.md`](docs/drift_state.md) first**; it is the
now-pointer, and any session can recover the project from it plus the cycle log.

## Architecture — the one non-negotiable rule

```
/src/brain/   Pure TypeScript: simulation, data model, reconciliation, formulas.
              ZERO Phaser. Fully unit-tested.
/src/body/    Phaser scenes, rendering, input. Imports the brain; the brain never
              imports the body.
/src/data/    Content tables + tune.ts — every tunable number, and only here.
/tests/       Brain tests — the automated done-checks.
/tools/       Purity check, placeholder-audio generator, device smoke test.
/docs/        Canon.
/builds/      Per-cycle archived builds, published alongside the current build.
```

Phaser only *draws*. The valuable logic stays portable so a future native port re-skins
the body and reuses the brain untouched. A CI check fails the build on any Phaser import
under `/src/brain`.

The other standing law: **no magic numbers**. Everything that changes how the game plays
lives in [`src/data/tune.ts`](src/data/tune.ts), mirrored by the TUNE ledger at the top of
[`docs/drift_cycle_log.md`](docs/drift_cycle_log.md).

## Commands

```bash
npm install

npm run dev          # dev server on :8080
npm run build        # production build → dist/
npm run preview      # serve the production build on :4173

npm test             # brain suite (Vitest)
npm run typecheck    # tsc --noEmit
npm run purity       # brain/body law
npm run done-checks  # all three, in the order CI runs them

npm run gen:audio    # regenerate the placeholder cues
npm run smoke        # device acceptance checks — drives a real Chrome with touch
                     # npm run smoke -- https://<play-url>/ --headful
```

`npm run smoke` needs a Chrome or Edge already installed (set `CHROME_PATH` to point at
it) and a server to test — run `npm run preview` in another terminal first, or pass a
deployed URL.

## The pipeline

Push to `main` → done-checks run → GitHub Pages deploys → one stable play URL. Each cycle
is also archived under `/builds/<cycle-id>/` and tagged (`c01`, `c02`, …).
