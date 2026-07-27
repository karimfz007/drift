/**
 * BRAIN — run state: creation, and the pure rules behind every player verb.
 * Zero rendering engine. The body calls these and then draws the result.
 */

import { gameHoursFromRealSeconds } from './clock';
import { TUNE } from '../data/tune';
import { POND, SPAWN, WALKABLE_RADIUS, WORLD, createNodes, isPlaceablePoint } from '../data/world';
import { deathResourceLoss, loadEnergyMultiplierOf, respawnMessageFor } from './body';
import { cloneDomainScores, domainForNodeKind, freshDomainScores, recordTrying, masteryForNodeKind } from './knowledge';
import { cloneLoadout, freshLoadout } from './loadout';
import { recipeDomain } from './recipes';
import { grantXp, newSkill } from './skills';
import { applyDrink, applyFood } from './vitals';
import {
    SCHEMA_VERSION,
    type GameState,
    type Inventory,
    type ItemGrade,
    type NodeKind,
    type SalvageLoot,
    type Skills,
    type StorageInventory,
    type Structure,
    type WoodNode, type KnowledgeDomain } from './types';

export function createInitialState(nowMs: number): GameState {
    return {
        schemaVersion: SCHEMA_VERSION,
        startedAtMs: nowMs,
        lastSeenMs: nowMs,
        gameHoursElapsed: 0,
        warmth: TUNE.warmthMax,
        thirst: TUNE.thirstMax,
        hunger: TUNE.hungerMax,
        health: TUNE.healthMax,
        energy: TUNE.energyMax,
        wet: 0,
        fatigue: 0,
        resting: false,
        inventory: emptyInventory(),
        tools: { axe: false, flask: false, flaskSips: 0, stoneHammer: false, axeGrade: 'serviceable' },
        skills: emptySkills(),
        fire: { built: false, fuel: 0, x: 0, y: 0 },
        shelter: { built: false, x: 0, y: 0, durability: TUNE.structureDurabilityMax, grade: 'serviceable' },
        storage: { built: false, x: 0, y: 0, durability: TUNE.structureDurabilityMax, stored: { wood: 0, stone: 0, fiber: 0 } },
        torch: { owned: false, lit: false, fuelGameHoursRemaining: 0, grade: 'serviceable' },
        player: { x: SPAWN.x, y: SPAWN.y },
        nodes: createNodes(),
        salvageSpawnCount: 0,
        nextSalvageSpawnAtGameHours: gameHoursFromRealSeconds(TUNE.salvageSpawnMinutesMin * 60),
        craftRollCount: 0,
        knowledge: { nullPairs: [], events: [], domains: freshDomainScores() },
        loadout: freshLoadout(),
        blueprints: [],
        experimentCount: 0,
        settings: { controlMode: 'tap' },
        trace: {
            msToFirstMove: null,
            msToFirstWood: null,
            msToFireLit: null,
            msToFirstDrink: null,
            msToFirstCraft: null,
            failedInteractionTaps: 0,
            controlModeSwitches: 0,
            steelThreadComplete: false,
            deaths: 0,
            activeMs: 0,
            deathLog: []
        },
        lastDeathCause: null
    };
}

export function emptyInventory(): Inventory {
    return { wood: 0, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0, sharpblade: 0 };
}

export function emptySkills(): Skills {
    return { woodcutting: newSkill(), foraging: newSkill() };
}

export function cloneState(state: GameState): GameState {
    return {
        ...state,
        inventory: { ...state.inventory },
        tools: { ...state.tools },
        skills: {
            woodcutting: { ...state.skills.woodcutting },
            foraging: { ...state.skills.foraging }
        },
        fire: { ...state.fire },
        shelter: { ...state.shelter },
        storage: { ...state.storage, stored: { ...state.storage.stored } },
        torch: { ...state.torch },
        player: { ...state.player },
        nodes: state.nodes.map((n) => ({ ...n })),
        knowledge: {
            nullPairs: [...state.knowledge.nullPairs],
            events: [...state.knowledge.events],
            domains: cloneDomainScores(state.knowledge.domains)
        },
        loadout: cloneLoadout(state.loadout),
        blueprints: state.blueprints.map((b) => ({ ...b })),
        settings: { ...state.settings },
        trace: { ...state.trace, deathLog: state.trace.deathLog.map((d) => ({ ...d })) }
    };
}

// ---- Node content -------------------------------------------------------

/**
 * Structural facts about each node kind: which verb reaches it, whether the axe gates it,
 * and which skill (if any) a successful gather trains. The *numbers* (yields, seconds)
 * live in tune.ts; this table is only "how does the player touch it".
 */
interface NodeSpec {
    interaction: 'tap' | 'hold';
    /** The axe is required to gather this at all. */
    needsAxe: boolean;
    skill: keyof Skills | null;
    holdBaseSeconds: number;
}

const NODE_SPECS: Record<NodeKind, NodeSpec> = {
    driftwood: { interaction: 'tap', needsAxe: false, skill: null, holdBaseSeconds: 0 },
    deadfall: { interaction: 'hold', needsAxe: false, skill: null, holdBaseSeconds: TUNE.deadfallHoldSeconds },
    tree: { interaction: 'hold', needsAxe: true, skill: 'woodcutting', holdBaseSeconds: TUNE.treeChopSecondsWithAxe },
    rock: { interaction: 'hold', needsAxe: false, skill: null, holdBaseSeconds: TUNE.deadfallHoldSeconds },
    berrybush: { interaction: 'tap', needsAxe: false, skill: 'foraging', holdBaseSeconds: 0 },
    coconutpalm: { interaction: 'hold', needsAxe: false, skill: 'foraging', holdBaseSeconds: TUNE.deadfallHoldSeconds },
    reed: { interaction: 'tap', needsAxe: false, skill: 'foraging', holdBaseSeconds: 0 },
    shellfish: { interaction: 'tap', needsAxe: false, skill: 'foraging', holdBaseSeconds: 0 },
    crashbox: { interaction: 'hold', needsAxe: true, skill: null, holdBaseSeconds: TUNE.deadfallHoldSeconds },
    quarry: { interaction: 'hold', needsAxe: false, skill: null, holdBaseSeconds: TUNE.deadfallHoldSeconds },
    salvage: { interaction: 'tap', needsAxe: false, skill: null, holdBaseSeconds: 0 }
};

export function nodeSpec(kind: NodeKind): NodeSpec {
    return NODE_SPECS[kind];
}

