# DRIFT — Ops Protocol v1.0
**Team · Process · Protocol** — the operating system for building DRIFT.

**Status:** standing. This file operationalizes Charter Part II. If it ever conflicts with the charter, the charter governs; the conflict is logged in the decisions log and reconciled next cycle.

---

## 1. The crew

Every hat is Claude except the Director. A "session" is any Claude context (chat or Claude Code); the hat is declared at boot.

| Hat | Runs where | Owns | Default tier |
|---|---|---|---|
| **Director (Kimz)** | Phone + desktop | Vision, priorities, playtest feel, roadmap calls, feeding files | — |
| **C1 — Orchestrator** | Claude chat, this Project | Design translation, cycle specs, forks & ping-pong, living docs, feedback triage, opening/closing cycles | Opus-class |
| **C2 — Builder** | Claude Code, the repo | Implementation, tests, tooling, shipping, as-built notes, applying doc deltas | Sonnet-class; Opus-class for architecture-founding cycles |
| **C3 — Auditor** | Fresh-context agent in the repo | Independent check of build vs. spec; verdict | Sonnet-class |

**Later hats** (named now, activated when their phase arrives): **Art Director** (style lock + external image-engine pipeline, Phase 2–3), **Systems Designer** (heavy pre-design, Phase 5), **Port Engineer** (native wrapper, launch).

