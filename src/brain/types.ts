/**
 * BRAIN — data model. Pure TypeScript. Zero rendering engine (Ops v1.3 §5 law 1).
 */

/**
 * v1 — Cycles 01–02 (warmth, wood, fire).
 * v2 — Cycle 03: three vitals, death/respawn, expanded inventory, the first tool and
 *      loot, and two seed skills. Migration v1→v2 lives in save.ts.
 * v3 — Cycle 05: the 5th vital (energy), the wet condition, shelter, and storage.
 *      Migration v2→v3 lives in save.ts.
 * v4 — Cycle 05 PERFECT (D-051): the renewability law (nodes regrow; nothing is globally
 *      exhaustible), the stone quarry, and beach salvage spawns. Migration v3→v4 lives in
 *      save.ts and heals an existing save — every depleted node comes back at once ("while
 *      you were away, the island came back to life").
 * v5 — Living Island Track A FIX package (D-052): the torch (a new carried light source,
 *      FIX 5) and a per-death log on the trace (FIX 2). Migration v4→v5 lives in save.ts;
 *      a returning player simply hasn't crafted a torch yet, the same reasoning v2→v3 used
 *      for shelter/storage.
 * v6 — Ch.1 v3, buildable content (D-055): the sharp-blade intermediate (a new carried
 *      material, knapped from raw stone with the new stone hammer); the stone hammer
 *      itself (a new Tier-0 tool); a grade (crude/serviceable/refined/exceptional) on the
 *      axe/torch/shelter; and the null-outcome combination journal (Ch.1's knowledge
 *      layer). Migration v5→v6 lives in save.ts; a returning player simply hasn't knapped
 *      a blade or made a hammer yet, and every ALREADY-owned axe/torch/shelter heals in at
 *      the baseline `serviceable` grade — the honest "we don't know what grade it would
 *      have rolled" answer, never a retroactive upgrade or downgrade.
 * v7 — Ch.2, "The Knowledge Model" (MAJOR artifact, AUDITED-GO): a per-domain
 *      `KnowledgeState.domains` (Technique/Understanding/Adaptation, seven domains, every
 *      score starting at an innate floor). Brain-layer only — no new player-facing UI
 *      surface (Ch.4 owns the reveal). Migration v6→v7 lives in save.ts; a returning
 *      player's `nullPairs`/`events` carry over untouched, and every domain starts fresh
 *      at the innate floor — no retroactive Understanding credit for null pairs discovered
 *      before this chapter shipped, the same "we don't know what it would have been"
 *      honesty D-055's own grade migration already established.
 * v8 — Ch.6, "The Body Model" (D-058): `fatigue` (accrued on energy debt, shed by rest)
 *      and `resting` (true only while asleep, driving the new recovery rates that replaced
 *      C05's instant sleep-refill). The death log's entries additionally carry the
 *      cause-specific respawn message and what the death actually cost. Migration v7→v8
 *      lives in save.ts; a returning player wakes with zero fatigue and not resting — the
 *      honest "we have no record of how tired you were" answer, and the kind one.
 * v9 — Tree parity (D-059): 14 treeline positions promoted from decorative scenery to real
 *      harvestable `tree` nodes, bringing trees to the same real:decorative ratio rocks
 *      already had. Migration v8→v9 lives in save.ts and MERGES the new nodes into an
 *      existing save's node list — without it a returning player would keep their old
 *      five-tree island forever, since `hydrate` deliberately preserves a save's own nodes.
 *      The same "new content is merged in, nothing existing is disturbed" shape v3→v4 used
 *      for the quarry.
 * v10 — Embodied inventory + experimentation (v0_7 §9/§10.6, D-063): the six-zone
 *      `loadout` (hands/belt/pockets as physical positions), and `blueprints` +
 *      `experimentCount` for Try-Combining. Migration v9→v10 lives in save.ts; a returning
 *      player gets an empty loadout with nothing positioned and no plans yet — their tools
 *      are all still owned and simply sit in general carry, which is exactly where they
 *      effectively were before positions existed.
 */
export const SCHEMA_VERSION = 16;

export type ControlMode = 'tap' | 'joystick';