/**
 * Energy spent on ONE successful gather of this kind (FIX-1, Living Island Track A).
 * Root cause closed: `gatherNode` never charged energy at all — the ambient per-game-hour
 * drain in reconcile.ts was the only cost that existed, so a felled tree and an idle
 * minute cost identically nothing extra. Only `hold`-interaction (effortful) kinds cost
 * anything here — the same distinction `NODE_SPECS` already draws; an instant `tap`
 * pickup is not exertion the way a timed hold is. Exhaustive by kind (no default) so a
 * future node kind cannot silently fall through uncosted.
 */
export function effortEnergyCostFor(kind: NodeKind): number {
    switch (kind) {
        case 'tree': return TUNE.energyCostTreeChop;
        case 'deadfall': return TUNE.energyCostDeadfallGather;
        case 'rock': return TUNE.energyCostRockMine;
        case 'quarry': return TUNE.energyCostQuarryMine;
        case 'coconutpalm': return TUNE.energyCostCoconutGather;
        case 'crashbox': return TUNE.energyCostCrashboxOpen;
        case 'driftwood': return 0;
        case 'berrybush': return 0;
        case 'reed': return 0;
        case 'shellfish': return 0;
        case 'salvage': return 0;
    }
}

export function findNode(state: GameState, nodeId: string): WoodNode | undefined {
    return state.nodes.find((n) => n.id === nodeId);
}

/**
 * Wood a deadfall yields. Derived from the node id rather than a random roll, so the
 * island is the same island every time and every test is reproducible.
 */
export function deadfallYield(nodeId: string): number {
    const span = TUNE.deadfallYieldMax - TUNE.deadfallYieldMin + 1;
    let hash = 0;
    for (let i = 0; i < nodeId.length; i++) {
        hash = (hash * 31 + nodeId.charCodeAt(i)) >>> 0;
    }
    return TUNE.deadfallYieldMin + (hash % span);
}

/**
 * How much longer an effortful hold takes because the castaway is running on empty
 * (D-059). 1 while energy is healthy; climbing to `exhaustedHoldMultiplier` at the low
 * threshold and on to `collapsedHoldMultiplier` at zero, interpolated across that last
 * stretch so exhaustion has a gradient rather than a cliff.
 *
 * **The root cause this closes:** before D-059, energy touched *nothing* about gathering.
 * `nodeHoldSeconds` read skill level and axe grade only, and `isExhausted` had exactly
 * three consumers — the movement speed scale and two lines of hint text. A player at 0
 * energy mined at exactly the speed they mined at 100, which is what the director reported.
 * Deliberately shaped as a multiplier on the SAME stat skill and grade already scale, so
 * this reuses that plumbing rather than adding a second, parallel notion of "slower."
 *
 * Never blocks the action and never scales the yield: a spent castaway can still work, it
 * just costs them time — the C05 rule that low energy is a soft debuff, never a wall.
 */
export function exhaustionHoldMultiplierFor(energy: number): number {
    if (energy > TUNE.energyLowThreshold) return 1;
    const span = TUNE.energyLowThreshold;
    //  `t` is 0 at the threshold and 1 at empty.
    const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (span - energy) / span));
    return TUNE.exhaustedHoldMultiplier + (TUNE.collapsedHoldMultiplier - TUNE.exhaustedHoldMultiplier) * t;
}

/** Real seconds to complete a hold on this node, at the player's current skill level. */
export function nodeHoldSeconds(state: GameState, node: WoodNode): number {
    const spec = NODE_SPECS[node.kind];
    if (spec.interaction !== 'hold') return 0;
    //  D-059: exhaustion lengthens every effortful hold, whatever the node kind — applied
    //  once here, at the single place hold duration is computed, so no gather verb can be
    //  added later that silently escapes it.
    const exhaustion = exhaustionHoldMultiplierFor(state.energy);
    //  Ch.2 mastery, made real (Gate 0 item 3): technique shortens the work. Applied here,
    //  at the one place hold duration exists, for the same reason exhaustion is — so no
    //  gather verb added later can silently escape it.
    const mastery = masteryForNodeKind(state, node.kind).speedMultiplier;
    if (spec.skill === 'woodcutting') {
        //  Woodcutting mastery shortens the chop — the action gets faster, not the number
        //  over the tree (§I.9). The axe's OWN grade (Ch.1 v3, D-055) is a second, distinct
        //  lever on the same stat — skill is the player's mastery, grade is the specific
        //  tool's own quality; they stack multiplicatively rather than one masking the other.
        const level = state.skills.woodcutting.level;
        const base = spec.holdBaseSeconds / (1 + (level - 1) * TUNE.skillSpeedBonusPerLevel);
        return base * axeChopMultiplierFor(state.tools.axeGrade) * exhaustion * mastery;
    }
    return spec.holdBaseSeconds * exhaustion * mastery;
}

/** Why a gather can't happen right now, or null if it can. */
export function gatherBlockedReason(state: GameState, nodeId: string): 'spent' | 'need-axe' | null {
    const node = findNode(state, nodeId);
    if (!node || !node.available) return 'spent';
    if (NODE_SPECS[node.kind].needsAxe && !state.tools.axe) return 'need-axe';
    return null;
}

export interface GatherResult {
    ok: boolean;
    reason: 'spent' | 'need-axe' | null;
    kind: NodeKind | null;
    /** Inventory deltas applied. */
    gained: Partial<Inventory>;
    /** True if this gather opened the crash box (found the flask). */
    foundFlask: boolean;
    /** The skill trained, the XP granted, and the levels it earned. */
    skill: keyof Skills | null;
    xpGained: number;
    levelsGained: number;
    /** What this action taught, if anything — so the body can SAY so. Ch.2 trained domains
     *  from day one and the body never once mentioned it, which is why a director could play
     *  a full session and conclude mastery "only affects forging": the felling effect was
     *  real but nothing on screen ever acknowledged it (D-070 playtest). */
    learned: { domain: KnowledgeDomain; techniqueBefore: number; techniqueAfter: number } | null;
}

/**
 * Gather a node: the one path for driftwood, deadfall, trees, rock, forage, and the crash
 * box. Applies the yield, trains the skill, and reports everything the body needs to draw
 * the result. Mutates state. A blocked gather returns ok:false with a reason.
 */
