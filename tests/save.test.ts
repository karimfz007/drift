import { describe, expect, it } from 'vitest';
import {
    MemorySaveRepository,
    deserialize,
    migrate,
    serialize,
    type SaveEnvelope
} from '../src/brain/save';
import { buildFire, createInitialState, gatherNode } from '../src/brain/state';
import { SCHEMA_VERSION } from '../src/brain/types';
import { TUNE } from '../src/data/tune';

function playedRun() {
    const s = createInitialState(1_700_000_000_000);
    gatherNode(s, 'dw1');
    gatherNode(s, 'df1');
    s.inventory.wood = TUNE.woodPerFire;
    buildFire(s, 210, 330);
    s.gameHoursElapsed = 4.25;
    s.warmth = 63.5;
    s.settings.controlMode = 'joystick';
    s.trace.msToFirstWood = 3400;
    return s;
}

describe('save — A1: survives a schema round-trip', () => {
    it('restores an identical state through serialize → deserialize', () => {
        const before = playedRun();
        const envelope = deserialize(serialize(before, 1_700_000_500_000));

        expect(envelope).not.toBeNull();
        expect(envelope!.schemaVersion).toBe(SCHEMA_VERSION);
        expect(envelope!.savedAtMs).toBe(1_700_000_500_000);
        expect(envelope!.state).toEqual(before);
    });

    it('round-trips through a repository', () => {
        const repo = new MemorySaveRepository();
        const before = playedRun();
        repo.write(serialize(before, 42));
        const envelope = deserialize(repo.read());
        expect(envelope!.state).toEqual(before);

        repo.clear();
        expect(deserialize(repo.read())).toBeNull();
    });

    it('always stamps the current schema version', () => {
        const stale = playedRun();
        stale.schemaVersion = 0;
        const envelope = deserialize(serialize(stale, 0));
        expect(envelope!.state.schemaVersion).toBe(SCHEMA_VERSION);
    });
});

describe('save — refuses what it cannot trust', () => {
    it('returns null for absent, empty and corrupt payloads', () => {
        expect(deserialize(null)).toBeNull();
        expect(deserialize('')).toBeNull();
        expect(deserialize('{not json')).toBeNull();
        expect(deserialize('"a string"')).toBeNull();
        expect(deserialize('null')).toBeNull();
        expect(deserialize('{}')).toBeNull();
        expect(deserialize('{"schemaVersion":1}')).toBeNull();
        expect(deserialize('{"schemaVersion":1,"savedAtMs":1}')).toBeNull();
    });

    it('refuses a save written by a newer build rather than corrupting it', () => {
        const future: SaveEnvelope = {
            schemaVersion: SCHEMA_VERSION + 1,
            savedAtMs: 1,
            state: createInitialState(0)
        };
        expect(migrate(future)).toBeNull();
        expect(deserialize(JSON.stringify(future))).toBeNull();
    });

    it('fills in fields a partial save is missing', () => {
        const partial = {
            schemaVersion: SCHEMA_VERSION,
            savedAtMs: 5,
            state: { schemaVersion: SCHEMA_VERSION, warmth: 30, gameHoursElapsed: 2 }
        };
        const envelope = deserialize(JSON.stringify(partial));
        expect(envelope).not.toBeNull();
        expect(envelope!.state.warmth).toBe(30);
        expect(envelope!.state.gameHoursElapsed).toBe(2);
        // Defaults arrive from a fresh run rather than crashing the body.
        expect(envelope!.state.inventory.wood).toBe(0);
        expect(envelope!.state.tools.axe).toBe(false);
        expect(envelope!.state.skills.woodcutting.level).toBe(1);
        expect(envelope!.state.nodes.length).toBeGreaterThan(0);
        expect(envelope!.state.settings.controlMode).toBe('tap');
    });
});

describe('save — A1: a Cycle 02 save migrates to Cycle 03', () => {
    /** A realistic v1 (Cycle 01–02) save: warmth, wood, a lit fire, a joystick preference. */
    function v1Save(): string {
        const state = {
            schemaVersion: 1,
            startedAtMs: 1_700_000_000_000,
            lastSeenMs: 1_700_000_300_000,
            gameHoursElapsed: 6.5,
            warmth: 72.4,
            inventory: { wood: 3 },
            fire: { built: true, fuel: 4.2, x: 12, y: -3 },
            player: { x: 8, y: 41 },
            nodes: [
                { id: 'dw1', kind: 'driftwood', x: -6, y: 40, available: false },
                { id: 'df1', kind: 'deadfall', x: -8, y: 22, available: true }
            ],
            settings: { controlMode: 'joystick' },
            trace: {
                msToFirstMove: 800,
                msToFirstWood: 3400,
                msToFireLit: 14000,
                failedInteractionTaps: 2,
                controlModeSwitches: 1,
                steelThreadComplete: true,
                activeMs: 300000
            }
        };
        return JSON.stringify({ schemaVersion: 1, savedAtMs: 1_700_000_300_000, state });
    }

    it('loads, keeps what carried over, and gains a sensible set of vitals', () => {
        const envelope = deserialize(v1Save());
        expect(envelope).not.toBeNull();
        const s = envelope!.state;

        // Bumped to the current schema.
        expect(s.schemaVersion).toBe(SCHEMA_VERSION);

        // Carried over from v1.
        expect(s.warmth).toBeCloseTo(72.4, 6);
        expect(s.gameHoursElapsed).toBeCloseTo(6.5, 6);
        expect(s.inventory.wood).toBe(3);
        expect(s.fire).toMatchObject({ built: true, fuel: 4.2 });
        expect(s.settings.controlMode).toBe('joystick');
        expect(s.trace.msToFirstWood).toBe(3400);

        // Gained in v2, at full — the castaway wakes whole, not on the brink.
        expect(s.thirst).toBe(TUNE.thirstMax);
        expect(s.hunger).toBe(TUNE.hungerMax);
        expect(s.health).toBe(TUNE.healthMax);
        expect(s.tools.axe).toBe(false);
        expect(s.skills.foraging.level).toBe(1);

        // The rest of the inventory starts empty; the island's nodes are regenerated
        // (the world genuinely changed), so the pond/forage/trees exist for them.
        expect(s.inventory.stone).toBe(0);
        expect(s.nodes.some((n) => n.kind === 'tree')).toBe(true);
        expect(s.nodes.some((n) => n.kind === 'crashbox')).toBe(true);
    });

    it('is idempotent — migrating a v1 save then serialising round-trips as v2', () => {
        const once = deserialize(v1Save());
        const twice = deserialize(serialize(once!.state, once!.savedAtMs));
        expect(twice!.state).toEqual(once!.state);
    });
});

describe('save — a tampered save cannot carry an out-of-band vital (C3 audit, C03)', () => {
    it('clamps a negative or over-max vital on load', () => {
        const tampered = {
            schemaVersion: SCHEMA_VERSION,
            savedAtMs: 5,
            state: { schemaVersion: SCHEMA_VERSION, health: -40, thirst: 999, hunger: -1, warmth: 50 }
        };
        const envelope = deserialize(JSON.stringify(tampered));
        expect(envelope!.state.health).toBe(0); // negative → 0; self-heals to a respawn on the next tick
        expect(envelope!.state.thirst).toBe(TUNE.thirstMax); // clamped to the ceiling
        expect(envelope!.state.hunger).toBe(0);
        expect(envelope!.state.warmth).toBe(50); // in range, untouched
    });
});