/**
 * Every kind of resource node on the island. `driftwood`/`deadfall` are Cycle 01's;
 * most of the rest arrive with Cycle 03's bigger island. `quarry` (one, high-capacity,
 * repeat-minable) and `salvage` (randomly spawned beach finds) are D-051. What each
 * yields, and what gate it asks for, lives in state.ts — one place, keyed by kind.
 */
export type NodeKind =
    | 'driftwood'
    | 'deadfall'
    | 'tree'
    | 'rock'
    | 'berrybush'
    | 'coconutpalm'
    | 'reed'
    | 'shellfish'
    | 'crashbox'
    | 'quarry'
    | 'salvage';

/** What a beach salvage find turns out to hold, rolled once at spawn (D-051). */
export type SalvageLoot = 'driftwood' | 'cordage' | 'stone' | 'bundle';

/** A gatherable node, as placed by the authored island (src/data/world.ts) or spawned. */
export interface WoodNode {
    id: string;
    kind: NodeKind;
    x: number;
    y: number;
    /** False once consumed (or, for the quarry, once its pool hits 0). The renewability
     *  law (D-051) means this is temporary for every kind except `crashbox` — a one-time
     *  story beat, not a resource — which is exempt and never regrows. */
    available: boolean;
    /** Game-hours timestamp this node was last depleted; null while available (or never
     *  yet depleted). Drives regrowth — elapsed time since this, checked against the
     *  kind's regrow duration (D-051, `regrowGameHoursFor` in state.ts). */
    depletedAtGameHours: number | null;
    /** Remaining stone in a repeat-minable quarry. Undefined for every other kind — those
     *  stay single-shot (one gather, then regrow from scratch). */
    pool?: number;
    /** Which reward a `salvage` find holds, rolled once at spawn. Undefined for every
     *  other kind. */
    salvageLoot?: SalvageLoot;
}

export interface FireState {
    built: boolean;
    /** Wood units remaining. Fractional as it burns. Lit means built && fuel > 0. */
    fuel: number;
    x: number;
    y: number;
}

export interface PlayerState {
    x: number;
    y: number;
}

/**
 * What the castaway is carrying. Counts, all of them — the minimal inventory the spec
 * asks for. `wood` is Cycle 01's; berries/coconut/shellfish are Cycle 03's; `sharpblade`
 * is Ch.1 v3 (D-055) — a refined material, knapped from raw stone, not gathered directly.
 */
export interface Inventory {
    wood: number;
    stone: number;
    fiber: number;
    berries: number;
    coconut: number;
    shellfish: number;
    sharpblade: number;
    /** DROP 1 — raw meat from a killed boar. Spoils fast; cooking is the NEXT discovery. */
    meat: number;
}

/** Every kind of carried material — the key set `Inventory` actually holds. Ch.1 v3's
 *  material-family/tag schema (`src/brain/materials.ts`) is keyed by this. */
export type MaterialKind = keyof Inventory;

/**
 * Grade (Ch.1 v3, D-055): four tiers, rolled once at craft time via a seeded hash — the
 * same determinism technique `deadfallYield`/`spawnSalvageNode` already use, not a fresh
 * mechanic. Exactly ONE functional stat moves per item type with grade (never more): the
 * axe's fell speed, the torch's burn duration, the shelter's warmth bonus. Cosmetic too —
 * a small mesh-level tell per grade, the same pattern as the harvest blaze-mark/depletion-
 * stump system (grade is drawn, not just stated).
 */
export type ItemGrade = 'crude' | 'serviceable' | 'refined' | 'exceptional';

/** Tools and carried gear. Booleans in v1; each is a made-or-found milestone. */
export interface Tools {
    /** The crude axe: fells trees, opens the crash box. */
    axe: boolean;
    /** DROP 1 — the spear. The only made thing that answers a boar. */
    spear: boolean;
    /** The water flask: found in the crash box; carries drinks inland. */
    flask: boolean;
    /** Drinks currently in the flask (0..flaskCapacitySips). */
    flaskSips: number;
    /** The stone hammer (Ch.1 v3, D-055): Tier-0 — its one live verb is knapping raw
     *  stone into the sharp-blade intermediate the axe now needs. */
    stoneHammer: boolean;
    /** Rolled once at craft time (Ch.1 v3, D-055); scales fell speed only. */
    axeGrade: ItemGrade;
    /** A line to fish with (Slice 2). A CAPABILITY, not a consumable — it is what makes the
     *  pond's circle divide a third time. D-086's six-state ladder will later replace this
     *  boolean with a position on that ladder; it is a boolean now because the ladder does
     *  not exist yet and pretending otherwise would be inventing the spec. */
    fishingLine: boolean;
}