export function gatherNode(state: GameState, nodeId: string): GatherResult {
    const blocked = gatherBlockedReason(state, nodeId);
    if (blocked) {
        return { ok: false, reason: blocked, kind: null, gained: {}, foundFlask: false, skill: null, xpGained: 0, levelsGained: 0, learned: null };
    }

    const node = findNode(state, nodeId)!;
    const spec = NODE_SPECS[node.kind];
    const gained: Partial<Inventory> = {};
    let foundFlask = false;

    //  FIX-1 (Living Island Track A): charge the per-action energy cost up front, before
    //  the yield switch below — every effortful (hold) kind pays; every tap kind pays
    //  nothing (see effortEnergyCostFor). Clamped at 0: low energy never blocks a gather
    //  this pass, it only makes the castaway sluggish on foot (isExhausted, unchanged).
    //
    //  Ch.6 (D-058): scaled by the current load band — working under a heavy pack costs
    //  more than the same swing unencumbered. This MULTIPLIES the existing D-052 cost
    //  rather than adding a second drain beside it, so there is still exactly one place
    //  effortful energy is priced. A `light` band multiplies by exactly 1, leaving the
    //  pre-Ch.6 numbers bit-for-bit unchanged; a tap kind still costs 0 either way.
    state.energy = Math.max(0, state.energy - effortEnergyCostFor(node.kind) * loadEnergyMultiplierOf(state));

    switch (node.kind) {
        case 'driftwood':
            state.inventory.wood += TUNE.driftwoodTapYield;
            gained.wood = TUNE.driftwoodTapYield;
            break;
        case 'deadfall': {
            const y = deadfallYield(node.id);
            state.inventory.wood += y;
            gained.wood = y;
            break;
        }
        case 'tree':
            state.inventory.wood += TUNE.treeWoodYield;
            gained.wood = TUNE.treeWoodYield;
            break;
        case 'rock':
            state.inventory.stone += TUNE.stoneNodeYield;
            gained.stone = TUNE.stoneNodeYield;
            break;
        case 'berrybush':
            state.inventory.berries += 1;
            gained.berries = 1;
            break;
        case 'coconutpalm':
            state.inventory.coconut += 1;
            state.inventory.fiber += TUNE.palmHuskFiberYield;
            gained.coconut = 1;
            gained.fiber = TUNE.palmHuskFiberYield;
            break;
        case 'reed':
            state.inventory.fiber += TUNE.reedFiberYield;
            gained.fiber = TUNE.reedFiberYield;
            break;
        case 'shellfish':
            state.inventory.shellfish += 1;
            gained.shellfish = 1;
            break;
        case 'crashbox':
            state.inventory.fiber += TUNE.crashBoxFiber;
            state.tools.flask = true;
            state.tools.flaskSips = 0;
            gained.fiber = TUNE.crashBoxFiber;
            foundFlask = TUNE.crashBoxFlask > 0;
            break;
        case 'quarry': {
            //  Repeat-minable (D-051): one tap spends from the pool, not the node itself —
            //  the quarry only "depletes" (below) once the whole pool is spent.
            const take = Math.min(TUNE.quarryYieldPerTap, node.pool ?? 0);
            state.inventory.stone += take;
            gained.stone = take;
            node.pool = (node.pool ?? 0) - take;
            break;
        }
        case 'salvage': {
            //  Plain odds, no loot-box dressing (D-051): the reward was rolled once at
            //  spawn time and simply revealed now.
            switch (node.salvageLoot) {
                case 'driftwood':
                    state.inventory.wood += TUNE.salvageWoodAmount;
                    gained.wood = TUNE.salvageWoodAmount;
                    break;
                case 'cordage':
                    state.inventory.fiber += TUNE.salvageFiberAmount;
                    gained.fiber = TUNE.salvageFiberAmount;
                    break;
                case 'stone':
                    state.inventory.stone += TUNE.salvageStoneAmount;
                    gained.stone = TUNE.salvageStoneAmount;
                    break;
                case 'bundle':
                    state.inventory.wood += TUNE.salvageBundleWoodAmount;
                    state.inventory.stone += TUNE.salvageBundleStoneAmount;
                    state.inventory.fiber += TUNE.salvageBundleFiberAmount;
                    gained.wood = TUNE.salvageBundleWoodAmount;
                    gained.stone = TUNE.salvageBundleStoneAmount;
                    gained.fiber = TUNE.salvageBundleFiberAmount;
                    break;
            }
            break;
        }
    }

    //  Ch.2 mastery, made real (Gate 0 item 3) — the YIELD half, applied ONCE here rather
    //  than inside eight separate yield cases, so a kind added later cannot escape it and
    //  no case can drift out of step with the others.
    //
    //  Understanding gets more out of the same tree. The fractional remainder resolves from
    //  the seeded hash (never `Math.random` — the brain has no randomness), keyed on the
    //  node and the world clock, so the same gather always produces the same answer and a
    //  reload cannot be used to re-roll a better one.
    const yieldMultiplier = masteryForNodeKind(state, node.kind).yieldMultiplier;
    if (yieldMultiplier > 1) {
        const roll = seedFraction(hashText(node.id) + Math.floor(state.gameHoursElapsed * 60));
        for (const key of Object.keys(gained) as Array<keyof Inventory>) {
            const base = gained[key] ?? 0;
            if (base <= 0) continue;
            const exact = base * yieldMultiplier;
            const whole = Math.floor(exact);
            let bonus = (whole - base) + (roll < exact - whole ? 1 : 0);
            //  CONSERVATION. A pool-backed node (the quarry) must not yield more than its
            //  pool holds — mastery gets more out of the rock, it does not conjure rock.
            //  The first cut of this added the bonus straight to the inventory and left the
            //  pool untouched, which quietly created stone from nothing and broke D-051's
            //  whole accounting; a renewability test caught it on the next run.
            if (node.pool !== undefined) {
                bonus = Math.min(bonus, node.pool);
                node.pool -= bonus;
            }
            if (bonus > 0) {
                state.inventory[key] += bonus;
                gained[key] = base + bonus;
            }
        }
    }

    //  The quarry stays available until its pool is actually spent — every other kind is
    //  single-shot, exactly as before. Either way, depletion is stamped with the game clock
    //  so the renewability law (reconcile.ts) knows when to start counting toward regrowth.
    const stillHasPool = node.kind === 'quarry' && (node.pool ?? 0) > 0;
    if (!stillHasPool) {
        node.available = false;
        node.depletedAtGameHours = state.gameHoursElapsed;
    }

    //  Ch.2, item 4: only the verbs the ruling names (felling/quarrying/salvage) train a
    //  domain — `domainForNodeKind` returns null for every other kind, left at the innate
    //  floor this pass, on purpose.
    const learningDomain = domainForNodeKind(node.kind);
    let learned: GatherResult['learned'] = null;
    if (learningDomain) {
        const before = state.knowledge.domains[learningDomain].technique;
        recordTrying(state, learningDomain);
        learned = { domain: learningDomain, techniqueBefore: before, techniqueAfter: state.knowledge.domains[learningDomain].technique };
    }

    let xpGained = 0;
    let levelsGained = 0;
    if (spec.skill) {
        xpGained = TUNE.xpPerMeaningfulAction;
        levelsGained = grantXp(state.skills[spec.skill], xpGained);
    }

    return { ok: true, reason: null, kind: node.kind, gained, foundFlask, skill: spec.skill, xpGained, levelsGained, learned };
}

