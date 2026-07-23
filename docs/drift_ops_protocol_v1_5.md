# DRIFT — Ops Protocol v1.5 *(project: The First Night)*
**Team · Process · Protocol** — the operating system for building DRIFT.

**Status:** standing. This file operationalizes Charter Part II. *(v1.1–v1.2, 2026-07-22 — dependency law §5.7; experience fields in §7. v1.3, 2026-07-22 — repo URL recorded in §8; §5 made engine-neutral for the 3D pivot, charter v0.4 §II.5. v1.4, 2026-07-23 — crew reorganization for token economy (D-044): SON Operator added, C1 becomes Supervisor, C2 default drops to Sonnet high with per-block/per-blockage Opus escalation; §1 crew table + supervision loop and §6 token economy revised. v1.5, 2026-07-23 — process-gap remediation (D-046): §4 gains four standing laws closing the gap the missing Cycle 05 OPEN spec exposed — no committed spec means no build, handoff packages embed their spec inline, MAJOR artifacts need C1's explicit "AUDITED — GO" relayed by the director, and a CI docs-integrity check keeps every decisions-log reference honest.)* If it ever conflicts with the charter, the charter governs; the conflict is logged in the decisions log and reconciled next cycle.

---

## 1. The crew

Every hat is Claude except the Director. A "session" is any Claude context (chat or Claude Code); the hat is declared at boot.

| Hat | Runs where | Owns | Default tier |
|---|---|---|---|
| **Director (Kimz)** | Phone + desktop | Vision, priorities, playtest feel, roadmap calls, feeding files | — |
| **C1 — Supervisor** | Claude chat, this Project | Constitution (charter/ops pen), fork resolution, MAJOR-artifact audits, cycle-close verdicts, KEY REPORT recipient | Top tier |
| **SON — Operator** | Claude chat | Daily orchestration; feedback triage; drafting specs, handoff packages, and doc deltas; opening cycles; flags MAJOR artifacts for C1 audit. No constitutional pen, no fork resolution. | Sonnet (high) |
| **C2 — Builder** | Claude Code, the repo | Implementation, tests, tooling, shipping, as-built notes, applying doc deltas | Sonnet (high); Opus per-block or per-blockage |
| **C3 — Auditor** | Fresh-context agent in the repo | Independent check of build vs. spec; verdict | Sonnet-class |

**Later hats** (named now, activated when their phase arrives): **Art Director** (style lock + external image-engine pipeline, Phase 2–3), **Systems Designer** (heavy pre-design, Phase 5), **Port Engineer** (native wrapper, launch).

**C2 tier rule:** the Builder runs Sonnet (high) by default. The **tier line on line 1 of each handoff block governs exceptions** — run Opus only when a block declares it, or when C2 hits an architecture-level problem it cannot crack in two attempts (tell the Director "flip to Opus for this", then flip back once resolved). C01–C04 ran Opus as architecture-founding cycles — correct spend, that era is closed (D-044).

**Crew norms** (the charter's founding constraints, operationalized):
1. **Standing authority** — no permission or approval gates. The only stops are the director's playtest checkpoints and genuine forks.
2. **The fork rule** — a fork is a question that changes the game's identity: pillars, tone, arc, or business posture. Forks resolve with C1 (Supervisor). Everything smaller: decide, log it in the decisions log, move.
3. **Volunteer** — better solutions are offered unprompted; every cycle CLOSE includes a proposed next cycle.
4. **Nothing reaches the director unchecked** — every artifact is self-verified and proofread by its author before handoff.
5. **Never ask the director to do what code can do.** The director's actions are enumerated in §8; if it isn't on that list, it's crew work.
6. **Honest systems only** — the morning report and all retention math stay free of dark patterns (Charter §8).
7. **Supervision loop** (D-044) — SON runs day-to-day; **MAJOR artifacts** (cycle specs, handoff packages, constitutional deltas) are flagged by SON and **audited by C1 before handoff**. A **KEY REPORT goes to C1 at every CLOSE**. The constitutional pen (charter/ops) and fork resolution stay with C1.

---

## 2. Where truth lives

**The six documents:** charter · ops protocol (this file) · state · decisions log · cycle log · codex.

- **Canon:** from Cycle 01 onward, the living four (state, decisions log, cycle log, codex) live canonically in the repo at `/docs/`. The Project library permanently holds the two constitutional files (charter + ops) and is refreshed only on version bumps.
- **Chat reads canon** at boot by fetching the repo's raw `/docs/` files (public repo). If the fetch fails, fallback: the director drops current copies into the chat.
- **Chat writes canon** via **doc deltas**: any updates authored in chat (a new decision, a new cycle spec, state changes) travel inside the next handoff block; C2 applies them to `/docs/` verbatim before building. SON drafts these; constitutional deltas (charter/ops) carry C1's pen.
- **C2 and C3 write canon** directly (as-built notes, audit verdicts, TUNE ledger, state-after-ship), always per the templates in §7.
- One canonical copy of everything; the repo is it. The library seeds it once, then stays constitutional.
- **PARKed ideas** live in the Parked section at the bottom of the decisions log (this absorbs the charter's parked-concepts list; Appendix A is its seed).

---

## 3. The cycle

Seven stages; each has one owner and one output.

| Stage | Owner | Output |
|---|---|---|
| **OPEN** | SON (MAJOR spec audited by C1) | Cycle spec appended to the cycle log + a paste-ready handoff block |
| **BUILD** | C2 | Working build; automated done-checks green; brain-purity check green |
| **AUDIT** | C3 | Verdict: PASS / PASS-WITH-NOTES / FAIL (+ defect list). FAIL loops to BUILD. |
| **SHIP** | C2 | Stable play URL + `/builds/<cycle-id>/` archive + as-built note in the cycle log |
| **PLAYTEST** | Director | Plain-language reactions, on the phone, in the chat |
| **PERFECT** | SON → C2 | Feedback triaged and fixed until the director calls it |
| **CLOSE** | SON → C1 | State regenerated, decisions logged, codex entries added, next cycle proposed; KEY REPORT to C1, who renders the close verdict |

**Definition of done — three gates, all required:**
(1) automated done-checks green · (2) audit PASS (or PASS-WITH-NOTES with every note triaged) · (3) the director says it feels right on the phone.

**Feedback triage** — SON sorts every director reaction into exactly one of:
- **FIX** — breaks this cycle's goal; C2 fixes now.
- **TUNE** — a number feels wrong; adjust `tune.ts`, update the TUNE ledger.
- **NEXT** — real new scope; becomes (part of) a future cycle spec.
- **PARK** — an idea for later; appended to the Parked section of the decisions log.

**Forks** go to the director as a short option set with a recommendation (the ping-pong), resolved with C1. Everything else is decided under standing authority and logged.

At PLAYTEST the director just reacts in plain language — no forms. Two prompts worth answering when they come naturally: *most satisfying moment* and *most annoying moment*.

---

## 4. Session protocol

- **Chat boot (SON or C1):** read charter → this file → fetch `/docs/drift_state.md` from the repo (then other living docs as needed) → open by stating the current cycle, its status, and the next action.
- **C2 boot (Claude Code):** handoff block pasted in → read the docs the block names → apply any doc deltas → confirm boot with a ≤5-line restatement of the cycle's goal and acceptance checks → execute with standing authority at the block's tier (Sonnet high default; Opus only if the block says so or on an uncrackable architecture blockage).
- **C3 boot (fresh context):** knows nothing but the spec, the as-built claim, the code, and the URL. Re-runs the acceptance checks independently. Fresh context is the requirement (Charter §II.4); a clean-context subagent spawned by C2 at the end of BUILD (with a deployed build for it to play) satisfies it with no director relay — a separate session also works.
- **Mid-cycle recovery:** any session dying mid-cycle is recoverable from state + cycle log (C2 additionally from the repo itself). No other handover ceremony exists — **state is the handover.**

**Process-gap remediation laws (D-046)** — added after Cycle 05's handoff arrived with the cycle log missing its own OPEN spec, and C2 improvised one rather than stopping:

(a) **No committed spec, no build.** If the cycle log lacks the target cycle's spec when a BUILD handoff arrives, C2 halts and requests it. A missing OPEN artifact is a stop condition, never an improvisation license — even under standing authority.

(b) **Handoff packages embed their spec and deltas inline.** A handoff block may never merely reference spec content that isn't already committed to the repo; whatever the block depends on travels inside it, verbatim.

(c) **MAJOR artifacts flagged by SON reach C2 only with C1's explicit "AUDITED — GO"**, relayed by the director. A MAJOR artifact (cycle spec, handoff package, constitutional delta) in transit without that relay is not yet cleared for BUILD.

(d) **A CI docs-integrity check** (`tools/check-docs-integrity.mjs`, run alongside the purity check) confirms every `D-NNN` reference across the living `/docs/` files resolves to an actual entry in the decisions log — mechanically, the same check that would have caught the dangling D-045 reference before this remediation had to happen by hand.

---

## 5. Build constitution (C2's law)

**Repo layout:**
```
/src/brain/   Pure TypeScript: simulation, data model, reconcile, formulas.
              ZERO Phaser imports. Fully unit-testable.
/src/body/    Rendering, scenes, input (currently Babylon.js). Imports brain; brain never imports body.
/src/data/    Content tables + tune.ts (every [TUNE] constant lives here, and only here,
              each with a comment).
/docs/        The six documents (canon).
/tests/       Brain tests — the automated done-checks.
/builds/      Per-cycle archived builds, published alongside the current build.
```

**Laws:**
1. **Brain/body law** (Charter §II.5) — enforced mechanically: a transitive purity check in CI fails any build with a rendering-engine import (currently Babylon) under `/src/brain/`.
2. **Tune law** — no magic numbers in code; every tunable lives in `tune.ts`; the cycle log's TUNE ledger mirrors current values.
3. **Testing law** — the brain is tested code (Vitest); the body is verified against each cycle's device acceptance checks via the smoke harness (`npm run smoke`).
4. **Pipeline** — public GitHub repo; auto-deploy to GitHub Pages on push to main; one stable play URL; each cycle also archived under `/builds/<cycle-id>/` for regression comparison; repo tagged at each cycle close (`c01`, `c02`, …).
5. **Save law** — versioned save schema from day one (`schemaVersion` field + migration stub). The offline DNA depends on saves surviving updates.
6. **Placeholder-first art** (Charter §II.7) — the build never blocks on visuals.
7. **Dependency law** (Charter §II.10) — every direct dependency is pinned (lockfile committed), permissively licensed, and listed in the repo's `DEPENDENCIES.md` (version · license · purpose · exit path). Upgrades happen only between cycles, never mid-build.
8. **Docs-integrity law** (D-046(d)) — `npm run docs-integrity` runs alongside the purity check; a `D-NNN` reference anywhere in `/docs/*.md` that does not resolve to an entry in `drift_decisions_log.md` fails CI.

---

## 6. Token economy (Charter §II.9)

| Work | Tier |
|---|---|
| Constitution (charter/ops), fork resolution, MAJOR-artifact audits, cycle-close verdicts | Top tier (C1 — Supervisor) |
| Chat orchestration — daily triage, cycle specs, handoff packages, doc-delta drafting | Sonnet high (SON — Operator) |
| Build cycles | Sonnet high (C2); Opus per-block (tier line) or per-blockage escalation |
| Audits | Sonnet-class (C3) |
| Bulk content entry (codex data, boilerplate, asset lists) | Haiku-class |

Chat orchestration defaults to Sonnet; supervision, forks, and the constitution stay top tier; builds default to Sonnet high with per-block Opus escalation declared on the handoff block's tier line. Every handoff block declares its tier on line 1. The bigger lever stays scope (Charter §II.9): small cycles, precise handoffs, zero back-and-forth.

---

## 7. Templates

**Cycle spec** (SON, at OPEN — appended to the cycle log; MAJOR specs audited by C1 first):
```
## CYCLE <id> — <name>
Phase · Tier · Status · Opened <date>
HANDOFF BLOCK: <paste-ready, ≤10 lines, tier on line 1, doc deltas attached if any>
GOAL: <one sentence — what this cycle proves>
PROMISE: <one sentence — what the player should feel>
HYPOTHESIS: <the human-experience bet this cycle tests>
PLAYTEST QUESTION: <the one thing the director's reaction must answer>
SCOPE IN: <staged, in buildable order>
SCOPE OUT: <explicit non-goals>
ACCEPTANCE CHECKS: <A1…An, each independently checkable>
TUNE INTRODUCED: <constant = initial value, one line each — or "see ledger">
AS-BUILT: (pending)
AUDIT: (pending)
```

**As-built note** (C2, at SHIP): shipped vs. spec; deviations and why; TUNE values as implemented; known gaps; play URL; archive path.

**Audit verdict** (C3): each acceptance check → result; verdict PASS / PASS-WITH-NOTES / FAIL; defects with reproduction steps if any.

**Handoff block** (SON): tier on line 1 (Sonnet high default, or Opus if the cycle warrants it); role; boot reading list; doc deltas; the cycle's spec **embedded inline** (D-046(b) — never referenced as "already in the log" unless it demonstrably is); then: "confirm boot, execute <cycle> end-to-end with standing authority; once deployed, spawn the C3 audit; on PASS, append the as-built note and report the play URL."

---

## 8. The director's workload — the complete list

**One-time (before Cycle 01):** install the Claude Code desktop app → make a folder → drop the six documents into it → open the folder in Claude Code → paste the Cycle 01 handoff block (top of Cycle 01 in the cycle log) → approve the GitHub sign-in when C2 asks (C2 creates the repo and pipeline itself).

**Recurring (per cycle):** paste one handoff block · open one link on the phone and play · react in plain language in the chat.

**Occasional:** replace the charter or ops file in the Project library when a version bumps; add any file to the library the crew should absorb (references, art, notes); relay C1's "AUDITED — GO" to C2 for a MAJOR artifact (D-046(c)).

Everything else — every file, commit, deploy, test, and doc update — is crew work.

**Repo URL:** https://github.com/karimfz007/drift · **Play URL:** https://karimfz007.github.io/drift/ · 2D laboratory preserved at `/builds/c01/`.

---

*End of Ops Protocol v1.5.*
