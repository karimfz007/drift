/**
 * BRAIN — the save. Versioned from day one (Ops v1.2 §5 law 5): the offline DNA is
 * worthless if a save does not survive an update.
 *
 * Storage sits behind `SaveRepository` so the localStorage implementation shipped this
 * cycle can be swapped for IndexedDB (or a native store) without the brain noticing.
 */

import { TUNE } from '../data/tune';
import { SCHEMA_VERSION, type GameState } from './types';
import { createInitialState } from './state';

/** Keep a loaded vital in [0, max]; fall back to a fresh-run default if it is not a number. */
function clampVital(value: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(max, value));
}

export interface SaveEnvelope {
    schemaVersion: number;
    /** Real epoch ms the save was written. The anchor for the absence calculation. */
    savedAtMs: number;
    state: GameState;
}

export interface SaveRepository {
    read(): string | null;
    write(payload: string): void;
    clear(): void;
}

export const SAVE_KEY = 'drift.save.v1';

// ---- Serialisation ------------------------------------------------------

export function serialize(state: GameState, savedAtMs: number): string {
    const envelope: SaveEnvelope = {
        schemaVersion: SCHEMA_VERSION,
        savedAtMs,
        state: { ...state, schemaVersion: SCHEMA_VERSION }
    };
    return JSON.stringify(envelope);
}

/**
 * Parse and migrate. Returns null for absent, corrupt, or unmigratable saves —
 * the caller then starts a fresh run rather than crashing on someone's old data.
 */
export function deserialize(payload: string | null): SaveEnvelope | null {
    if (!payload) return null;

    let raw: unknown;
    try {
        raw = JSON.parse(payload);
    } catch {
        return null;
    }

    if (typeof raw !== 'object' || raw === null) return null;
    const envelope = raw as Partial<SaveEnvelope>;
    if (typeof envelope.schemaVersion !== 'number') return null;
    if (typeof envelope.savedAtMs !== 'number') return null;
    if (typeof envelope.state !== 'object' || envelope.state === null) return null;

    const migrated = migrate(envelope as SaveEnvelope);
    if (!migrated) return null;

    return { ...migrated, state: hydrate(migrated.state) };
}

/**
 * Migration ladder. Each schema bump adds one step here and never touches the steps below
 * it. v1 is the floor: anything older predates the save format. A save from the future
 * belongs to a newer build than this one — refuse it rather than silently corrupt it.
 */
export function migrate(envelope: SaveEnvelope): SaveEnvelope | null {
    let current = envelope;

    if (current.schemaVersion > SCHEMA_VERSION) return null;

    if (current.schemaVersion === 1) current = migrateV1toV2(current);
    if (current.schemaVersion === 2) current = migrateV2toV3(current);

    return current.schemaVersion === SCHEMA_VERSION ? current : null;
}

/**
 * v1 (Cycles 01–02: warmth, wood, fire) → v2 (Cycle 03: three vitals, expanded inventory,
 * tools, skills, death). A returning player keeps their clock, warmth, wood, fire, and
 * position; they wake to a full set of vitals and an island that has grown demands. The
 * old island's node layout is discarded — the world genuinely changed — and regenerated,
 * so the pond, forage, trees, and crash box exist for them. (A1: a c02 save loads and
 * gains the new vitals sensibly.)
 */