// ---- Renewability law (D-051) -------------------------------------------
//
// "No survival-critical resource is globally exhaustible — scarcity is rate/effort, never
// extinction." `crashbox` is the one deliberate exemption: it is a fixed, one-time story
// beat (the flask), not a resource, and never regrows.

/** How long, in game hours, a spent node of this kind takes to regrow. Infinity = exempt. */
export function regrowGameHoursFor(kind: NodeKind): number {
    switch (kind) {
        case 'driftwood': return TUNE.driftwoodRegrowGameHours;
        case 'deadfall': return TUNE.deadfallRegrowGameHours;
        case 'tree': return TUNE.treeRegrowGameHours;
        case 'rock': return TUNE.rockRegrowGameHours;
        case 'berrybush': return TUNE.berrybushRegrowGameHours;
        case 'coconutpalm': return TUNE.coconutpalmRegrowGameHours;
        case 'reed': return TUNE.reedRegrowGameHours;
        case 'shellfish': return TUNE.shellfishRegrowGameHours;
        //  GEOLOGY V2 (Gate 0 item 7): the quarry is the FINITE tier. A rich deposit is a
        //  real, spent thing — it visibly empties as you work it and it does not come back.
        //  This does NOT breach D-051's renewability law, because stone itself stays
        //  renewable: surface `rock` still returns on the tide/erosion cycle below, so the
        //  survival floor holds while the *rich* seam is genuinely exhaustible. Scarcity of
        //  convenience, not of survival.
        case 'quarry': return Infinity;
        case 'salvage': return Infinity; // claimed and gone; the beach spawns a new one instead
        case 'crashbox': return Infinity; // exempt: a one-time beat, not a resource
    }
}

/**
 * 0 (just depleted) to 1 (fully regrown / available). Trees additionally read this as a
 * stump (< `TUNE.treeSaplingAtFraction`) or a sapling (between that and 1) for the body to
 * draw (D-051's "sapling stages"). Always 1 for an available node or an exempt kind.
 */
export function regrowProgress(node: WoodNode, currentGameHours: number): number {
    if (node.available || node.depletedAtGameHours === null) return 1;
    const total = regrowGameHoursFor(node.kind);
    if (!Number.isFinite(total)) return 0;
    const elapsed = currentGameHours - node.depletedAtGameHours;
    return Math.max(0, Math.min(1, elapsed / total));
}

// ---- Beach salvage (D-051, pulled forward from Phase 2) -----------------
//
// Reconcile is the only clock the world has (charter §I.8) — so salvage spawns are driven
// by the SAME elapsed-game-hours math as everything else, online and offline alike, never
// by `Math.random()` or a wall-clock read. Position and loot are derived from a seed
// (the spawn count), the same determinism `deadfallYield` already relies on.

/** A small, deterministic 32-bit hash — same technique as `deadfallYield`'s id hash. */
function hash32(seed: number): number {
    let h = seed | 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

/** A pseudo-random fraction in [0, 1) for this seed, stable across calls (pure). */
/** A stable numeric hash of a node id, so seeded rolls can be keyed on it. */
function hashText(text: string): number {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function seedFraction(seed: number): number {
    return hash32(seed) / 0x100000000;
}

// ---- Grades (Ch.1 v3, D-055) --------------------------------------------
//
// Rolled once at craft time via the SAME seeded-hash determinism salvage loot already
// uses above — plain, stated odds (honest-systems law), not loot-box dressing. Checked
// in a fixed order (crude, serviceable, refined, exceptional); `serviceable` is defined to
// reproduce every pre-grade constant exactly, so a save migrated at that baseline grade
// (D-055's v5→v6 migration) feels functionally unchanged.

const GRADE_ROLL_ORDER: ItemGrade[] = ['crude', 'serviceable', 'refined', 'exceptional'];

function gradeOdds(grade: ItemGrade): number {
    switch (grade) {
        case 'crude': return TUNE.gradeOddsCrude;
        case 'serviceable': return TUNE.gradeOddsServiceable;
        case 'refined': return TUNE.gradeOddsRefined;
        case 'exceptional': return TUNE.gradeOddsExceptional;
    }
}

/** Roll a grade from a seed. Exhaustive over `GRADE_ROLL_ORDER`; the final entry is
 *  returned unconditionally past its cumulative threshold, a floating-point guard against
 *  the four odds not summing to exactly 1 in the tune table. */
export function rollGrade(seed: number): ItemGrade {
    const roll = seedFraction(seed);
    let cumulative = 0;
    for (const grade of GRADE_ROLL_ORDER) {
        cumulative += gradeOdds(grade);
        if (roll < cumulative) return grade;
    }
    return GRADE_ROLL_ORDER[GRADE_ROLL_ORDER.length - 1];
}

/** The next craft-roll seed, and advances the counter — the same "counter as seed"
 *  determinism `salvageSpawnCount` already established. Mutates state. */
function nextGradeSeed(state: GameState): number {
    const seed = state.craftRollCount;
    state.craftRollCount += 1;
    return seed;
}

/** The axe's one grade-linked stat: fell speed. Multiplies `treeChopSecondsWithAxe`. */
export function axeChopMultiplierFor(grade: ItemGrade): number {
    return TUNE.axeGradeChopMultiplier[grade];
}

/** The torch's one grade-linked stat: burn duration. */
export function torchBurnGameHoursFor(grade: ItemGrade): number {
    return TUNE.torchBurnGameHours * TUNE.torchGradeBurnMultiplier[grade];
}

/** The shelter's one grade-linked stat: its warmth-drain multiplier (lower is better). */
export function shelterWarmthMultiplierFor(grade: ItemGrade): number {
    return TUNE.shelterGradeWarmthMultiplier[grade];
}

export function activeSalvageCount(nodes: WoodNode[]): number {
    return nodes.filter((n) => n.kind === 'salvage' && n.available).length;
}

/** Game hours until the next salvage spawn is due, drawn from the tuned real-minute range. */
export function salvageIntervalGameHours(seed: number): number {
    const span = TUNE.salvageSpawnMinutesMax - TUNE.salvageSpawnMinutesMin;
    const minutes = TUNE.salvageSpawnMinutesMin + seedFraction(seed) * span;
    return gameHoursFromRealSeconds(minutes * 60);
}

/** How many arc steps a blocked salvage spawn may walk before giving up (D-064). 24 steps
 *  of 15° sweeps the full ring exactly once. */
const SALVAGE_PLACEMENT_ATTEMPTS = 24;
const SALVAGE_PLACEMENT_ARC = (Math.PI * 2) / 24;

const SALVAGE_LOOT_ODDS: ReadonlyArray<SalvageLoot> = ['driftwood', 'cordage', 'stone'];

/**
 * A new salvage node on the beach ring, its position and reward rolled once from `seed`.
 *
 * FIX-3 (Living Island Track A): the radius band used to run up to `WORLD.islandRadius -
 * 4` (118 m) — up to 10 m past `WALKABLE_RADIUS` (108 m), landing spawns in the shore
 * falloff, in or at the water, unreachable on foot. The band is now bounded by
 * `WALKABLE_RADIUS` itself (minus a shore margin, so a spawn never sits exactly on the
 * walkability edge either), and every candidate point is validated against
 * `isWalkablePoint` before it is committed — belt and suspenders, not just a tighter
 * constant, so a future change to either bound cannot silently reopen this gap.
 */
/**
 * Where a salvage find WOULD land for this seed, before placement validation.
 *
 * Exported so a test can witness the blocked-spawn branch instead of hoping a random seed
 * happens to hit it (D-066 a). C3's audit of D-064 measured that branch firing **0 times
 * across seeds 0–499** — the range the property test used — so the ring walk and the centre
 * fallback had zero coverage and the test would have stayed green if the whole block were
 * deleted. A test that cannot witness its target does not test it.
 */
export function salvageCandidatePoint(seed: number): { x: number; y: number } {
    const angle = seedFraction(seed * 2 + 1) * Math.PI * 2;
    const maxRadius = WALKABLE_RADIUS - TUNE.salvageShoreMarginM;
    const radius = WORLD.beachRadius + seedFraction(seed * 2 + 2) * Math.max(0, maxRadius - WORLD.beachRadius);
    return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) };
}

