# THE FIRST NIGHT — AMENDMENT SHEET TO DESIGN BIBLE v2.7

## Laws 201–206, the Skills Constitution, and the resolution of the v2.7 version collision

**Status:** design canon. **Amends:** *Design Bible v2.7 — Civilization Weave and Second-Life Stewardship Constitution*.
**Withdraws:** *Design Bible v2.7 — Skills, Salvage, Forge and Depth* (C1, 11 Aug 2026), in full.
**Companion artifact:** `drift_design_vs_shipped_audit_v2_7.xlsx`.
**Compiled by:** C1, 11 August 2026.

---

# 0. The collision, and the ruling

On 11 August 2026 two documents were authored as Design Bible v2.7. Both declared constitutional laws beginning at 163. **Eighteen law numbers were double-assigned.**

| Number | Civilization Weave | C1's withdrawn document |
|---|---|---|
| 163 | Fire is infrastructure | Growth is embodied |
| 167 | A workbench opens operations, never recipes | The graph is a superset of the game |
| 173 | Metal remembers source and history | The workspace ladder is physical, never a level |
| 175 | Salvage is triage before loot | Metal carries its provenance |
| 178 | Buried salvage is an earthwork problem | Seeds carry a line |
| 180 | Hazards attack mechanisms | Breath is trained, never extended |

**Ruling.** The *Civilization Weave* document is the canonical v2.7. It is broader, its model is larger and structurally sound, and it independently reaches the same conclusions on growth feedback. **Laws 163–200 belong to it and to nothing else.** C1's document is withdrawn in full. Its genuinely additive content is re-issued here as **Laws 201–206**.

This is the third register collision on this project — ENDING E03 against CAPABILITY E03, AGENT C1 against ITEM C1, and now two v2.7s. The standing rule already written for the first two now extends: **a document version number is a register too, and only one document may hold one.**

---

# 1. Where the withdrawn laws now live

Nothing is lost. Twelve of the eighteen were already covered, and this is the map.

| Withdrawn law | Now governed by |
|---|---|
| Every activity trains something nameable | Weave Law 187 — every action resolves a consequence event |
| Nothing opens before its workspace | Weave Laws 167, 168 and §6.1 workbench states |
| Salvage has four fates | Weave Laws 175 and 176 |
| Identity is earned by inspection | Weave §19.2 material inspection language, with Law 95 |
| Weight and volume are the beach's price | Weave Laws 176 and 177 |
| Some salvage is buried | Weave Law 178 |
| The workspace ladder is physical | Weave Laws 167, 168 |
| Fire has three grades | Weave Law 164 and §5.1 fire capability states |
| Metal carries its provenance | Weave Law 173 |
| Forging is failure-bearing | Weave Law 189, extended by Law 205 below |
| Cultivation is a promise against the future | Weave Laws 183 and 186 |
| Taming is a relationship, not inventory | Weave Law 185 |
| Breath is trained, never extended | Weave Law 191 |

The six that follow had no home.

---

# 2. Laws 201–206

## Law 201 — Growth is embodied and never numeric

> Internal scores exist and remain internal. The player is never shown a level, a point total, an experience bar, a percentage, or a numeric skill screen. Growth reaches the player as changed behaviour in the world first, and as plain language second.

This enshrines what v2.7 §13.5 and §19.5 already practise as evidence strands. It is written as law because it was the Director's explicit ruling of 11 August 2026, taken on a fork put to him directly — literal numbers, embodied phrasing, or both — and because a request to *see points* recurs, and the honest answer to it is always better evidence rather than a number.

The four rungs in shipped code are the vocabulary: **as you landed · finding it easier · noticeably stronger · practised.** A rung change must be perceivable in the act before any panel names it, per Law 26.

## Law 202 — No composite score may exist

> Body capacity, knowledge and confidence are earned separately and none substitutes for another. No total, average, level or composite of the three may exist anywhere in the game — not in the interface, and not internally.

Weave Law 160 forbids silent substitution. This forbids the aggregation that would make substitution possible in the first place. A survivor is never a single number, even in memory.

## Law 203 — A tracked score with no producer is a defect

> Every tracked score must have at least one activity in the shipped game that raises it, reachable through a real player path. A score that cannot move is given a producer or removed. It is never left sitting at its floor.

Written because the audit found seven: the `adaptation` score in all seven knowledge domains, tracked, saved, migrated across schema versions, and impossible to change. This is the eighth instance of the project's recurring defect class — correct code with no live caller — and the first found in a *score* rather than a function.

**Effectivity.** This law lands with the reachability harness that proves it, and with the ruling in §3.3 below.

## Law 204 — The manufacture graph is a superset of the shipped game

> Anything craftable, buildable or findable in the game must exist as a node in the manufacture graph. A shipped capability with no node is a canon defect, closed by adding the node — never by ignoring it.

The graph is the only artifact that can answer *what is left to build*. The moment the game contains something the graph does not, that answer becomes a guess. Two are outstanding: the **torch** and the **journal**, both in code, neither in the 222.

## Law 205 — A diagnosed failure raises understanding; a success raises technique

> Failed work is not wasted work. A failure whose cause the survivor identifies raises understanding, where a clean success raises technique. Failure is never arbitrary: the evidence that predicted it — colour, scale, sound, resistance, smell — is present beforehand for a survivor who has learned to read it.

This is the invention pivot applied to the whole manufacture graph, and it is the mechanism behind Weave Law 189's *control before power*. It also gives the empty catalogue its reward structure: a survivor who tries and fails learns something a survivor who succeeds by luck does not.

## Law 206 — Seed lines and tamed animals are inheritable

> A documented seed lot and a habituated animal persist across the Castaway Cycle. A successor inherits not a number but a strain and a relationship, together with the evidence of who kept them and how.

