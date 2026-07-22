# DRIFT — Library-First Technical & Product Audit

**Report version:** 1.0  
**Research date:** 22 July 2026  
**Audited source:** *DRIFT — Project Charter & Design Document v0.1*  
**Prepared for:** Studio Director  
**Purpose:** Decide what DRIFT should adopt, integrate, evaluate, defer, or build itself before Codex begins production.

---

## 1. Executive decision

### Verdict: **GO — with a mandatory stack correction and a smaller first build**

DRIFT has a strong product spine: grounded castaway survival, an offline world that produces and suffers consequences while the player is away, embodied learn-by-doing growth, and a run that ends in escape. The concept is worth developing.

The charter’s founding instruction — **do not reinvent the wheel** — should become an engineering constitution, not merely a design preference. DRIFT should not begin from an empty Phaser repository and should not custom-build its editor, browser storage layer, responsive menu system, mobile input primitives, PWA shell, pathfinding, testing harness, or placeholder asset library.

The largest immediate correction is the engine version:

- The charter specifies **Phaser 3**.
- Phaser 4 is now stable, and Phaser 4.2.1 was released on 9 July 2026.
- Phaser’s own guidance says a new project should start on Phaser 4 rather than Phaser 3.
- Phaser 4 adds material advantages for a large 2D world, especially `TilemapGPULayer`, improved lighting and filters, smaller atlas descriptors, and a newer renderer.

**Decision:** amend the charter from **Phaser 3 + TypeScript** to **Phaser 4.2.1 + TypeScript**, initially pinned to the audited version and upgraded only at deliberate milestone gates.

### Recommended starting foundation

DRIFT should begin from the **official Phaser React TypeScript template**, selected through Phaser’s project-creation tooling, rather than from a hand-assembled build. The official template already provides:

- Phaser 4 integration;
- Vite build and hot reload;
- TypeScript;
- a React–Phaser bridge and event bus;
- production build scripts;
- a clean split between DOM interface and game canvas.

React is not being selected as the game engine or simulation store. Its role is limited to the mobile interface: menus, inventory, crafting, skill selection, reports, settings, accessibility, and overlays. Phaser renders and animates the island. Plain TypeScript owns the simulation.

### The initial package stack

**Adopt at project creation:**

1. Phaser 4.2.1
2. Official Phaser React TypeScript/Vite template
3. React 19 for DOM interface only
4. Tiled 1.12.2 for the authored first island and level metadata
5. Phaser Arcade Physics for continuous movement and simple collisions
6. Selective Rex plugins for virtual joystick and gestures
7. Dexie for IndexedDB persistence and migrations
8. Zod 4 for runtime validation of saves and content data
9. Vitest for unit and integration tests
10. fast-check for property-based simulation tests
11. Playwright for mobile-browser and touch-flow testing
12. vite-plugin-pwa for installability, asset caching, and controlled updates
13. Kenney assets for placeholders
14. Game-icons.net for temporary interface symbols, with attribution

**Evaluate in a bounded technical spike:**

- Grid Engine for NPC movement, pathfinding, occupancy, and possibly grid-snapped player movement.
- XState v5 for top-level application and player-action state orchestration.
- Phaser Editor as an optional productivity tool, never a required project dependency.

**Defer until the game proves the need:**

- Capacitor/native projects
- procedural island packages
- ROT.js
- multiplayer frameworks
- server persistence
- advanced physics
- an ECS framework

### What remains genuinely custom

Libraries can give us infrastructure, but they cannot give us DRIFT. We still build:

- the survival model;
- the offline reconciliation rules;
- morning-report event semantics and writing system;
- gathering, crafting, building and upkeep rules;
- the embodied Development Tree;
- knowledge versus proficiency gates;
- escape progression and run records;
- content balance and game feel.

The correct goal is therefore not “write no code.” It is:

> **Write only the code that creates DRIFT’s identity. Borrow the rest.**

---

## 2. Audit basis and distinction of evidence

This report uses three classes of evidence:

### 2.1 Charter-derived findings

These come directly from DRIFT Charter v0.1:

- mobile-first, web-first testing;
- 2D top-down perspective;
- plain-TypeScript simulation separated from Phaser;
- survive → operate → escape arc;
- offline delta-time reconciliation and morning report;
- learn-by-doing character development;
- small build cycles and independent audit;
- placeholder-first visual production;
- a Phase 1 intended to contain the full concept in miniature.

### 2.2 Current external research

These findings were verified against official project documentation and repositories as of 22 July 2026. They cover current engine status, maintained packages, capabilities, licenses, and compatibility claims.

### 2.3 Studio recommendations and inference

These are architectural or product judgments based on the charter and the external research. They are explicitly recommendations, not claims made by the package maintainers.

---

## 3. Product audit of the charter

### 3.1 What is strong and should remain constitutional

#### A. Survive → operate → escape

The three-act handoff remains DRIFT’s strongest structural decision. It avoids the common survival-game failure in which the player accumulates resources but never reaches a meaningful conclusion.

