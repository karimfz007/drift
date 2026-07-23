# CYCLE 04 HANDOFF PACKAGE — paste this entire file into Claude Code, opened in the repo folder
*(Director: one paste is the whole action.)*

```
Tier: Opus-class. You are C2 — Builder for DRIFT (The First Night). Cycle 04 "Second Nature" — the feel overhaul.
You are in the repo root. Boot: read /docs/ canon (charter v0.4 §I.18 esp. rules 1–3 and 7, ops v1.3),
then apply the DOC DELTAS below verbatim: append the decisions as the next ledger numbers (expected
D-040…D-043 — renumber to follow the ledger if Cycle 03 logged further decisions), append the Cycle 04
spec + TUNE rows to the cycle log, mark Cycle 03 CLOSED, regenerate state, apply the codex delta.
Confirm boot in ≤5 lines (goal + acceptance checks), then execute Cycle 04 end-to-end with standing
authority. No approval stops. This cycle's law: every director defect in D-040 must be root-caused —
find *why* the fire hid until night/axe, don't just make the symptom pass — and each fix gets a
regression check in the harness. Once deployed, spawn the C3 audit (Ops §4); on PASS, append the
as-built note per Ops §7 and report the play URL in one line.
```

---

## DOC DELTAS — apply to `/docs/` before building

### 1 · Append to `drift_decisions_log.md` (next ledger numbers)

**D-043 · 2026-07-23 — Resource legibility: the fiber lesson.**
The director found fiber only by exhausting alternatives — palms were the *designed* source, but the game never taught it, which fails Experience rule 1 even when the design is sound. Fixes: **reed/tall-grass clumps** added near the pond and scattered inland as the visually obvious fiber source (fibrous silhouette); palms keep husk fiber with visible husks at the trunk base; the craft card shows a source hint under any missing material ("Fibre — reeds by the pond, palm husks"); first-time pickups toast their identity. *Status: standing.*

**D-042 · 2026-07-23 — Direct-world interaction replaces the context-button model.**
The Cycle 03 defects (fire buildable at range, fire hidden until night/axe, an axe that did nothing findable) share one root: verbs lived in a prioritized HUD button stack instead of on the objects themselves. New model: **tap the thing to use the thing** — in range it acts; out of range the character walks there and then acts (tap-to-move-and-use, the LDOE flow); every object has an interaction radius and a subtle in-range affordance; every blocked interaction states its reason ("Too far", "Needs an axe", "Not enough wood"). Buttons survive only for placement verbs (Build fire — available whenever wood suffices, day or night), the craft card, and settings. *Status: standing.*