/**
 * The torch (Living Island Track A, FIX 5): a carried, consumable light source — the
 * inverse of the fixed structures below. `owned` is true from the moment it is crafted
 * (unlit) until its fuel burns out (consumed, not just "off"); `lit` only ever becomes
 * true at an active fire. Burn-down is handled in reconcile.ts, the same closed-form
 * treatment as structure durability decay — nothing else's rate depends on exactly when
 * it crosses zero.
 */
export interface TorchState {
    /** True once crafted; false again once fully burned down. A fresh torch must be
     *  crafted to replace a spent one — there is no "refuel". */
    owned: boolean;
    /** True while lit. Never true unless `owned`; extinguishes itself at 0 fuel. */
    lit: boolean;
    /** Game hours of burn remaining. Only ticks down while `lit`; set to
     *  `torchBurnGameHoursFor(grade)` on craft. */
    fuelGameHoursRemaining: number;
    /** Rolled once at craft time (Ch.1 v3, D-055); scales burn duration only. */
    grade: ItemGrade;
}

/**
 * A placed structure (Cycle 05): the shelter or the storage crate. Both share the same
 * shape — a location and a durability that decays over game hours and pauses the
 * structure's bonus at 0 until repaired. Nothing is ever destroyed (charter honest-systems
 * law) — disrepair, never deletion.
 */
export interface Structure {
    built: boolean;
    x: number;
    y: number;
    /** 0–100. At 0 the structure's bonus pauses until repaired; never deleted. */
    durability: number;
}

/** The shelter specifically — the one structure with a grade (Ch.1 v3, D-055): its
 *  warmth bonus, and only its warmth bonus, scales with it. Storage has no grade — the
 *  spec names exactly one stat per item TYPE, and storage has none listed. */
export interface ShelterState extends Structure {
    /** Rolled once at build time; scales the warmth-drain-reduction bonus only. */
    grade: ItemGrade;
}

/** The storage crate's contents — raw materials only, a second pool from personal carry. */
export interface StorageInventory {
    wood: number;
    stone: number;
    fiber: number;
}

export interface StorageState extends Structure {
    stored: StorageInventory;
}

/** One skill in the Development Tree seed. Levels through meaningful use (§I.9). */
export interface Skill {
    level: number;
    /** XP accumulated toward the NEXT level. */
    xp: number;
}

export interface Skills {
    woodcutting: Skill;
    foraging: Skill;
}

export interface Settings {
    controlMode: ControlMode;
}

/** Local-only playtest trace (Ops: no external service; localStorage/debug only). */
export interface TraceState {
    msToFirstMove: number | null;
    msToFirstWood: number | null;
    msToFireLit: number | null;
    /** C03 milestones. */
    msToFirstDrink: number | null;
    msToFirstCraft: number | null;
    failedInteractionTaps: number;
    controlModeSwitches: number;
    steelThreadComplete: boolean;
    /** How many times the castaway has died and washed back ashore. */
    deaths: number;
    /** Real ms of active (foreground) play since the run started. */
    activeMs: number;
    /** Every death this run, cause and the game-clock moment it happened (FIX 2) — surfaced
     *  in the debug export (D-050's tool) so a death-loop report is diagnosable without
     *  relying on the player's memory of what killed them and when. Unbounded; a run's
     *  death count is never so large this matters for storage.
     *
     *  Ch.6 (D-058) extends each entry with the cause-specific respawn message the player
     *  was actually shown, and `lost` — exactly which carried resources the death cost,
     *  so "what did that death take from me" is answerable from the record rather than
     *  from memory. Both are optional: entries written before v8 have neither. */
    deathLog: Array<{
        cause: string;
        gameHoursElapsed: number;
        message?: string;
        lost?: Partial<Record<MaterialKind, number>>;
    }>;
}

/**
 * A knowledge event — Ch.1's null-outcome journal recording that trying is itself
 * knowledge (D-055). Ch.2 (knowledge/experimenting) does not exist yet in this codebase;
 * this is the stub hook for it — recorded, unwired beyond that, ready for Ch.2 to read.
 */