- **Survive:** immediate vulnerability, exposure, fire and shelter.
- **Operate:** automation, production planning, maintenance and optimization.
- **Escape:** a destination that converts the whole tech tree into preparation for an ending.

#### B. The morning report

The morning report is the most credible signature feature. Offline production alone is not distinctive. A readable account of what the player’s preparation caused — gains, losses, discoveries, damage, weather and completed work — can make reopening the game emotionally meaningful.

#### C. Grounded first, strange later

The Bermuda Triangle mystery should widen after the survival rules become credible. Mystery becomes stronger when the player first learns the island’s normal patterns.

#### D. Plain-TypeScript simulation

The charter’s non-negotiable separation between game logic and Phaser is correct. It improves:

- testability;
- save migration;
- deterministic reconciliation;
- portability;
- future server simulation;
- future renderer or native changes;
- Codex’s ability to reason about isolated rules.

This principle should be strengthened, not relaxed.

#### E. Web-link playtesting

Shipping a static browser build for immediate phone testing is appropriate for the current studio. It reduces deployment friction and keeps feedback centered on game feel.

### 3.2 What is weak, overstated, or not build-ready

#### A. Phase 1 is still a phase, not one implementation ticket

The current Phase 1 includes most of a survival game: multiple vitals, several gathering activities, fire, forging, building, decay, respawn, seven chosen skills, learn-by-doing growth, offline production, offline threats, reports, saves and mobile controls.

That is acceptable as a phase goal but unsafe as a single build. It must be divided into independently playable cycles.

#### B. The active interaction model is underspecified

The charter defines many verbs but not the tactile rules that determine enjoyment:

- continuous direct movement versus tile movement;
- virtual joystick versus tap-to-move;
- contextual targeting;
- hold, tap, rhythm, timing, or queue-based gathering;
- tool switching;
- combat aiming;
- camera behavior;
- interruption and cancellation;
- feedback latency.

This is why movement technology cannot be chosen purely from a feature checklist.

#### C. Offline risk needs a fairness constitution

Production, threats, vitals, resource draw, spoilage and decay are all proposed for offline resolution. Without caps and mercy rules, this can punish absence rather than reward preparation.

Recommended constitutional rule:

> Offline simulation may create meaningful consequences, but it may not erase a run or invalidate major progress without a conscious risk decision by the player.

Initial implementation should therefore prohibit offline death, cap unattended damage, protect critical storage, and show a risk forecast before exit.

#### D. Seven skills at the crash is too much onboarding

The player cannot understand a large skill catalogue before performing the relevant actions. The full system can remain, but the opening should reveal or recommend a smaller seed after the player demonstrates preferences.

#### E. The anti-grind claim is not proven

A formula that rewards active play more than idle play does not by itself prevent optimal repetition. Progression should reward meaningful outcomes, challenge, varied contexts and qualitative milestones, not merely action count.

#### F. Procedural generation should not precede an excellent island

The first island should be authored or strongly controlled in Tiled. Once its pacing works, its successful patterns can become procedural rules. Procedural variety before proven pacing would multiply mediocre layouts.

---

## 4. Library-first engineering constitution

The following rules should be added to the project charter.

### Rule 1 — Integrate before inventing

Before custom-building infrastructure, the crew must search for a maintained, compatible, permissively licensed package or tool.

### Rule 2 — Own identity, rent plumbing

DRIFT owns its rules, economy, content and emotional experience. It should rent or adopt build tooling, rendering, editing, storage, validation, input primitives, testing and deployment infrastructure.

### Rule 3 — Every dependency has a boundary

External packages must sit behind small adapters. Simulation code may not import Phaser, React, Dexie, browser globals or platform APIs.

### Rule 4 — No dependency without an exit path

Every adopted package must have:

- a license record;
- a specific purpose;
- an adapter boundary where practical;
- a removal or replacement path;
- a pinned version and lockfile;
- tests covering the behavior DRIFT relies on.

### Rule 5 — No package collection for its own sake

Libraries reduce work only when they replace real infrastructure. A package that introduces more concepts than code removed is rejected.

### Rule 6 — Package upgrades happen at gates

Do not continuously chase versions during a cycle. Upgrade after a build passes, in a dedicated maintenance branch, with regression tests and a playable comparison.

---

## 5. Recommended stack and package audit

## 5.1 Foundation: Phaser 4.2.1

**Status:** ADOPT  
**Role:** renderer, scenes, cameras, input routing, audio, animation and basic physics  
**License:** MIT  
**Why:** mature browser game framework, current stable v4 release, official templates, large example ecosystem, and improved large-map/mobile rendering.

### Audit conclusion

The charter’s Phaser selection remains sound, but its version is obsolete for a new project. Phaser 4’s GPU tilemap layer is especially relevant to a top-down island that may grow large. Standard camera, input, tilemap, physics, scene, audio and tween APIs remain largely familiar from Phaser 3.

