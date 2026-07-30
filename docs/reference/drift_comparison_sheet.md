# THE FIRST NIGHT (DRIFT) — Comparison Sheet

*A living document. Regenerated at every gate close ([[D-078]] amendment E). This edition: **Slice 2B close, both stages**, 2026-07-30 ([[D-088]], [[D-089]]).*

**Vocabulary.** Build artifacts use the **evidence vocabulary** ([[D-081]]): what is claimed, set against what actually witnesses it. Laws use OPERATIVE / DESIGN-BINDING ([[D-076]]); plan sections use RATIFIED / PROVISIONAL ([[D-077]]). Three vocabularies, none overloading.

| | |
|---|---|
| **VERIFIED** | Claim holds, and a *named* witness proves it — a test, a device check, a measurement. The witness is cited. |
| **PARTIAL** | Claim holds in part, or its witness proves less than the claim asserts. The gap is stated, not implied. |
| **OPEN** | Measured, not fixed, and owned by a named item. Never a synonym for unknown. |
| **UNWITNESSED** | Claimed with no mechanism behind it. Illegal for a live-game guarantee under [[D-076]]. |

> **Provenance, stated plainly.** The director's own comparison sheet — attached alongside Bible v2.0 and v2.2 under [[D-078]] amendment E — **has not landed in `/docs/reference`**. This edition is therefore a **repo-side regeneration**, built only from what the repository can itself witness: the ledger, the cycle log, the test suite and the device harness. It is not a substitute for the director's sheet and should be **reconciled with it** when that lands. Nothing below is asserted from memory or from another document's word.

---

## Gate 0 — the machine half

| Claim | Status | Witness |
|---|---|---|
| Standing hazard #4 closed — no device check driven by a debug hook | **VERIFIED** | Harness audit converted every hook-driven check to a real interaction path; `tryCombine` → `combineViaPlayerPath`, `intend` → `faceNode` + `tapWorld` |
| The bench mutex governs harness, builds and audits alike | **VERIFIED** | `tests/bench.test.ts`, 6 properties, private lock file. Was **UNWITNESSED** at the prior gate — C3 A3 — and the wrapper additionally *deadlocked* against the harness |
| F3 — every fix proven fail-then-pass | **VERIFIED** | Bench deadlock (FAIL 4194 ms → PASS 194 ms); npm spawn (FAIL `ENOENT` → PASS); announcement (FAIL all-five-triumphant → PASS) |
| F5 — the pack on the survivor's back is tappable | **VERIFIED** | Device witness, both directions, two independent runs: `0:ground 20:pack 40:pack 70:pack 120:ground` |
| F5 does not steal the `empty-ground` "never mind" tap | **VERIFIED** | Same check, second assertion — the property attempt 2 broke (C3 A2) |
| The Effectivity Law has a working witness | **VERIFIED** | `tools/check-docs-integrity.mjs` refuses any post-[[D-076]] decision with no class. Was **UNWITNESSED** — the law named a mechanism that did not exist (C3 A6) |
| The harness-fidelity probe answers as the player's tap does | **VERIFIED** | One `worldCandidateAt` resolver called by both paths; `__drift.lastTapOutcome()` added so the two can be compared (C3 A9) |
| Mastery rewards effortful work only | **VERIFIED** | Structural guard against `NODE_SPECS.interaction`, over a kind list now *derived* rather than hand-typed (C3 A7) |
| Pressing into a structure slides rather than pins | **OPEN** | Measured `moved 0.00m in 2s of pressing`. Owned by [[D-078]](B), Slice 1 opener. Previously **UNWITNESSED-in-effect**: the check reported PASS on this same pin (C3 A5) |
| The storage box opens on a tap | **PARTIAL** | It opens — in **6476 ms**. `approach()` gives up **3.79 m** short of the 2.5 m interact radius. Same collision cause; not an independent defect |
| Device harness, whole suite | **PARTIAL** | **199/209**, 10 failures, 1 known-open. 6 storage-cluster, 3 collateral from the panel left open, 1 unrelated (clock rate, 1.84 game hours) |
| Unit suite | **VERIFIED** | 367/367 |
| Brain purity | **VERIFIED** | 16 brain files, 18 modules in closure, zero rendering-engine imports |
| Docs integrity | **VERIFIED** | 81 decisions, every D-reference resolves, all 5 governed decisions declare a class |