import type { CapacityScores } from './capacities';
import type { ConfidenceState } from './confidence';
import type { MatterWear } from './matter';

export interface KnowledgeEvent {
    kind: 'combination-tried';
    /** Plain-language detail — e.g. "wood does not satisfy the axe's blade slot." */
    detail: string;
    gameHoursElapsed: number;
}

/**
 * Ch.2, "The Knowledge Model" (v7): the seven domains a unit's knowledge is tracked across.
 * Most will sit untouched for a long time — Mechanical systems, Electrical & radio, and
 * Navigation & seamanship have no producer anywhere in this codebase yet, and that is
 * correct, not a gap (src/brain/knowledge.ts).
 */
export type KnowledgeDomain =
    | 'survivalcraft'
    | 'foragingMedicine'
    | 'harvestingFabrication'
    | 'construction'
    | 'mechanicalSystems'
    | 'electricalRadio'
    | 'navigationSeamanship';

/**
 * One domain's three scores (Ch.2, v7). All start at `TUNE.knowledgeInnateFloor`, never
 * zero — see `freshDomainScore` in knowledge.ts. `adaptation` has no producer this pass
 * (C1 amendment A) — it stays at the innate floor for every domain until a later pass
 * feeds it; see knowledge.ts's own doc comment for exactly what that producer would do.
 */
export interface DomainScore {
    technique: number;
    understanding: number;
    adaptation: number;
}

/**
 * The null-outcome combination journal (Ch.1 v3, D-055): every (recipe slot, material
 * kind) pair tried and found NOT to combine, so it is never re-evaluated. Encoded as
 * `${slotId}|${materialKind}` strings — a Set expressed as a JSON-safe array, the same
 * plain-array convention `trace.deathLog` already uses for small, append-only history.
 */
export interface KnowledgeState {
    nullPairs: string[];
    /** Unbounded, matching `trace.deathLog`'s own precedent — tiny data, a knowledge
     *  event only fires once per pair ever, never per frame. */
    events: KnowledgeEvent[];
    /** Ch.2 (v7): one score per domain. Never reduced by `reconcile` — offline absence may
     *  cost warmth or hunger; it can never cost what the unit has learned (C1 amendment B,
     *  property-tested in tests/vitals.test.ts alongside the offline-death-impossible law). */
    domains: Record<KnowledgeDomain, DomainScore>;
}

/**
 * The six physical access zones' state (v0_7 §9, D-063). Hands, belt and pockets hold
 * SPECIFIC items by position — a quick slot names a position, and the position holds a
 * thing. When that thing is consumed the position goes empty and is never silently
 * refilled (enforced by `syncLoadoutToOwnership` in loadout.ts). The backpack is
 * `GameState.inventory` and nearby storage is `GameState.storage`; neither is duplicated
 * here, because §9's scope is an access layer over them, not a replacement.
 */
export interface LoadoutState {
    activeHand: ToolId | null;
    supportHand: ToolId | null;
    belt: Array<ToolId | null>;
    pockets: Array<ToolId | null>;
}

/** Every tool that can occupy a physical access position (v0_7 §9, D-063). */
export type ToolId = 'axe' | 'stoneHammer' | 'torch' | 'flask';

/**
 * A Blueprint (v0_7 §10.5/§10.6, D-063): the NAMED PLAN a successful prototype becomes.
 * Physical by design — §10.5 says plans are "copyable, versioned, teachable, tradable,
 * stealable, corruptible, comparable against field evidence". This slice ships the object
 * and its authorship/versioning so those later verbs have something real to act on; the
 * social half (teaching, trading, theft) is Ch.8's and is deliberately not built here.
 *
 * §10.6's rule that a plan reproduces "the relationships, not the original quality for
 * free" is why `workmanship` is recorded but never re-applied on reproduction.
 */
export interface Blueprint {
    id: string;
    /** The named plan, e.g. "Knapped blade, hafted". */
    name: string;
    /** The recipe id in the Ch.1 tree this plan realises — plans never invent new recipes. */
    recipeId: string;
    /** What it was made of, as discovered. */
    inputs: MaterialKind[];
    /** Bumped when the same plan is re-derived with a better result — §10.5's versioning. */
    version: number;
    /** The grade the original prototype came out at. Recorded as evidence, NOT granted to
     *  anyone who later works from the plan (§10.6). */
    workmanship: ItemGrade;
    /** Who made it. Single-run today; the field exists so authorship survives into Ch.8. */
    author: string;
    discoveredAtGameHours: number;
}