### Boundary

Phaser may:

- create game objects;
- render world state;
- collect raw input;
- play animation and audio;
- perform presentation collision queries where appropriate.

Phaser may not own:

- inventory truth;
- vital truth;
- production jobs;
- skill progression;
- save schema;
- offline elapsed-time decisions;
- economy calculations.

### Risk

Phaser 4 is relatively young compared with Phaser 3. Mitigation:

- pin 4.2.1 initially;
- use standard APIs rather than custom render pipelines;
- test target phones immediately;
- isolate renderer integration;
- avoid experimental features unless benchmarked.

---

## 5.2 Official Phaser React TypeScript template

**Status:** ADOPT  
**Role:** project skeleton, Vite build, React–Phaser bridge and hot reload  
**License:** MIT

### Why this template

DRIFT needs two different interface surfaces:

- a high-frequency animated world, best rendered in Phaser;
- information-dense mobile panels such as inventory, crafting, reports, character setup and settings, better handled as accessible DOM UI.

The official template already demonstrates this communication boundary through a bridge and event bus. That is exactly the wheel we should not rebuild.

### React scope restriction

React is approved only for:

- menus;
- reports;
- HUD labels and panels;
- inventories and grids;
- settings;
- accessibility-sensitive controls;
- debug and tuning panels.

React must not become the simulation authority. It reads projections and sends commands.

### Template telemetry note

The official template contains a small optional anonymous usage log script. Use its `-nolog` scripts or remove the logging call during bootstrap so the project’s build behavior is explicit.

---

## 5.3 Vite

**Status:** ADOPT through official template  
**Role:** development server, bundling, asset import and production output

No custom bundler configuration should be written until a measured need appears.

---

## 5.4 Tiled 1.12.2

**Status:** ADOPT  
**Role:** authored map and world metadata editor  
**Tool license:** GPL; exported map data remains project content and does not force the game to use the editor’s license  
**Output:** Tiled JSON/TMX consumed by the game

### Why

Tiled supports:

- orthogonal tile layers;
- free object placement;
- object layers and polygons;
- custom properties;
- collision shapes;
- tile animation;
- terrain transitions;
- scripting and plugins;
- shared tilesets.

For DRIFT it should author:

- terrain layers;
- walkability and collision metadata;
- resource spawn markers;
- interaction zones;
- beach, jungle, cliff and water regions;
- crash site;
- tutorial landmarks;
- audio regions;
- potential building/no-building zones;
- narrative discovery points.

### Decision

The first island is authored in Tiled. Procedural island generation is deferred until the team can identify which spatial relationships made the authored island enjoyable.

### Data rule

Never hard-code game rules into tile indices. Use semantic properties such as `biome=beach`, `blocksMovement=true`, or `resourceTable=coastal_forage`.

---

## 5.5 Phaser Arcade Physics

**Status:** ADOPT for the first movement prototype  
**Role:** continuous top-down movement, simple overlap and collision

### Why

The intended feel is direct-control mobile survival. Arcade Physics is already in Phaser and avoids adding a second physics stack. It is sufficient for:

- player motion;
- collision with obstacles;
- trigger volumes;
- basic projectile or melee overlap;
- simple knockback.

### Do not adopt Matter initially

DRIFT does not currently require rigid-body stacking, joints or complex physical simulation. Matter would increase implementation and tuning cost without improving the core loop.

---

## 5.6 Rex plugins

**Status:** SELECTIVE ADOPTION  
**Initial candidates:** virtual joystick and gesture plugins  
**License:** MIT

### Why

Rex’s Phaser plugin catalogue is extensive and now documents Phaser 4 usage. A ready-made joystick and gesture layer prevents us from rebuilding touch primitives.

### Restriction

Do not import the entire plugin collection. Import only audited modules. Wrap them in a DRIFT `InputAdapter` so they can be replaced without touching gameplay code.

### Initial use

- left-side virtual movement joystick;
- tap/hold interaction detection;
- drag/pinch only where camera testing proves it useful;
- haptic call sites abstracted for later Capacitor support.

---

## 5.7 Grid Engine

**Status:** EVALUATE, NOT YET ADOPT FOR PLAYER CONTROL  
**Role under evaluation:** tile occupancy, NPC pathfinding, multi-tile structures and optional grid movement  
**License:** Apache 2.0  
**Current compatibility:** compatible with Phaser 4; can also run standalone

### Strengths

Grid Engine already provides:

- tile collision groups;
- configurable pathfinding;
- diagonal movement;
- multi-tile objects;
- orthogonal and isometric support;
- a standalone mode that fits the plain-TypeScript architecture.

### Why it is not automatically selected

Grid Engine can save substantial work, but player movement is a feel decision. A visibly grid-stepped character may conflict with the desired grounded, direct-control survival feel. Conversely, smooth grid movement may simplify interactions and building.

### Required comparison

Cycle 0 must compare:

- **Prototype A:** continuous analog movement using Arcade Physics;
- **Prototype B:** Grid Engine movement with tuned interpolation and input buffering.

Both use the same tiny map and action timing. The director chooses based on feel, not feature count.

Even if Prototype A wins, Grid Engine may later be adopted for NPC navigation and structure occupancy behind an adapter.

---

## 5.8 Dexie

**Status:** ADOPT  
**Role:** browser save database over IndexedDB  
**License:** Apache 2.0

### Why not raw localStorage

The projected world includes entities, jobs, reports, run records, settings, content versions and potentially multiple save slots. `localStorage` is synchronous, small and awkward for schema migration.

### Why Dexie

Dexie supplies:

- IndexedDB access;
- typed tables;
- transactions;
- versioned schemas;
- explicit upgrade functions;
- indexes and query helpers.

### Proposed tables

- `saveMeta`
- `worldSnapshots`
- `playerSnapshots`
- `entities`
- `productionJobs`
- `eventLedger`
- `morningReports`
- `runRecords`
- `settings`

These are a starting model, not a requirement to fragment every object immediately. The key is that migrations and recovery are designed from Cycle 0.

### Repository boundary

The simulation kernel sees `SaveRepository` interfaces, not Dexie. Dexie exists only in the browser infrastructure layer.

---

## 5.9 Zod 4

**Status:** ADOPT  
**Role:** runtime schema validation and safe parsing  
**License:** MIT

### Why

TypeScript types disappear at runtime. Saves, map properties, tuning data and imported JSON can still be corrupt or stale. Zod validates them before they enter the simulation.

### Required schemas

- save envelope;
- player state;
- world state;
- production jobs;
- content definitions;
- Tiled property mappings;
- morning-report event records;
- settings;
- migration input/output.

### Rule

A save is never trusted merely because it came from our own previous version.

---

## 5.10 XState v5

**Status:** LIMITED EVALUATION  
**Role:** explicit state machines for flows with many transitions  
**License:** MIT

### Good uses

- boot → load → migrate → reconcile → report → play;
- player action states: idle, moving, interacting, crafting, injured, sleeping;
- modal and pause coordination;
- crash-introduction flow;
- escape sequence.

### Bad use

Do not place the entire simulation, inventory or world database inside XState. It is an orchestration tool, not the universal data model.

### Adoption gate

Use it only if the Cycle 0 flow diagram shows enough transition complexity to justify it. Otherwise begin with typed commands and explicit reducers, then add XState when complexity appears.

---

## 5.11 vite-plugin-pwa

**Status:** ADOPT  
**Role:** PWA manifest, service worker, offline asset caching and update prompts  
**License:** MIT

### Why

The charter’s phone-browser loop benefits from:

- install-to-home-screen behavior;
- cached game assets;
- faster reopening;
- resilience to poor connectivity;
- explicit new-build prompts.

### Critical update rule

Do not silently replace assets or JavaScript during an active save session. Use a controlled “new build available” prompt and reload only from a safe state.

---

## 5.12 Vitest

**Status:** ADOPT FROM FIRST COMMIT  
**Role:** unit and integration testing  
**License:** MIT

Vitest reuses the Vite configuration, supports TypeScript and ESM directly, and provides fast watch-mode feedback.

### Mandatory test areas

- vitals and exposure;
- inventory transactions;
- crafting gates;
- production jobs;
- skill XP;
- building wear/upkeep;
- save migrations;
- report event generation;
- clock and time caps;
- deterministic randomness.

---

## 5.13 fast-check

**Status:** ADOPT FOR THE SIMULATION KERNEL  
**Role:** property-based tests  
**License:** MIT

### Why it matters specifically to DRIFT

Offline reconciliation will be fed combinations of elapsed time, inventories, partial jobs, weather, durability, defenses and random events that are impossible to cover with a few hand-written examples.

Property-based tests generate many inputs and shrink failures to minimal counterexamples.

### Required invariants

- quantities never become `NaN` or infinite;
- inventories never become negative;
- elapsed time below zero is treated safely;
- reconciliation respects the offline cap;
- identical state + time + seed produces identical results;
- a production job cannot consume more input than exists;
- applying a zero-time reconciliation changes nothing;
- offline rules cannot kill the player during the protected early-game policy;
- event order is stable and explainable;
- migrations preserve required identity fields.

---

## 5.14 Playwright

**Status:** ADOPT  
**Role:** browser-level mobile and touch-flow testing  
**License:** Apache 2.0

Playwright can emulate mobile device viewports, touch capability, user agents and related browser behavior.

### Initial device matrix

At minimum:

- a recent iPhone profile / Mobile Safari emulation;
- a common Android phone viewport / Chromium;
- small 320px-wide layout stress;
- tablet landscape as a secondary compatibility check.

### Automated flows

- boot and load;
- rotate or resize handling;
- virtual joystick appears and responds;
- tap/hold action works;
- inventory opens without covering required controls;
- save, close/reload and report display;
- update prompt does not corrupt the active session;
- no input remains stuck after losing browser focus.

