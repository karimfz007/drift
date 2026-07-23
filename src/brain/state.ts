/**
 * BRAIN — run state: creation, and the pure rules behind every player verb.
 * Zero rendering engine. The body calls these and then draws the result.
 */

import { TUNE } from '../data/tune';
import { POND, SPAWN, createNodes } from '../data/world';
import { grantXp, newSkill } from './skills';
import { applyDrink, applyFood } from './vitals';
import {
    SCHEMA_VERSION,
    type GameState,
    type Inventory,
    type NodeKind,
    type Skills,
    type StorageInventory,
    type Structure,
    type WoodNode
} from './types';

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
        inventory: emptyInventory(),
        tools: { axe: false, flask: false, flaskSips: 0 },
        skills: emptySkills(),
        fire: { built: false, fuel: 0, x: 0, y: 0 },
        shelter: { built: false, x: 0, y: 0, durability: TUNE.structureDurabilityMax },
        storage: { built: false, x: 0, y: 0, durability: TUNE.structureDurabilityMax, stored: { wood: 0, stone: 0, fiber: 0 } },
        player: { x: SPAWN.x, y: SPAWN.y },
        nodes: createNodes(),
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
            activeMs: 0
        },
        lastDeathCause: null
    };
}

export function emptyInventory(): Inventory {
    return { wood: 0, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0 };
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
        player: { ...state.player },
        nodes: state.nodes.map((n) => ({ ...n })),
        settings: { ...state.settings },
        trace: { ...state.trace }
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
    crashbox: { interaction: 'hold', needsAxe: true, skill: null, holdBaseSeconds: TUNE.deadfallHoldSeconds }
};

export function nodeSpec(kind: NodeKind): NodeSpec {
    return NODE_SPECS[kind];
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

/** Real seconds to complete a hold on this node, at the player's current skill level. */
export function nodeHoldSeconds(state: GameState, node: WoodNode): number {
    const spec = NODE_SPECS[node.kind];
    if (spec.interaction !== 'hold') return 0;
    if (spec.skill === 'woodcutting') {
        //  Woodcutting mastery shortens the chop — the action gets faster, not the number
        //  over the tree (§I.9).
        const level = state.skills.woodcutting.level;
        return spec.holdBaseSeconds / (1 + (level - 1) * TUNE.skillSpeedBonusPerLevel);
    }
    return spec.holdBaseSeconds;
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
}

/**
 * Gather a node: the one path for driftwood, deadfall, trees, rock, forage, and the crash
 * box. Applies the yield, trains the skill, and reports everything the body needs to draw
 * the result. Mutates state. A blocked gather returns ok:false with a reason.
 */
export function gatherNode(state: GameState, nodeId: string): GatherResult {
    const blocked = gatherBlockedReason(state, nodeId);
    if (blocked) {
        return { ok: false, reason: blocked, kind: null, gained: {}, foundFlask: false, skill: null, xpGained: 0, levelsGained: 0 };
    }

    const node = findNode(state, nodeId)!;
    const spec = NODE_SPECS[node.kind];
    const gained: Partial<Inventory> = {};
    let foundFlask = false;

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
    }

    node.available = false;

    let xpGained = 0;
    let levelsGained = 0;
    if (spec.skill) {
        xpGained = TUNE.xpPerMeaningfulAction;
        levelsGained = grantXp(state.skills[spec.skill], xpGained);
    }

    return { ok: true, reason: null, kind: node.kind, gained, foundFlask, skill: spec.skill, xpGained, levelsGained };
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
    return true;
}

export function canFeedFire(state: GameState): boolean {
    return state.fire.built && state.inventory.wood >= 1 && state.fire.fuel < TUNE.fireMaxFuel;
}

export function feedFire(state: GameState): boolean {
    if (!canFeedFire(state)) return false;
    state.inventory.wood -= 1;
    state.fire.fuel = Math.min(TUNE.fireMaxFuel, state.fire.fuel + 1);
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
    return true;
}

