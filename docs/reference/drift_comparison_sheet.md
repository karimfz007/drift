# THE FIRST NIGHT (DRIFT) — Comparison Sheet

*A living document. Regenerated at every gate close ([[D-078]] amendment E). This edition: **Slice 2 close**, 2026-07-30 ([[D-087]]).*

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

## Slice 2B Stage 2a — discovery routes (in progress)

| Claim | Status | Witness |
|---|---|---|
| All five pre-listed items have a working discovery route | **VERIFIED** | `tests/discovery.test.ts` — axe, torch, shelter, storage, stone hammer; the first test is the dependency written down and fails the moment the catalogue is emptied for an unreachable item |
| A discovery prompt names a need and a material, never the product | **VERIFIED** | Two tests: one borrows `affordance.ts`'s own `namesAFinishedAnswer` detector so the layers cannot drift; one checks the blunt case that no prompt contains its own product's name |
| A suspicion requires all three legs — need, makings in hand, property | **VERIFIED** | `tests/discovery.test.ts` — need alone, makings alone, and a partial handful each yield no suspicion |
| Knowledge stays monotonic under the new reader | **VERIFIED** | `ladderFor` consults suspicion *after* the blueprint check; the test fails when the order is inverted, because `conceptually-suspected` sits below `demonstrated` |
| Fail-then-pass proven per [[D-066]] | **VERIFIED** | With `suspected` widened to `needFelt \|\| complete` and the ladder's suspicion check hoisted, **11 tests fail**, including both guard groups |
| The manufacture catalogue is emptied | **OPEN** | Not yet — Stage 2b. The routes exist first by design: emptying it is a dependency inversion, not a deletion |
| F3's 40–50% first-night exposure survives the pivot | **OPEN** | Not yet re-measured post-pivot — Stage 2c. Last measured **45.00%** at [[D-085]], pre-pivot |
| Migration: structures persist as matter, crafted types enter at Demonstrated | **PARTIAL** | `migratedLadderFor` exists and is tested; not yet wired to the live save path — Stage 2d |

**Interim signal, stated so it is not mistaken for the design.** "Has handled this material" currently reads from what the survivor is carrying, because inspection is not yet persisted. When it is, that one predicate changes and the routes do not.

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