Real-device director testing remains mandatory because emulation cannot prove tactile comfort or actual mobile-browser performance.

---

## 5.15 Kenney assets

**Status:** ADOPT FOR PLACEHOLDERS  
**Role:** temporary tiles, UI, objects and audio  
**License:** verify per pack; Kenney commonly publishes game assets under CC0

Kenney provides thousands of free assets and open-source starter kits. They are ideal for building readable prototypes without waiting for final art.

### Restriction

Do not let placeholder style dictate the final art direction. Maintain an asset manifest so every temporary asset can be located and replaced.

---

## 5.16 Game-icons.net

**Status:** ADOPT SELECTIVELY FOR PROTOTYPE UI  
**Role:** inventory, skill, status and action icons  
**License:** CC BY 3.0; attribution required

The library contains more than four thousand SVG/PNG icons. SVG supports scale and recoloring, which is useful for rapid UI iteration.

### Restriction

Maintain an attribution ledger from the first imported icon. Replace icons that conflict with the final realistic style.

---

## 5.17 Seeded randomness and noise

**Status:** DEFER UNTIL PROCEDURAL-WORLD CYCLE

### Candidate packages

- `seedrandom` for repeatable local PRNG state;
- `simplex-noise` or another audited noise implementation for terrain fields;
- Phaser 4 GPU Noise for visual textures, not authoritative world generation;
- ROT.js only for specific proven needs such as field of view or turn scheduling.

### Why deferred

The first island should be authored. Adding procedural generation now would create more test combinations before the survival pacing is proven.

### Determinism rule

When adopted, authoritative randomness must be injected into the simulation, seeded, serializable and local. Never replace global `Math.random` in production.

---

## 5.18 Capacitor

**Status:** DEFER, PRESERVE COMPATIBILITY  
**Role later:** package the web game for iOS and Android and access native APIs  
**License:** MIT

Capacitor is designed to drop into an existing modern web application and run it on iOS, Android and the web from one codebase.

### Why not now

Native projects introduce signing, platform configuration, store tooling and device-specific maintenance before the core game is proven.

### What to do now

- avoid browser APIs that Capacitor cannot reasonably support;
- isolate platform services such as haptics, storage export, share, status bar and notifications;
- keep viewport and safe-area behavior correct;
- add Capacitor only when store or native-device capabilities become a milestone.

---

## 5.19 Packages explicitly not recommended now

### A. Phaser 3

Rejected for a new project. It remains maintained enough for existing games but is not the correct foundation in July 2026.

### B. Matter Physics

Rejected until a concrete mechanic requires rigid-body simulation.

### C. An all-in-one survival/RPG kit

No audited Phaser 4 kit was found that safely matches DRIFT’s combination of direct mobile control, offline reconciliation, tiered building, embodied skills and escape structure. Forcing a generic kit into the design would likely cost more than borrowing focused infrastructure packages.

### D. A general ECS framework

Rejected for the initial build. A typed world model and systems in plain TypeScript are sufficient. Add an ECS only after profiling or entity complexity demonstrates the need.

### E. A custom level editor

Rejected. Use Tiled and semantic properties.

### F. A custom UI widget library

Rejected. Use React/DOM for complex interface surfaces and Phaser/Rex for world-space controls.

### G. A custom IndexedDB wrapper

Rejected. Use Dexie.

### H. A multiplayer framework

Deferred. Phase 5 is too distant, and premature networking choices would distort the solo game. The current architecture should preserve stable IDs, ownership and serializable commands, then evaluate multiplayer technology when the product reaches that phase.

---

## 6. Build-versus-borrow matrix

| Subsystem | Decision | Starting point | DRIFT-specific work |
|---|---|---|---|
| Rendering | Borrow | Phaser 4 | presentation adapters, art direction |
| Build tooling | Borrow | official template + Vite | project rules and CI |
| Menus/HUD/reports | Borrow foundation | React | DRIFT UX and visual language |
| World authoring | Borrow | Tiled | island layout and semantic metadata |
| Player collision | Borrow | Arcade Physics | movement tuning and interaction feel |
| Touch controls | Borrow | selective Rex plugins | input mapping and contextual action rules |
| NPC pathfinding | Evaluate/borrow | Grid Engine | AI decisions and behavior |
| Persistence | Borrow | Dexie | save model and repository adapter |
| Runtime validation | Borrow | Zod | DRIFT schemas and migration policy |
| App orchestration | Evaluate/borrow | XState | DRIFT states and transitions |
| PWA/install/cache | Borrow | vite-plugin-pwa | update policy and asset strategy |
| Unit tests | Borrow | Vitest | test specifications |
| Simulation fuzzing | Borrow | fast-check | invariants and generators |
| Browser E2E | Borrow | Playwright | mobile flows and acceptance criteria |
| Placeholder assets | Borrow | Kenney/Game-icons | manifest, selection and replacement |
| Survival economy | Build | none | proprietary rules and tuning |
| Offline simulation | Build | pure TS patterns | proprietary reconciliation and fairness |
| Morning report | Build | event ledger pattern | proprietary emotional/narrative layer |
| Development Tree | Build | data-driven model | proprietary embodied progression |
| Building/upkeep | Build on grid/map primitives | Phaser/Tiled | proprietary construction economy |
| Escape meta-loop | Build | save/run records | proprietary progression and scoring |

