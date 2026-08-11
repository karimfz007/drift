# DRIFT — CANON FILING MANIFEST AND BUILD BRIEF

**Compiled by:** C1, 11 August 2026 · **For:** SON to relay, CODE to execute
**Origin at time of writing:** ledger head D-139, Drop 5 "The Static" live

---

# PART ONE — THE FILING PROBLEM

Seven canonical artifacts exist only as uploads. **None of them is in the repository.** CODE cannot build against a file it cannot open, and this project has already lost one document this way — `handover_challenge_sprint.md` was ordered, written, and never landed; it still returns 404.

## 1.1 What is missing from `docs/reference/`

| File | Status at origin | Why it matters |
|---|---|---|
| `the_first_night_design_bible_v2_6_body_water_work_and_survival_manufacture.md` | **404** | Laws 138–162. The body, water truth, continuous time. |
| `the_first_night_body_water_work_manufacture_model_v2_6.xlsx` | **404** | The 159-node graph, superseded but the ancestor of record. |
| `the_first_night_design_bible_v2_7_civilization_weave_and_second_life.md` | **404** | Laws 163–200. The canonical v2.7. |
| `the_first_night_civilization_weave_model_v2_7.xlsx` | **404** | The 222-node graph, 649 edges, 33 domains. |
| `the_first_night_bible_v2_7_amendment_sheet_laws_201_206.md` | **404** | Laws 201–206 and the version ruling. |
| `drift_design_vs_shipped_audit_v2_7.xlsx` | **404** | The accomplished table. The only artifact that says what is left. |

## 1.2 What is missing from `docs/`

| File | Status | Note |
|---|---|---|
| `handover_challenge_sprint.md` | **404** | Ordered twice. Never landed. File it or formally retire it. |

## 1.3 Filing rules

- Reference documents go to `docs/reference/`, alongside `the_first_night_design_bible_v2_5_whole_game_integration_and_benchmark.md`, which is already there and is the precedent.
- Spreadsheets go to `docs/reference/model/`, which already exists.
- Filing is verified per clause (e): after the push, grep each filename at origin and report the result. **An edit must witness its landing.**
- One ledger entry covers the whole filing pass, and it names every file.

---

# PART TWO — WHERE THE GAME ACTUALLY IS

Measured against the 222-node v2.7 graph:

- **21 nodes shipped. 4 half-built. 197 absent. 9.5%.**
- **Nothing above threshold H3 exists anywhere in the game.**
- Wave 2 alone — the workbench and controlled heat — gates **77 of the 222**.
- The design did not stall. The design grew from 159 nodes to 222 in a day. The build did not move.

This is the whole of the Director's *crafting is too shallow* and *survival is too shallow*, in one number.

---

# PART THREE — WAVE 0: THE FLOOR

Nothing new is built until this closes. Six of these are defects the Director hit in play on 11 August; four are half-built nodes; three are the cheapest water rungs in the graph.

## 3.1 The six defects, P0

**D1 — The combination chooses for you.** 5 wood + 5 stone silently built storage when the Director wanted a stone hammer. Both patterns match what he held. v2.7 §11.4 step 4 requires *choose/apply an operation*; `resolveRecipe` is choosing instead. When staged materials satisfy more than one pattern the survivor already knows, **offer the choice**. Never auto-resolve. Never-attempted patterns still show property hints only, per Law 95. This needs two staging positions, not three — it is not blocked on the workbench.

**D2 — Vitals is inert.** Fibre cannot heal an injury from the Vitals tab. The bandage's verb has been owed since Drop 2. Wire it, with a reachability proof from the real panel.

**D3 — Dropped items vanish.** `dropped.ts` exists; nothing surfaces or recovers them. An item put down must be findable and retrievable.

**D4 — The spear is invisible.** It kills a boar, so the object is real. It does not appear in the backpack and cannot be placed in hand. Fix the readout and the equip path.

**D5 — The journal is undiscoverable.** Craftable at 1 wood + 2 fibre + 6 energy, and nothing ever suggests it is possible. Give it a first-contact route like any other discovery.