Weave Laws 185 and 186 make taming a relationship and husbandry an ongoing obligation. This binds both to permadeath, which is the project's own spine: what survives a survivor is what they built, what they wrote, and now what they kept alive.

---

# 3. Rulings that are not laws

## 3.1 Mobility and Balance are one capacity

v2.6 lists them separately. `capacities.ts` ships one capacity, `mobilityBalance`, tested and carried in the save schema. **Code wins; the Bible amends to eight capacities.** Recorded so no future reader has to pick a winner.

## 3.2 The workbench closes Boundary 3

The third staging position has been blocked since Slice 2C on a physical enabler that was never built — recorded in the ledger as *NOT STARTED: Boundary 3 (the work-mat entity, Law 127 position 3, known-multiple-results)*. Weave Law 167 and §6.1 supply that enabler: **the workbench is the thing that holds what your second hand cannot.** The third position is not a reward for experience and never was. Boundary 3 is closed by wave 2, not by a level.

## 3.3 `adaptation` gets a producer, not a deletion

Weave Law 188 now defines what adaptation means — specific, stimulus-driven, and recovered. That is a buildable specification, so the score is kept and wired in wave 2 rather than removed. **Reversible:** if wave 2 closes without a producer landing, Law 203 forces deletion at that point rather than another pass at the floor.

## 3.4 Two nodes to add

`T-TORCH` and `A-JOURNAL`, at H1 and H1 respectively, at the next graph revision. The net, bow and arrows were added in v2.7 and need nothing.

---

# 4. The Skills Constitution

Three systems exist in shipped code and had never been drawn as one picture. This is that picture. It is the internal architecture; §13.5's nine player-facing families are how it is *shown*, and Law 201 governs the difference.

## 4.1 Axis one — Knowledge

Seven domains, each carrying three scores.

| Domain | Covers |
|---|---|
| Survivalcraft | fire, warmth, shelter-craft, water discipline |
| Foraging & medicine | plants, food identification, treatment, dressing |
| Harvesting & fabrication | felling, mining, knapping, tool-making |
| Construction | shelter, storage, workspaces, structures |
| Mechanical systems | engines, linkages, pumps, machines |
| Electrical & radio | cells, wiring, receivers, transmitters |
| Navigation & seamanship | boats, tides, bearings, crossings |

**Technique** is what your hands can already do, and it rises by doing. **Understanding** is why it works and what transfers, and it rises by evidence, inspection, diagnosed failure and manuals read. **Adaptation** is carrying skill into an unfamiliar problem; it is currently inert and is governed by Law 203 and §3.3.

## 4.2 Axis two — Capacity

Eight trainable properties of the body, each with a stimulus, an improvement, and a limit it never crosses.

| Capacity | Trained by | Improves | Never does |
|---|---|---|---|
| Strength | progressive force work, lifting, striking, climbing, heavy control, plus recovery | safe force, short load handling, tool control | eliminate mass or joint risk |
| Endurance | sustained walking, paddling, swimming, labour at appropriate intensity, plus recovery | stamina capacity and recovery | prevent dehydration or sleep need |
| Load tolerance | progressive, well-fitted carriage across real routes | pack comfort, gait economy, tissue tolerance | make maximum overload good training |
| Mobility & balance | varied terrain, climbing, crouching, boat motion, recovery practice | stability, efficient movement, fall avoidance | ignore injury or bad footing |
| Coordination & dexterity | cutting, knotting, sewing, fitting, aiming, instrument work | precision and lower handling error | replace knowledge or correct tools |
| Breath & water confidence | staged swimming and diving, and rescue practice | calm, efficient movement, safer decisions | extend human physiology without limit |
| Acclimatisation | gradual repeated heat, cold and sea exposure with recovery | thermoregulation and work tolerance | grant immunity or persist indefinitely |
| General resilience | diverse activity, nutrition, sleep, treatment, low chronic burden | recovery quality and illness resistance | act as a refillable health bonus |

## 4.3 Axis three — Confidence

Held per technique rather than per domain. It rises with practice, rises more slowly with rehearsal without materials, and decays to rust when unused. It governs execution time and steadiness, and it is the only axis that can go backwards.

## 4.4 What the player sees

Never these tables. The four rungs, and cross-lines naming the specific change — *steadier with the axe*, *you held your breath eleven seconds longer*, *the pack rides better than it did* — grouped into v2.7 §13.5's nine families as evidence strands.

---

# 5. Acceptance gates added

**Gate SK1 — Growth is felt blind.** A player who never opens Skills can tell from the act alone that they have become better at something. No number appears anywhere.
**Gate SK2 — No inert scores.** Every tracked score has a producer reachable through a real player path, proven by the reachability harness.
**Gate SK3 — No composite exists.** A search of the codebase finds no total, average or level combining the three axes.
**Gate GR1 — The graph is a superset.** Every craftable, buildable and findable thing in the game resolves to a node ID. The check is machine-run, not read.

---

# 6. Open, and owed to the Director

1. **The version ruling** — confirm the Civilization Weave keeps v2.7 and C1's document is withdrawn.
2. **Wave order** — waves 1 to 4 are the Director's own ranking; waves 0 and 5 are C1's placement and reorder on one word.
3. **The plane crash** as a rare, announced, time-bounded salvage arrival in wave 1 — the only credible source of aluminium sheet and sealed medical supply in quantity.
4. **The coconut boiler** — H2, and the cheapest possible answer to *boil it with what?* C1 recommends pulling it forward into wave 0.

---

*Compiled 11 August 2026. This sheet is design canon and asserts nothing about implementation. For that, read `drift_design_vs_shipped_audit_v2_7.xlsx`.*