---

## 7. Proposed architecture

## 7.1 Layer diagram

```text
┌───────────────────────────────────────────────────────────────┐
│ React UI                                                       │
│ HUD · Inventory · Crafting · Skills · Morning Report · Settings│
└───────────────────────┬───────────────────────────────────────┘
                        │ typed commands / view models
┌───────────────────────▼───────────────────────────────────────┐
│ Application Layer                                             │
│ command router · flow state · use cases · session coordinator  │
└──────────────┬───────────────────────────────┬────────────────┘
               │                               │
┌──────────────▼──────────────┐  ┌────────────▼─────────────────┐
│ Pure TypeScript Simulation   │  │ Phaser Presentation Adapter   │
│ world · player · jobs        │  │ scenes · sprites · camera     │
│ vitals · skills · economy    │  │ audio · animations · input   │
│ reconciliation · events      │  └────────────┬─────────────────┘
└──────────────┬──────────────┘               │
               │                              │
┌──────────────▼──────────────┐  ┌────────────▼─────────────────┐
│ Repository Interfaces        │  │ Tiled / Asset Content         │
└──────────────┬──────────────┘  └──────────────────────────────┘
               │
┌──────────────▼──────────────┐
│ Dexie + Zod Infrastructure   │
│ versions · migrations · DB   │
└──────────────────────────────┘
```

## 7.2 Dependency rule

Dependencies point inward:

- React depends on application contracts.
- Phaser depends on presentation contracts and simulation projections.
- Dexie implements repository contracts.
- The simulation depends only on plain TypeScript types, injected clock and injected RNG.

The simulation may run in Vitest without browser, React, Phaser or IndexedDB.

## 7.3 Suggested project structure

```text
src/
  app/
    commands/
    flows/
    session/
    view-models/
  core/
    world/
    player/
    vitals/
    inventory/
    crafting/
    production/
    building/
    skills/
    offline/
    reports/
    shared/
  content/
    schemas/
    definitions/
    tiled/
  infrastructure/
    persistence/dexie/
    platform/
    pwa/
    telemetry/
  presentation/
    phaser/
      scenes/
      adapters/
      input/
      audio/
    react/
      hud/
      inventory/
      reports/
      settings/
  tests/
    unit/
    properties/
    integration/
    e2e/
```

## 7.4 Simulation API shape

The critical offline function should resemble:

```ts
reconcileOffline({
  snapshot,
  elapsedMs,
  rules,
  clock,
  rng
}): ReconciliationResult
```

It returns:

- next snapshot;
- ordered domain events;
- morning-report facts;
- warnings or capped-time information;
- diagnostic totals for testing.

It does not write to IndexedDB and does not render anything.

---

## 8. Revised development roadmap

## Cycle 0A — Official foundation bootstrap

### Goal

Prove the selected stack builds, runs and deploys on phones before gameplay code expands.

### Integrate

- official Phaser React TypeScript template;
- Phaser 4.2.1 pinned;
- strict TypeScript;
- Vitest;
- Playwright;
- Zod;
- Dexie;
- vite-plugin-pwa;
- Tiled sample import;
- placeholder asset manifest;
- CI build and test commands.

### Acceptance

- production build succeeds;
- static host build opens on target phones;
- a Tiled map renders;
- React overlay communicates with Phaser through typed messages;
- a validated snapshot saves and reloads;
- PWA update behavior is explicit;
- tests run in one command;
- no simulation module imports Phaser, React or Dexie.

## Cycle 0B — Control shootout: the hands

### Goal

Choose the movement identity by feel.

### Build two prototypes

**A. Continuous:** Arcade Physics + Rex virtual joystick.  
**B. Grid-assisted:** Grid Engine + the same joystick and animation timing.

### Shared slice

- one small beach clearing;
- one survivor;
- three resource nodes;
- walk, target, hold action, collect;
- camera follow;
- identical sound and feedback.

### Measure

- response latency;
- accidental targeting;
- stop precision;
- one-handed comfort;
- collision reliability;
- frame stability;
- perceived sluggishness.

### Exit

Director chooses the better-feeling version. The losing prototype is archived, not blended by committee.

## Cycle 0C — Offline proof

### Goal

Prove DRIFT’s technical DNA before broad survival systems.

### Build

- one production job;
- save timestamp;
- close/reload reconciliation;
- deterministic event ledger;
- one simple morning report;
- offline cap;
- clock manipulation in tests;
- property-based invariants.

### Exit

The same saved state, elapsed time and seed always produce the same result; corrupted or old saves fail safely or migrate.

