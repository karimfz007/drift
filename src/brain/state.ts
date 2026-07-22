/**
 * BRAIN — run state: creation, and the pure rules behind every player verb.
 * Zero Phaser. The body calls these and then draws the result.
 */

import { TUNE } from '../data/tune';
import { SPAWN, createNodes } from '../data/world';
import { SCHEMA_VERSION, type GameState, type WoodNode } from './types';

export function createInitialState(nowMs: number): GameState {
    return {
        schemaVersion: SCHEMA_VERSION,
        startedAtMs: nowMs,
        lastSeenMs: nowMs,
        gameHoursElapsed: 0,
        warmth: TUNE.warmthMax,
        inventory: { wood: 0 },
        fire: { built: false, fuel: 0, x: 0, y: 0 },
        player: { x: SPAWN.x, y: SPAWN.y },
        nodes: createNodes(),
        settings: { controlMode: 'tap' },
        trace: {
            msToFirstMove: null,
            msToFirstWood: null,
            msToFireLit: null,
            failedInteractionTaps: 0,
            controlModeSwitches: 0,
            steelThreadComplete: false,
            activeMs: 0
        }
    };
}

export function cloneState(state: GameState): GameState {
    return {
        ...state,
        inventory: { ...state.inventory },
        fire: { ...state.fire },
        player: { ...state.player },
        nodes: state.nodes.map((n) => ({ ...n })),
        settings: { ...state.settings },
        trace: { ...state.trace }
    };
}

// ---- Wood ---------------------------------------------------------------

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

/** Wood this node will yield if gathered right now. 0 if it is spent. */
export function nodeYield(state: GameState, nodeId: string): number {
    const node = findNode(state, nodeId);
    if (!node || !node.available) return 0;
    return node.kind === 'driftwood' ? TUNE.driftwoodTapYield : deadfallYield(node.id);
}

/** Salvage a node. Returns the wood gained (0 if it was already spent). Mutates state. */
export function gatherNode(state: GameState, nodeId: string): number {
    const node = findNode(state, nodeId);
    if (!node || !node.available) return 0;
    const gained = nodeYield(state, nodeId);
    node.available = false;
    state.inventory.wood += gained;
    return gained;
}

// ---- Fire ---------------------------------------------------------------

export function isFireLit(state: GameState): boolean {
    return state.fire.built && state.fire.fuel > 0;
}

export function fireBurnHoursRemaining(state: GameState): number {
    return Math.max(0, state.fire.fuel) * TUNE.fireBurnGameHoursPerWood;
}

export function canBuildFire(state: GameState): boolean {
    return !state.fire.built && state.inventory.wood >= TUNE.woodPerFire;
}

/** Build a campfire at (x, y), spending woodPerFire. Returns false if it can't be paid for. */
export function buildFire(state: GameState, x: number, y: number): boolean {
    if (!canBuildFire(state)) return false;
    state.inventory.wood -= TUNE.woodPerFire;
    state.fire = { built: true, fuel: TUNE.woodPerFire, x, y };
    return true;
}

export function canFeedFire(state: GameState): boolean {
    return state.fire.built && state.inventory.wood >= 1 && state.fire.fuel < TUNE.fireMaxFuel;
}

/** Add one wood to the fire, extending the burn. Returns false if it can't be fed. */
export function feedFire(state: GameState): boolean {
    if (!canFeedFire(state)) return false;
    state.inventory.wood -= 1;
    state.fire.fuel = Math.min(TUNE.fireMaxFuel, state.fire.fuel + 1);
    return true;
}

// ---- Shelter ------------------------------------------------------------

export function distance(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
}

/** The player is standing inside the fire's warmth radius (the fire need not be lit). */
export function isPlayerInFireRadius(state: GameState): boolean {
    if (!state.fire.built) return false;
    return (
        distance(state.player.x, state.player.y, state.fire.x, state.fire.y) <=
        TUNE.fireWarmthRadius
    );
}

/** Warmth is recovering right now: a lit fire, and the player inside its radius. */
export function isSheltered(state: GameState): boolean {
    return isFireLit(state) && isPlayerInFireRadius(state);
}