// ---- Crafting: the crude axe (the four gates made concrete) --------------

export function canCraftAxe(state: GameState): boolean {
    return (
        !state.tools.axe &&
        state.inventory.wood >= TUNE.axeWoodCost &&
        state.inventory.stone >= TUNE.axeStoneCost &&
        state.inventory.fiber >= TUNE.axeFiberCost
    );
}

/** What the axe still needs — for the craft card. */
export function axeShortfall(state: GameState): { wood: number; stone: number; fiber: number } {
    return {
        wood: Math.max(0, TUNE.axeWoodCost - state.inventory.wood),
        stone: Math.max(0, TUNE.axeStoneCost - state.inventory.stone),
        fiber: Math.max(0, TUNE.axeFiberCost - state.inventory.fiber)
    };
}

/** Spend the recipe and make the axe. Returns false if it can't be paid for. */
export function craftAxe(state: GameState): boolean {
    if (!canCraftAxe(state)) return false;
    state.inventory.wood -= TUNE.axeWoodCost;
    state.inventory.stone -= TUNE.axeStoneCost;
    state.inventory.fiber -= TUNE.axeFiberCost;
    state.tools.axe = true;
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
    state.shelter = { built: true, x, y, durability: TUNE.structureDurabilityMax };
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
    return true;
}

/** True while a structure's durability has lapsed to 0 — its bonus is paused, not gone. */
export function isInDisrepair(structure: Structure): boolean {
    return structure.built && structure.durability <= 0;
}

export type RepairTarget = 'shelter' | 'storage';

/**
 * True once durability has dropped below `structureRepairThresholdFraction` of max — a real
 * threshold, not "less than 100.000". Passive decay is continuous, so `durability < max` is
 * true almost all the time; gating on that alone would make repair win the sleep/storage-use
 * disjoint choice on nearly every tap, the same one-condition-always-true bug class that
 * starved Build-fire in C03 (D-040/D-042). Cosmetic decay noise never triggers repair.
 */
export function canRepairStructure(state: GameState, which: RepairTarget): boolean {
    const structure = state[which];
    if (!structure.built || structure.durability >= TUNE.structureDurabilityMax * TUNE.structureRepairThresholdFraction) return false;
    if (state.inventory.wood <= 0) return false;
    return which === 'shelter' ? isNearShelter(state) : isNearStorage(state);
}

/** Spend one wood to restore `repairDurabilityPerWood` durability. Returns true if it did anything. */
export function repairStructure(state: GameState, which: RepairTarget): boolean {
    if (!canRepairStructure(state, which)) return false;
    state.inventory.wood -= 1;
    const structure = state[which];
    structure.durability = Math.min(TUNE.structureDurabilityMax, structure.durability + TUNE.repairDurabilityPerWood);
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

export function canSleep(state: GameState): boolean {
    return isNearShelter(state);
}

// ---- Death and respawn --------------------------------------------------

/**
 * Wake washed ashore after a death. Inventory, tools, skills, fire, and the island are
 * kept (v1 mercy, charter §14); vitals reset so you do not immediately die again, and the
 * cause is recorded for the overlay. Called by the session when reconcile reports a death.
 *
 * Cycle 05 (§2): once a shelter is built, it — not the original beach — is home. Energy
 * and wet reset with the rest of the vitals; a death is a clean slate, not a lingering one.
 */
export function respawn(state: GameState, cause: string): void {
    state.player = state.shelter.built ? { x: state.shelter.x, y: state.shelter.y } : { x: SPAWN.x, y: SPAWN.y };
    state.warmth = TUNE.warmthMax;
    state.thirst = TUNE.thirstMax;
    state.hunger = TUNE.hungerMax;
    state.health = TUNE.healthMax;
    state.energy = TUNE.energyMax;
    state.wet = 0;
    state.lastDeathCause = cause;
    state.trace.deaths += 1;
}
