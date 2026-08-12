/**
 * BRAIN — run state: creation, and the pure rules behind every player verb.
 * Zero rendering engine. The body calls these and then draws the result.
 */

import { gameHoursFromRealSeconds } from './clock';
import { arrivalProfile } from './arrival';
import { createBoars } from './fauna';
import { disturb, harmFromWorking } from './wreck';
import { submerge } from './dive';
import { freshFishing } from './fishing';
import { freshStorm } from './storm';
import { freshRadio, salvageReceiver } from './radio';
import { freshCrash } from './crash';
import { freshWater } from './vessel';
import { answerLoss, degradeProfile, upkeepNote } from './upkeep';
import { builtShelterProfile } from './vulnerability';
import { freshDefects, hasOutstandingWork, mendWorst } from './upkeep';
import { freshTraces } from './traces';
import { freshInjuries } from './injury';
import { freshIllness, onsetFrom } from './illness';
import { TUNE } from '../data/tune';
import { suspicionFor } from './discovery';
import { freshCapacities } from './capacities';
import { freshConfidence } from './confidence';
import { freshMatterWear, isSpoiled, transformationFor } from './matter';
import {
    CAVE_SITE, POND, SPAWN, SURF_LINE_RADIUS, WALKABLE_RADIUS, WORLD,
    createNodes, isDryLand, isPlaceablePoint, waterDepthAt
} from '../data/world';

import { applyEffect, demandFor, resolveActivity } from './resolver';
import { cloneDomainScores, domainForNodeKind, freshDomainScores, recordTrying, masteryForNodeKind } from './knowledge';
import { cloneLoadout, freshLoadout } from './loadout';
import { recipeDomain } from './recipes';
import { grantXp, newSkill } from './skills';
import { applyDrink, applyFood, type Food } from './vitals';
import {
    SCHEMA_VERSION,
    type GameState,
    type Inventory,
    type ItemGrade,
    type JournalState,
    type NodeKind,
    type MaterialKind,
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
        //  LAWS 115-117: the first survivor lands EXACTLY as every successor does. This used
        //  to read `warmthMax`/`thirstMax`/... — six full bars, a castaway who had survived
        //  nothing — and the director reported it as "100% spawn". The profile is spread here
        //  rather than restated so the two arrivals cannot drift apart again.
        ...arrivalBody(),
        fatigue: 0,
        resting: false,
        inventory: emptyInventory(),
        tools: { axe: false, spear: false, backpack: false, flask: false, flaskSips: 0, stoneHammer: false, axeGrade: 'serviceable', fishingLine: false, net: false },
        skills: emptySkills(),
        fire: { built: false, fuel: 0, x: 0, y: 0 },
        shelter: { built: false, x: 0, y: 0, durability: TUNE.structureDurabilityMax, grade: 'serviceable', defects: freshDefects() },
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
        lastDeathCause: null,
        //  §12's eight capacities and the confidence layer (v13). Both start fresh; neither
        //  is derivable from anything already in the save, so both are seeded here.
        capacities: freshCapacities(),
        confidence: freshConfidence(),
        matterWear: freshMatterWear(),
        //  Slice 3. The first castaway arrives to an empty island and an empty graveyard;
        //  everything here is about the PLACE, so it is seeded once and then only ever added
        //  to. `survivorStartedAtGameHours` is 0 because the world clock and this survivor's
        //  clock start together exactly once — for the first life, and never again.
        memorial: [],
        survivorStartedAtGameHours: 0,
        journal: freshJournal(),
        //  DROP 1: the boars were here before the survivor and stay after. Created once,
        //  never added to — the absence of a spawner is the no-spawn-waves rail, in code.
        boars: createBoars(),
        //  FISHING — nothing cast, nothing set, nothing going off. `freshUntil` starts EMPTY
        //  rather than seeded with zeroes: a clock only exists once there is something to
        //  spoil, so an empty pack is not carrying four expired countdowns.
        fishing: freshFishing(),
        //  RAIN & WET ESCALATION — clear skies, and the first storm a comfortable way off.
        storm: freshStorm(),
        radio: freshRadio(),
        crash: freshCrash(),
        water: freshWater(),
        freshUntil: {},
        injuries: freshInjuries(),
        illness: freshIllness(),
        //  The cave is TERRAIN: it is on the island from the first second, unfound. Placed
        //  from the same seeded constants the island uses so every survivor's cave is in the
        //  same place across a succession — the island persists, and so does its geology.
        cave: { found: false, x: CAVE_SITE.x, y: CAVE_SITE.y, sheltering: false },
        dropped: [],
        dropCount: 0,
        //  THE MARITIME SLICE. No raft — it is the largest thing in the game to make and the
        //  only one that leaves the island, so it is earned like everything else post-pivot.
        raft: { built: false, x: 0, y: 0, grade: 'serviceable', aboard: false },
        //  The wreck has been on the horizon since Cycle 03 and nobody has ever been to it.
        wreck: { reached: false, reachedAtGameHours: null, instability: 0, lastDisturbedAtGameHours: null },
        //  THE UNDERWATER SLICE. At the surface with a full breath, which is where every
        //  castaway starts and where an absence always returns them.
        dive: { submerged: false, air: TUNE.diveAirCapacityBase, deepestM: 0 },
        //  Nobody has read anything on the far island, because nobody has been.
        traces: freshTraces()
    };
}

/**
 * The six body values of the arrival profile, ready to spread. Split from `arrivalProfile`
 * because that carries a `condition` sentence for the UI, and spreading a string into
 * `GameState` would be a type error waiting to be silenced with a cast.
 */
function arrivalBody(): Pick<GameState, 'warmth' | 'thirst' | 'hunger' | 'health' | 'energy' | 'wet'> {
    const p = arrivalProfile();
    return { warmth: p.warmth, thirst: p.thirst, hunger: p.hunger, health: p.health, energy: p.energy, wet: p.wet };
}

/** No journal until someone makes one. See `journal.ts` — this is the absent state. */
export function freshJournal(): JournalState {
    return { exists: false, x: 0, y: 0, carried: false, condition: 1, entries: [], lastWrittenAtGameHours: null };
}