function migrateV1toV2(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const fresh = createInitialState(typeof old.startedAtMs === 'number' ? old.startedAtMs : 0);

    const state: GameState = {
        ...fresh,
        startedAtMs: num(old.startedAtMs, fresh.startedAtMs),
        lastSeenMs: num(old.lastSeenMs, fresh.lastSeenMs),
        gameHoursElapsed: num(old.gameHoursElapsed, 0),
        // Warmth carries over; the three new vitals start full.
        warmth: num(old.warmth, fresh.warmth),
        // Only wood existed in v1; the rest of the inventory starts empty.
        inventory: { ...fresh.inventory, wood: num((old.inventory as Record<string, unknown>)?.wood, 0) },
        fire: isObject(old.fire)
            ? {
                  built: Boolean((old.fire as Record<string, unknown>).built),
                  fuel: num((old.fire as Record<string, unknown>).fuel, 0),
                  x: num((old.fire as Record<string, unknown>).x, 0),
                  y: num((old.fire as Record<string, unknown>).y, 0)
              }
            : fresh.fire,
        player: isObject(old.player)
            ? { x: num((old.player as Record<string, unknown>).x, fresh.player.x), y: num((old.player as Record<string, unknown>).y, fresh.player.y) }
            : fresh.player,
        settings: isObject(old.settings)
            ? { controlMode: (old.settings as Record<string, unknown>).controlMode === 'joystick' ? 'joystick' : 'tap' }
            : fresh.settings,
        // Keep whatever of the old trace survives; the rest defaults.
        trace: { ...fresh.trace, ...(isObject(old.trace) ? (old.trace as Partial<GameState['trace']>) : {}) },
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v2 (Cycle 03: three vitals, death/respawn) → v3 (Cycle 05: energy, wet, shelter,
 * storage). Everything a v2 save has carries over untouched; the new fields start at
 * their fresh-run defaults (full energy, dry, nothing built yet) — a returning player
 * simply hasn't built anything yet, which is the honest truth for a save from before
 * construction existed.
 */
function migrateV2toV3(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const fresh = createInitialState(typeof old.startedAtMs === 'number' ? old.startedAtMs : 0);

    const state: GameState = {
        ...(old as unknown as GameState),
        energy: fresh.energy,
        wet: fresh.wet,
        shelter: fresh.shelter,
        storage: fresh.storage,
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

function num(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/** Fill in any field a hand-edited or partial save is missing, using a fresh run as the default. */
function hydrate(state: GameState): GameState {
    const base = createInitialState(state.startedAtMs ?? 0);
    return {
        ...base,
        ...state,
        inventory: { ...base.inventory, ...state.inventory },
        tools: { ...base.tools, ...state.tools },
        skills: {
            woodcutting: { ...base.skills.woodcutting, ...state.skills?.woodcutting },
            foraging: { ...base.skills.foraging, ...state.skills?.foraging }
        },
        fire: { ...base.fire, ...state.fire },
        shelter: { ...base.shelter, ...state.shelter },
        storage: { ...base.storage, ...state.storage, stored: { ...base.storage.stored, ...state.storage?.stored } },
        player: { ...base.player, ...state.player },
        settings: { ...base.settings, ...state.settings },
        trace: { ...base.trace, ...state.trace },
        nodes: Array.isArray(state.nodes) && state.nodes.length > 0 ? state.nodes : base.nodes,
        //  Defensive clamp on load. Vitals are now life-and-death, so a corrupt or
        //  hand-edited save must not carry an out-of-band value (a negative health would
        //  otherwise be held negative forever by reconcile's floor). A health of 0 self-heals
        //  on the next online tick — death, then a merciful respawn. (C3 audit, C03.)
        warmth: clampVital(state.warmth, TUNE.warmthMax, base.warmth),
        thirst: clampVital(state.thirst, TUNE.thirstMax, base.thirst),
        hunger: clampVital(state.hunger, TUNE.hungerMax, base.hunger),
        health: clampVital(state.health, TUNE.healthMax, base.health),
        energy: clampVital(state.energy, TUNE.energyMax, base.energy),
        wet: clampVital(state.wet, TUNE.wetMax, base.wet),
        schemaVersion: SCHEMA_VERSION
    };
}

// ---- Repositories -------------------------------------------------------

/** In-memory repository — the test double, and the fallback when storage is unavailable. */
export class MemorySaveRepository implements SaveRepository {
    private payload: string | null = null;

    read(): string | null {
        return this.payload;
    }

    write(payload: string): void {
        this.payload = payload;
    }

    clear(): void {
        this.payload = null;
    }
}

/**
 * localStorage repository. Cycle 01's storage (Ops §5 law 5). Every call is guarded:
 * private-mode Safari and storage-full both throw on write, and neither is a reason to
 * lose the running game.
 */
export class LocalStorageSaveRepository implements SaveRepository {
    constructor(private readonly key: string = SAVE_KEY) {}

    static isAvailable(): boolean {
        try {
            if (typeof localStorage === 'undefined') return false;
            const probe = '__drift_probe__';
            localStorage.setItem(probe, '1');
            localStorage.removeItem(probe);
            return true;
        } catch {
            return false;
        }
    }

    read(): string | null {
        try {
            return localStorage.getItem(this.key);
        } catch {
            return null;
        }
    }

    write(payload: string): void {
        try {
            localStorage.setItem(this.key, payload);
        } catch {
            /* Storage refused the write; the run continues in memory. */
        }
    }

    clear(): void {
        try {
            localStorage.removeItem(this.key);
        } catch {
            /* nothing to do */
        }
    }
}

/** Pick the best repository this environment offers. */
export function createSaveRepository(): SaveRepository {
    return LocalStorageSaveRepository.isAvailable()
        ? new LocalStorageSaveRepository()
        : new MemorySaveRepository();
}