export function spawnSalvageNode(seed: number): WoodNode {
    const angle = seedFraction(seed * 2 + 1) * Math.PI * 2;
    const maxRadius = WALKABLE_RADIUS - TUNE.salvageShoreMarginM;
    const radius = WORLD.beachRadius + seedFraction(seed * 2 + 2) * Math.max(0, maxRadius - WORLD.beachRadius);
    let x = Math.round(Math.cos(angle) * radius);
    let y = Math.round(Math.sin(angle) * radius);
    //  REACHABILITY, THIRD STRIKE (D-064). This used to validate against `isWalkablePoint`,
    //  which models the island as a bare disc and is blind to the decorative rocks and trees
    //  that are real collision obstacles — so a find could land hard against a boulder, be
    //  perfectly "walkable" by the arithmetic, and be physically uncollectable because the
    //  player's own push-out held them further away than they could reach. It now validates
    //  against `isPlaceablePoint`, which enforces D-051's banked constraint
    //  (`objectCollisionRadius + playerCollisionRadius < interactRadiusM`) against every
    //  obstacle rather than only the one that had already broken.
    //
    //  Rather than collapsing a blocked spawn to the island's centre (the old fallback — a
    //  find teleporting inland is its own kind of wrong), walk the ring outward in fixed
    //  steps and take the first genuinely placeable point. Deterministic, seeded, and it
    //  keeps the find on the shore where a beach find belongs.
    if (!isPlaceablePoint(x, y)) {
        let placed = false;
        for (let step = 1; step <= SALVAGE_PLACEMENT_ATTEMPTS && !placed; step++) {
            const nudged = angle + step * SALVAGE_PLACEMENT_ARC;
            const cx = Math.round(Math.cos(nudged) * radius);
            const cy = Math.round(Math.sin(nudged) * radius);
            if (isPlaceablePoint(cx, cy)) { x = cx; y = cy; placed = true; }
        }
        //  Last resort only if the whole ring is somehow blocked: the centre, as before.
        if (!placed) { x = 0; y = 0; }
    }
    const loot: SalvageLoot = seedFraction(seed * 2 + 3) < TUNE.salvageBundleOdds
        ? 'bundle'
        : SALVAGE_LOOT_ODDS[Math.floor(seedFraction(seed * 2 + 4) * SALVAGE_LOOT_ODDS.length)];
    return { id: `sv${seed}`, kind: 'salvage', x, y, available: true, depletedAtGameHours: null, salvageLoot: loot };
}

// ---- Fire (unchanged from Cycle 01) -------------------------------------

export function isFireLit(state: GameState): boolean {
    return state.fire.built && state.fire.fuel > 0;
}

export function fireBurnHoursRemaining(state: GameState): number {
    return Math.max(0, state.fire.fuel) * TUNE.fireBurnGameHoursPerWood;
}

export function canBuildFire(state: GameState): boolean {
    return !state.fire.built && state.inventory.wood >= TUNE.woodPerFire;
}

export function buildFire(state: GameState, x: number, y: number): boolean {
    if (!canBuildFire(state)) return false;
    state.inventory.wood -= TUNE.woodPerFire;
    state.fire = { built: true, fuel: TUNE.woodPerFire, x, y };
    recordTrying(state, 'survivalcraft');
    return true;
}

export function canFeedFire(state: GameState): boolean {
    return state.fire.built && state.inventory.wood >= 1 && state.fire.fuel < TUNE.fireMaxFuel;
}

export function feedFire(state: GameState): boolean {
    if (!canFeedFire(state)) return false;
    state.inventory.wood -= 1;
    state.fire.fuel = Math.min(TUNE.fireMaxFuel, state.fire.fuel + 1);
    recordTrying(state, 'survivalcraft');
    return true;
}

// ---- Geometry and shelter -----------------------------------------------

export function distance(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
}

export function isPlayerInFireRadius(state: GameState): boolean {
    if (!state.fire.built) return false;
    return distance(state.player.x, state.player.y, state.fire.x, state.fire.y) <= TUNE.fireWarmthRadius;
}

export function isSheltered(state: GameState): boolean {
    return isFireLit(state) && isPlayerInFireRadius(state);
}

// ---- Drink and eat ------------------------------------------------------

/** The player is close enough to the pond to drink from it. */
export function isAtPond(state: GameState): boolean {
    return distance(state.player.x, state.player.y, POND.x, POND.y) <= POND.radius + TUNE.interactRadius;
}