## Cycle 1 — The first night

### Add

- crash introduction;
- warmth/exposure only;
- wood and fiber;
- fire;
- basic shelter;
- day/night;
- clear first objective;
- save/resume.

### Do not add yet

- full skill tree;
- hunting;
- mining depth;
- decay economy;
- multiple offline threats;
- procedural islands.

## Cycle 2 — Leave something running

### Add

- one production loop, preferably a water collector, fish trap or drying rack;
- visible before-exit forecast;
- richer morning report;
- production input/output UX.

## Cycle 3 — Protect what you built

### Add

- one understandable threat;
- one defensive preparation;
- visible structure wear;
- repair;
- capped offline damage;
- cause-and-effect report.

## Cycle 4 — Become what you do

### Add

A small skill subset proving embodied progression before exposing the full tree:

- stamina;
- firecraft;
- foraging;
- construction;
- one movement/body adaptation.

## Cycle 5 — Naked Hour integration

Combine the proven systems into a coherent Phase 1 build, then decide which remaining Phase 1 features earn entry.

---

## 9. Offline fairness specification

The morning report will fail if it becomes a punishment report. The following should be binding for early builds.

1. The player cannot die offline.
2. Critical vitals stop at a recoverable floor.
3. The base cannot be fully erased offline.
4. A threat’s maximum loss is capped by the defenses and current phase.
5. Critical quest or escape items cannot be destroyed by generic offline rolls.
6. The player sees likely risks before leaving.
7. Elapsed time is capped; excess time may become rested status or non-destructive narrative time.
8. The report explains causes, not merely results.
9. Random events use a saved seed or event identity for reproducibility.
10. Returning after a long absence should offer a recovery path, not demand restart.

These rules can tighten in hardcore mode or future multiplayer, but the normal solo game should respect absence.

---

## 10. Dependency and licensing governance

Create `DEPENDENCIES.md` with one entry per direct dependency:

- package/tool;
- version;
- license;
- official source;
- exact DRIFT use;
- owner/adapter;
- replacement plan;
- upgrade date;
- known risks.

Create `ASSET_LICENSES.md` recording:

- source pack;
- creator;
- asset filenames;
- license;
- attribution text;
- whether temporary or final.

### Package policy

- exact versions are locked;
- lockfile is committed;
- no automatic major upgrades;
- dependency audit runs before phase gates;
- unused packages are removed;
- packages may not leak into the simulation core without explicit architecture approval.

---

## 11. Risk register

| Risk | Severity | Mitigation |
|---|---:|---|
| Phaser 4 youth/regression risk | Medium | pin version; standard APIs; phone tests; renderer adapter |
| React and Phaser state duplication | High | one simulation authority; typed commands/view models; no mirrored mutable truth |
| Grid movement feels sluggish | High | mandatory control shootout before adoption |
| Offline system corrupts or over-punishes | High | pure deterministic function; caps; property tests; fairness constitution |
| Phase 1 scope explosion | Critical | revised cycle gates; no broad integration before control/offline proofs |
| Save migration failure | High | Dexie versions; Zod validation; fixtures from every released build |
| PWA stale assets mismatch save/content | High | versioned content; controlled update prompt; atomic safe reload |
| Placeholder art becomes permanent incoherence | Medium | manifest; replacement status; early style test after game-feel proof |
| Plugin abandonment | Medium | adapters; selective imports; tests; replacement plan |
| Premature procedural generation | Medium | authored first island; defer generation |
| Premature multiplayer architecture | Medium | stable IDs/commands now; no framework commitment |
| Package bloat and agent confusion | Medium | narrow approved stack; architecture linting; dependency ledger |

---

## 12. Required charter amendments

### Amendment 1 — Engine

Replace:

> Phaser 3 + TypeScript

with:

> Phaser 4.2.1 + TypeScript, initialized from the official Phaser React TypeScript/Vite template. React owns DOM interface surfaces; Phaser owns world presentation; plain TypeScript owns the game simulation.

### Amendment 2 — Library-first rule

Add:

> Infrastructure is integrated from maintained, compatible packages before custom development is considered. Custom code is reserved for DRIFT’s proprietary rules and experience.

### Amendment 3 — Map strategy

Add:

> The first island is authored in Tiled. Procedural generation begins only after the authored island’s pacing and spatial rules are validated.

### Amendment 4 — Phase 1 cycles

Replace the single large Phase 1 implementation with Cycles 0A–5 in this report.

### Amendment 5 — Offline fairness

Add the ten binding rules in Section 9.

### Amendment 6 — Package governance

Add version pinning, lockfile, license ledger, adapter and upgrade-gate rules.

### Amendment 7 — Roles

Replace references that assign the entire crew to Claude with the actual studio model:

- director;
- executive producer/integrator session;
- specialist staff sessions;
- Codex engineering;
- independent audit session.

### Amendment 8 — Acceptance evidence

A cycle passes only with:

- automated tests;
- mobile browser evidence;
- a fresh audit against its specification;
- director game-feel acceptance.

“Build succeeds” is not gameplay acceptance.

---

## 13. Initial Codex bootstrap work order

### Title

**DRIFT-BOOT-001 — Library-First Phaser 4 Foundation**

### Objective

Create the smallest production-quality DRIFT repository from the official Phaser React TypeScript template and prove rendering, UI bridge, map loading, persistence, validation, testing and static deployment.

### Required dependencies/tools

- Phaser 4.2.1
- official React TypeScript template
- Dexie
- Zod
- vite-plugin-pwa
- Vitest
- fast-check
- Playwright
- Tiled 1.12.2 as external authoring tool

### Required repository boundaries

- `src/core` has zero Phaser, React, Dexie and browser imports.
- `src/presentation/phaser` contains Phaser-only integration.
- `src/presentation/react` contains UI-only integration.
- `src/infrastructure/persistence` contains Dexie.
- all cross-layer communication is typed.

### Demonstration slice

- render a small Tiled beach map;
- move a placeholder survivor;
- display a React status overlay;
- send one typed UI command to the application layer;
- save a versioned, Zod-validated snapshot;
- reload it;
- show a mock report generated from a pure core event;
- build a PWA-capable production bundle.

### Automated acceptance

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

All pass from a clean checkout.

### Prohibited

- no survival balance implementation;
- no procedural generation;
- no full inventory;
- no multiplayer;
- no custom UI framework;
- no custom database abstraction beyond the narrow repository interfaces;
- no Phaser references in core.

### Evidence package

- build URL;
- test output;
- architecture dependency check;
- browser/device matrix;
- as-built note;
- dependency and license ledger;
- known limitations.

---

## 14. Final audit conclusion

DRIFT should proceed, but not as “a survival game built in Phaser from scratch.” It should proceed as a **composed product**:

- Phaser supplies the world renderer.
- React supplies the information interface.
- Tiled supplies world authoring.
- Rex supplies touch primitives.
- Arcade Physics supplies first-pass movement.
- Grid Engine competes for movement/pathfinding duties.
- Dexie supplies durable browser storage.
- Zod supplies runtime trust boundaries.
- vite-plugin-pwa supplies the mobile-web shell.
- Vitest, fast-check and Playwright supply verification.
- Kenney and Game-icons supply replaceable prototype visuals.
- Capacitor supplies a future native route.

The studio then spends its original effort on the systems no package can provide: the emotional transition from exposure to ownership, the strategic decision made before closing the app, the fair but tense consequences discovered on return, the body shaped by habitual play, and the final act of leaving the island.

### Final ratings

| Area | Rating | Audit view |
|---|---:|---|
| Product identity | 8.5/10 | clear and marketable once demonstrated |
| Core loop concept | 8/10 | strong, but active interaction still unproven |
| Offline signature | 9/10 potential | highest-value differentiator; fairness is critical |
| Current Phase 1 scope | 3/10 | too large as one build; corrected by cycle split |
| Original technical stack | 7/10 | right architecture, wrong Phaser generation |
| Library-first readiness after audit | 9/10 | strong package coverage for infrastructure |
| Production readiness today | 5/10 | ready for bootstrap and control spike, not feature production |

### Studio decision

**Authorize Cycle 0A and Cycle 0B.**  
Do not authorize the original all-in-one Phase 1 build.  
Do not authorize procedural generation, multiplayer, full skill selection or aggressive offline threats until the two foundational proofs pass.

---

## 15. Primary research sources

1. DRIFT Project Charter & Design Document v0.1 — studio source of truth.
2. Phaser release list and Phaser 4.2.1 release notes: https://github.com/phaserjs/phaser/releases
3. Phaser — “Phaser 3 vs Phaser 4: What Changed and Why You Should Upgrade”: https://phaser.io/news/2026/05/phaser-3-vs-phaser-4
4. Official Phaser React TypeScript template: https://github.com/phaserjs/template-react-ts
5. Tiled 1.12 documentation: https://doc.mapeditor.org/en/stable/
6. Grid Engine official repository: https://github.com/Annoraaq/grid-engine
7. Rex Phaser plugins/notes: https://github.com/rexrainbow/phaser3-rex-notes
8. Dexie documentation: https://dexie.org/docs/
9. Zod documentation: https://zod.dev/
10. XState v5 documentation: https://stately.ai/docs
11. vite-plugin-pwa documentation repository: https://github.com/vite-pwa/docs
12. Vitest documentation: https://vitest.dev/
13. fast-check documentation: https://fast-check.dev/
14. Playwright device emulation documentation: https://playwright.dev/docs/emulation
15. Capacitor official repository: https://github.com/ionic-team/capacitor
16. Kenney: https://kenney.nl/
17. Game-icons.net: https://game-icons.net/
18. ROT.js: https://ondras.github.io/rot.js/hp/
19. seedrandom: https://github.com/davidbau/seedrandom

---

*End of report.*