/**
 * The whole run. Everything the game needs to be reconstructed from a cold start.
 * Serialised verbatim into the save (see save.ts).
 */
export interface GameState {
    schemaVersion: number;
    startedAtMs: number;
    lastSeenMs: number;
    gameHoursElapsed: number;

    // Vitals.
    warmth: number;
    thirst: number;
    hunger: number;
    health: number;
    /** The 5th vital (Cycle 05): a slow, full-day rhythm. A soft debuff only — never a
     *  death vector this cycle (see the C05 spec's SCOPE OUT). Restored by sleeping. */
    energy: number;
    /** Not a vital: a 0–100 condition, not part of the health-drain path. Rises in the
     *  pond, decays on dry land (faster within the shelter's radius), and raises warmth's
     *  drain rate while high — the reason a roof matters even with a fire already lit. */
    wet: number;
    /**
     * Ch.6 (D-058): 0–`fatigueMax`. Accrues while ONLINE and in energy debt; shed by rest.
     * **Never accrues offline, ever** — absence may cost warmth or hunger, but it may never
     * make the body worse, the same law Ch.2's amendment B set for knowledge. Deliberately
     * NOT part of the health-drain path: fatigue is a perceivable soft state (three stages,
     * `fatigueStage` in body.ts), never a death vector, which is what keeps the
     * offline-death-impossible law (D-011) structurally intact with it added.
     */
    fatigue: number;
    /**
     * Ch.6 (D-058): true only while actually asleep in a bed. Drives the accelerated
     * energy/warmth recovery rates and fatigue shedding in `reconcile`, and is cleared the
     * moment the sleep span ends — this is a transient of the sleep action, never a mode
     * the player is left sitting in. Replaces C05's instant sleep-refill: recovery is now a
     * RATE over elapsed time, so a sleep from empty genuinely may not reach full.
     */
    resting: boolean;

    inventory: Inventory;
    tools: Tools;
    skills: Skills;

    fire: FireState;
    /** The lean-to (Cycle 05): warmth-drain relief and faster drying in its radius; once
     *  built, it is also where death and absence respawn the castaway (D-042/C05 §2). */
    shelter: ShelterState;
    /** The storage crate (Cycle 05): a second pool for raw materials only. */
    storage: StorageState;
    /** The carried torch (Living Island Track A, FIX 5). */
    torch: TorchState;
    player: PlayerState;
    nodes: WoodNode[];
    /** How many salvage nodes have ever been spawned — the id/seed counter (D-051). Also
     *  doubles as the deterministic seed for each spawn's position and loot roll, keeping
     *  reconcile pure (no clock or RNG reads — same law as `deadfallYield`'s id hash). */
    salvageSpawnCount: number;
    /** The game-hours clock value the next salvage spawn is due. Reconcile advances this
     *  the same way it advances everything else — by math over elapsed time, identically
     *  online and offline (D-051). */
    nextSalvageSpawnAtGameHours: number;
    /** How many crafts (of any kind) have ever rolled a grade — the seed counter for each
     *  roll (Ch.1 v3, D-055), the same "counter as seed" determinism `salvageSpawnCount`
     *  already established, kept pure (no clock or RNG reads). */
    craftRollCount: number;
    /** Ch.1's knowledge layer, v3 (D-055): the null-outcome combination journal. */
    knowledge: KnowledgeState;
    /**
     * §12's eight long-term capacities (v13). The body's own record of work done. Separate
     * from `knowledge` because they are different things that fail differently, and separate
     * from the six indicators because no bar shows them.
     */
    capacities: CapacityScores;
    /**
     * The confidence / recency layer (v13). Timing and confidence, NEVER knowledge — see
     * `confidence.ts` for the boundary and the property test that enforces it. Stores only
     * WHEN each technique was last practised; the confidence value itself is derived on
     * every read, so there is no second source of truth to drift from the clock.
     */
    confidence: ConfidenceState;
    /**
     * Law 128 (v14): accumulated wear per material kind, put there by failed attempts. Matter
     * comes out of a failure CHANGED — and a unit is only ever lost after wear the player was
     * told about, never to a hidden roll.
     */
    matterWear: MatterWear;
    /** The six physical access zones (v0_7 §9, D-063). Hands/belt/pockets hold specific
     *  items by position; the backpack is `inventory` and nearby storage is `storage`. */
    loadout: LoadoutState;
    /** Named plans minted by successful experiments (v0_7 §10.6, D-063). */
    blueprints: Blueprint[];
    /** How many experiments have ever been attempted — the id/seed counter for minted
     *  blueprints, the same "counter as seed" determinism `craftRollCount` established. */
    experimentCount: number;
    settings: Settings;
    trace: TraceState;