**Crew norms** (the charter's founding constraints, operationalized):
1. **Standing authority** — no permission or approval gates. The only stops are the director's playtest checkpoints and genuine forks.
2. **The fork rule** — a fork is a question that changes the game's identity: pillars, tone, arc, or business posture. Everything smaller: decide, log it in the decisions log, move.
3. **Volunteer** — better solutions are offered unprompted; every cycle CLOSE includes a proposed next cycle.
4. **Nothing reaches the director unchecked** — every artifact is self-verified and proofread by its author before handoff.
5. **Never ask the director to do what code can do.** The director's actions are enumerated in §8; if it isn't on that list, it's crew work.
6. **Honest systems only** — the morning report and all retention math stay free of dark patterns (Charter §8).

---

## 2. Where truth lives

**The six documents:** charter · ops protocol (this file) · state · decisions log · cycle log · codex.

- **Canon:** from Cycle 01 onward, the living four (state, decisions log, cycle log, codex) live canonically in the repo at `/docs/`. The Project library permanently holds the two constitutional files (charter + ops) and is refreshed only on version bumps.
- **C1 reads canon** at boot by fetching the repo's raw `/docs/` files (public repo). If the fetch fails, fallback: the director drops current copies into the chat.
- **C1 writes canon** via **doc deltas**: any updates C1 authors (a new decision, a new cycle spec, state changes) travel inside the next handoff block; C2 applies them to `/docs/` verbatim before building.
- **C2 and C3 write canon** directly (as-built notes, audit verdicts, TUNE ledger, state-after-ship), always per the templates in §7.
- One canonical copy of everything; the repo is it. The library seeds it once, then stays constitutional.
- **PARKed ideas** live in the Parked section at the bottom of the decisions log (this absorbs the charter's parked-concepts list; Appendix A is its seed).

---

## 3. The cycle

Seven stages; each has one owner and one output.

| Stage | Owner | Output |
|---|---|---|
| **OPEN** | C1 | Cycle spec appended to the cycle log + a paste-ready handoff block |
| **BUILD** | C2 | Working build; automated done-checks green; brain-purity check green |
| **AUDIT** | C3 | Verdict: PASS / PASS-WITH-NOTES / FAIL (+ defect list). FAIL loops to BUILD. |
| **SHIP** | C2 | Stable play URL + `/builds/<cycle-id>/` archive + as-built note in the cycle log |
| **PLAYTEST** | Director | Plain-language reactions, on the phone, in the chat |
| **PERFECT** | C1 → C2 | Feedback triaged and fixed until the director calls it |
| **CLOSE** | C1 | State regenerated, decisions logged, codex entries added, next cycle proposed |

**Definition of done — three gates, all required:**
(1) automated done-checks green · (2) audit PASS (or PASS-WITH-NOTES with every note triaged) · (3) the director says it feels right on the phone.

**Feedback triage** — C1 sorts every director reaction into exactly one of:
- **FIX** — breaks this cycle's goal; C2 fixes now.
- **TUNE** — a number feels wrong; adjust `tune.ts`, update the TUNE ledger.
- **NEXT** — real new scope; becomes (part of) a future cycle spec.
- **PARK** — an idea for later; appended to the Parked section of the decisions log.

**Forks** go to the director as a short option set with a recommendation (the ping-pong). Everything else is decided under standing authority and logged.

---

## 4. Session protocol

- **C1 boot (chat):** read charter → this file → fetch `/docs/drift_state.md` from the repo (then other living docs as needed) → open by stating the current cycle, its status, and the next action.
- **C2 boot (Claude Code):** handoff block pasted in → read the docs the block names → apply any doc deltas → confirm boot with a ≤5-line restatement of the cycle's goal and acceptance checks → execute with standing authority.
- **C3 boot (fresh context):** knows nothing but the spec, the as-built claim, the code, and the URL. Re-runs the acceptance checks independently. Fresh context is the requirement (Charter §II.4); a clean-context subagent spawned by C2 at the end of BUILD (with a deployed build for it to play) satisfies it with no director relay — a separate session also works.
- **Mid-cycle recovery:** any session dying mid-cycle is recoverable from state + cycle log (C2 additionally from the repo itself). No other handover ceremony exists — **state is the handover.**

---

## 5. Build constitution (C2's law)

**Repo layout:**
```
/src/brain/   Pure TypeScript: simulation, data model, reconcile, formulas.
              ZERO Phaser imports. Fully unit-testable.
/src/body/    Phaser 3 scenes, rendering, input. Imports brain; brain never imports body.
/src/data/    Content tables + tune.ts (every [TUNE] constant lives here, and only here,
              each with a comment).
/docs/        The six documents (canon).
/tests/       Brain tests — the automated done-checks.
/builds/      Per-cycle archived builds, published alongside the current build.
```

**Laws:**
1. **Brain/body law** (Charter §II.5) — enforced mechanically: a purity check in CI fails any build with a Phaser import under `/src/brain/`.
2. **Tune law** — no magic numbers in code; every tunable lives in `tune.ts`; the cycle log's TUNE ledger mirrors current values.
3. **Testing law** — the brain is tested code (Vitest); the body is verified against each cycle's device acceptance checks.
4. **Pipeline** — public GitHub repo; auto-deploy to GitHub Pages on push to main; one stable play URL; each cycle also archived under `/builds/<cycle-id>/` for regression comparison; repo tagged at each cycle close (`c01`, `c02`, …).
5. **Save law** — versioned save schema from day one (`schemaVersion` field + migration stub). The offline DNA depends on saves surviving updates.
6. **Placeholder-first art** (Charter §II.7) — the build never blocks on visuals.

---

## 6. Token economy (Charter §II.9)

| Work | Tier |
|---|---|
| Cycle specs, forks, design translation, architecture-founding builds | Opus-class |
| Standard build cycles, audits | Sonnet-class |
| Bulk content entry (codex data, boilerplate, asset lists) | Haiku-class |

Every handoff block declares its tier on line 1. The bigger lever stays scope (Charter §II.9): small cycles, precise handoffs, zero back-and-forth.

---

## 7. Templates

**Cycle spec** (C1, at OPEN — appended to the cycle log):
```
## CYCLE <id> — <name>
Phase · Tier · Status · Opened <date>
HANDOFF BLOCK: <paste-ready, ≤10 lines, tier on line 1, doc deltas attached if any>
GOAL: <one sentence — what this cycle proves>
SCOPE IN: <staged, in buildable order>
SCOPE OUT: <explicit non-goals>
ACCEPTANCE CHECKS: <A1…An, each independently checkable>
TUNE INTRODUCED: <constant = initial value, one line each — or "see ledger">
AS-BUILT: (pending)
AUDIT: (pending)
```

**As-built note** (C2, at SHIP): shipped vs. spec; deviations and why; TUNE values as implemented; known gaps; play URL; archive path.

**Audit verdict** (C3): each acceptance check → result; verdict PASS / PASS-WITH-NOTES / FAIL; defects with reproduction steps if any.

**Handoff block** (C1): tier on line 1; role; boot reading list; doc deltas; then: "confirm boot, execute <cycle> end-to-end with standing authority; once deployed, spawn the C3 audit; on PASS, append the as-built note and report the play URL."

---

## 8. The director's workload — the complete list

**One-time (before Cycle 01):** install the Claude Code desktop app → make a folder → drop the six documents into it → open the folder in Claude Code → paste the Cycle 01 handoff block (top of Cycle 01 in the cycle log) → approve the GitHub sign-in when C2 asks (C2 creates the repo and pipeline itself).

**Recurring (per cycle):** paste one handoff block · open one link on the phone and play · react in plain language in the chat.

**Occasional:** replace the charter or ops file in the Project library when a version bumps; add any file to the library the crew should absorb (references, art, notes).

Everything else — every file, commit, deploy, test, and doc update — is crew work.

**Repo URL:** recorded here at Cycle 01 close (this file → v1.1).

---

*End of Ops Protocol v1.0.*