export function canDrinkAtPond(state: GameState): boolean {
    return isAtPond(state) && state.thirst < TUNE.thirstMax;
}

/** Drink a sip from the pond. Returns true if it did anything. */
export function drinkAtPond(state: GameState): boolean {
    if (!canDrinkAtPond(state)) return false;
    state.thirst = applyDrink(state.thirst);
    recordTrying(state, 'survivalcraft');
    return true;
}

export function canFillFlask(state: GameState): boolean {
    return state.tools.flask && isAtPond(state) && state.tools.flaskSips < TUNE.flaskCapacitySips;
}

/** Fill the flask at the pond, to carry a drink inland. */
export function fillFlask(state: GameState): boolean {
    if (!canFillFlask(state)) return false;
    state.tools.flaskSips = TUNE.flaskCapacitySips;
    return true;
}

export function canDrinkFlask(state: GameState): boolean {
    return state.tools.flask && state.tools.flaskSips > 0 && state.thirst < TUNE.thirstMax;
}

/** Drink from the carried flask, anywhere. */
export function drinkFlask(state: GameState): boolean {
    if (!canDrinkFlask(state)) return false;
    state.thirst = applyDrink(state.thirst);
    state.tools.flaskSips -= 1;
    recordTrying(state, 'survivalcraft');
    return true;
}

export type Food = 'berries' | 'coconut' | 'shellfish';

export function canEat(state: GameState, food: Food): boolean {
    return state.inventory[food] > 0 && state.hunger < TUNE.hungerMax;
}

/** Eat one unit of a food. Returns true if it did anything. */
export function eat(state: GameState, food: Food): boolean {
    if (state.inventory[food] <= 0) return false;
    //  Coconut is worth drinking even at full hunger (its water); everything else needs
    //  the hunger room. Keep it simple: allow the eat if it would restore *anything*.
    const applied = applyFood(food, state.hunger, state.thirst);
    if (applied.hunger === state.hunger && applied.thirst === state.thirst) return false;
    state.inventory[food] -= 1;
    state.hunger = applied.hunger;
    state.thirst = applied.thirst;
    recordTrying(state, 'survivalcraft');
    return true;
}

// ---- Crafting: the crude axe (the four gates made concrete) --------------
//
// Ch.1 v3 (D-055): the axe now needs a knapped sharp blade, not raw stone directly — the
// stone hammer + knapping (below) is the new Tier-0 step that unlocks it. An axe made
// before this change is untouched (the boolean `tools.axe` doesn't get re-evaluated);
// only a NEW craft goes through the new recipe.

export function canCraftAxe(state: GameState): boolean {
    return (
        !state.tools.axe &&
        state.inventory.wood >= TUNE.axeWoodCost &&
        state.inventory.sharpblade >= TUNE.axeSharpbladeCost &&
        state.inventory.fiber >= TUNE.axeFiberCost
    );
}

/** What the axe still needs — for the craft card. */
export function axeShortfall(state: GameState): { wood: number; sharpblade: number; fiber: number } {
    return {
        wood: Math.max(0, TUNE.axeWoodCost - state.inventory.wood),
        sharpblade: Math.max(0, TUNE.axeSharpbladeCost - state.inventory.sharpblade),
        fiber: Math.max(0, TUNE.axeFiberCost - state.inventory.fiber)
    };
}

/** Spend the recipe and make the axe. Returns false if it can't be paid for. Rolls a
 *  grade (Ch.1 v3, D-055) that scales fell speed only. */
export function craftAxe(state: GameState): boolean {
    if (!canCraftAxe(state)) return false;
    state.inventory.wood -= TUNE.axeWoodCost;
    state.inventory.sharpblade -= TUNE.axeSharpbladeCost;
    state.inventory.fiber -= TUNE.axeFiberCost;
    state.tools.axe = true;
    state.tools.axeGrade = rollGrade(nextGradeSeed(state));
    recordTrying(state, recipeDomain('axe'));
    return true;
}

// ---- The stone hammer + knapping (Ch.1 v3, D-055) — Tier-0 ----------------
//
// The stone hammer's one live verb: knapping raw stone into the sharp-blade intermediate
// the axe recipe now needs — not a standalone item (C1's "no dead-on-arrival tools" rule).

export function canCraftStoneHammer(state: GameState): boolean {
    return (
        !state.tools.stoneHammer &&
        state.inventory.wood >= TUNE.stoneHammerWoodCost &&
        state.inventory.stone >= TUNE.stoneHammerStoneCost
    );
}

/** What the stone hammer still needs — for the craft card. */
export function stoneHammerShortfall(state: GameState): { wood: number; stone: number } {
    return {
        wood: Math.max(0, TUNE.stoneHammerWoodCost - state.inventory.wood),
        stone: Math.max(0, TUNE.stoneHammerStoneCost - state.inventory.stone)
    };
}

export function craftStoneHammer(state: GameState): boolean {
    if (!canCraftStoneHammer(state)) return false;
    state.inventory.wood -= TUNE.stoneHammerWoodCost;
    state.inventory.stone -= TUNE.stoneHammerStoneCost;
    state.tools.stoneHammer = true;
    recordTrying(state, recipeDomain('stonehammer'));
    return true;
}

/** Knapping: repeatable, not a one-time build — no "done" state, just a standing gate on
 *  owning the hammer and holding enough raw stone. */
export function canKnapSharpblade(state: GameState): boolean {
    return state.tools.stoneHammer && state.inventory.stone >= TUNE.knapStoneCost;
}

/** Spend raw stone, gain a sharp blade. Returns false if it can't be paid for. */
export function knapSharpblade(state: GameState): boolean {
    if (!canKnapSharpblade(state)) return false;
    state.inventory.stone -= TUNE.knapStoneCost;
    state.inventory.sharpblade += TUNE.knapSharpbladeYield;
    recordTrying(state, recipeDomain('knap'));
    return true;
}

// ---- The torch (FIX-1 pkg item 5, Living Island Track A) — crafting tree entry #1 ------
//
// wood + fiber -> unlit torch; light it at any active fire; it burns down over game hours
// (reconcile.ts) and is spent, not refuelled — craft another. Carried once owned, the same
// "no equip step, owning it is wearing it" rule the axe already set (D-046(d)).

export function canCraftTorch(state: GameState): boolean {
    return (
        !state.torch.owned &&
        state.inventory.wood >= TUNE.torchWoodCost &&
        state.inventory.fiber >= TUNE.torchFiberCost
    );
}