    /**
     * The cause of the most recent death, for the death overlay ("You died of thirst").
     * Null until the first death; set the instant a death is actioned, cleared when the
     * player acknowledges it. Not part of the survival sim — a message, not a state.
     */
    lastDeathCause: string | null;

    /**
     * SLICE 3 — the castaway cycle. Everyone who has died on this island, oldest first. This
     * is a property of the PLACE, not a save slot: it survives every death, and it is the
     * only thing a dead survivor leaves behind that a successor can be certain of.
     *
     * Recorded as HISTORY and never read back as knowledge — see `succession.ts` for the
     * matter-not-memory line ([[D-069]]) and the property test that enforces it.
     */
    memorial: SurvivorRecord[];
    /**
     * The island-clock reading when the CURRENT survivor washed ashore. Zero for the first.
     * Every "how long have I lasted" question is this subtracted from `gameHoursElapsed` —
     * the world clock never resets, so a successor's age has to be measured, not stored.
     */
    survivorStartedAtGameHours: number;
    /**
     * THE SURVIVOR'S JOURNAL ([[D-068]]) — the one channel by which anything a survivor
     * knew can outlive them, and only because they spent real time and real light writing
     * it down. Absent until one is made. The carrier is mortal.
     */
    journal: JournalState;
    /**
     * DROP 1 — the island's first predator. A FIXED population of individuals, created once
     * at world birth and never added to; there is deliberately no spawner. Persists through
     * death like everything else physical: the boars were here before you and stay after.
     */
    boars: Boar[];
    /**
     * DROP 1 — the island-clock reading after which raw meat is spoiled. Null when carrying
     * none. Raw meat is an EVENT, not a stockpile: it goes off before it can solve hunger,
     * which is precisely what makes cooking — the NEXT discovery, deliberately not built in
     * this drop — worth wanting.
     */
    meatFreshUntilGameHours: number | null;
}

/** The five-stage grammar of the fair-challenge contract. See `fauna.ts`. */
export type BoarStage = 'unaware' | 'alert' | 'warning' | 'charge' | 'aftermath';

/**
 * One boar. A FIXED individual with a territory and a rhythm — never a spawn-wave unit.
 * `homeX`/`homeY` are its anchor: it wanders from there and D-011 returns it there.
 */
export interface Boar {
    id: string;
    x: number;
    y: number;
    /** Where it lives. Its own ground, and where an absence puts it back. */
    homeX: number;
    homeY: number;
    /** Radians. Decides the sight cone, and is frozen into `chargeBearing` at commitment. */
    facing: number;
    stage: BoarStage;
    /** Island-clock reading when it entered the current stage. The ladder's own timer. */
    stageSinceGameHours: number;
    /**
     * The bearing a charge was committed to, fixed at wind-up and NEVER recomputed. Null
     * unless charging. This one field is what makes a charge evadable.
     */
    chargeBearing: number | null;
    /** Its own need, driving the daily rhythm at coarse grain. */
    hunger: number;
    alive: boolean;
}

/** One life, closed. See `succession.ts`. Declared here because `GameState` carries it. */
export interface SurvivorRecord {
    /** Which castaway this was, counting from the first. */
    ordinal: number;
    cause: string;
    /** The island-clock reading when they died. */
    diedAtGameHours: number;
    /** How long they lasted, in game hours. */
    livedGameHours: number;
    /** What they had demonstrated. HISTORY — never read back as knowledge. */
    knewRecipes: string[];
    /** What they left standing. */
    leftBehind: string[];
}

