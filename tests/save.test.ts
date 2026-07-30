import { describe, expect, it } from 'vitest';
import {
    MemorySaveRepository,
    deserialize,
    migrate,
    serialize,
    type SaveEnvelope
} from '../src/brain/save';
import { freshDomainScores } from '../src/brain/knowledge';
import { ladderFor } from '../src/brain/ladder';
import { confidenceFor } from '../src/brain/confidence';
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

describe('save — a v5 (D-052) save migrates to v6 (Ch.1 v3, D-055)', () => {
    /** A realistic v5 save: axe/torch/shelter all owned, no grade/sharpblade/stoneHammer
     *  fields at all — exactly what a save from before this pass looks like. */
    function v5Save(): string {
        const state = {
            schemaVersion: 5,
            startedAtMs: 1_700_000_000_000,
            lastSeenMs: 1_700_000_300_000,
            gameHoursElapsed: 20,
            inventory: { wood: 4, stone: 6, fiber: 2, berries: 0, coconut: 0, shellfish: 0 },
            tools: { axe: true, flask: true, flaskSips: 1 },
            shelter: { built: true, x: 10, y: -5, durability: 88 },
            torch: { owned: true, lit: false, fuelGameHoursRemaining: 3 },
            trace: { deathLog: [{ cause: 'thirst', gameHoursElapsed: 5 }] }
        };
        return JSON.stringify({ schemaVersion: 5, savedAtMs: 1_700_000_300_000, state });
    }

    it('heals every already-owned axe/torch/shelter to the baseline serviceable grade — never a retroactive up/downgrade', () => {
        const envelope = deserialize(v5Save());
        expect(envelope).not.toBeNull();
        const s = envelope!.state;

        expect(s.schemaVersion).toBe(SCHEMA_VERSION);
        expect(s.tools.axe).toBe(true); // kept
        expect(s.tools.axeGrade).toBe('serviceable');
        expect(s.shelter.built).toBe(true); // kept
        expect(s.shelter.grade).toBe('serviceable');
        expect(s.torch.owned).toBe(true); // kept
        expect(s.torch.grade).toBe('serviceable');
        // Fuel/durability carry over untouched — the heal is grade only, not a refill.
        expect(s.shelter.durability).toBe(88);
        expect(s.torch.fuelGameHoursRemaining).toBe(3);
    });

    it("gains the new Ch.1 v3 fields — hasn't made a hammer or knapped a blade yet", () => {
        const envelope = deserialize(v5Save());
        const s = envelope!.state;
        expect(s.inventory.sharpblade).toBe(0);
        expect(s.tools.stoneHammer).toBe(false);
        expect(s.craftRollCount).toBe(0);
        //  Migrating a v5 save runs the WHOLE ladder, through v7 (Ch.2) too — domains
        //  arrive fresh at the innate floor, the same "hasn't happened yet" honesty as
        //  every other field this migration heals.
        expect(s.knowledge).toEqual({ nullPairs: [], events: [], domains: freshDomainScores() });
    });

    it('keeps everything else untouched — inventory, the death log, position', () => {
        const envelope = deserialize(v5Save());
        const s = envelope!.state;
        expect(s.inventory.wood).toBe(4);
        expect(s.inventory.stone).toBe(6);
        expect(s.trace.deathLog).toEqual([{ cause: 'thirst', gameHoursElapsed: 5 }]);
        expect(s.gameHoursElapsed).toBe(20);
    });

    it('is idempotent — migrating then serialising round-trips as v6', () => {
        const once = deserialize(v5Save());
        const twice = deserialize(serialize(once!.state, once!.savedAtMs));
        expect(twice!.state).toEqual(once!.state);
    });
});

