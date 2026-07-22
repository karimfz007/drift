# THE FIRST NIGHT (DRIFT) — State
*The now-pointer. Canonical home: repo `/docs/drift_state.md`. Regenerated at every cycle CLOSE; C2 updates it after ship (Ops §2). This is the only handover document — any session can recover the project from here plus the cycle log.*

**As of:** 2026-07-22 (Cycle 01 shipped and audited; awaiting the director's playtest)

## Now
- **Title: The First Night** (D-015). DRIFT remains the internal codename for files and the repo.
- **Phase 1 — The Naked Hour · Cycle 01 "First Fire" — SHIPPED, AUDITED, awaiting PLAYTEST.**
  Two of the three gates are closed: automated done-checks green, C3 audit PASS. The third gate is the director's — does it feel right on the phone.
- **Play URL: https://karimfz007.github.io/drift/** — open it on the phone, no install.
- **Repo: https://github.com/karimfz007/drift** (public). Archive: `/builds/c01/`. Tag: `c01`.
- Current canon: **charter v0.3 · ops v1.2** (supersede all earlier versions), plus this state, the decisions log, the cycle log, and the codex. All six live in the repo at `/docs/`; superseded versions in `/docs/archive/`, the director's reference material in `/docs/reference/`.
- **Current experience bet (C01):** the lit fire turns vulnerability into earned safety; biggest human risk: movement and gathering feel slow or ambiguous before the payoff. **The build's own trace answers part of this** — first wood lands ~6 s after the player gains control.

## What exists now (the inheritance every later cycle gets free)
- **Brain/body architecture**, mechanically enforced: `/src/brain` is pure TypeScript with zero Phaser, verified by a transitive import-graph check in CI (D-026). The valuable logic is portable.
- **`reconcile()`** — the offline DNA. Pure, deterministic, segment-stepped, tested from one second to three real days. Every later vital, production loop, and offline threat plugs into this one function.
- **Versioned save** behind `SaveRepository`, ready to swap for IndexedDB without the brain noticing (D-010).
- **The pipeline**: push to `main` → purity → types → tests → audio reproducibility → build → Pages. One stable URL, per-cycle archives, a tag per cycle.
- **`tools/smoke.mjs`** — 30 device acceptance checks driving a real Chrome with real touches, re-runnable against any deployed URL. This is how "it plays on a phone" became a check instead of a claim (D-022).

## Director's standing notes
- Keep replies short. C1 doubles as the director's candid advisor outside cycle ceremony (D-015).
- **Android-first**: Android Chrome is the primary device until launch-prep.

## Next actions
1. **Director** — open the play URL on the phone and play the steel thread **in both control modes** (the Controls button, top right, switches them). React in plain language in the chat: which controls felt right; most satisfying moment; most annoying moment. To feel the morning report, light the fire, then close the app for at least two minutes and come back.
2. **C1** — triage the reactions (FIX / TUNE / NEXT / PARK), run PERFECT with C2 until the director calls it, then CLOSE: regenerate this file, log decisions, add codex entries, bump ops to **v1.3** with the repo URL (Ops §8), and propose Cycle 02.
3. **Cycle 02 design frame** (unchanged, now with one addition): offline fairness D-011 + the Experience Constitution §I.18 — the first real preparation tradeoff, goal horizons, one curiosity promise. **New:** D-025 asks Cycle 02 to confirm or overturn the rule that the fairness floor protects *absence* rather than *idleness*, once warmth carries real stakes.

## Awaiting the director (⚑ fork, does not block)
- **Crew composition** — the library-first audit's Amendment 7 proposes adding non-Claude sessions to the standing crew. Default if unanswered: crew stays as chartered; external red-team audits stay welcome as an occasional practice. Restructuring who builds is the director's call alone.

## Open design notes (not blockers)
- **iOS save durability** — deferred to **launch-prep** (Android-first, D-015): verify Safari's ~7-day eviction of script-writable storage before any iOS push; mitigation path add-to-home-screen/PWA, later a native wrapper.
- **Clock scale** — one clock online and offline, 1 game day = 60 real minutes `[TUNE]` (D-007). Confirmed working end to end; the number itself is untested against taste.
- **The camera does not scroll** — world is screen. An island larger than one phone screen is a Cycle 02+ concern.

## Last close
— none yet. Cycle 01 is shipped but not closed; it closes after the director's playtest and PERFECT.
