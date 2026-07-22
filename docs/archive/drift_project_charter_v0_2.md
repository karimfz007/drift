# DRIFT — Project Charter & Design Document

**Version:** 0.2 (foundation + engineering addenda)
*(v0.2, 2026-07-22 — after the external library-first audit: engine updated to Phaser 4 in §II.5; §II.10 engineering addenda added. Rationale and full triage: decisions log D-008 … D-014.)*
**Status:** Living document. Everything numeric is `[TUNE]` and refined in playtest. Systems marked *(living)* grow one build-cycle at a time.
**Working title:** DRIFT *(codename — placeholder, free to rename)*
**Format note:** This file is the single source of truth for the new project's library. It has two halves — **Part I: The Game** (what we're building) and **Part II: How We Build It** (the sessions and protocols) — plus **Part III: The Roadmap** and appendices.

---

## Part 0 — What this document is, and how it was reached

This charter was built by design ping-pong: rounds of questions, answers, research, and refinement until every fork was closed. It supersedes nothing from prior projects — it starts a clean project. Two prior efforts inform it and are **not** continued here: *Claimstake* (a PC-scale voxel survival RPG in Godot — healthy, but the wrong fit for mobile + ready-made libraries) and *Nightfold* (a 2D mobile concept). DRIFT keeps the single most original idea developed across both — **a world that persists and changes while you're gone** — and rebuilds around it for mobile, fast.