## Gate 0 — the director's half ([[D-079]])

| Gate | Status | Note |
|---|---|---|
| **F1** — embodied feel, verb quality on a real phone | **VERIFIED** | Director's read, PASS |
| **F2** — one complete expedition loop as *pleasure*, not operations | **VERIFIED** | Director's read, PASS |
| **F3** — one truthful first night at the v0_14 balance target | **OPEN** | NOT MET, substantial work. **Not a defect** — Slice 1's own certification target ([[D-078]] amendment A) |

**F1 and F2 are passing and unlocked.** Neither is regression-locked yet; that is Slice 1 item (3). Until then both are *remembered*, not *guarded* — which is the condition [[D-066]] exists to distrust.

## Slice 2 — the radial circle ([[D-087]])

| Claim | Status | Witness |
|---|---|---|
| A tap always fires the context's default verb — capability never changes what a tap does | **VERIFIED** | `tests/verbs.test.ts` frequent-verb sweep, every target × every capability combination; device check *"with a flask, TAPPING the pond still drinks"* (thirst 69.7 → 100.0, circle did not open) |
| A hold opens the circle wherever more than one verb is available | **VERIFIED** | Device check *"HOLDING the pond opens the circle"* — ready `drink, fill-flask`, blocked `fish` |
| A blocked verb is **shown**, greyed, carrying its own reason — never hidden | **VERIFIED** | Device check: blocked `fish`, reason *"You have no line to fish with."* |
| Every segment is reachable by one thumb, on-screen, at phone size | **VERIFIED** | Device check ONE-THUMB REACH — **0 segments off-screen, lowest edge 296 px**. Failed three prior runs; the fix was CSS, not geometry — see below |
| Hold is never *required* — every verb it reaches is reachable otherwise | **VERIFIED** | The default-verb law itself: `defaultVerb` resolves before the circle is consulted; `tests/verbs.test.ts` asserts the single-option case never opens a menu |
| Three of four priority hacks retired | **PARTIAL** | Three retired at the call site; **fire is deliberately not routed** — lighting a torch from a fire is not a menu decision. The exception is named in code rather than left implicit |
| The circle closed the notch | **OPEN** | It did not. [[D-085]] named Slice 2 as the notch's closer and Slice 2 did not close it — 376 heading reversals per 960 frames, unchanged. Carried to Slice 2B rather than quietly dropped |

**The reasoning failure worth keeping.** ONE-THUMB REACH failed three runs before it passed, and the cause was never the geometry I kept re-deriving: **the clamp was inert.** The hub's inline `left`/`top` were being ignored because no CSS existed for `.verb-hub` or `.verb-seg` at all — the hub was statically positioned and the segments laid out in normal flow. Two fixes reasoned harder about a coordinate system that was never applied. What found it was asking *whether the fix ran at all*. Filed against hazard #2: **a fix that cannot be observed to have executed is indistinguishable from no fix**, and that question belongs after the *first* failed run, not the third.

**The design correction worth keeping.** My first cut opened the circle on tap whenever two options existed. C1 ruled that a **defect class**, not a trade-off: a survivor carrying wood tapped their shelter and got a menu instead of sleep, so the most frequent action in the game silently cost two taps. After the law landed, **twelve of the thirteen checks I had listed as needing supersession self-resolved** — the reliable tell that the law was right and the design was wrong.

---

## Slice 2B Stage B — embodied growth ([[D-089]])

*Brain-layer only. No capacity, crossing or rust note has a player-facing surface yet, and nothing below claims one.*

