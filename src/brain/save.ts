/**
 * BRAIN — the save. Versioned from day one (Ops v1.2 §5 law 5): the offline DNA is
 * worthless if a save does not survive an update.
 *
 * Storage sits behind `SaveRepository` so the localStorage implementation shipped this
 * cycle can be swapped for IndexedDB (or a native store) without the brain noticing.
 */

import { SCHEMA_VERSION, type GameState } from './types';
import { createInitialState } from './state';

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
 * Migration ladder. Each future schema bump adds one step here and never touches the
 * steps below it. v1 is the floor: anything older than v1 predates the save format.
 */
export function migrate(envelope: SaveEnvelope): SaveEnvelope | null {
    let current = envelope;

    // Saves from the future belong to a newer build than this one; refuse rather than
    // silently corrupt them.
    if (current.schemaVersion > SCHEMA_VERSION) return null;

    // while (current.schemaVersion < SCHEMA_VERSION) { ... one step per version ... }

    return current.schemaVersion === SCHEMA_VERSION ? current : null;
}

/** Fill in any field a hand-edited or partial save is missing, using a fresh run as the default. */
function hydrate(state: GameState): GameState {
    const base = createInitialState(state.startedAtMs ?? 0);
    return {
        ...base,
        ...state,
        inventory: { ...base.inventory, ...state.inventory },
        fire: { ...base.fire, ...state.fire },
        player: { ...base.player, ...state.player },
        settings: { ...base.settings, ...state.settings },
        trace: { ...base.trace, ...state.trace },
        nodes: Array.isArray(state.nodes) && state.nodes.length > 0 ? state.nodes : base.nodes,
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
