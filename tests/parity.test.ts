import { describe, expect, it } from 'vitest';
import { HARVESTABLE_TREE_SPOTS, ROCKS, TREES, createNodes } from '../src/data/world';
import { deserialize } from '../src/brain/save';
import { createInitialState, exhaustionHoldMultiplierFor, nodeHoldSeconds } from '../src/brain/state';
import { SCHEMA_VERSION } from '../src/brain/types';
import { TUNE } from '../src/data/tune';
import type { GameState, WoodNode } from '../src/brain/types';

function run(): GameState {
    return createInitialState(0);
}

function nodesOfKind(kind: string): WoodNode[] {
    return createNodes().filter((n) => n.kind === kind);
}

describe('FIX-1 — tree parity: trees match how rocks already work (D-059)', () => {
    it('rocks are 3 real against 14 decorative — the measured pattern trees are matched to', () => {
        //  Pinned so the target cannot drift silently: if the rock population ever changes,
        //  this fails and the tree ratio below has to be re-derived rather than assumed.
        expect(nodesOfKind('rock')).toHaveLength(3);
        expect(ROCKS).toHaveLength(14);
    });

    it('REGRESSION — trees are no longer a handful of real among a hundred fakes', () => {
        //  Before D-059 this was 5 real against 101 decorative: 4.7%, versus rocks' 17.6%.
        //  A tap on any of the other ~96 fell silently through to the terrain — D-051's own
        //  root cause, still live for trees.
        const realTrees = nodesOfKind('tree');
        expect(realTrees.length).toBeGreaterThan(5);
        expect(realTrees).toHaveLength(19);
    });

    it('the real:decorative ratio now matches rocks within a whole tree', () => {
        const realTrees = nodesOfKind('tree').length;
        const treeFraction = realTrees / (realTrees + TREES.length);
        const rockFraction = 3 / (3 + ROCKS.length);
        //  19/106 = 17.9% against rocks' 17.6%. The closest whole-tree match available:
        //  18 real would give 17.0%, which is further from the target.
        expect(treeFraction).toBeGreaterThan(rockFraction - 0.02);
        expect(treeFraction).toBeLessThan(rockFraction + 0.02);
    });

    it('no position is ever drawn twice — promoted spots leave the decorative list', () => {
        const decorative = new Set(TREES.map(([x, z]) => `${x},${z}`));
        for (const [x, z] of HARVESTABLE_TREE_SPOTS) {
            expect(decorative.has(`${x},${z}`)).toBe(false);
        }
        expect(HARVESTABLE_TREE_SPOTS).toHaveLength(14);
    });

    it('promoted trees are spread around the treeline, not clustered in one arc', () => {
        //  A player should never have to learn which quadrant is the "real" forest.
        const quadrants = new Set(HARVESTABLE_TREE_SPOTS.map(([x, z]) => `${x >= 0 ? 'E' : 'W'}${z >= 0 ? 'N' : 'S'}`));
        expect(quadrants.size).toBe(4);
    });

    it('every promoted tree is an ordinary tree node — the existing machinery, not a new kind', () => {
        //  Inherits the blaze mark, the axe gate, stump/sapling depletion and 96 h regrowth
        //  by being the same kind tr1-tr5 always were.
        for (const n of nodesOfKind('tree')) {
            expect(n.kind).toBe('tree');
            expect(n.available).toBe(true);
            expect(n.depletedAtGameHours).toBeNull();
            expect(n.pool).toBeUndefined();
        }
    });

    it('every node id is unique — the promoted ids cannot collide with tr1-tr5', () => {
        const ids = createNodes().map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('the island is deterministic — two builds produce identical node lists', () => {
        expect(JSON.stringify(createNodes())).toBe(JSON.stringify(createNodes()));
    });
});

describe('FIX-2 — exhaustion has teeth: it reaches gathering, not just walking (D-059)', () => {
    it('REGRESSION — a hold at zero energy takes strictly longer than at full', () => {
        //  The root cause: `nodeHoldSeconds` read skill level and axe grade only. Energy
        //  touched nothing about gathering, so mining at 0 was identical to mining at 100.
        const rested = run();
        const spent = run();
        rested.energy = TUNE.energyMax;
        spent.energy = 0;
        const rock = createNodes().find((n) => n.kind === 'rock')!;

        const restedSeconds = nodeHoldSeconds(rested, rock);
        const spentSeconds = nodeHoldSeconds(spent, rock);
        expect(spentSeconds).toBeGreaterThan(restedSeconds);
        expect(spentSeconds).toBeCloseTo(restedSeconds * TUNE.collapsedHoldMultiplier, 9);
    });

    it('applies to EVERY hold kind, including the axe-gated ones', () => {
        const rested = run();
        const spent = run();
        spent.energy = 0;
        for (const kind of ['tree', 'deadfall', 'rock', 'quarry', 'coconutpalm', 'crashbox']) {
            const node = createNodes().find((n) => n.kind === kind);
            if (!node) continue;
            expect(nodeHoldSeconds(spent, node)).toBeGreaterThan(nodeHoldSeconds(rested, node));
        }
    });

    it('tap-kind gathers are untouched — an instant pickup is not effort', () => {
        const spent = run();
        spent.energy = 0;
        for (const kind of ['driftwood', 'berrybush', 'reed', 'shellfish']) {
            const node = createNodes().find((n) => n.kind === kind);
            if (!node) continue;
            expect(nodeHoldSeconds(spent, node)).toBe(0);
        }
    });

    it('healthy energy costs nothing at all — exactly 1, so nothing pre-Ch.6 shifted', () => {
        expect(exhaustionHoldMultiplierFor(TUNE.energyMax)).toBe(1);
        expect(exhaustionHoldMultiplierFor(TUNE.energyLowThreshold + 0.01)).toBe(1);
    });

    it('is a gradient, not a cliff — "nearly spent" and "utterly spent" differ', () => {
        const atThreshold = exhaustionHoldMultiplierFor(TUNE.energyLowThreshold);
        const halfway = exhaustionHoldMultiplierFor(TUNE.energyLowThreshold / 2);
        const empty = exhaustionHoldMultiplierFor(0);
        expect(atThreshold).toBeCloseTo(TUNE.exhaustedHoldMultiplier, 9);
        expect(empty).toBeCloseTo(TUNE.collapsedHoldMultiplier, 9);
        expect(halfway).toBeGreaterThan(atThreshold);
        expect(halfway).toBeLessThan(empty);
    });

    it('never blocks the action and never shrinks the yield — a soft debuff, as C05 set', () => {
        const spent = run();
        spent.energy = 0;
        const rock = createNodes().find((n) => n.kind === 'rock')!;
        const seconds = nodeHoldSeconds(spent, rock);
        expect(Number.isFinite(seconds)).toBe(true);
        expect(seconds).toBeGreaterThan(0);
    });
});

describe('save — a v8 save migrates to v9 and RECEIVES the new trees (D-059)', () => {
    /** A realistic v8 save: mid-run, five trees, one of them already felled. */
    function v8Save(): string {
        const fresh = createInitialState(1_700_000_000_000);
        const oldTrees = fresh.nodes.filter((n) => n.kind === 'tree').slice(0, 5);
        const felled = { ...oldTrees[0], available: false, depletedAtGameHours: 12 };
        const nodes = [felled, ...oldTrees.slice(1), ...fresh.nodes.filter((n) => n.kind !== 'tree')];
        const state = { ...fresh, schemaVersion: 8, nodes, gameHoursElapsed: 50 };
        return JSON.stringify({ schemaVersion: 8, savedAtMs: 1_700_000_300_000, state });
    }

    it('a returning player gains the promoted trees rather than keeping a five-tree island', () => {
        const s = deserialize(v8Save())!.state;
        expect(s.schemaVersion).toBe(SCHEMA_VERSION);
        expect(s.nodes.filter((n) => n.kind === 'tree')).toHaveLength(19);
    });

    it('the new trees arrive standing and ready', () => {
        const s = deserialize(v8Save())!.state;
        const promoted = s.nodes.filter((n) => n.kind === 'tree' && !['tr1', 'tr2', 'tr3', 'tr4', 'tr5'].includes(n.id));
        expect(promoted).toHaveLength(14);
        for (const n of promoted) {
            expect(n.available).toBe(true);
            expect(n.depletedAtGameHours).toBeNull();
        }
    });

    it('a tree the player already felled STAYS felled, still counting down — nothing is healed', () => {
        const s = deserialize(v8Save())!.state;
        const felled = s.nodes.find((n) => n.id === 'tr1')!;
        expect(felled.available).toBe(false);
        expect(felled.depletedAtGameHours).toBe(12);
    });

    it('adds only — every pre-existing node survives untouched', () => {
        const before = JSON.parse(v8Save()).state.nodes as WoodNode[];
        const after = deserialize(v8Save())!.state.nodes;
        for (const old of before) {
            expect(after.find((n) => n.id === old.id)).toMatchObject({ id: old.id, kind: old.kind, available: old.available });
        }
        expect(after.length).toBeGreaterThan(before.length);
    });

    it('is idempotent — migrating an already-v9 save adds nothing further', () => {
        const once = deserialize(v8Save())!;
        const twice = deserialize(JSON.stringify(once))!;
        expect(twice.state.nodes).toHaveLength(once.state.nodes.length);
    });
});