**D-041 · 2026-07-23 — Landscape-first (director's call).**
Two-thumb stick-and-look 3D belongs in landscape; the UI is relaid for it, portrait shows a rotate prompt, and a web-app manifest sets the orientation (fullscreen + orientation lock requested on first interaction where the browser allows). The manifest also plants the deferred PWA seed from D-014 — install/service-worker still later. *Status: standing.*

**D-040 · 2026-07-23 — ⚑ Cycle 03 CLOSED: systems pass, feel fails the LDOE bar. Construction defers one cycle.**
Director's verdict, five defects: (1) camera/look while moving is not smooth; (2) fiber sourcing was opaque (bushes teased, palms hid); (3) fire interactable from far away; (4) fire could not be built until night or until the axe existed — root cause to be identified, suspected context-button priority starvation; (5) the axe apparently did nothing — its verbs were not discoverable. All five are one architecture problem (D-042) plus camera feel and teaching gaps (D-041, D-043). The D-037 escalation order stands, with a feel cycle inserted first: **C04 feel → C05 construction → C06 threats** — building on a janky camera would compound every later cycle. *Status: standing.*

### 2 · Regenerate `drift_state.md`

Regenerate with: **Cycle 04 "Second Nature" — OPEN** (D-040…D-043); canon unchanged (charter v0.4 · ops v1.3); experience bet = *landscape + a smoothed camera + touch-the-world interaction clears the Last Day on Earth fluidity bar*; roadmap now C04 feel → C05 construction (LDOE-simple placement, bed/respawn anchor, energy/sleep, upkeep, Havok's entry) → C06 threats; director's standing notes unchanged; next actions = C2 executes → director plays **holding the phone sideways**, judging smoothness directly against LDOE → C1 triages and closes; carried watch items unchanged (perf/Godot hatch, iOS at launch-prep, clock scale, crew fork parked).

### 3 · Append to `drift_cycle_log.md`

Mark Cycle 03 **CLOSED** (per D-040). Add TUNE rows (all C04, all `[TUNE]`; C2 adds derived constants per the tune law, mirrored here):
`interactRadiusM = 2.5` · `cameraFollowLerp = 0.12` · `cameraLookSmoothing = 0.15` · `lookSensitivity` (existing, recurved for landscape) · `turnSlerpSpeed = 10` · `moveAccelMps2 = 14` · `frameTimeP95BudgetMs = 33` · `reedFiberYield = 2` · `palmHuskFiberYield = 2` · `rotatePromptEnabled = true`

### 4 · Codex delta

Add row: **Reeds / tall grass** | Resource | Gather near the pond and inland (tap/hold) | Time only | Fibre for cordage and crafting | *Legibility — the material that looks like what it makes* | **C04**. Amend the fiber note on palms (husk fiber, visible at trunk base).

## CYCLE 04 — "Second Nature"
**Phase 1 · Tier: Opus-class · Status: OPEN · Opened 2026-07-23 · The feel cycle (D-040 … D-043)**

**GOAL:** Make the phone disappear — landscape presentation, a camera that glides, and a world you touch directly, with every Cycle 03 defect root-caused, fixed, and regression-locked.

**PROMISE:** Moving, looking, and touching the island feels like second nature — smoother than Last Day on Earth.

**HYPOTHESIS:** Landscape + camera smoothing + tap-the-world interaction is what "fluid" actually means on a phone; feel is architecture, not polish.

**PLAYTEST QUESTION:** Held sideways — is it smoother than Last Day on Earth, and did every tap either do what you expected or tell you why not?

**SCOPE IN (build in stage order):**

- **Stage 0 — Landscape-first.** UI relaid for landscape (HUD corners, stick lower-left, look zone right, craft/settings top); portrait shows a rotate prompt; web-app manifest with landscape orientation; fullscreen + orientation lock requested on first interaction where supported; safe-area insets respected.
- **Stage 1 — Camera and movement feel.** Damped camera follow (`cameraFollowLerp`) and smoothed look (`cameraLookSmoothing`) with a proper sensitivity curve for landscape; character turns by slerp toward movement (`turnSlerpSpeed`); movement acceleration/deceleration (`moveAccelMps2`) instead of instant velocity; camera collision so it never clips terrain or trees; render interpolation/frame pacing so look-while-moving has no stutter; FOV retuned for landscape. Harness gains a **jank metric**: p95 frame time ≤ `frameTimeP95BudgetMs` through a scripted move-and-orbit run.
- **Stage 2 — Direct-world interaction (D-042).** Tap any interactive object: in range it acts; out of range the character path-walks to it and then acts (tap-to-move-and-use). Interaction radius per object with a subtle in-range highlight; hold-to-gather stays on gather nodes; tap fire → add wood / relight (range-gated); tap pond edge → drink; tap tree → chop **with the axe auto-used** (pre-axe: "Needs an axe"); tap crash box → open (same gate). Every blocked interaction states its reason. Buttons reduced to: **Build fire** (enabled whenever wood ≥ cost, day or night, placed at the player with a clear-ground check), the craft card, and settings. **Root-cause requirement:** identify and document in the as-built *why* fire was unavailable until night/axe in C03, and add a harness regression: *at game start, daytime, no axe, gather 5 wood → Build fire is enabled and works.*
- **Stage 3 — Resource legibility (D-043).** Reed clumps near the pond and scattered (fibrous silhouette, gather for fiber); palm husks visible at trunk bases; craft-card source hints under missing materials; first-pickup identity toasts; hints cover the new interaction model.
- **Stage 4 — Audit & ship.** Deploy; archive `/builds/c04/`; tag `c04`; smoke green including the new regressions; C3 audit; on PASS, as-built + play URL.

**SCOPE OUT (explicit):** construction, bed, upkeep, energy/sleep, storage, Havok (all C05); threats/combat (C06); new vitals, new tools, fishing, cooking, purification; first-person; island growth; PWA install/service worker; multiplayer.

**ACCEPTANCE CHECKS:**
- **A1** — Brain suite green; reed nodes covered; zero regressions (the brain barely changes this cycle — that is itself the check).
- **A2** — Purity green (all five bypass classes still caught).
- **A3** — Landscape lays out correctly on-device; portrait shows the rotate prompt; cold load ≤ budget; median FPS ≥ floor **and p95 frame time ≤ `frameTimeP95BudgetMs`** through the scripted move-and-orbit run.
- **A4** — Interaction truth, scripted in the harness: day-one pre-axe fire regression passes; all object interactions range-gated (a far tap walks then acts — never remote action); tap-tree pre-axe explains, post-axe chops; box likewise; every block states a reason.
- **A5** — URL live; `/builds/c04/` archived; `c04` tag; as-built appended (including the C03 fire-gating root cause); c01–c03 archives intact.
- **A6** — Camera: no snap on look start/stop, no clipping through terrain or trees in the scripted orbit, character turns smoothly, sensitivity persists.
- **A7** — Feel: reeds read as fiber at a glance; craft card teaches sources; first-pickup toasts fire once each; in-range highlight is subtle but noticeable; walk-to-and-use feels like one motion.

**TUNE INTRODUCED:** see ledger — rows marked C04.

**AS-BUILT:** *(pending — C2 at SHIP)*

**AUDIT:** *(pending — C3)*