export function emptyInventory(): Inventory {
    return {
        wood: 0, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0, sharpblade: 0, meat: 0, fish: 0,
        //  THE WRECK SLICE. Zero, and a fresh castaway can never gain one on the island —
        //  every gram of these exists 115 m offshore.
        metal: 0, wiring: 0, glass: 0, medicine: 0
    };
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
        //  ENTROPY & MAINTENANCE — the named places clone BY VALUE. The outer spread copies
        //  the reference, so a cloned state would otherwise mend the original's roof.
        shelter: { ...state.shelter, defects: { ...state.shelter.defects } },
        cave: { ...state.cave },
        storage: { ...state.storage, stored: { ...state.storage.stored } },
        torch: { ...state.torch },
        raft: { ...state.raft },
        wreck: { ...state.wreck },
        dive: { ...state.dive },
        storm: { ...state.storm },
        fishing: {
            line: state.fishing.line ? { ...state.fishing.line } : null,
            net: state.fishing.net ? { ...state.fishing.net } : null,
        },
        freshUntil: { ...state.freshUntil },
        traces: { read: [...state.traces.read] },
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
    //  DROP 2 — the bluff. No axe (it is stone), no skill (Ch.2's anti-grind: repetition on
    //  an inexhaustible face must never become an XP faucet), and a hold long enough that
    //  working it by hand is a real decision rather than a reflex.
    boulder: { interaction: 'hold', needsAxe: false, skill: null, holdBaseSeconds: TUNE.boulderHoldSecondsByHand },
    salvage: { interaction: 'tap', needsAxe: false, skill: null, holdBaseSeconds: 0 },
    //  THE WRECK SLICE. A HOLD, and no axe: prying a hull apart is effortful and needs
    //  hands and leverage, not an edge. No skill trains — `woodcutting`/`foraging` are both
    //  island verbs and neither describes working a wreck; the domain that DOES describe it
    //  (`navigationSeamanship`) is trained through `recordTrying` at the call site, the same
    //  way the raft and the crossing already do.
    wreckpart: { interaction: 'hold', needsAxe: false, skill: null, holdBaseSeconds: TUNE.deadfallHoldSeconds },
    //  THE UNDERWATER SLICE. A hold, no axe — same shape as the wreck, and the only thing
    //  that makes it different is that the air budget is running while you do it.
    divepart: { interaction: 'hold', needsAxe: false, skill: null, holdBaseSeconds: TUNE.deadfallHoldSeconds },
    //  FISHING — a TAP, and it never reaches `gatherNode`. A fishing spot is the one node
    //  kind that is not a thing you pick up: the tap fires the fishing circle's default verb
    //  (cast a line) and the hold opens all three methods, exactly as the pond already does
    //  for drink/fill/fish. The spec exists so the kind is total everywhere the compiler
    //  checks, and `holdBaseSeconds` is 0 because nothing here is ever held.
    fishingspot: { interaction: 'tap', needsAxe: false, skill: null, holdBaseSeconds: 0 }
};

export function nodeSpec(kind: NodeKind): NodeSpec {
    return NODE_SPECS[kind];
}

/**
 * Every node kind there is, derived from the spec table rather than typed out again.
 *
 * C3 finding A8: the mastery guard asserted its rule against `NODE_SPECS.interaction`
 * (good) but iterated a hand-written list of kinds (not good) — so a kind added to the
 * game and forgotten in that list would be skipped in silence, and the guard would stay
 * green while the very drift it exists to catch went unexamined. `NODE_SPECS` is
 * `Record<NodeKind, NodeSpec>`, so its keys ARE the exhaustive set and the compiler
 * maintains them. One list, one place.
 */
