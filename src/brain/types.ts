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
 */
export const SCHEMA_VERSION = 4;

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
 * asks for. `wood` is Cycle 01's; the rest are Cycle 03's materials and food.
 */
export interface Inventory {
    wood: number;
    stone: number;
    fiber: number;
    berries: number;
    coconut: number;
    shellfish: number;
}

/** Tools and carried gear. Booleans in v1; each is a made-or-found milestone. */
export interface Tools {
    /** The crude axe: fells trees, opens the crash box. */
    axe: boolean;
    /** The water flask: found in the crash box; carries drinks inland. */
    flask: boolean;
    /** Drinks currently in the flask (0..flaskCapacitySips). */
    flaskSips: number;
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

    inventory: Inventory;
    tools: Tools;
    skills: Skills;

    fire: FireState;
    /** The lean-to (Cycle 05): warmth-drain relief and faster drying in its radius; once
     *  built, it is also where death and absence respawn the castaway (D-042/C05 §2). */
    shelter: Structure;
    /** The storage crate (Cycle 05): a second pool for raw materials only. */
    storage: StorageState;
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
    settings: Settings;
    trace: TraceState;

    /**
     * The cause of the most recent death, for the death overlay ("You died of thirst").
     * Null until the first death; set the instant a death is actioned, cleared when the
     * player acknowledges it. Not part of the survival sim — a message, not a state.
     */
    lastDeathCause: string | null;
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
    /** How many OTHER (non-driftwood) nodes regrew this span, via the general timer. */
    nodesRegrewCount: number;
    /** How many new beach salvage finds appeared this span. */
    salvageSpawnedCount: number;
}