| Claim | Status | Witness |
|---|---|---|
| §12: health is not the price of ordinary work | **VERIFIED** | `tests/capacities.test.ts` — swept across duration × pace × load, `channelsFor(...).health` is exactly 0 at every intensity; `healthMayChangeFrom` admits only the six named causes |
| §12: the other five corrections hold | **VERIFIED** | Nutrition debt accumulates rather than charging per swing; hydration scales with heat *and* pace; energy ≠ stamina; work produces heat; `staminaCeilingFor` derives the reserve from endurance |
| §12: **eight** capacities, superseding v0.9's **seven** | **VERIFIED** | `CAPACITIES` (8) and `SUPERSEDED_V09_CAPACITIES` (7) both in code; register row records the evolution so the ledger carries one count, not two |
| §12: maximum overload is not good training | **VERIFIED** | `trainingStimulus` returns exactly 0 for every capacity when overloaded — not a token amount, which would make grinding optimal |
| §12: capacities never decay | **VERIFIED** | `developCapacity` cannot lower a score for any input, including negative stimuli |
| §15: capability needs BOTH legs | **VERIFIED** | `tests/crossdev.test.ts` — swept across the full threshold grid, `safeControl` is true iff both legs clear; a maxed body alone and maxed understanding alone each fail, for all three combinations |
| §15: the knowledge leg is UNDERSTANDING, not technique | **VERIFIED** | Maxed technique with zero understanding does not cross — having done it does not transfer |
| §15: reasoning never replaces force | **VERIFIED** | `forceStillRequired` true at every level including `crossed`; the leverage multiplier is a bounded discount, never a bypass |
| §15: the gate is on safe control, never the attempt | **VERIFIED** | The body-alone note names the risk (*"moves things briefly… instability"*) rather than refusing the verb |
| **KnowledgeState stays MONOTONIC under the new layer** | **VERIFIED** | 3000 randomised states driven through the *entire* confidence layer across floor-length absences, asserting `state.knowledge` deep-equal — **plus a companion test that plants the forbidden downward write and proves the assertion can fail** |
| The never-decays-offline property test is untouched | **VERIFIED** | `tests/vitals.test.ts` unmodified and passing — 2000 random domain-score states × long absences, no score falls |
| Rust costs time and nothing else | **VERIFIED** | `executionTimeMultiplier` bounded and never below 1; no failure, no worse object, no ladder rung, no domain score |
| The floor is rust, not amnesia | **VERIFIED** | Confidence bottoms at 0.55 for absences up to 1e9 hours; something never practised reads FULL, not floored |
| Save v12 → v13 fills rather than overwrites | **VERIFIED** | `tests/save.test.ts` — a partial capacity set survives; confidence starts empty so nobody is charged rust for pre-layer time; device run migrates a really-played v11 save through to schema 13 |
| Migration against the director's real save | **PARTIAL** | Unchanged from [[D-088]] — awaiting his playtest. Confirmed against a really-played save, never against his device |
| The notch | **OPEN** | Untouched. Carried from [[D-085]] / [[D-087]] / [[D-088]] |
| A player-facing surface for any of this | **OPEN** | Not built, not claimed |

**Two defects the tests found and reading did not.** The health sweep first used the wrong `WorkloadFactors` field names, so every factor read `undefined` and the assertion **passed against a NaN workload** — a vacuous green, hazard #2 wearing a sweep's clothes. It now asserts the workload is finite before asserting anything about it. And `executionTimeMultiplier` normalised rust across `[0,1]` when confidence can only fall to the floor, **capping the real penalty at 45% of what TUNE declared** — a tunable quietly meaning something other than what it says.

**Why the boundary test is written the way it is.** The instruction was that avoiding a violation is not the same as proving one cannot happen. So the guard is construction first — `practise` and `rehearse` never receive a `GameState`, so they cannot reach `knowledge` even by accident — and then a property test that was verified to **catch a deliberately planted violation** rather than merely to pass.

---

## Slice 2B Stage A — the invention pivot ([[D-088]])

*Stage B closed separately — see the section above ([[D-089]]). Nothing here speaks for it.*