export const ALL_NODE_KINDS = Object.keys(NODE_SPECS) as NodeKind[];

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
        case 'boulder': return TUNE.boulderEnergySwing;
        case 'coconutpalm': return TUNE.energyCostCoconutGather;
        case 'crashbox': return TUNE.energyCostCrashboxOpen;
        case 'driftwood': return 0;
        case 'berrybush': return 0;
        case 'reed': return 0;
        case 'shellfish': return 0;
        case 'salvage': return 0;
        case 'wreckpart': return TUNE.wreckPartEffortEnergy;
        case 'divepart': return TUNE.divePartEffortEnergy;
        //  FISHING — ZERO, and it is not an oversight. A fishing spot is never gathered;
        //  each method charges its own price where that price is actually paid (the spear's
        //  `spearFishEnergy`, the line's minutes, the net's tether). A cost here would be a
        //  second, invisible one on top.
        case 'fishingspot': return 0;
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
    //  THE BLUFF IS MISERABLE BY HAND AND WORKABLE WITH THE HAMMER. The hammer is the only
    //  tool that touches it today; a pick takes this further later. Note what is NOT here:
    //  no skill term. Ch.2's anti-grind holds by construction — mastery still speeds the work
    //  through `mastery` below, but the bluff trains no skill, so an inexhaustible face can
    //  never become an XP faucet however long you stand at it.
    if (node.kind === 'boulder') {
        const base = state.tools.stoneHammer
            ? TUNE.boulderHoldSecondsWithHammer
            : TUNE.boulderHoldSecondsByHand;
        return base * exhaustion * mastery;
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
    /** DROP 5 — this hold was the one that found the receiver in the instrument housing. */
    foundReceiver: boolean;
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
/**
 * GOING UNDER TO REACH SOMETHING. A dive begins by reaching for what is on the bottom, which
 * is the decision a player actually makes — nobody submerges for its own sake.
 *
 * Returns false when there is nothing to submerge into, which is the honest answer in shallow
 * water and the reason this is a predicate rather than a command.
 */
export function submergeForNode(state: GameState, nodeId: string): boolean {
    const node = findNode(state, nodeId);
    if (!node || node.kind !== 'divepart') return false;
    return submerge(state);
}

export function gatherNode(state: GameState, nodeId: string): GatherResult {
    const blocked = gatherBlockedReason(state, nodeId);
    if (blocked) {
        return { ok: false, reason: blocked, kind: null, gained: {}, foundFlask: false, foundReceiver: false, skill: null, xpGained: 0, levelsGained: 0, learned: null };
    }

    const node = findNode(state, nodeId)!;
    const spec = NODE_SPECS[node.kind];
    const gained: Partial<Inventory> = {};
    let foundFlask = false;
    let foundReceiver = false;

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
    //  PART 3 — THROUGH THE ONE BODY RESOLVER. This line used to BE the body model for every
    //  effortful act in the game: one channel, one multiplier, one subtraction. §13's formula
    //  existed the whole time and governed nothing.
    //
    //  It now declares what the ACT is and lets the resolver supply what it costs THIS body
    //  HERE — load (as before), and additionally impairment and environment, which this call
    //  site never knew about. `demandFor` derives the base demand from the same shipped
    //  constant, so a neutral body pays exactly what it always paid; a wounded, frozen or
    //  exhausted one now pays more, which is the causality that was described and not wired.
    applyEffect(state, resolveActivity(state, {
        id: `gather:${node.kind}`,
        baseDemand: demandFor(effortEnergyCostFor(node.kind)),
        durationGameHours: 1,
    }));

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
        case 'boulder': {
            //  THE BLUFF. Yields and NEVER depletes — `available` is untouched, there is no
            //  pool, and nothing about this branch can make the node go away. That absence is
            //  the mechanic: the D-051 First Amendment requires the survival floor to be
            //  reachable through ACTIVE PLAY ALONE, and this is the path that asks only for
            //  time and effort rather than for the tide.
            //
            //  It NEVER PRETENDS TO DEPLETE. No shrink, no pool counter, no "exhausted" state
            //  — a rock face that visibly wore away would be the game lying about its own
            //  geology, and the honesty rules forbid it. What it does record is a chip SCAR
            //  (see `boulderScarFadeGameHours`), which weathers smooth again: the island's
            //  skin heals, its mass never changes.
            state.inventory.stone += TUNE.boulderYieldPerSwing;
            gained.stone = TUNE.boulderYieldPerSwing;
            node.depletedAtGameHours = state.gameHoursElapsed;   // the scar's clock, not a death
            break;
        }
        case 'wreckpart': {
            //  ---- THE WRECK SLICE: what the crossing buys, and what lingering costs -------
            //
            //  THE HARM IS READ AND DEALT BEFORE THE YIELD, and the order is the contract.
            //  `harmFromWorking` reads the hull the survivor was WARNED about — the state
            //  before this action's own disturbance. Reading it after would charge them for a
            //  stage they were never told of, which is precisely what the five-stage grammar
            //  exists to prevent. They still get the salvage: the wreck shifting does not
            //  cancel the work, it costs you for doing it anyway.
            const harm = harmFromWorking(state.wreck);
            if (harm.health > 0) {
                state.health = Math.max(0, state.health - harm.health);
                //  Torn on sharp metal is a WOUND, through the shipped injury model — not a
                //  wreck-specific harm invented beside it. Bleeding out here is the real
                //  danger, because the shore is 115 m away.
                state.injuries = {
                    ...state.injuries,
                    bleeding: Math.min(TUNE.injuryBleedMax, state.injuries.bleeding + harm.bleeding),
                };
            }

            //  Which part this is decides what it yields — authored per part, so the medical
            //  store is a PLACE on the wreck rather than a lucky roll. `wr6` is the ship's
            //  medical store; see `WRECK_PARTS` in world.ts.
            const yieldFor = wreckPartYield(node.id);
            for (const [kind, amount] of Object.entries(yieldFor) as Array<[MaterialKind, number]>) {
                state.inventory[kind] += amount;
                gained[kind] = amount;
            }

            //  ...and only NOW does the hull shift. Rises on an action, never over time —
            //  which is what makes D-011 structural here (see `wreck.ts`).
            state.wreck = disturb(state.wreck, state.gameHoursElapsed);
            //  DROP 5 — THE STATIC. The receiver comes out of the instrument housing, once,
            //  through this same hold: no new verb for the taking, and it costs the crossing
            //  and the hull's own risk exactly as every other thing here does. Register named
            //  per [[D-138]]: this is one rung of ENDING E03.
            foundReceiver = salvageReceiver(state, node.id);
            //  Working a wreck is seamanship, and it is the third producer for a domain that
            //  had none before the Maritime Slice.
            recordTrying(state, 'navigationSeamanship');
            break;
        }
        case 'divepart': {
            //  ---- THE UNDERWATER SLICE: what a breath buys ---------------------------
            //
            //  NO EXTRA HARM HERE, deliberately. The wreck's own gather charges a wound when
            //  the hull is giving way; this one charges nothing beyond the effort, because
            //  the danger underwater is not the salvage — it is the air, and the air is
            //  already running. Adding a second threat on top would make the one that
            //  matters harder to read, which is the opposite of a legible risk.
            const yieldFor = divePartYield(node.id);
            for (const [kind, amount] of Object.entries(yieldFor) as Array<[MaterialKind, number]>) {
                state.inventory[kind] += amount;
                gained[kind] = amount;
            }
            recordTrying(state, 'navigationSeamanship');
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
    //  DROP 2 — THE BLUFF IS NEVER SPENT, and this is the line that enforces it. It has no
    //  pool to run down and it is never marked unavailable, so there is no state in which the
    //  survivor arrives to find it gone. That is the D-051 First Amendment in one clause:
    //  the active-play path cannot be closed by having used it.
    //
    //  It keeps a scar timestamp of its own (set in the gather branch) for the cosmetic chip
    //  marks that weather away — the island's skin heals, its mass never changes — but that
    //  stamp must never travel through the depletion machinery, which is what marks a node
    //  dead and queues it for regrowth.
    const inexhaustible = node.kind === 'boulder';
    const stillHasPool = node.kind === 'quarry' && (node.pool ?? 0) > 0;
    if (!inexhaustible && !stillHasPool) {
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

    return { ok: true, reason: null, kind: node.kind, gained, foundFlask, foundReceiver, skill: spec.skill, xpGained, levelsGained, learned };
}

// ---- Renewability law (D-051) -------------------------------------------
//
// "No survival-critical resource is globally exhaustible — scarcity is rate/effort, never
// extinction." `crashbox` is the one deliberate exemption: it is a fixed, one-time story
// beat (the flask), not a resource, and never regrows.

/** How long, in game hours, a spent node of this kind takes to regrow. Infinity = exempt. */
/**
 * What each part of the wreck gives up. Authored per part rather than rolled, so the wreck is
 * a place with a layout a survivor can LEARN — the medical store is off the stern quarter and
 * stays there. A roll would make every visit a fresh lottery over the same water, which is the
 * "treasure room" shape v0_10 explicitly rules out.
 *
 * Unknown ids fall back to plating rather than throwing: a save whose node list predates a
 * future re-authoring should hand over metal, not crash.
 */
/**
 * What each submerged point gives up. Authored per point, like the wreck's, so the site has a
 * layout a diver can LEARN — the locker is the locker every time, and knowing that is what
 * lets someone spend a breath deliberately instead of gambling it.
 *
 * The yields are RICHER than the wreck's per point, and there are fewer points. That is the
 * trade the depth buys: what sank is better preserved than what stayed up in the weather, and
 * you can only reach one or two of them per breath.
 */
export function divePartYield(nodeId: string): Partial<Record<MaterialKind, number>> {
    switch (nodeId) {
        case 'dv1': return { metal: 4, glass: 2 };
        case 'dv2': return { metal: 2, wiring: 3 };
        case 'dv3': return { metal: 5 };
        //  The ship's locker, still shut — and the only other medical store in the game.
        case 'dv4': return { medicine: 1, glass: 2, wiring: 1 };
        default: return { metal: 3 };
    }
}

export function wreckPartYield(nodeId: string): Partial<Record<MaterialKind, number>> {
    switch (nodeId) {
        case 'wr1': return { metal: TUNE.wreckMetalYield };
        case 'wr2': return { metal: TUNE.wreckMetalYield };
        case 'wr3': return { glass: TUNE.wreckGlassYield, wiring: 1 };
        case 'wr4': return { metal: 1, glass: TUNE.wreckGlassYield };
        case 'wr5': return { wiring: TUNE.wreckWiringYield };
        //  The ship's medical store. ONE, and it is the reason to come back.
        case 'wr6': return { medicine: TUNE.wreckMedicineYield, glass: 1 };
        default: return { metal: TUNE.wreckMetalYield };
    }
}

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
        //  THE WRECK SLICE. The sea shifts the wreckage back into reach — v0_10's Zone U0 is
        //  "the boundary where waves, tide and wreckage repeatedly move", so this is the tide
        //  doing the work rather than a season. Slower than a tree, so the crossing stays a
        //  journey rather than becoming a commute.
        case 'wreckpart': return TUNE.wreckPartRegrowGameHours;
        //  The same tide that shifts the wreck shifts what sank beneath it.
        case 'divepart': return TUNE.divePartRegrowGameHours;
        //  FISHING — the population model, and it is one line because the machinery was
        //  already here. A site emptied by any of the three methods comes back on the same
        //  clock, through the same [[D-051]] regrow path every bush uses.
        case 'fishingspot': return TUNE.fishSpotRegrowGameHours;
        //  GEOLOGY V2 (Gate 0 item 7): the quarry is the FINITE tier. A rich deposit is a
        //  real, spent thing — it visibly empties as you work it and it does not come back.
        //  This does NOT breach D-051's renewability law, because stone itself stays
        //  renewable: surface `rock` still returns on the tide/erosion cycle below, so the
        //  survival floor holds while the *rich* seam is genuinely exhaustible. Scarcity of
        //  convenience, not of survival.
        case 'quarry': return Infinity;
        //  THE BOULDER FORMATION — the third tier, and the one that closes the ONLINE half of
        //  the renewability law. `Infinity` here does NOT mean "spent forever": the bluff
        //  never becomes unavailable in the first place, so it never enters the regrow queue.
        //  It is effectively inexhaustible, which is a different thing from renewable and is
        //  exactly the distinction the D-051 First Amendment turns on — absence-restock is a
        //  gift, and this is the path that does not require one.
        case 'boulder': return Infinity;
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

/**
 * LAW 130 (Bible v2.4): **no survivor begins with "Build Fire" in a menu, anywhere, ever.**
 *
 * THE RESIDUAL THIS CLOSES. Slice 2B emptied the Build panel's catalogue, and the primary
 * HUD fire button was never in that catalogue — it is a separate entry point with its own
 * gate, and that gate asked only whether you were holding enough wood. So a castaway four
 * seconds off the beach with three sticks was offered fire-making as a known verb, which is
 * precisely the pre-known affordance the invention pivot exists to remove. The pivot swept
 * the room it was standing in and missed the door.
 *
 * Fire is SURVIVAL-BASIC, so it is scaffolded rather than gated behind blind experiment
 * (Law 113): the knowledge arrives when the need is real and the makings are in hand, which
 * is `discovery.ts`'s torch route — the dark closing in, and something that burns in your
 * hands. It is not arbitrary knowledge to be stumbled on; it is knowledge that arrives when
 * a person in that situation would arrive at it.
 *
 * And once you have made fire, you know how. That half is monotonic on purpose.
 */
export function fireIsKnown(state: GameState): boolean {
    //  Demonstrated — you have done it. A torch is fire-craft by another name.
    if (state.blueprints?.some((bp) => bp.recipeId === 'torch')) return true;
    if (state.torch?.owned) return true;
    if (state.fire.built) return true;
    //  Law 113's scaffold: need plus makings, from the shipped discovery route.
    return suspicionFor(state, 'torch')?.suspected === true;
}

/** Does the MATTER allow it — wood in hand, no fire already standing? Physical only. */
export function fireMatterSuffices(state: GameState): boolean {
    return !state.fire.built && state.inventory.wood >= TUNE.woodPerFire;
}

/**
 * May this be OFFERED to the player? Knowledge and matter both.
 *
 * The split is deliberate and it is where Law 130 actually lives. The law is about what a
 * survivor is offered — "no survivor begins with Build Fire in a menu" — so knowledge gates
 * the AFFORDANCE. `buildFire` below still validates the matter, because a verb that fires
 * without the wood is a different bug. `onBuildFire` in the body routes through here, so the
 * button cannot appear to someone who has no idea how.
 */
export function canBuildFire(state: GameState): boolean {
    return fireIsKnown(state) && fireMatterSuffices(state);
}

export function buildFire(state: GameState, x: number, y: number): boolean {
    //  Matter, not knowledge. The knowledge gate belongs on the affordance (`canBuildFire`),
    //  which is what the player actually touches; this is the execution, and it validates
    //  that there is wood and no fire already there.
    if (!fireMatterSuffices(state)) return false;
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
    //  DROP 3 — BAD WATER, priced at the moment of swallowing rather than accrued. The
    //  pond is untreated standing water; a sip on a healthy body stays inside the free
    //  warning band, and drinking it all day while cold and tired is what makes you ill.
    //  The flask is deliberately NOT a cause: it is what you filled and carried, and
    //  giving the player one water source with a cost and one without is the decision.
    state.illness = onsetFrom(state, 'bad-water', TUNE.badWaterExposurePerDrink);
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

//  `Food` is defined in vitals.ts, beside the values it indexes, and re-exported here so
//  every existing `import { type Food } from './state'` keeps working.
export type { Food } from './vitals';

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
    //  DROP 3 — SPOILED FOOD. Reuses Law 128's matter model rather than inventing a second
    //  spoilage clock. Berries and meat both transform to `contaminated` when an attempt on
    //  them fails, and `matterWear` already counts how far gone a kind is — so the food that
    //  can make you ill is exactly the food the game has already been describing as crushed
    //  and spoiled. Nothing new is stored, and the warning was on screen before the bite.
    if (transformationFor(food) === 'contaminated' && (state.matterWear[food] ?? 0) > 0) {
        state.illness = onsetFrom(state, 'spoiled-food', TUNE.spoiledFoodExposure);
    }
    recordTrying(state, 'survivalcraft');
    return true;
}

// ---- Crafting: the fishing line and the net ------------------------------
//
// Both follow the shape every post-pivot craft uses: a `can` predicate, a `shortfall` for
// the card to name what is missing, and a `craft` that spends and records. Neither is
// reachable from a menu — the Build panel only ever shows what discovery has minted.

export function canCraftFishingLine(state: GameState): boolean {
    return !state.tools.fishingLine
        && state.inventory.fiber >= TUNE.fishingLineFiberCost
        && state.inventory.sharpblade >= TUNE.fishingLineBladeCost;
}

export function fishingLineShortfall(state: GameState): { fiber: number; sharpblade: number } {
    return {
        fiber: Math.max(0, TUNE.fishingLineFiberCost - state.inventory.fiber),
        sharpblade: Math.max(0, TUNE.fishingLineBladeCost - state.inventory.sharpblade),
    };
}

export function craftFishingLine(state: GameState): boolean {
    if (!canCraftFishingLine(state)) return false;
    state.inventory.fiber -= TUNE.fishingLineFiberCost;
    state.inventory.sharpblade -= TUNE.fishingLineBladeCost;
    state.tools.fishingLine = true;
    recordTrying(state, recipeDomain('fishingline'));
    return true;
}

export function canCraftNet(state: GameState): boolean {
    return !state.tools.net
        && state.inventory.fiber >= TUNE.netFiberCost
        && state.inventory.sharpblade >= TUNE.netSharpbladeCost;
}

export function netShortfall(state: GameState): { fiber: number; sharpblade: number } {
    return {
        fiber: Math.max(0, TUNE.netFiberCost - state.inventory.fiber),
        sharpblade: Math.max(0, TUNE.netSharpbladeCost - state.inventory.sharpblade),
    };
}

export function craftNet(state: GameState): boolean {
    if (!canCraftNet(state)) return false;
    state.inventory.fiber -= TUNE.netFiberCost;
    state.inventory.sharpblade -= TUNE.netSharpbladeCost;
    state.tools.net = true;
    recordTrying(state, recipeDomain('net'));
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

// ---- DROP 1: the spear, the thrust, and the meat --------------------------

/**
 * THE SPEAR. The only made thing that answers a boar, and it enters the world exactly as
 * every post-pivot item does — by inspection and Try-Combining, never as a row that appears
 * in a menu the day a predator ships. A survivor who has never put a blade to a shaft does
 * not know a spear is possible, and being charged does not teach them.
 */
/**
 * THE BACKPACK. It used to be free — every survivor had full carry capacity from the moment
 * they washed ashore, which quietly said that the one thing every other tool had to be
 * EARNED did not apply to the container holding them all.
 */
export function canMakeBackpack(state: GameState): boolean {
    return !state.tools.backpack
        && state.inventory.fiber >= TUNE.backpackFiberCost
        && state.inventory.wood >= TUNE.backpackWoodCost;
}

export function backpackShortfall(state: GameState): { fiber: number; wood: number } {
    return {
        fiber: Math.max(0, TUNE.backpackFiberCost - state.inventory.fiber),
        wood: Math.max(0, TUNE.backpackWoodCost - state.inventory.wood)
    };
}

export function makeBackpack(state: GameState): boolean {
    if (!canMakeBackpack(state)) return false;
    state.inventory.fiber -= TUNE.backpackFiberCost;
    state.inventory.wood -= TUNE.backpackWoodCost;
    state.tools.backpack = true;
    recordTrying(state, 'harvestingFabrication');
    return true;
}

// ---- THE MARITIME SLICE: the raft ----------------------------------------

/**
 * THE RAFT. The first made thing in this game that carries you somewhere, and the first with
 * a site rule of its own.
 *
 * WHY THE SITE RULE EXISTS. §9.6's claim — *the site IS the decision* — was built for
 * shelters, where a bad site is merely worse. For a raft it is absolute: one built in the
 * treeline is fourteen wood and ten fibre spent on scenery, because nothing in this game can
 * drag it. So the shore requirement is not flavour, it is the difference between a craft that
 * works and a trap, and it is stated to the player BEFORE they spend anything
 * (`raftBlocker`), never discovered afterwards.
 */
export function nearShoreForRaft(state: GameState): boolean {
    return Math.hypot(state.player.x, state.player.y)
        >= SURF_LINE_RADIUS - TUNE.raftBuildMaxShoreDistanceM;
}

export function canCraftRaft(state: GameState): boolean {
    return raftBlocker(state) === null;
}

/**
 * The first thing standing in the way, in the player's own terms — the order the §9.6 site
 * reading uses, and for the same reason: a survivor should be told the thing to fix, not
 * handed a checklist of everything that is not yet true.
 */
export function raftBlocker(state: GameState): string | null {
    if (state.raft.built) return 'You already have a raft.';
    const missing: string[] = [];
    if (state.inventory.wood < TUNE.raftWoodCost) missing.push(`${TUNE.raftWoodCost - state.inventory.wood} more wood`);
    if (state.inventory.fiber < TUNE.raftFiberCost) missing.push(`${TUNE.raftFiberCost - state.inventory.fiber} more fibre`);
    if (state.inventory.coconut < TUNE.raftCoconutCost) missing.push(`${TUNE.raftCoconutCost - state.inventory.coconut} more coconut`);
    if (missing.length > 0) return `Not enough to build with — you need ${missing.join(', ')}.`;
    if (!nearShoreForRaft(state)) return 'Too far from the water. A raft has to be built where it can float.';
    return null;
}

export function raftShortfall(state: GameState): { wood: number; fiber: number; coconut: number } {
    return {
        wood: Math.max(0, TUNE.raftWoodCost - state.inventory.wood),
        fiber: Math.max(0, TUNE.raftFiberCost - state.inventory.fiber),
        coconut: Math.max(0, TUNE.raftCoconutCost - state.inventory.coconut)
    };
}

/**
 * Build it, here, at the water's edge. Grade rolls once from the shipped seeded-hash
 * technique (D-055) and moves exactly one stat — speed — like every other graded item.
 *
 * It is moored at the WATERLINE rather than at the survivor's feet: they may be standing a
 * few metres up the sand, and a raft resting on dry ground is the exact thing the site rule
 * exists to prevent. Pushed straight out along their own bearing, so it lands in front of
 * them rather than somewhere they have to go looking for.
 */
export function craftRaft(state: GameState): boolean {
    if (!canCraftRaft(state)) return false;
    state.inventory.wood -= TUNE.raftWoodCost;
    state.inventory.fiber -= TUNE.raftFiberCost;
    state.inventory.coconut -= TUNE.raftCoconutCost;

    const r = Math.hypot(state.player.x, state.player.y);
    //  A survivor standing exactly on the island's centre has no bearing to push along. It
    //  cannot happen (the shore rule is 116 m out) but a NaN moored raft would be a silent,
    //  permanent loss of fourteen wood, so the degenerate case gets an answer rather than a
    //  division.
    const bearingX = r > 1e-6 ? state.player.x / r : 0;
    const bearingY = r > 1e-6 ? state.player.y / r : 1;
    const moorRadius = SURF_LINE_RADIUS + TUNE.raftMooringOffsetM;

    state.raft = {
        built: true,
        x: bearingX * moorRadius,
        y: bearingY * moorRadius,
        grade: rollGrade(nextGradeSeed(state)),
        aboard: false
    };
    recordTrying(state, recipeDomain('raft'));
    return true;
}

/** Near enough to climb onto. The same reach every other object in this game uses. */
export function canBoardRaft(state: GameState): boolean {
    if (!state.raft.built || state.raft.aboard) return false;
    return Math.hypot(state.raft.x - state.player.x, state.raft.y - state.player.y)
        <= TUNE.interactRadiusM;
}

export function boardRaft(state: GameState): boolean {
    if (!canBoardRaft(state)) return false;
    state.raft.aboard = true;
    //  You stand ON it. Position and raft are the same point from here until you step off,
    //  which is what makes `steerRaft` able to move a player at all.
    state.player.x = state.raft.x;
    state.player.y = state.raft.y;
    recordTrying(state, 'navigationSeamanship');
    return true;
}

/**
 * Step off. Onto dry land if there is any within reach, otherwise into the water — and being
 * TOLD which is about to happen is `leaveRaftIsIntoWater`'s job, because stepping off a raft
 * a hundred metres out is a decision and it must never be a surprise.
 */
export function leaveRaftIsIntoWater(state: GameState): boolean {
    return nearestDryPointTo(state.raft.x, state.raft.y) === null;
}

export function leaveRaft(state: GameState): boolean {
    if (!state.raft.aboard) return false;
    state.raft.aboard = false;
    const dry = nearestDryPointTo(state.raft.x, state.raft.y);
    if (dry) {
        state.player.x = dry.x;
        state.player.y = dry.y;
    }
    return true;
}

/**
 * The nearest dry ground within stepping distance of a floating raft, or null when there is
 * none — which, anywhere but the shore, is the answer.
 *
 * Walks INWARD along the raft's own bearing rather than searching, because the shoreline is a
 * circle and "towards the middle" is always the way to land. Half-metre steps out to the
 * shore band's own width; nothing wider, or stepping off would teleport a survivor across
 * water they should have had to paddle.
 */
function nearestDryPointTo(x: number, y: number): { x: number; y: number } | null {
    const r = Math.hypot(x, y);
    if (r <= 1e-6) return null;
    const ux = x / r;
    const uy = y / r;
    for (let back = 0; back <= TUNE.raftStepAshoreReachM; back += 0.5) {
        const px = ux * (r - back);
        const py = uy * (r - back);
        if (isDryLand(px, py)) return { x: px, y: py };
    }
    return null;
}

/**
 * WHERE A PADDLED RAFT MAY ACTUALLY GO. Returns the position to take, which is the requested
 * one when it is over water and the current one when it is not.
 *
 * A raft that could be steered onto grass would be a boat used as a car, and it would let a
 * player cross the island faster than walking. Refusing the step rather than clamping to the
 * shoreline is deliberate: it GROUNDS — the raft noses into the shallows and stops, exactly
 * as it would — and the player, who is holding the stick, feels a beach rather than a wall.
 *
 * Wading depth counts as water, so a raft can be nosed right up to the sand and stepped off.
 */
export function steerRaft(
    fromX: number, fromY: number, toX: number, toY: number,
): { x: number; y: number } {
    return waterDepthAt(toX, toY) > 0 ? { x: toX, y: toY } : { x: fromX, y: fromY };
}

export function canCraftSpear(state: GameState): boolean {
    return !state.tools.spear
        && state.inventory.wood >= TUNE.spearWoodCost
        && state.inventory.sharpblade >= TUNE.spearSharpbladeCost
        && state.inventory.fiber >= TUNE.spearFiberCost;
}

export function spearShortfall(state: GameState): { wood: number; sharpblade: number; fiber: number } {
    return {
        wood: Math.max(0, TUNE.spearWoodCost - state.inventory.wood),
        sharpblade: Math.max(0, TUNE.spearSharpbladeCost - state.inventory.sharpblade),
        fiber: Math.max(0, TUNE.spearFiberCost - state.inventory.fiber)
    };
}

export function craftSpear(state: GameState): boolean {
    if (!canCraftSpear(state)) return false;
    state.inventory.wood -= TUNE.spearWoodCost;
    state.inventory.sharpblade -= TUNE.spearSharpbladeCost;
    state.inventory.fiber -= TUNE.spearFiberCost;
    state.tools.spear = true;
    recordTrying(state, recipeDomain('spear'));
    return true;
}

/**
 * THRUST. Reachable only with a spear in hand and a boar within reach — and it is the
 * survivor's half of the rhythm the charge sets up: the aftermath window is when this lands.
 *
 * Returns what happened rather than mutating blindly, so the body can speak plainly about a
 * miss instead of leaving a tap silent (D-042's fail-loud law).
 */
export function canThrustAt(state: GameState, boarId: string): boolean {
    const boar = state.boars.find((b) => b.id === boarId);
    if (!boar || !boar.alive || !state.tools.spear) return false;
    return Math.hypot(boar.x - state.player.x, boar.y - state.player.y) <= TUNE.interactRadiusM + 1.5;
}

export function thrustSpear(state: GameState, boarId: string): { ok: boolean; killed: boolean; meat: number } {
    if (!canThrustAt(state, boarId)) return { ok: false, killed: false, meat: 0 };
    const boar = state.boars.find((b) => b.id === boarId)!;
    const remaining = TUNE.boarHealth;
    //  Damage accumulates in a session-local map, never in the save — see `boarDamage`.
    const dealt = TUNE.spearThrustDamage;
    const already = boarDamage.get(boar.id) ?? 0;
    const total = already + dealt;
    if (total >= remaining) {
        boarDamage.delete(boar.id);
        const index = state.boars.findIndex((b) => b.id === boarId);
        state.boars = state.boars.map((b, i) => (i === index ? { ...b, alive: false, stage: 'aftermath' as const, chargeBearing: null } : b));
        state.inventory.meat += TUNE.boarMeatYield;
        //  FISHING retired `meatFreshUntilGameHours`. Meat now uses the same countdown
        //  every perishable does — see `perishOnTick`. Nothing about the boar changed except
        //  that its meat no longer rots while the game is closed.
        state.freshUntil = { ...state.freshUntil, meat: TUNE.meatSpoilGameHours };
        recordTrying(state, 'survivalcraft');
        return { ok: true, killed: true, meat: TUNE.boarMeatYield };
    }
    boarDamage.set(boar.id, total);
    recordTrying(state, 'survivalcraft');
    return { ok: true, killed: false, meat: 0 };
}

/**
 * Damage dealt to each boar, held OUTSIDE the save on purpose. A boar heals between
 * sessions — a wound model that persisted would be Drop 2's injury profile arriving early
 * through the back door, and the handoff was explicit that harm is a number this drop.
 */
const boarDamage = new Map<string, number>();

/**
 * Raw meat spoils. Cooking is still the NEXT discovery and is still deliberately not built.
 *
 * Now one line over the shared perishable clock rather than its own arithmetic — the whole
 * point of `freshUntil` is that meat and fish cannot answer this question differently.
 */
export function meatIsSpoiled(state: GameState): boolean {
    return isSpoiled(state, 'meat');
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
 * MAKE A JOURNAL ([[D-068]]). Bark or beaten fibre to write on, charcoal to write with.
 *
 * It is made like anything else, from matter the island actually has, because a journal that
 * simply appeared would say that recording knowledge is free — and the entire weight of the
 * castaway cycle rests on it not being free. The recipe is deliberately cheap in materials
 * and expensive in everything after: making one is easy, filling it is not.
 *
 * Requires a fire, and not for warmth — the charcoal comes from it. That is also why a
 * survivor cannot make one on their first evening before doing anything else: the fire comes
 * first, which is the correct order for both the fiction and the difficulty curve.
 */
export function canMakeJournal(state: GameState): boolean {
    return !state.journal.exists
        && isFireLit(state)
        && state.inventory.fiber >= TUNE.journalFiberCost
        && state.inventory.wood >= TUNE.journalWoodCost;
}

export function journalShortfall(state: GameState): { fiber: number; wood: number } {
    return {
        fiber: Math.max(0, TUNE.journalFiberCost - state.inventory.fiber),
        wood: Math.max(0, TUNE.journalWoodCost - state.inventory.wood)
    };
}

/** Spend the recipe and make an empty journal, in hand. Returns false if it can't be paid for. */
export function makeJournal(state: GameState): boolean {
    if (!canMakeJournal(state)) return false;
    state.inventory.fiber -= TUNE.journalFiberCost;
    state.inventory.wood -= TUNE.journalWoodCost;
    //  Born CARRIED, at the survivor's feet. Carrying it is the natural state and the
    //  dangerous one; putting it down is the deliberate act, and that asymmetry is the
    //  decision D-068 wants — a player who never thinks about it loses the book when they die.
    state.journal = {
        exists: true, x: state.player.x, y: state.player.y, carried: true,
        condition: 1, entries: [], lastWrittenAtGameHours: null
    };
    return true;
}

/** Put the journal down here, or pick it up again. The whole of the storage decision. */
export function setJournalCarried(state: GameState, carried: boolean): boolean {
    if (!state.journal.exists) return false;
    state.journal = carried
        ? { ...state.journal, carried: true }
        : { ...state.journal, carried: false, x: state.player.x, y: state.player.y };
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

/**
 * THE CAVE, FOUND AND ENTERED (Drop 3 Part 2 item 2).
 *
 * Two facts, kept apart on purpose. Finding it is KNOWLEDGE and it is permanent — once you
 * have seen the mouth in the hillside you know it is there, and walking away does not unknow
 * it. Sheltering in it is POSITION and it is momentary. Collapsing the two would mean a
 * survivor who found the cave in daylight loses it the instant they leave, which is not how
 * finding somewhere works.
 *
 * Discovery is proximity rather than a verb, because a cave is not a thing you operate — the
 * human outcome is *somewhere out of the weather*, and you get it by going there. That is the
 * same framing the Maker's construction flow uses, and it is why there is no "enter cave"
 * button: standing in it IS entering it.
 */
export function updateCavePresence(state: GameState): void {
    const inside = distance(state.player.x, state.player.y, state.cave.x, state.cave.y) <= TUNE.caveShelterRadiusM;
    state.cave.sheltering = inside;
    //  Never un-found. Knowledge does not switch off when you walk out (the same rule the
    //  Build panel's ladder already holds: the scaffold is a floor, never a ceiling).
    if (inside) state.cave.found = true;
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
    state.shelter = { built: true, x, y, durability: TUNE.structureDurabilityMax, defects: freshDefects(), grade };
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
    if (!structure.built) return false;
    if (state.inventory.wood <= 0) return false;
    //  ENTROPY & MAINTENANCE (v0.11 §8) — the shelter now has a SECOND reason to be worth
    //  mending, and this is the whole of what "extend, don't replace" means here. The bar
    //  still gates it exactly as it did; a NAMED DEFECT is a new, independent reason. A
    //  shelter at full durability with a parted lashing was previously un-mendable, which is
    //  the shape of refusal this stage exists to remove.
    const worthDoing = which === 'shelter'
        ? structure.durability < TUNE.structureDurabilityMax || hasOutstandingWork(state)
        : structure.durability < TUNE.structureDurabilityMax;
    if (!worthDoing) return false;
    return which === 'shelter' ? isNearShelter(state) : isNearStorage(state);
}

export interface RepairResult {
    ok: boolean;
    /** Which named place the wood actually went into, or null when it went into the bar. */
    mended: ReturnType<typeof mendWorst>;
}

/**
 * Spend one wood. On the shelter it goes into ONE NAMED PLACE if any is outstanding, and into
 * the durability bar otherwise.
 *
 * NAMED WORK FIRST, and that priority is the maintenance-debt model in one line: a survivor
 * with a rotted footing and a scuffed bar should be fixing the footing, because the footing is
 * holding up the parts that answer the weather. The bar is general wear; a defect is a place.
 */
export function repairStructureDetailed(state: GameState, which: RepairTarget): RepairResult {
    if (!canRepairStructure(state, which)) return { ok: false, mended: null };
    state.inventory.wood -= 1;
    const structure = state[which];
    const mended = which === 'shelter' ? mendWorst(state) : null;
    if (!mended) {
        structure.durability = Math.min(TUNE.structureDurabilityMax, structure.durability + TUNE.repairDurabilityPerWood);
    }
    recordTrying(state, 'construction');
    return { ok: true, mended };
}

/** Spend one wood to restore `repairDurabilityPerWood` durability. Returns true if it did anything. */
export function repairStructure(state: GameState, which: RepairTarget): boolean {
    return repairStructureDetailed(state, which).ok;
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

// ---- Death — RETIRED HERE, OWNED BY succession.ts (Slice 3) ---------------

//  `respawn()` and `lastRespawnMessage()` are GONE, not deprecated.
//
//  They implemented the interim mercy: the same survivor woke on the sand with half their
//  vitals, a small resource loss and a one-line scolding. Slice 3 replaces the entire idea.
//  Death is final; what follows is a DIFFERENT PERSON arriving on the crash profile, into an
//  island that kept everything physical. That lives in `succession.ts` (the persists table
//  and the atomic commit) and `deathReview.ts` (the causal chain and the arrival narration).
//
//  Deleted rather than left unused on purpose: a resurrection function sitting in the file
//  with no callers is one careless import away from being alive again, and it would be alive
//  in exactly the code path where nobody looks — after a death, once, on a real device.

/**
 * WHY THE SHELTER IS OR IS NOT WORKING — F3, refuge quality (Slice 1 item 2).
 *
 * The exposure model was already honest and already invisible. Warmth drained more slowly
 * under a shelter and the player was told nothing: not the size of the relief, not that
 * standing six metres away had switched it off, not that being soaked had eaten most of it.
 * A hidden number is not a system the player can play — it fails the depth-dial admission
 * test on all three counts at once, since you cannot influence what you cannot perceive and
 * cannot narrate what you were never shown.
 *
 * This adds no parallel system. It reports the one already shipped: `shelterActive`
 * (near AND not in disrepair) times the grade multiplier, times the wet penalty — the exact
 * product `reconcile` applies to the night-time drain. If this and reconcile ever disagree,
 * this is the liar, and `tests/refuge.test.ts` asserts they agree across the whole grid.
 */
export interface RefugeReport {
    /**
     * What fraction of the night's cold the refuge is actually cutting, 0–1, right now.
     *
     * This is the shelter's share and it does NOT move with wetness. My first cut multiplied
     * it by the wet penalty, which reads plausible and is wrong: wet raises the drain INSIDE
     * and OUTSIDE by the same factor, so it cancels in the ratio and the shelter keeps
     * cutting the same fraction either way. The grid test in `tests/refuge.test.ts` caught
     * it — reported 0.38 against 0.45 measured through reconcile — which is the entire
     * reason that test compares against the model instead of against this file.
     */
    reduction: number;
    /** The same as a whole percent, for the UI to show without re-deriving it. */
    reductionPct: number;
    /** What the shelter WOULD cut if the player were under it and it were sound. */
    potentialPct: number;
    /**
     * How much harsher being wet makes the night, as a whole percent ON TOP of everything —
     * a separate cost, not a discount on the shelter. 0 when dry.
     */
    wetPenaltyPct: number;
    /** Is it helping at this moment? */
    working: boolean;
    /** Machine-readable cause, so the UI never has to parse prose. */
    status: 'none' | 'too-far' | 'disrepair' | 'wet-reduced' | 'working';
    /** One plain sentence: what is happening and, when it is not working, what to do. */
    line: string;
    /**
     * ENTROPY & MAINTENANCE (v0.11 §8) — the outstanding named work, or null when there is
     * none. THE MAINTENANCE DEBT, and it is a separate field rather than more prose inside
     * `line` for the same reason `wetPenaltyPct` is: they are different costs with different
     * answers, and a player has to be able to act on each independently.
     */
    upkeep: string | null;
}

export function refugeReport(state: GameState): RefugeReport {
    const grade = state.shelter.grade;
    const potential = 1 - TUNE.shelterGradeWarmthMultiplier[grade];
    const pct = (v: number) => Math.round(v * 100);
    //  ENTROPY & MAINTENANCE — what the building is ACTUALLY answering, defects and all.
    //
    //  This file's own header calls it "the liar" and means it: the reduction reported here
    //  must equal the reduction `reconcile` produces, and `tests/refuge.test.ts` compares
    //  them across the whole grid. The moment `activeProfile` learned about defects, a
    //  report still quoting the grade's sound number became exactly that lie. So it reads the
    //  degraded profile from the same function the heat balance does, rather than deriving a
    //  second opinion from the same defects.
    const degraded = degradeProfile(builtShelterProfile(grade), answerLoss(state));
    const upkeep = upkeepNote(state);

    const wetMultiplier = 1 + (TUNE.wetWarmthDrainMultiplierAtMaxWet - 1) * (state.wet / TUNE.wetMax);
    const wetPenaltyPct = Math.round((wetMultiplier - 1) * 100);
    const soaked = state.wet > TUNE.wetMax * 0.25;
    const wetTail = soaked ? ` Being soaked makes the whole night ${wetPenaltyPct}% colder — dry off.` : '';

    if (!state.shelter.built) {
        return {
            reduction: 0, reductionPct: 0, potentialPct: pct(potential), wetPenaltyPct, working: false,
            status: 'none', upkeep,
            line: `No shelter. The night takes its full toll — a lean-to would cut it by about half.${wetTail}`,
        };
    }
    if (isInDisrepair(state.shelter)) {
        return {
            reduction: 0, reductionPct: 0, potentialPct: pct(potential), wetPenaltyPct, working: false,
            status: 'disrepair', upkeep,
            line: `The shelter has fallen apart — it cuts nothing until it is mended. Sound, it would hold off ${pct(potential)}% of the cold.${wetTail}`,
        };
    }
    if (!isNearShelter(state)) {
        return {
            reduction: 0, reductionPct: 0, potentialPct: pct(potential), wetPenaltyPct, working: false,
            status: 'too-far', upkeep,
            line: `Too far from the shelter for it to help. Within ${TUNE.shelterRadius} m it would hold off ${pct(potential)}% of the cold.${wetTail}`,
        };
    }
    //  Working. The shelter's share is the grade multiplier and nothing else — see the note
    //  on `reduction`. Wet is reported alongside it, as its own cost, because it IS its own
    //  cost: it makes the night harsher everywhere rather than making the shelter worse.
    //  Keeping them separate is what lets the player act on each one independently, which is
    //  the whole point of the influence half of the depth-dial test.
    return {
        reduction: degraded.cold,
        reductionPct: pct(degraded.cold),
        potentialPct: pct(potential),
        wetPenaltyPct,
        working: true,
        status: soaked ? 'wet-reduced' : 'working',
        //  When there is outstanding work the line says what the building is holding off NOW
        //  and what it would hold off sound — the gap between those two numbers IS the
        //  maintenance debt, stated rather than hidden. When everything is sound the second
        //  clause is absent, because a report that always hedges teaches nobody anything.
        line: upkeep === null
            ? `The shelter is holding off ${pct(degraded.cold)}% of the night's cold.${wetTail}`
            : `The shelter is holding off ${pct(degraded.cold)}% of the night's cold — sound, it would hold ${pct(potential)}%.${wetTail}`,
        upkeep,
    };
}
