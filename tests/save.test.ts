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
        expect(envelope!.state.nodes.length).toBeGreaterThan(0);
        expect(envelope!.state.settings.controlMode).toBe('tap');
        expect(envelope!.state.trace.failedInteractionTaps).toBe(0);
    });
});