| Claim | Status | Witness |
|---|---|---|
| A fresh castaway is offered nothing to build | **VERIFIED** | Device: *"THE PIVOT: a fresh castaway is offered NOTHING to build — 0 row(s)"*; `tests/reveal.test.ts` asserts the same for all five |
| A row exists only because it was earned, or is survival-basic and suspected | **VERIFIED** | `src/brain/reveal.ts` `revealedInPanel`; 15 unit tests incl. "earning an axe teaches you nothing about storage" |
| Law 113: fire reveals itself when cold and holding the makings, and really crafts | **VERIFIED** | Device: *"the fire route reveals itself — rows: Torch"*, *"the scaffold does NOT leak — 1 row"*, *"really craftable — tap true, owned true"* |
| The scaffold is a floor, not a ceiling — once earned it stops depending on the need | **VERIFIED** | Device: *"warm and by daylight it STAYS"*; unit: "knowledge does not switch off at dawn" |
| Subtraction never shipped alone — a suspected thing nags | **VERIFIED** | Device: **3 hints** rendered and visible (shelter, stonehammer, storage) |
| A hint names a need and a material, never the product | **VERIFIED** | Device asserts the rendered text contains no product name; units borrow `affordance.ts`'s own `namesAFinishedAnswer` so the layers cannot drift |
| The pivot removed the catalogue, not the panel | **VERIFIED** | Device: rest and the F3 refuge line both survive an otherwise-empty panel |
| A minted blueprint puts the row back | **VERIFIED** | Device: *"a minted blueprint puts the row back: the panel is the EARNED record"* |
| All five pre-listed items have a discovery route | **VERIFIED** | `tests/discovery.test.ts` — the first test is the dependency written down |
| **2d** — a really-played v11 save migrates; every crafted type enters at Demonstrated | **VERIFIED** | Device, on the run's own accumulated state rewound to v11: schema 12, blueprints minted for every crafted type, six rows shown to the returning survivor |
| **2d** — structures are matter | **VERIFIED** | Device: shelter and store still standing, durability unchanged to within 0.2 |
| **2c** — F3's 40–50% band re-verified on device, post-pivot | **VERIFIED** | Device: **45%** on a `crude` shelter, read off the rendered line — Slice 1's own number, [[D-085]] |
| Migration confirmed against the director's actual save | **PARTIAL** | Confirmed against a *really-played* save, not a fixture — but not against the director's device, which this machine cannot reach. Stated rather than implied |
| The notch | **OPEN** | Untouched by this stage. Carried from [[D-085]] / [[D-087]] |
| Slice 2B Stage B — capacities, combinations, confidence layer | **OPEN** | Not begun |

**Where the value was.** The pre-scan, not the code. Emptying the catalogue looked like a deletion and was a **dependency inversion**: ~31 checks and a new player's whole first night ran *through* the list, with six harness click-sites feeding the progression spine. Building all five discovery routes *before* removing anything is the only reason this stage did not make the game uncompletable.

**Three corrections, all mine.** (1) The 2d check read zero rows and I nearly filed it as a migration failure — the Build button was **correctly hidden** by D-053's gate, asserted two checks below in the same run. I tapped a button the game had deliberately removed. (2) Fixing that by un-building the shelter stranded it down for the rest of the run: **249 checks became 240** and I nearly read that as progress. (3) The old *"lists all five craftables"* check asserted the **catalogue** — keeping it would have locked the retired behaviour in as a regression test.

**One correction nobody flagged.** F3's new band check first passed at **50%**, inside 40–50 and still wrong: `reductionPct` is grade-driven and that run's shelter had rolled better than crude, so the check certified a shelter F3 is not about. Pinned to `crude`, it reads **45%**.

---

## Carried debts into Slice 1 ([[D-080]])

| Debt | Owner | Closes when |
|---|---|---|
| (a) Unified collision-model fix | Slice 1, opening item | Fail-then-pass across all three historical symptoms — movement hard-block, shelter pin, stalled `approach()` — plus the feel-court check that sliding reads as sliding |
| (b) F3 exposure-reduction certification | Slice 1, item 2 | Refuge quality delivering the 40–50% reduction, truthfully and legibly, at the v0_14 target |
| (c) F1/F2 regression lock | Slice 1, item 3 | Certification formalized against the now-passed reads, guarded rather than remembered |

## Still open, carried from earlier gates, never claimed fixed

| Item | Status |
|---|---|
| **F6** — stone has no ONLINE replenishment path (measured: 1433 game hours, 0 rocks) | **OPEN** — needs the director's call, a consequence of [[D-070]]'s "restock happens out of view" |
| **F7** — `src/body/entities.ts` still lists `rock` among kinds that regrow from themselves | **OPEN** |
| **F8** — unreachable "Too far from the shelter to sleep." in `game.ts` and `session.ts` | **OPEN** |
| C3's Gate 0 remediation itself | **UNWITNESSED** — A1–A11 were addressed, several with mechanisms rather than prose; **no auditor has read any of it** |

---

*Regenerate at the next gate close. If this sheet ever disagrees with the director's copy, the director's copy governs on scope and this one governs on evidence — it cites only what the repository can prove.*
