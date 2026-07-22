# THE FIRST NIGHT (DRIFT) — State
*The now-pointer. Canonical home: repo `/docs/drift_state.md`. Regenerated at every cycle CLOSE; C2 updates it after ship (Ops §2). This is the only handover document — any session can recover the project from here plus the cycle log.*

**As of:** 2026-07-22 (Cycle 01 closed; **Cycle 02 "Boots on Sand" OPEN — the 3D pivot**)

## Now
- **Title: The First Night** (D-015). DRIFT remains the internal codename for files and the repo.
- **⚑ THE PIVOT (D-027 … D-030).** Cycle 01 passed technically and was **overturned at gate 3**: the systems work, but 2D top-down buttons-and-overlays cannot deliver the Rust-like experience the game is for. The three-gate rule did its job — the direction changed at the cheapest possible moment, one cycle in. The 2D body is frozen. **Everything above the renderer survives untouched**: brain, reconcile, saves, tune, tests, pipeline, ops, every decision.
- **Phase 1 — The Naked Hour · Cycle 02 "Boots on Sand" — OPEN.** Low-poly 3D, close third-person, Babylon.js. The same steel thread, standing up.
- Current canon: **charter v0.4 · ops v1.3** (supersede all earlier versions), plus this state, the decisions log, the cycle log, and the codex. All six live at `/docs/`; superseded versions in `/docs/archive/`, reference material in `/docs/reference/`.
- **Repo: https://github.com/karimfz007/drift** (public). **Play URL: https://karimfz007.github.io/drift/** — becomes the 3D build at Cycle 02 ship; the **2D simulation laboratory is preserved at `/builds/c01/`**.
- **Current experience bet (C02):** low-poly 3D in the phone browser delivers the presence 2D couldn't, at a playable frame rate, without giving up the tap-a-link loop.

## What survives the pivot (the inheritance, unchanged)
- **The brain** — `/src/brain` and `/tests`, byte-identical. C02's A1 checks this mechanically: zero diffs versus tag `c01`. This is the pivot's central claim, and it is the whole reason the architectural rule exists.
- **`reconcile()`** — the offline DNA. Pure, deterministic, tested from one second to three real days.
- **Versioned save** behind `SaveRepository` (D-010), and every `[TUNE]` constant.
- **The pipeline** — push → purity → types → tests → build → Pages. One stable URL, per-cycle archives, a tag per cycle.
- **`tools/smoke.mjs`** — the device acceptance harness (D-022), adapted in C02 to 3D readiness signals and an FPS probe.
- **The constitutions** — the Experience Constitution (§I.18), offline fairness (D-011), honest systems (§I.8), the tune law, the dependency law. None of them were about the renderer.

## Director's standing notes
- Keep replies short. C1 doubles as the director's candid advisor outside cycle ceremony (D-015).
- **Android-first**: Android Chrome is the primary device until launch-prep.

## Next actions
1. **C2** — execute Cycle 02 end-to-end; spawn the C3 audit once deployed; on PASS, append the as-built note and report the play URL.
2. **Director** — play on the phone: walk, gather, build the fire, close the app for two minutes, come back. **Judge presence and frame rate, not content volume** — C02 is deliberately thin on content and thick on whether being there feels like being there.
3. **C1** — triage, PERFECT, CLOSE; propose Cycle 03 (the Rust-loop systems begin on this foundation).

## Awaiting the director (⚑ fork, does not block)
- **Crew composition** — the library-first audit's Amendment 7 proposes adding non-Claude sessions to the standing crew. Default if unanswered: crew stays as chartered; external red-team audits stay welcome as an occasional practice.

## Open design notes and watch items (not blockers)
- **⚠ Performance ceiling (new, C02).** If median FPS stays below `fpsFloorMedian` on the director's device after a dedicated optimization pass, the **Godot native hatch (D-028) triggers a fork**. This is the one gate that reopens the engine decision.
- **iOS save durability** — deferred to launch-prep (Android-first, D-015): Safari's ~7-day eviction of script-writable storage; mitigation add-to-home-screen/PWA, later a native wrapper.
- **Clock scale** — one clock online and offline, 1 game day = 60 real minutes `[TUNE]` (D-007). Proven working end to end; the number itself is untested against taste.
- **D-025 floor semantics** — the offline fairness floor protects *absence*, not *idleness*, and on the primary device it quietly leans on OS auto-lock (no safety net on desktop). Confirm or replace it in the cycle that gives warmth real stakes.

## Last close
**Cycle 01 "First Fire" — closed 2026-07-22.** Three gates: done-checks green · C3 audit PASS-WITH-NOTES with all eight defects fixed · **director's verdict at gate 3: overturned** (D-027). Shipped, audited, and preserved at `/builds/c01/` as the simulation laboratory. Its real product was not the 2D build — it was the brain, the pipeline, and the harness that Cycle 02 inherits for free.