/**
 * One entry, written by hand, by firelight. `topic` is the recipe the entry is ABOUT, and it
 * is the whole reason the journal is not just flavour text: a legible entry about `shelter`
 * is the evidence that lifts a successor's ladder for shelter. `text` is what the survivor
 * would have written — never a recipe listing, because a survivor writing at night writes
 * what they did, not a specification.
 */
export interface JournalEntry {
    /** Which survivor wrote it. */
    author: number;
    writtenAtGameHours: number;
    /** The recipe this entry is about, or null for a plain observation. */
    topic: string | null;
    text: string;
}

/**
 * The journal as an OBJECT, subject to everything objects are subject to. `condition` runs
 * 0..1; damp and fire take it down; below the legibility floor the ink has run and the entry
 * is there but cannot be read. `carried` decides whether it burns with you or waits in the
 * store box — which is the actual decision D-068 wants the player to have to make.
 */
export interface JournalState {
    exists: boolean;
    /** Where it is when not carried. Meaningless while `carried`. */
    x: number;
    y: number;
    carried: boolean;
    /** 0..1. Damp, fire and time take it down. Never rises on its own. */
    condition: number;
    entries: JournalEntry[];
    /** Island-clock reading of the last write, so a session can rate-limit honestly. */
    lastWrittenAtGameHours: number | null;
}

export interface TimeOfDay {
    hourOfDay: number;
    dayNumber: number;
    isNight: boolean;
}

/** Which vital drove a death or a drain. Used for honest, specific causes. */
export type VitalName = 'thirst' | 'hunger' | 'warmth';

/** The drift of one vital across a reconcile span, for the morning report. */
export interface VitalDrift {
    vital: VitalName | 'health';
    before: number;
    after: number;
    /** The offline floor stopped this vital's fall. */
    floorHeld: boolean;
}

/** Everything that happened across an elapsed span. Input to the morning report. */
export interface ReconcileResult {
    elapsedRealSeconds: number;
    elapsedGameHours: number;

    warmthBefore: number;
    warmthAfter: number;
    /** True if any offline fairness floor (D-011) stopped a fall. */
    floorHeld: boolean;

    // The three C03 vitals, and per-vital drift for the report.
    thirstBefore: number;
    thirstAfter: number;
    hungerBefore: number;
    hungerAfter: number;
    healthBefore: number;
    healthAfter: number;
    /** Cycle 05: tracked for tests and the sleep summary; no new report line this cycle
     *  (the C05 spec scopes that out — the numbers are honest even unnarrated). */
    energyBefore: number;
    energyAfter: number;
    wetBefore: number;
    wetAfter: number;
    /** Ch.6 (D-058): tracked for tests and the sleep summary. No new morning-report line
     *  this slice — the numbers are honest even unnarrated, the same call energy's own
     *  C05 introduction made. */
    fatigueBefore: number;
    fatigueAfter: number;
    drifts: VitalDrift[];

    /**
     * A death occurred DURING this span (only possible for a non-qualifying online span;
     * the floors make it impossible for a qualifying offline span — that is the law).
     * The session actions the respawn; reconcile only reports it.
     */
    diedDuringSpan: boolean;
    deathCause: string | null;

    fireLitBefore: boolean;
    fireLitAfter: boolean;
    fireWentOutAtGameHours: number | null;
    woodBurned: number;
    shelteredByFire: boolean;

    timeBefore: TimeOfDay;
    timeAfter: TimeOfDay;
    dawnBroke: boolean;
    nightFell: boolean;

    /** Absence long enough to earn a morning report (TUNE.morningReportMinRealMinutes). */
    qualifiesForReport: boolean;

    // ---- Renewability law (D-051) ----
    /** True if this span restocked at least one depleted driftwood node — the tide, on
     *  any qualifying absence, regardless of that node's own regrow timer. */
    driftwoodRestocked: boolean;
    /** GEOLOGY V2: surface stone returned on the tide/erosion cycle during this absence.
     *  Drives its own morning-report line so the beach never silently repopulates. */
    stoneWashedUp: boolean;
    /** How many OTHER (non-driftwood) nodes regrew this span, via the general timer. */
    nodesRegrewCount: number;
    /** How many new beach salvage finds appeared this span. */
    salvageSpawnedCount: number;
}