describe('save — a v6 (Ch.1 v3, D-055) save migrates to v7 (Ch.2, "The Knowledge Model")', () => {
    /** A realistic v6 save: the null-outcome journal has real entries (from a real Build
     *  panel session before Ch.2 existed), but no `domains` field at all — exactly what a
     *  save from before this pass looks like. */
    function v6Save(): string {
        const state = {
            schemaVersion: 6,
            startedAtMs: 1_700_000_000_000,
            lastSeenMs: 1_700_000_300_000,
            gameHoursElapsed: 30,
            inventory: { wood: 2, stone: 1, fiber: 0, berries: 3, coconut: 0, shellfish: 0, sharpblade: 1 },
            tools: { axe: true, flask: false, flaskSips: 0, stoneHammer: true, axeGrade: 'refined' },
            craftRollCount: 4,
            knowledge: {
                nullPairs: ['axe-blade|wood', 'shelter-walls|fiber'],
                events: [{ kind: 'combination-tried', detail: 'wood does not satisfy axe-blade', gameHoursElapsed: 12 }]
                // no `domains` at all — this field did not exist at v6
            },
            trace: { deathLog: [] }
        };
        return JSON.stringify({ schemaVersion: 6, savedAtMs: 1_700_000_300_000, state });
    }

    it('gains every domain fresh at the innate floor — no retroactive Understanding credit for pre-Ch.2 null pairs', () => {
        const envelope = deserialize(v6Save());
        expect(envelope).not.toBeNull();
        const s = envelope!.state;

        expect(s.schemaVersion).toBe(SCHEMA_VERSION);
        expect(Object.keys(s.knowledge.domains).length).toBe(7);
        for (const domain of Object.values(s.knowledge.domains)) {
            expect(domain).toEqual({
                technique: TUNE.knowledgeInnateFloor,
                understanding: TUNE.knowledgeInnateFloor,
                adaptation: TUNE.knowledgeInnateFloor
            });
        }
    });

    it('keeps the pre-existing null-outcome journal exactly as it was', () => {
        const envelope = deserialize(v6Save());
        const s = envelope!.state;
        expect(s.knowledge.nullPairs).toEqual(['axe-blade|wood', 'shelter-walls|fiber']);
        expect(s.knowledge.events).toHaveLength(1);
        expect(s.knowledge.events[0].detail).toBe('wood does not satisfy axe-blade');
    });

    it('keeps everything else untouched — the axe grade, the hammer, the blade in hand', () => {
        const envelope = deserialize(v6Save());
        const s = envelope!.state;
        expect(s.tools.axeGrade).toBe('refined');
        expect(s.tools.stoneHammer).toBe(true);
        expect(s.inventory.sharpblade).toBe(1);
        expect(s.craftRollCount).toBe(4);
    });

    it('is idempotent — migrating then serialising round-trips as v7', () => {
        const once = deserialize(v6Save());
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

describe('save — a v11 save migrates to v12 (Slice 2B Stage 2d, the invention pivot)', () => {
    /**
     * The director's live save, in the shape that matters: a shelter standing, an axe in hand,
     * a hammer that knapped a blade — and, crucially, NO blueprints, because before the pivot
     * the manufacture catalogue handed those over and nobody had to earn one.
     *
     * That is the whole risk of Stage 2b. Empty the catalogue with this save untouched and a
     * survivor holding their own axe is told they have never heard of one, then has to
     * rediscover it by Try-Combine to get the list back. The migration reads possession as
     * proof and mints what the evidence implies.
     */
    function v11Save(over: Record<string, unknown> = {}): string {
        const state = {
            schemaVersion: 11,
            startedAtMs: 1_700_000_000_000,
            lastSeenMs: 1_700_000_300_000,
            gameHoursElapsed: 40,
            inventory: { wood: 5, stone: 2, fiber: 4, berries: 0, coconut: 0, shellfish: 0, sharpblade: 1 },
            tools: { axe: true, flask: true, flaskSips: 2, stoneHammer: true, axeGrade: 'serviceable', fishingLine: false },
            shelter: { built: true, durability: 70 },
            storage: { built: true, durability: 55 },
            torch: { owned: true, lit: false, fuel: 3 },
            blueprints: [],
            knowledge: { nullPairs: [], events: [] },
            trace: { deathLog: [] },
            ...over,
        };
        return JSON.stringify({ schemaVersion: 11, savedAtMs: 1_700_000_300_000, state });
    }

    it('mints a blueprint for everything possession proves was once made', () => {
        const loaded = deserialize(v11Save())!.state;
        expect(loaded).not.toBeNull();
        const made = loaded.blueprints.map((b) => b.recipeId).sort();
        expect(made).toEqual(['axe', 'knap', 'shelter', 'stonehammer', 'storage', 'torch']);
    });

    it('those items read DEMONSTRATED on the ladder — done, not merely suspected', () => {
        const loaded = deserialize(v11Save())!.state;
        for (const id of ['axe', 'shelter', 'storage', 'stonehammer', 'torch']) {
            expect(ladderFor(loaded, id), id).toBe('demonstrated');
        }
    });

    it('and NOT understood — having once succeeded is not the same as knowing why', () => {
        const loaded = deserialize(v11Save())!.state;
        //  `understood` and `documented` are earned through domain understanding. Granting
        //  them here would hand over exactly what the pivot exists to make earnable.
        for (const b of loaded.blueprints) {
            expect(ladderFor(loaded, b.recipeId)).not.toBe('understood');
            expect(ladderFor(loaded, b.recipeId)).not.toBe('documented');
        }
    });

    it('grants NOTHING it has no evidence for', () => {
        const bare = deserialize(v11Save({
            tools: { axe: false, flask: false, flaskSips: 0, stoneHammer: false, axeGrade: 'crude', fishingLine: false },
            shelter: { built: false, durability: 0 },
            storage: { built: false, durability: 0 },
            torch: { owned: false, lit: false, fuel: 0 },
            inventory: { wood: 0, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0, sharpblade: 0 },
        }))!.state;
        expect(bare.blueprints).toEqual([]);
        expect(ladderFor(bare, 'axe')).toBe('physically-possible');
    });

    it('STRUCTURES ARE MATTER — a standing shelter is not an entry in a list', () => {
        //  No knowledge pivot may take down something physically standing on the island.
        const loaded = deserialize(v11Save())!.state;
        expect(loaded.shelter.built).toBe(true);
        expect(loaded.shelter.durability).toBe(70);
        expect(loaded.storage.built).toBe(true);
        expect(loaded.storage.durability).toBe(55);
    });

    it('never overwrites a blueprint the survivor actually earned', () => {
        const earned = {
            id: 'bp-earned', name: 'My own axe', recipeId: 'axe', inputs: ['wood', 'sharpblade', 'fiber'],
            version: 3, workmanship: 'exceptional', author: 'castaway', discoveredAtGameHours: 12,
        };
        const loaded = deserialize(v11Save({ blueprints: [earned] }))!.state;
        const axes = loaded.blueprints.filter((b) => b.recipeId === 'axe');
        expect(axes).toHaveLength(1);
        expect(axes[0].workmanship, 'the earned grade survives').toBe('exceptional');
        expect(axes[0].version).toBe(3);
    });

    it('the migration is idempotent — loading twice mints nothing new', () => {
        const once = deserialize(v11Save())!.state;
        const twice = deserialize(JSON.stringify({
            schemaVersion: 11, savedAtMs: 1_700_000_300_000,
            state: { ...once, schemaVersion: 11 },
        }))!.state;
        expect(twice.blueprints).toHaveLength(once.blueprints.length);
    });
});

describe('save — a v12 save migrates to v13 (Slice 2B Stage B: capacities + confidence)', () => {
    /**
     * A v12 save is everything Stage A shipped and nothing Stage B did: blueprints, domains,
     * structures — but no `capacities` and no `confidence`, because neither field existed.
     */
    function v12Save(over: Record<string, unknown> = {}): string {
        const state = {
            schemaVersion: 12,
            startedAtMs: 1_700_000_000_000,
            lastSeenMs: 1_700_000_300_000,
            gameHoursElapsed: 400,
            inventory: { wood: 5, stone: 2, fiber: 4, berries: 0, coconut: 0, shellfish: 0, sharpblade: 1 },
            tools: { axe: true, flask: true, flaskSips: 2, stoneHammer: true, axeGrade: 'serviceable', fishingLine: false },
            shelter: { built: true, durability: 70 },
            storage: { built: true, durability: 55 },
            torch: { owned: true, lit: false, fuel: 3 },
            blueprints: [{
                id: 'bp-axe', name: 'My axe', recipeId: 'axe', inputs: ['wood'],
                version: 1, workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 12,
            }],
            knowledge: {
                nullPairs: ['axe-blade|wood'],
                events: [],
                domains: {
                    survivalcraft: { technique: 55, understanding: 44, adaptation: 12 },
                    foragingMedicine: { technique: 20, understanding: 20, adaptation: 12 },
                    harvestingFabrication: { technique: 60, understanding: 51, adaptation: 12 },
                    construction: { technique: 41, understanding: 47, adaptation: 12 },
                    mechanicalSystems: { technique: 12, understanding: 12, adaptation: 12 },
                    electricalRadio: { technique: 12, understanding: 12, adaptation: 12 },
                    navigationSeamanship: { technique: 12, understanding: 12, adaptation: 12 },
                },
            },
            trace: { deathLog: [] },
            ...over,
        };
        return JSON.stringify({ schemaVersion: 12, savedAtMs: 1_700_000_300_000, state });
    }

    it('gains all eight capacities at the innate floor', () => {
        const s = deserialize(v12Save())!.state;
        expect(s.schemaVersion).toBe(SCHEMA_VERSION);
        expect(Object.keys(s.capacities)).toHaveLength(8);
        for (const v of Object.values(s.capacities)) expect(v).toBe(TUNE.capacityInnateFloor);
    });

    it('gains an EMPTY confidence record — nobody is charged rust for time before the layer', () => {
        //  Seeding it with the current clock would read the same today and become wrong the
        //  moment a save sat unopened between this migration and the next session. Empty
        //  means "never practised", which `confidenceFor` reads as FULL confidence.
        const s = deserialize(v12Save())!.state;
        expect(s.confidence.lastPractisedGameHours).toEqual({});
        expect(confidenceFor(s, 'axe', s.gameHoursElapsed + 99_999)).toBe(1);
    });

    it('KNOWLEDGE IS UNTOUCHED by the migration — no domain score moves, in either direction', () => {
        const before = JSON.parse(v12Save()).state.knowledge;
        const after = deserialize(v12Save())!.state.knowledge;
        expect(after.domains).toEqual(before.domains);
        expect(after.nullPairs).toEqual(before.nullPairs);
    });

    it('and everything Stage A earned survives — blueprints and structures both', () => {
        const s = deserialize(v12Save())!.state;
        expect(s.blueprints.map((b) => b.recipeId)).toEqual(['axe']);
        expect(s.shelter.built).toBe(true);
        expect(s.shelter.durability).toBe(70);
    });

    it('a save with SOME capacities keeps them and gains only the missing ones', () => {
        //  hydrate merges per-capacity rather than falling back wholesale: a partial object
        //  must not silently drop the rest to undefined, which reads as NaN on first compare.
        const s = deserialize(v12Save({ capacities: { strength: 73 } }))!.state;
        expect(s.capacities.strength).toBe(73);
        expect(s.capacities.endurance).toBe(TUNE.capacityInnateFloor);
        expect(Object.keys(s.capacities)).toHaveLength(8);
    });
});
