# CYCLE 02 HANDOFF PACKAGE — paste this entire file into Claude Code, opened in the repo folder
*(Director: first copy `drift_project_charter_v0_4.md` and `drift_ops_protocol_v1_3.md` into the repo folder, then paste all of this.)*

```
Tier: Opus-class. You are C2 — Builder for DRIFT (The First Night). Cycle 02 "Boots on Sand" — the 3D pivot.
You are in the repo root (https://github.com/karimfz007/drift). The director has placed
drift_project_charter_v0_4.md and drift_ops_protocol_v1_3.md here: move them into /docs/,
archiving v0_3 and v1_2 to /docs/archive/.
Boot: read charter v0.4 (§II.5, §I.18) and ops v1.3, then apply the DOC DELTAS below to /docs/
verbatim (decisions D-027…D-030, state regeneration, Cycle 02 spec appended to the cycle log).
Confirm boot in ≤5 lines (goal + acceptance checks), then execute Cycle 02 end-to-end with
standing authority, Stage 0 through Stage 3. No approval stops. Once deployed, spawn the C3
audit (Ops §4); on PASS, append the as-built note per Ops §7 and report the play URL in one line.
The brain does not change: A1 requires zero diffs under /src/brain and /tests vs tag c01.
```

---

## DOC DELTAS — apply to `/docs/` before building

### 1 · Append to `drift_decisions_log.md` (newest first, above D-026)

**D-030 · 2026-07-22 — Cycle 02 "Boots on Sand": re-prove the Cycle 01 steel thread in the 3D body.**
Same brain, same tune constants, same tests — a new world. The pivot's central claim ("everything above the renderer survives") is checked mechanically: A1 requires zero diffs under `/src/brain` and `/tests` versus tag `c01`. Rust-loop systems (building, threats, more vitals) begin Cycle 03+ on this foundation. *Status: standing.*

**D-029 · 2026-07-22 — Art bar: low-poly stylized 3D; close third-person camera.**
Muck/Valheim readability, not Rust fidelity — Rust sets the *gameplay* bar, never the visual one. Close third-person default, first-person a later option. CC0-first assets (Kenney, Quaternius) until the Art Director hat activates. Touch model: left stick to move, drag to look, tap the world to interact. *Status: standing; camera/controls `[TUNE]` in playtest.*

**D-028 · 2026-07-22 — 3D stack: Babylon.js + TypeScript, web-first retained (charter v0.4 §II.5).**
Pinned to current stable (9.x line, verified 2026-07-22; exact pin in `DEPENDENCIES.md`), Apache-2.0, Havok WASM physics, glTF, WebGL2 baseline with a WebGPU path. Keeps the brain byte-identical, the whole proven pipeline (Pages, tap-a-link, smoke harness, CI), and the crew's strongest language. Rejected: Unity (editor-centric, poor AI-crew/director-machine fit, weak mobile-web), Three.js (lower-level, more glue), PlayCanvas (cloud-editor dependency), react-three-fiber (D-009's rule). **Godot 4.x is the named native escape hatch** — its 3D web export (Compatibility renderer, 30–100 MB payloads) is wrong for phone browsers, but its native Android path is strong; if mobile-web 3D hits a hard performance ceiling that optimization cycles cannot clear, the brain ports and Godot builds the APK. Only that gate reopens this decision. *Status: standing; reversible at the hatch.*

**D-027 · 2026-07-22 — ⚑ Cycle 01 CLOSED: technical PASS, direction overturned at gate 3. The First Night pivots to 3D.**
The director's playtest verdict: the systems work, but 2D top-down buttons-and-overlays cannot deliver the Rust-like experience the game is for. Under the three-gate rule that verdict is final and the machine worked as designed — the direction was overturned at the cheapest possible moment, one cycle in. Consequences: the 2D body is frozen (no further 2D cycles); the C01 build stays live at `/builds/c01/` as the **simulation laboratory**; everything above the renderer survives untouched (brain, reconcile, saves, tune, tests, pipeline, ops, all decisions). Charter → v0.4, ops → v1.3. *Status: standing.*

### 2 · Regenerate `drift_state.md`

Regenerate per the Ops §7 spirit with: title + pivot at top (**Cycle 02 "Boots on Sand" — OPEN; the 3D pivot, D-027…D-030**); canon = charter v0.4 · ops v1.3; play URL becomes the 3D build at ship, 2D laboratory preserved at `/builds/c01/`; current experience bet = *low-poly 3D in the phone browser delivers presence 2D couldn't, at a playable frame rate, without giving up the tap-a-link loop*; director's standing notes unchanged (short replies; candid advisor; Android-first); next actions = C2 executes C02 → director plays on the phone (walk, gather, fire, 2-minute absence, report; judge presence and frame rate, not content volume) → C1 triages and closes; the crew-composition fork stays parked; open notes carry forward (iOS at launch-prep; clock scale; D-025 floor-semantics question for the cycle that gives warmth real stakes) plus one new watch item: **performance ceiling — if median FPS stays below `fpsFloorMedian` on the director's device after a dedicated optimization pass, the Godot hatch (D-028) triggers a fork.**