/** What the torch still needs — for the craft card. */
export function torchShortfall(state: GameState): { wood: number; fiber: number } {
    return {
        wood: Math.max(0, TUNE.torchWoodCost - state.inventory.wood),
        fiber: Math.max(0, TUNE.torchFiberCost - state.inventory.fiber)
    };
}

/** Spend the recipe and make an unlit torch. Returns false if it can't be paid for. */
export function craftTorch(state: GameState): boolean {
    if (!canCraftTorch(state)) return false;
    state.inventory.wood -= TUNE.torchWoodCost;
    state.inventory.fiber -= TUNE.torchFiberCost;
    const grade = rollGrade(nextGradeSeed(state));
    state.torch = { owned: true, lit: false, fuelGameHoursRemaining: torchBurnGameHoursFor(grade), grade };
    recordTrying(state, recipeDomain('torch'));
    return true;
}

/**
 * True once an owned, unlit, unspent torch is at a fire that is actually burning. This is
 * checked (and called) only once the player is already within `interactRadiusM` of the
 * fire, the same reach every other direct-world interaction uses (D-042) — no separate
 * radius here.
 */
export function canLightTorch(state: GameState): boolean {
    return state.torch.owned && !state.torch.lit && state.torch.fuelGameHoursRemaining > 0 && isFireLit(state);
}

/** Light the carried torch from an active fire. Returns false if it can't be lit. */
export function lightTorch(state: GameState): boolean {
    if (!canLightTorch(state)) return false;
    state.torch.lit = true;
    recordTrying(state, 'survivalcraft');
    return true;
}

// ---- Construction: shelter, storage, upkeep (Cycle 05) -------------------
//
// Both structures share one shape (Structure/StorageState in types.ts) and one law:
// disrepair, never deletion (charter honest-systems). `isNearShelter`/`isNearStorage` are
// distinct from the fire's `isSheltered` above on purpose — one is "near a lit fire", the
// other "near the lean-to"; they are independent bonuses that can both apply at once.

export function isNearShelter(state: GameState): boolean {
    return state.shelter.built && distance(state.player.x, state.player.y, state.shelter.x, state.shelter.y) <= TUNE.shelterRadius;
}

export function isNearStorage(state: GameState): boolean {
    return state.storage.built && distance(state.player.x, state.player.y, state.storage.x, state.storage.y) <= TUNE.interactRadiusM;
}

export function canBuildShelter(state: GameState): boolean {
    return (
        !state.shelter.built &&
        state.inventory.wood >= TUNE.shelterWoodCost &&
        state.inventory.stone >= TUNE.shelterStoneCost &&
        state.inventory.fiber >= TUNE.shelterFiberCost
    );
}

/** What the shelter still needs — for the build card. */
export function shelterShortfall(state: GameState): { wood: number; stone: number; fiber: number } {
    return {
        wood: Math.max(0, TUNE.shelterWoodCost - state.inventory.wood),
        stone: Math.max(0, TUNE.shelterStoneCost - state.inventory.stone),
        fiber: Math.max(0, TUNE.shelterFiberCost - state.inventory.fiber)
    };
}

export function buildShelter(state: GameState, x: number, y: number): boolean {
    if (!canBuildShelter(state)) return false;
    state.inventory.wood -= TUNE.shelterWoodCost;
    state.inventory.stone -= TUNE.shelterStoneCost;
    state.inventory.fiber -= TUNE.shelterFiberCost;
    const grade = rollGrade(nextGradeSeed(state));
    state.shelter = { built: true, x, y, durability: TUNE.structureDurabilityMax, grade };
    recordTrying(state, recipeDomain('shelter'));
    return true;
}

export function canBuildStorage(state: GameState): boolean {
    return (
        !state.storage.built &&
        state.inventory.wood >= TUNE.storageWoodCost &&
        state.inventory.stone >= TUNE.storageStoneCost
    );
}

/** What storage still needs — for the build card. */
export function storageShortfall(state: GameState): { wood: number; stone: number } {
    return {
        wood: Math.max(0, TUNE.storageWoodCost - state.inventory.wood),
        stone: Math.max(0, TUNE.storageStoneCost - state.inventory.stone)
    };
}

export function buildStorage(state: GameState, x: number, y: number): boolean {
    if (!canBuildStorage(state)) return false;
    state.inventory.wood -= TUNE.storageWoodCost;
    state.inventory.stone -= TUNE.storageStoneCost;
    state.storage = { built: true, x, y, durability: TUNE.structureDurabilityMax, stored: { wood: 0, stone: 0, fiber: 0 } };
    recordTrying(state, recipeDomain('storage'));
    return true;
}

/** True while a structure's durability has lapsed to 0 — its bonus is paused, not gone. */
export function isInDisrepair(structure: Structure): boolean {
    return structure.built && structure.durability <= 0;
}

export type RepairTarget = 'shelter' | 'storage';

/**
 * Whether mending this structure is possible right now: it exists, it is not already whole,
 * you are standing at it, and you are carrying wood.
 *
 * **No durability threshold** (D-066 pass, 2026-07-27). There used to be one — repair only
 * "counted" below 90% of max — and it existed purely to stop mending from stealing the tap
 * from sleeping and from opening the box. That was a priority hack wearing an availability
 * test's clothes, and it produced a dead zone: with mending also gated on urgency (<40%), a
 * shelter between 40% and 90% could not be mended by any input at all, and since a repair is
 * +15 a shelter that had once decayed past 40 sat capped near 55/100 forever.
 *
 * Mending is now its own explicit action on its own control, so it competes with nothing and
 * needs no threshold. The full range is reachable.
 */
export function canRepairStructure(state: GameState, which: RepairTarget): boolean {
    const structure = state[which];
    if (!structure.built || structure.durability >= TUNE.structureDurabilityMax) return false;
    if (state.inventory.wood <= 0) return false;
    return which === 'shelter' ? isNearShelter(state) : isNearStorage(state);
}

/** Spend one wood to restore `repairDurabilityPerWood` durability. Returns true if it did anything. */
export function repairStructure(state: GameState, which: RepairTarget): boolean {
    if (!canRepairStructure(state, which)) return false;
    state.inventory.wood -= 1;
    const structure = state[which];
    structure.durability = Math.min(TUNE.structureDurabilityMax, structure.durability + TUNE.repairDurabilityPerWood);
    //  "Building shelter/storage/repair -> Construction" — one domain regardless of which
    //  structure, since both live there anyway.
    recordTrying(state, 'construction');
    return true;
}