**D6 — Pond illness is invisible.** Drinking pond water sickens the survivor with no felt signal. v2.6 §6.5 already forbids this — illness must be visible in play, as symptoms rather than labels, per Law 145.

## 3.2 The four half-built

| Node | What is missing |
|---|---|
| `W-HEARTH` | Fire exists. No controlled hearth, no cooking. Cooking is one rung and unlocks a wave. |
| `A-BANDAGE` | Same as D2. Listed here so the graph and the defect board agree. |
| `A-BOAT-B1` | The boat is on the beach and readable. It is not secured. |
| `A-DIVE` | Diving is an act. There is no shore-dive station. |

## 3.3 The three cheapest water rungs

`C-COCONUT-CUP` (H1), `C-COCONUT-BOILER` (H2), `C-FOUND-PAN` (H2) — with `P-CLEAN-WATER` as their output. These are the entire answer to *boil it with what?*, they need no bench, no kiln and no metal, and the coconut is already a shipped material. **This is the highest value-per-node in the graph.**

## 3.4 Legibility, carried from Drop 6

Mastery and capacities perceivable at the moment they change, in the world before any panel. The three tabs legible. Growth shown as evidence strands per v2.7 §13.5 and Law 201 — **no numbers, ever.**

**Wave 0 deliverable sentence:** *the director can now see, hold, choose, heal, and boil.*

---

# PART FOUR — WAVE 1: SALVAGE, THE BEACH, AND FIBRE

45 nodes. Zero shipped. The Director's first-ranked depth area, and the cheapest in the graph — the objects already wash ashore and fibre is already in inventory doing almost nothing.

**Salvage becomes matter.** Twenty sources — ferrous, aluminium, copper, brass, found rope, canvas, glass, rubber, polymer, bottles, food-grade pans, fasteners, bearings, a repairable engine. Governed by Weave Laws 175 through 178: triage before loot, junk keeps its mass, abundance and scarcity coexist, and buried salvage is an earthwork problem needing a tool and real time.

**The carry ladder.** Basket, pack frame, sled, tripod. A cart is not a convenience; it is the difference between one trip and five, and it is where load tolerance finally has somewhere to matter.

**The fibre economy, nine nodes.** Coir, leaf fibre, bast fibre → graded fibre → spindle → yarn → loom → cloth → net. The Director named fibre as underdeveloped; the graph agrees by nine to one.

**Rails.** Wash-up is generated at the moment of return, never accrued during an absence — D-011 is absolute, and Weave Law 199 forbids anything valuable arriving and vanishing while the player cannot act. Nothing is lost from a cache while away. Reachability proof on every new verb.

**Wave 1 deliverable sentence:** *the director can now spend a session on the beach and come home richer.*

---

# PART FIVE — STANDING ORDERS THAT APPLY THROUGHOUT

1. **Reachability proof on every new verb.** The zero-caller class stands at eight instances. Fail-then-pass on each.
2. **Three-way SHA witness** on every ship: pushed, origin, served. A mismatch or a red deploy is a failed ship.
3. **The graph is a superset** (Law 204). Anything shipped without a node is a defect, closed by adding the node.
4. **No numbers** (Law 201). Any numeric growth readout is a failed acceptance, however useful it seems in the moment.
5. **Registers are qualified on first use.** ENDING E03 not CAPABILITY E03; AGENT C1 not ITEM C1; one document per version number. Three collisions on record.
6. **Nothing off the wave order gets scoped, costed or specced.** If it is not in the current wave, it is banked — silently, and the build continues.

---

# PART SIX — OWED TO THE DIRECTOR

1. Confirm the **version ruling**: Civilization Weave keeps v2.7; C1's document is withdrawn.
2. Confirm the **wave order** — 1 to 4 are the Director's ranking; 0 and 5 are C1's placement.
3. Rule on the **plane crash** as a rare, announced, time-bounded salvage arrival in wave 1.
4. Rule on pulling the **coconut boiler** forward into wave 0. C1 recommends yes.

---

*Companion artifacts: `the_first_night_bible_v2_7_amendment_sheet_laws_201_206.md` and `drift_design_vs_shipped_audit_v2_7.xlsx`.*