### 3 · Append to `drift_cycle_log.md` (after Cycle 01's as-built and audit)

Also add these rows to the TUNE ledger: `walkSpeedMps = 3.5` (C02) · `cameraDistanceM = 6` (C02) · `lookSensitivity = 1.0` (C02) · `coldLoadBudgetSeconds = 8` (C02) · `fpsFloorMedian = 30` (C02). All C01 constants carry over unchanged.

## CYCLE 02 — "Boots on Sand"
**Phase 1 · Tier: Opus-class · Status: OPEN · Opened 2026-07-22 · The 3D pivot cycle (D-027 … D-030)**

**GOAL:** Prove The First Night in three dimensions on a phone — a real island underfoot, the same fire, the same honest absence — with the Cycle 01 brain running untouched.

**PROMISE:** Standing on the beach for the first time — the world has depth, and your fire lives in it, not in a UI.

**HYPOTHESIS:** Low-poly 3D in the phone browser delivers the presence 2D couldn't, at a playable frame rate, without giving up the tap-a-link loop.

**PLAYTEST QUESTION:** Does moving, looking, and gathering feel like being there — and does it hold a playable frame rate on your phone?

**SCOPE IN (build in stage order):**

- **Stage 0 — Rebase.** New body scaffold: Babylon.js pinned at current stable (record exact version + license in `DEPENDENCIES.md`), official Havok physics plugin; Phaser removed from dependencies; `/src/brain` and `/tests` carried over **byte-identical**; the purity check generalized (transitive check now forbids Babylon — and any rendering engine — under `/src/brain`); smoke harness adapted to 3D scene-readiness signals and an FPS probe; pipeline unchanged (push → checks → Pages). The 2D body remains at tag `c01` and deployed under `/builds/c01/`.
- **Stage 1 — The island underfoot.** One small handcrafted low-poly island slice (beach, treeline, water plane, sky — roughly 100–150 m across) with terrain collision; day/night driven by the existing world clock and tune constants; close third-person camera (`cameraDistanceM`); touch controls: left virtual stick to move (`walkSpeedMps`), right-side drag to orbit (`lookSensitivity`, persisted setting), tap the world to interact; capsule/simple CC0 placeholder character via a Havok character controller or kinematic controller (C2's call). Performance discipline from the first mesh: median ≥ `fpsFloorMedian` on Android Chrome, cold load ≤ `coldLoadBudgetSeconds` on 4G.
- **Stage 2 — The same fire, standing up.** Driftwood scattered on the sand (instant tap pickup, several near spawn), deadfall at the treeline (hold, world-space progress ring); campfire built at the player's spot as a real object — light pool, flame particles, the sanctuary transition re-created in 3D; warmth bar minimal; the six audio cues carried over; cold-open title card (**THE FIRST NIGHT**); one highlighted next action + idle hint; local playtest trace extended with an FPS median; morning-report overlay on qualifying reopen — all driven by the untouched brain and the same tune constants.
- **Stage 3 — Audit & ship.** Deploy (the main URL becomes the 3D build); archive `/builds/c02/`; tag `c02`; smoke checks green including the 3D additions; spawn the C3 audit; on PASS, append the as-built note and report the play URL.

**SCOPE OUT (explicit):** building system; inventory beyond the wood count; hunting, combat, threats; thirst/hunger/energy; skills/XP; first-person camera; procedural or full-size islands; character art and animations beyond a placeholder; multiplayer. (The Rust-loop systems begin Cycle 03+ on this foundation.)

**ACCEPTANCE CHECKS:**
- **A1** — Brain suite green with **zero diffs under `/src/brain` and `/tests` vs tag `c01`** — the pivot's central claim, checked mechanically.
- **A2** — Purity check green: zero rendering-engine imports under `/src/brain` (transitive), CI-enforced.
- **A3** — On Android Chrome via the public URL: cold load ≤ `coldLoadBudgetSeconds` on 4G, median FPS ≥ `fpsFloorMedian` through the steel thread, no pinch/zoom traps, tab-switch survives.
- **A4** — The 3D steel thread on-device: walk the island → gather ≥5 wood (both interactions) → build + light the fire → warmth visibly recovers → background/close ≥2 real minutes → reopen → morning report matches `tune.ts` math.
- **A5** — Main URL serves the 3D build; `/builds/c02/` archived; `c02` tag pushed; as-built appended; the 2D laboratory still reachable at `/builds/c01/`.
- **A6** — Controls: the thread completes with stick + drag + tap; look sensitivity persists across reload.
- **A7** — Feel in 3D: first wood within seconds of control; every action confirmed visibly and audibly **in the world**, not only the HUD; the lit fire reads as sanctuary (light pool + ambience shift); the idle hint fires; the trace records the run including the FPS median.

**TUNE INTRODUCED:** see ledger — rows marked C02.

**AS-BUILT:** *(pending — C2 at SHIP)*

**AUDIT:** *(pending — C3)*