/** The raw-material keys storage can hold — personal inventory carries food too; storage never does. */
const STORABLE_KEYS: Array<keyof StorageInventory> = ['wood', 'stone', 'fiber'];

export interface StorageActionResult {
    ok: boolean;
    action: 'deposit' | 'withdraw' | null;
    moved: Partial<StorageInventory>;
}

/**
 * Tap the storage crate: the disjoint-state rule that correctly resolved the pond's
 * fill-vs-drink conflict (D-042 audit), applied here up front. Carrying any raw material
 * deposits all of it; carrying none, with the crate holding any, withdraws a fixed batch
 * per resource. The two conditions cannot both be true, so neither can starve the other.
 */
export function useStorage(state: GameState): StorageActionResult {
    if (!state.storage.built) return { ok: false, action: null, moved: {} };

    const carrying = STORABLE_KEYS.some((key) => state.inventory[key] > 0);
    if (carrying) {
        const moved: Partial<StorageInventory> = {};
        for (const key of STORABLE_KEYS) {
            if (state.inventory[key] > 0) {
                moved[key] = state.inventory[key];
                state.storage.stored[key] += state.inventory[key];
                state.inventory[key] = 0;
            }
        }
        return { ok: true, action: 'deposit', moved };
    }

    const holding = STORABLE_KEYS.some((key) => state.storage.stored[key] > 0);
    if (!holding) return { ok: false, action: null, moved: {} };

    const moved: Partial<StorageInventory> = {};
    for (const key of STORABLE_KEYS) {
        const take = Math.min(state.storage.stored[key], TUNE.storageWithdrawBatch);
        if (take > 0) {
            moved[key] = take;
            state.storage.stored[key] -= take;
            state.inventory[key] += take;
        }
    }
    return { ok: true, action: 'withdraw', moved };
}

// ---- Energy and sleep (Cycle 05) ------------------------------------------

/** Below `energyLowThreshold`: sluggish (slower on foot), never a death vector this cycle. */
export function isExhausted(state: GameState): boolean {
    return state.energy <= TUNE.energyLowThreshold;
}

/**
 * Sleeping is always possible — a tired human can lie down anywhere (director's request).
 * WHERE they lie down is what differs: see `isShelteredSleep`.
 */
export function canSleep(state: GameState): boolean {
    void state;
    return true;
}

/**
 * True when this sleep happens under the shelter's roof. A rough sleep on the open ground
 * recovers more slowly (`groundSleepRecoveryMultiplier`) and gets no roof between the
 * survivor and the weather — the existing wet/warmth interaction then applies normally,
 * which is the whole penalty. Nothing new is invented for it.
 */
export function isShelteredSleep(state: GameState): boolean {
    return isNearShelter(state);
}

// ---- Death and respawn --------------------------------------------------

/**
 * Wake washed ashore after a death. Inventory, tools, skills, fire, and the island are
 * kept (v1 mercy, charter §14); the cause is recorded for the overlay. Called by the
 * session when reconcile reports a death.
 *
 * FIX-2 (Living Island Track A; interim only — the full death design is a later dossier
 * chapter, not built here): a death used to refill every vital to full — a free-refill
 * loop indistinguishable from genuinely eating, drinking, and sleeping. Respawn now wakes
 * the castaway diminished: thirst/hunger/energy at `respawnVitalFraction` (~50%), health
 * lower still at `respawnHealthFraction` (~30%). Warmth is the one deliberate exception,
 * kept at max — it is the acute killer (Rule of Threes, charter §I.6), and stacking a
 * second cold-death on the heels of the first is a tradeoff for the full death chapter to
 * make, not this interim fix. Wet resets to 0 regardless — a dry wake-up was never part of
 * the exploit (0 is the already-desired state, not a refill).
 *
 * Cycle 05 (§2): once a shelter is built, it — not the original beach — is home.
 *
 * Ch.6 (D-058) adds the death COST and the lesson. A death now takes a small, floored
 * fraction of each CARRIED loose resource stack (`deathResourceLoss` in body.ts) — and
 * nothing else. **Tools survive, stored goods survive, skills survive, and KnowledgeState
 * survives**: that last one is Ch.2's amendment B, a standing law, which this second
 * system respects rather than re-litigates. Storage is deliberately untouched too — what
 * you were carrying scatters where you fell; what you took the trouble to store at home is
 * exactly the investment a built crate is supposed to protect. The lesson is a
 * cause-specific respawn message (`respawnMessageFor`), recorded in the death log alongside
 * what the death actually cost, so "what did that one take from me" is answerable from the
 * record instead of from memory.
 */
export function respawn(state: GameState, cause: string): void {
    state.player = state.shelter.built ? { x: state.shelter.x, y: state.shelter.y } : { x: SPAWN.x, y: SPAWN.y };
    state.warmth = TUNE.warmthMax;
    state.thirst = TUNE.thirstMax * TUNE.respawnVitalFraction;
    state.hunger = TUNE.hungerMax * TUNE.respawnVitalFraction;
    state.energy = TUNE.energyMax * TUNE.respawnVitalFraction;
    state.health = TUNE.healthMax * TUNE.respawnHealthFraction;
    state.wet = 0;
    //  Ch.6: waking is a genuine rest — a death clears accumulated fatigue rather than
    //  compounding it. The setback is the lost resources and the lost vitals, never a body
    //  that starts the next attempt already worn out.
    state.fatigue = 0;
    state.resting = false;
    //  Ch.6: the cost. Computed first (pure), then applied, so the log records exactly what
    //  was taken. Tools/storage/skills/knowledge are not touched by this loop at all.
    const lost = deathResourceLoss(state);
    for (const [kind, amount] of Object.entries(lost)) {
        state.inventory[kind as keyof typeof state.inventory] -= amount;
    }
    const message = respawnMessageFor(cause);
    state.lastDeathCause = cause;
    state.trace.deaths += 1;
    //  FIX-2: log every death (cause + the game-clock moment) to the trace, surfaced in
    //  the debug export (D-050's tool) — a death-loop report should never depend on the
    //  player's memory of what killed them and when. Ch.6 extends the entry with the
    //  lesson the player was actually shown and what the death cost.
    state.trace.deathLog = [...state.trace.deathLog, { cause, gameHoursElapsed: state.gameHoursElapsed, message, lost }];
}

/** The lesson line for the most recent death, for the death overlay. Null when nothing has
 *  killed the castaway yet, or once the overlay has been acknowledged. */
export function lastRespawnMessage(state: GameState): string | null {
    return state.lastDeathCause === null ? null : respawnMessageFor(state.lastDeathCause);
}