**The founding constraints (author's, binding):**
1. Don't reinvent the wheel.
2. The best new game is the best old game with a tweak.
3. Time is money — cover as much ground per step as possible.
4. Don't come back for permissions or approvals.
5. Don't ask the human to do anything code can do, except add files to the library.
6. Don't wait to be asked — always volunteer a better solution when one is known.
7. Build for humans, not machines — design against the psychology of reward, tension, and the hunting-gathering instinct.

---

# PART I — THE GAME

## 1. Concept in one breath

You crash in the Bermuda Triangle and wash up on a strange island with nothing.

**Act 1 — you survive.** Fire first, then shelter, then water and food. Salvage the wreck, forge crude tools, hunt, fish, forage, mine. It is brutal and personal; your own body is the fragile thing.

**Act 2 — you build an operation.** A real base with tiered building and upkeep, and production that runs *while you're away* — smelting, drying, growing, trapping, researching salvage. You log off and the island keeps turning; you reopen the app to a morning report of what finished and what came for your walls.

**Act 3 — you leave.** Everything ladders toward one goal: build or repair a raft, a boat, a plane, and escape the Triangle. Leaving **ends the run** — your record is logged, and you replay onto a *different island with a different character*, growing a different way to beat your own best.

Under the survival is a character who **becomes whatever you keep doing** — dive daily and you'll hold your breath longer and move without gear; fight and you'll toughen. Under the island is a mystery you only pick at. Single-player first; other survivors come later.

## 2. The pillars — what makes it different (the tweak)

DRIFT is not a new genre. It is proven survival bones with four twists stacked on top, each borrowed from the best game that already solved it:

1. **The Rust economy** — tiered building, matched-material upkeep, decay, real stakes on what you own. *(from Rust)*
2. **The offline simulation** — the world produces and is threatened while you're gone; the "morning report" is the hook. This is mathematically just delta-time reconciliation, not a background process. *(the DNA — from nothing on mobile; nobody does this well here)*
3. **The emergent, embodied character** — you become what you do, and it shows in the body, gear-free. No classes; every run diverges. *(from Project Zomboid's learn-by-doing, pushed further)*
4. **The escape roguelike** — survival has a destination and an end; each run is a fresh island and a fresh build, scored against your own record. *(from Subnautica's three-act escape arc + roguelike replay)*

Wrapped in a setting only this project has: **a mysterious Bermuda-Triangle island, grounded castaway survival that slowly turns strange** — the fantasy of *"Lost, if it were actually about surviving the crash."*

## 3. The three-act arc and the meta-loop

The arc is the validated spine of the genre's best (Subnautica breaks into exactly these three acts). Each act is a different **reward system**, deliberately handed off in sequence:

- **Act 1 — Survive (adrenaline).** Naked, exposed, minute-to-minute. Vulnerability. The hook is fear and scarcity.
- **Act 2 — Build (optimization).** Base up, pressure shifts to running an operation — much of it idle. The hook is the satisfaction of setting up systems and watching them execute.
- **Act 3 — Escape (destination).** The long build toward the vehicle that gets you off the island. The hook is a goal worth everything you've made.

**The meta-loop (roguelike replay).** Escape ends the run. Your time and achievements are written to a **log left on the island**. Replaying crashes you onto a **different island with a different character seed**; you grow a different way and try to beat your own record. This is what makes DRIFT reopenable for months — the point is not endless survival, it's *escape, then out-do yourself*.

## 4. World, setting, and tone

- **Place:** a procedurally distinct island (jungle, beach, rock, caves, offshore water and wrecks) somewhere in the Bermuda Triangle.
- **Narrative touchstones:** *Cast Away* (grounded isolation), *Lost* (mysterious island), the Bermuda Triangle (the paranormal seam). All three are invoked, blended by a dial.
- **The tone dial — grounded-first, weird-grows-later (locked).** Grounded survival is the floor. The strange is a slow-burn seam that *widens by phase*: advanced salvage-tech (the 3D printer, better fabrication) is gated late behind rare finds; the Triangle's anomalies live in wreck logs, found notes, and discovered clues — never a monster in your face on day one. Story rides cheaply on discovery (as in *Raft*), not on cutscenes.

## 5. The loops (moment, session, offline, meta)

- **Moment-to-moment loop:** approach a resource/threat → act (chop, mine, hunt, fish, craft, build, fight) → reward (materials, food, progress, XP) → invest (build, upgrade, set production) → repeat. The player is never far from the next reward. Dopamine sits in the *anticipation* — telegraph rewards, show the loot before it's reached, keep progress visible.
- **Session loop (hybrid cadence — confirmed):** short **2–5 minute check-ins** to manage the base and collect offline yield; longer **active sessions** for expeditions, digging deep, diving, and combat. The idle layer respects a busy phone life; the active layer rewards sitting down.
- **Offline loop:** on quit, the world snapshots. On return, elapsed real time is reconciled — production advances, threats resolve, vitals drift — and the **morning report** narrates what happened. This is a loss-aversion + anticipation engine: you log off *afraid of what the night will do*, and reopen to find out.
- **Meta-loop:** escape → log the record → new island + new build → beat yourself.

## 6. Survival and vitals

Grounded in the **Rule of Threes**, which is both realistic and a clean priority ladder where each need assumes the one above it. The author's chosen priority order matches survival reality: **exposure kills faster than thirst, thirst faster than hunger.**

| Vital | Real-world basis | DRIFT starter target (`[TUNE]`) | Notes |
|---|---|---|---|
| **Warmth / Exposure** | ~3 hours without shelter in harsh cold/wet | Danger in game-**hours** without fire/shelter in cold, wet, or night | The acute killer. Fire is priority #1, shelter #2. |
| **Thirst** | ~3 days without water | ~3 game-days | Mid-term pressure. Fresh water sources, then purification. |
| **Hunger** | ~3 weeks without food (compressed) | ~7 game-days, **to be tightened in test** | Slow background pressure. Respawn makes long timers forgiving — expect this to shorten. |
| **Energy / Sleep** | — | Gates activity; sleep advances time | Sleeping is also the **respawn anchor** (bed/sleeping bag). |
| **Oxygen** (diving, Phase 3) | ~3 min baseline; free-divers exceed 20 min | ~3 min baseline, extended by **Lung Capacity** skill + gear | The diving tension clock. Embodied growth is the realistic extender (mammalian dive reflex). |
| **Sanity / Isolation** (later) | ~3 months without human contact | Reserved, Phase 5-adjacent | The *Cast Away* "Wilson" mechanic; a strong differentiator, held for later. |

**Priority ladder (Phase 1):** **Fire → Shelter → Water → Food** (food via forge/cook, hunt, fish, or collect — eggs, mussels, clams, vegetables, foraged plants).

## 7. Gathering, crafting, building

- **Core verbs (the foundation of every phase):** **salvage, forge, hunt, mine** — plus fish, forage, and collect. Fire and shelter are the survival keystones everything else is built to protect.
- **Building — Rust mechanics, expressed in 2D top-down tiles.** Tiered structures (e.g., branch/leaf → wood → stone → reinforced), placed on a grid footprint, with **matched-material upkeep** drawn from a base stockpile and **decay** when upkeep lapses or a structure is battered. Key fixtures: **fire** (warmth, cooking, light, deterrence) and a **bed/sleeping bag** (respawn anchor). Upkeep/decay in single-player serves the *maintenance-and-threat* loop (a reason to return and tend the base) and is `[TUNE]`/mercy-adjustable; it tightens when multiplayer arrives.
- **The one output formula (governs all gathering/production):**

  ```
  output = base_rate × mode(idle | active) × tool_quality × skill_level
  ```

  Idle mode is passive, slow, low-multiplier. Active mode is engaged, fast, high-multiplier with bonus/crit potential. *This is the anti-grind design (see §9):* mindless idle chopping is meant to be slow; tools, skill, and attention are what pay out.

## 8. The offline / idle simulation (the DNA)

- **Mechanically simple.** Not a background sim — **retrospective delta-time math**: on return, read the last-session timestamp, subtract from now, multiply elapsed time by rates to compute what accumulated (production finished, resources drawn, threats landed, vitals drifted). This is the reconciliation pattern, and it is cheap and portable.
- **What runs while away (grows by phase):** production (smelt, dry, cook, grow, brew, breed, trap/snare, research, cast, fish), resource draw and spoilage, weather, and **threats** (predators, raiders damaging the base). Full set is the long-term vision; Phase 1 ships **one** production loop and **one** threat.
- **The morning report.** A prose summary on return: what finished, what grew, what got raided, what decayed, what you lost. It is the retention weapon *and* the emotional payoff — built **honestly** (no artificial throttling, no fear-of-missing-out dark patterns; a game that respects the player's time is a better game).
- **Reward planning, not just waiting.** The decision of *what to set running before you log off* (smelt or cook? snares or crops? research the wreck?) is real strategy, not a timer.

## 9. The Development Tree — the character signature *(living)*

The thing no competitor does. **You become whatever you keep doing, and it shows in the body, gear-free.**

**Character creation (the seed).** At the crash, the player **selects 7 skills** from the full tree and **distributes a pool of starting points** among them. This is deliberately small to make the path easy to start; it does not lock the build.

**Growth (learn by doing).** Every action grants XP to its skill — **whether idle or active** (idle earns slowly, active earns faster). Skills level through use.

**Expansion (the tree opens).** As the player accumulates experience and branches into new activities, **new skills unlock beyond the original 7.** The build is not capped at 7 — it grows as playstyle demands.

**Embodied and classless.** Growth manifests physically (dive longer, carry more, chop faster, need less food, resist cold), not merely as menu numbers. There are **no fixed classes**; a character is the emergent sum of habits, and no two runs are alike. The wrong build gets you killed — the stakes the author wants.

**Anti-grind (resolved).** No degenerate grinding to patch: because the same action is *slow when idle* and *fast/high-yield when active with good tools and skill*, there is no incentive to spam a cheap action — effort and investment are what the curve rewards. Idle chopping for an hour is a legitimate low-effort choice, not an exploit.

**Starter skill tree** *(living — grows per-cycle; player picks 7 from this):*

| Domain | Skills |
|---|---|
| **Body** (embodied, gear-free) | Stamina, Strength, Swimming, Lung Capacity, Climbing, Cold Tolerance, Heat Tolerance, Pain Tolerance |
| **Provisioning** | Woodcutting, Mining, Foraging, Fishing, Hunting, Trapping, Skinning |
| **Fabrication** | Firecraft, Cooking, Smithing, Construction, Repair/Salvage, Chemistry (brew/medicine/poison), Electronics |
| **Mind** | Research, Medicine, Engineering/Lockpicking, Navigation |
| **Social** *(Phase 5)* | Teaching, Barter, Leadership, Deception |

*Grouping into domains follows the anti-bloat lesson from Project Zomboid/CDDA: a domain can gate and discount its skills so the player is not babysitting isolated bars. Each skill's exact curve, thresholds, and embodied payoff is designed during its own build-cycle.*

## 10. Knowledge & Experience (recipe vs. proficiency)

A crucial distinction: **knowing a recipe is not the same as being good at it.** You can own a blueprint but lack the hands, or have the hands but not the blueprint.

**Knowledge is diegetic — sources:**
- **Trial and error** — attempting things builds skill and can discover recipes; slow, wasteful, risky.
- **Books** — found in luggage, cabins, and wrecks; reading grants recipes and speeds learning (the skill-book model).
- **Salvaged screens (video)** — airplane seat-back screens, phones, laptops hold how-to videos; **they need power**, which is itself a progression gate. Fits the crash setting perfectly.
- **Teaching** *(Phase 5)* — being taught by another survivor transfers knowledge fastest.

**The four gates to make or fix anything:** **knowledge + tools + experience + time.** A locked toolbox wants lockpicking know-how, a pick, enough dexterity, and minutes. A dead generator wants repair knowledge, parts, tools, electronics skill, and time.

## 11. Loot and the world's generosity

The sea and sky keep the world stocked — this keeps resources flowing and creates contested, dramatic moments (especially once others exist):
- **Sources:** washed-up wreckage and debris, newly crashed planes/ships in the forest, and random small drops.
- **Containers:** tool boxes, food crates, a small fridge, sealed boxes — each needing time, tools, and experience to open or repair.
- **Offline events:** crashes and drops can happen while you're away and surface in the morning report — and later, others may race you to them.

## 12. Diving and the underwater layer (Phase 3)

- **Oxygen is the tension engine** — the deeper you go, the more the shrinking air supply forces you to weigh risk against retreat. A silent story of fragility and time pressure (Subnautica's core, proven and beloved).
- **Two progression axes:** **gear** (tanks, rebreathers) *and* **embodied lung capacity** grown by practice. The gear-free axis is the signature twist — free-diving adaptation, realistic to the mammalian dive reflex.
- **Diving gear** is a mid/late-game find in a **deep sunken ship** — it gates access to deeper wrecks and the salvage/mystery within.
- Underwater is a third spatial dimension alongside surface and underground (mining), each gating progression by requiring better tools/adaptation.

## 13. Escape and the meta-game (Phase 4)

- **The goal:** build or repair a vehicle — start with a **raft** that reaches a nearby island — to leave the Triangle. Introduced late; the whole tech ladder points at it.
- **The end of a run:** leaving ends the run. Achievements and time are written to a **log left on the island** (a persistent record).
- **New game plus:** replay crashes the player onto a **different island with a different character setup**; they grow a different way to **beat their own record.** Fresh island generation + fresh build + self-competition = the long-tail replay engine.

## 14. Death and permanence

- **Permanence:** whatever the player does is permanent — the world, the base, and earned adaptations persist.
- **Death model (confirmed):** on death, the player **respawns at their bed or sleeping bag** (a random spot if they have neither). **Loot and carried gear drop** for a corpse-recovery run; the base and embodied adaptations survive. An optional **hardcore/permadeath toggle** exists for players who want full stakes. This keeps the loss-aversion sting real without nuking weeks of an emergent character (which would kill mobile retention).

## 15. The others (Phase 5 — major, later)

Captured for product vision; a large build reserved for later, thorough design.
- **Arrival:** other survivors keep crashing in by plane, ship, and hot-air balloon; **more arrive as more escape** (a population equilibrium — departures pull in newcomers).
- **Prosocial:** cooperate, team up, **teach** (the fastest knowledge transfer), help build, hunt together, heal.
- **Antisocial:** kill, steal, poison, intoxicate, infect. The full-swing shared world — loot contested, bases raided while offline — brings the DNA to its complete scale.

## 16. The Codex — inventory / resource / tool catalogue *(living)*

Rather than enumerating everything up front (impossible and wasteful), the Codex is a **living catalogue that grows one build-cycle at a time.** Each entry records: what it is, how it's obtained, its four gates (resources + tools + knowledge + skill + time) to make or use, and what it does. New items/resources/tools are appended by whichever cycle introduces them.

**Phase-1 seed:** raw wood, stone, plant fiber, flint, clay, sand, vines, coconut; fresh water; raw meat, fish, eggs, mussels, clams, edible plants; crude axe, pick, spear, knife, digging stick, fishing line; fire (bow-drill → campfire); shelter tiers (leaf/branch → wood → stone) plus a bed as respawn anchor. **Phase-2 additions:** loot containers (tool box, food crate, small fridge, washed-up debris, crash boxes) and their open/repair requirements.

## 17. Reference lineage (what we're twisting, and why it works)

- **Rust** — the building/upkeep/decay economy and the offline-stakes tension (base fights while you sleep). Our version: 2D tiles, single-player-first.
- **Subnautica** — the crash → survive → explore → build-escape-vehicle three-act arc; oxygen-as-tension diving. Proven, beloved, and directly our shape.
- **Project Zomboid** — learn-by-doing skills producing emergent, classless builds; the hierarchy fix for grind-bloat; death making a build precious.
- **Terraria / The Bonfire** — proof that dig + build + survival (and day-build/night-defend) work on mobile in 2D.
- **Raft** — story delivered cheaply through discovered clues; visible growth as its own reward.
- **Fallout 2** — the character-as-identity ethos; a point-buy seed that opens into emergent growth.
- **The psychology (build-for-humans):** dopamine fires on *anticipation*, not receipt; unpredictable (variable-ratio) rewards hook hardest; **loss aversion** (~2×, and evolutionarily ancient) is the genre's real engine — which is exactly why the offline morning-report works; **scarcity** is the strongest retention lever; the arc is **vulnerability → domination**; we cherish what we build ourselves (endowment effect), which compounds the fear of losing it.

---

# PART II — HOW WE BUILD IT (Protocol & Sessions)

This protocol **inverts** the heavy ceremony of prior projects, because the human is vision-and-feedback, not hands-on-technical.

## 1. Roles

- **Human (Kimz) — director.** Owns vision, play-feedback, roadmap, and priorities. The one technical action taken: **adding files to the library.** 100% product/gaming instinct, 0% code required.
- **Claude (across sessions + Claude Code) — the entire crew.** Design translation, implementation, verification, tooling, and the art pipeline. Everything technical is Claude's.

## 2. The cycle model

Development proceeds in **small, self-contained cycles, each small enough to test thoroughly and perfect before the next.**

```
design the slice → build → Claude self-verifies → ship a playable web link
     → human plays on phone and reacts → perfect it → next cycle
```

Per-scenario design ("go through each scenario") happens **inside** the relevant cycle, so building starts immediately without waiting to enumerate all of Phase 5.

## 3. Autonomy

- Claude proceeds with **standing authority — no permission or approval gates** (constraint 4).
- The **only** stops are (a) the human's play-feedback checkpoints and (b) genuine creative/product forks that route to the director (the ping-pong moments).
- Claude **volunteers better solutions unprompted** (constraint 6) and covers maximum ground per step (constraint 3).

## 4. Verification (re-architected)

The human cannot corroborate code or git, so **verification is 100% Claude's:**
- **Automated done-checks** per cycle (the build behaves to spec).
- **A second-session audit** — a fresh Claude session reviews each build against its cycle spec, since the human cannot be the auditor.
- **Evidence is the build behaving correctly in the human's hands**, not a commit hash. If it plays right on the phone, it passed.

## 5. Tech stack

- **Engine: Phaser 4 + TypeScript, web-first** *(v0.2 — was Phaser 3)*. Initialized from the official Phaser Vite + TypeScript template, with Phaser pinned to the current stable release at project creation (4.2.1 as of this amendment) and upgraded only between cycles. Fastest iteration, best mobile-browser behavior for the tap-a-link loop, deepest ready-made 2D ecosystem — and v4's rewritten renderer (GPU tilemap and sprite layers, improved lighting/filters) directly serves a large top-down island on phones.
- **Perspective: 2D top-down**, with descended underground layers for mining and an offshore/underwater layer for diving. (Cleanest mobile touch controls; truest island fantasy; natural base-perimeter defense.)
- **The architectural rule (non-negotiable):** the game's **brain** — simulation, data model, reconciliation rules — lives in **plain TypeScript modules with zero Phaser in them.** Phaser only *draws.* This keeps the valuable logic portable so a future native/Godot port re-skins the body and reuses the brain untouched.
- **Native** (App Store / Play Store) is a **launch-phase concern, deferred** — reached later via a wrapper (Capacitor) or a port.

## 6. The playtest pipeline

- Each cycle ships an **HTML5 build to a static host**; the director **opens a link in the phone browser** and plays. No signing, no store, no install — instant iteration.
- Native testing (TestFlight/Play Console) is deferred to launch, when it's worth the pipeline cost.

## 7. The art pipeline

- **Placeholder-first** — the build never blocks on visuals; simple readable placeholders keep momentum.
- **Target style: realistic** (a good user experience in a simpler format is acceptable in the interim).
- Once a style is locked, a **consistent asset set** (tiles, items, creatures) is generated via the **external AI image engine**, and Claude integrates it.

## 8. Continuity & documentation (lightweight)

Enough to survive across sessions; far less than prior ceremony:
- **Per-cycle as-built note** + a roadmap update.
- **A decisions log** (choices and their rationale).
- **A parked-concepts list** (see appendix).
- **The Codex** (living inventory catalogue, §16).
- **The library is the source of truth** — Claude reads it; the director feeds it.

## 9. Token economy

- **Design/authority work and hard build steps → top tier** (Opus-class); a wrong architectural call costs more than the token delta.
- **Routine drafting, mechanical, well-specified build steps → mid tier** (Sonnet-class).
- **Bulk/mechanical → cheapest tier** (Haiku-class).
- **The real lever is scope, not model:** a library-assembled 2D mobile game is an order of magnitude cheaper to build than a bespoke engine, whatever model runs. Precise handoffs (the cycle model) kill the back-and-forth that actually burns tokens.

## 10. Engineering addenda *(v0.2)*

Three rules adopted from the external library-first audit (2026-07-22), binding alongside the constraints in Part 0:

- **Library-first: own the identity, rent the plumbing.** Before custom-building any infrastructure (input, storage, testing, tooling, editors, assets), the crew searches for a maintained, permissively licensed package — and rejects any package that introduces more concepts than the code it removes. Custom code is reserved for what makes DRIFT itself: the survival economy, the offline reconciliation and morning report, the Development Tree, the four gates, the escape meta-loop. Every direct dependency is pinned (lockfile committed), its license recorded, and its purpose and exit path listed in the repo's dependency ledger; upgrades happen only between cycles.
- **Authored-first island.** The first island is handcrafted. Procedural generation begins only after the authored island's pacing and spatial rules are proven in playtest — variety before proven pacing would only multiply mediocre layouts.
- **Offline fairness.** Offline consequences may sting, but they may never erase a run or invalidate major progress without a conscious risk decision by the player. In the normal solo game: no offline death, vitals stop at a recoverable floor, losses are capped by defenses and phase, the report explains causes rather than just results, and long absences get a recovery path. Full binding rules: decisions log D-011. (Hardcore mode and later multiplayer may tighten these; the honest-systems rule of §I.8 still governs everything.)

---

# PART III — THE ROADMAP (Phases & Cycles)

Each phase is several small cycles. Order is confirmed; anything can be pulled earlier if a cycle proves it cheap. Single-player through Phase 4; multiplayer is Phase 5.

## Phase 1 — The Naked Hour (MVP, solo)
**Goal:** the whole arc in miniature — one playable web build that already *feels* like DRIFT.
**Adds:** crash cold-open; vitals (warmth, thirst, hunger, energy); the core verbs (salvage, hunt, mine + forage/fish/collect); fire and forge; a Rust-tier **basic shelter with upkeep/decay** and a bed; the Development Tree seed (pick 7 + distribute points) with learn-by-doing on the starting verbs; **one** offline production loop; **one** offline threat (a predator/raider that can damage the base); the **morning report**; save + delta-time reconciliation.
**Exit criteria:** a player can crash in, survive the first exposure crisis, gather and build a first shelter, set one thing running, log off, and reopen to a meaningful morning report — on their phone, via a link.

## Phase 2 — The Operation
**Goal:** turn survival into a base you run.
**Adds:** more production (smelt, cook, trap, grow); the Development Tree opens (new skills unlock through use); deeper mine layers; the **loot system** (containers, washed-up debris, crashed planes, random drops) with the four-gate open/repair rules; the **knowledge system** (books + salvaged powered screens); richer offline events.

## Phase 3 — The Deep
**Goal:** the third dimension.
**Adds:** diving and underwater salvage (oxygen tension + gear-free lung-capacity growth); sunken wrecks and caves; **diving gear** found in a deep sunken ship; advanced salvage-tech (rare fabrication upgrades, the 3D printer as a rare appearance); the mystery seams widen (wreck logs, anomalies, clues).

## Phase 4 — The Way Off
**Goal:** a destination and an ending.
**Adds:** the escape-vehicle tech ladder (raft → boat → plane); endgame gating; the **win** (leave the island → run ends → record logged); the **roguelike meta-loop** (replay a fresh island with a fresh build to beat your record).

## Phase 5 — The Others
**Goal:** the full-swing shared world (major build, thorough design first).
**Adds:** multiplayer + NPC survivors; arrivals by plane/ship/balloon with the escape/arrival equilibrium; prosocial systems (teach, heal, build/hunt together, trade); antisocial systems (kill, steal, poison, intoxicate, infect); offline raiding at scale.

---

# PART IV — Open `[TUNE]` values and decisions to revisit

Nothing here is settled; all of it is refined in playtest, cycle by cycle:
- **Vitals timings** — the warmth/thirst/hunger/energy clocks (hunger's ~7 game-days is expected to shorten, given respawn).
- **The output formula constants** — base rates and the idle/active/tool/skill multipliers.
- **Building** — tier costs, upkeep fraction, decay rates, and how gentle decay is in single-player.
- **The Development Tree** — the starting-point pool size, per-skill XP curves and thresholds, and which experiences unlock which new skills.
- **Diving** — the oxygen baseline and how fast Lung Capacity extends it.
- **The Codex** — every recipe's exact requirements.
- **Death** — corpse-recovery rules and the hardcore-toggle specifics.
- **Business model** — free / premium / free-to-play / ad-supported is a **later-phase decision**; until launch the game is web-first and playable on the director's own devices, with no cash outlay beyond eventual store fees. Whatever the eventual model, the offline loop stays honest (no dark patterns).

---

# APPENDIX A — Parked concepts

- **Play-as-an-animal-in-a-world** — a separate concept where the player character is an animal. Filed untouched, for later consideration.

# APPENDIX B — Naming

- **DRIFT** is a working codename (placeholder). Rename freely; the file and project can be retitled without touching any of the above.

---

*End of charter v0.1. This is a living document — expect Part I systems and the Codex to deepen per build-cycle, and Part IV values to settle through playtest.*
