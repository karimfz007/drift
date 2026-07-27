import { describe, expect, it } from 'vitest';
import { reconcile } from '../src/brain/reconcile';
import {
    activeSalvageCount,
    createInitialState,
    findNode,
    gatherNode,
    regrowGameHoursFor,
    regrowProgress,
    spawnSalvageNode
} from '../src/brain/state';
import { deserialize, serialize } from '../src/brain/save';
import { SCHEMA_VERSION } from '../src/brain/types';
import { TUNE } from '../src/data/tune';
import { WALKABLE_RADIUS, WORLD, isWalkablePoint } from '../src/data/world';

function run() {
    return createInitialState(0);
}

describe('renewability law (D-051) — no resource is globally exhaustible', () => {
    //  GEOLOGY V2 (Gate 0 item 7) adds a genuinely FINITE tier. The renewability law is
    //  unchanged and is now stated more precisely: what may never be globally exhausted is a
    //  survival-critical RESOURCE, not every individual deposit. Stone stays renewable
    //  through surface `rock`; the rich quarry seam is spent for good.
    it('renewable kinds regrow; the exempt and the FINITE do not', () => {
        for (const kind of ['driftwood', 'deadfall', 'tree', 'rock', 'berrybush', 'coconutpalm', 'reed', 'shellfish'] as const) {
            expect(Number.isFinite(regrowGameHoursFor(kind))).toBe(true);
            expect(regrowGameHoursFor(kind)).toBeGreaterThan(0);
        }
        expect(Number.isFinite(regrowGameHoursFor('crashbox'))).toBe(false); // a story beat
        expect(Number.isFinite(regrowGameHoursFor('quarry'))).toBe(false);   // a spent seam
    });

    it('D-051 STILL HOLDS: stone survives the quarry being exhausted forever', () => {
        //  The point of the law is that no survival-critical resource can be extinguished.
        //  Mine the seam to nothing, confirm it never returns however long passes, and then
        //  confirm stone is STILL obtainable from the renewable surface tier. If this ever
        //  fails, the finite tier has breached the law and must be reverted.
        const state = run();
        while (findNode(state, 'qr1')!.available) gatherNode(state, 'qr1');
        expect(findNode(state, 'qr1')!.available).toBe(false);
        expect(findNode(state, 'qr1')!.pool).toBe(0);

        //  A lifetime away, in the same elapsed-SECONDS form the rest of this file uses.
        const aLifetime = (TUNE.quarryRegrowGameHours + 5000) * TUNE.dayLengthRealMinutes * 60 / TUNE.gameHoursPerDay;
        const { state: after } = reconcile(state, aLifetime);
        expect(after.nodes.find((n) => n.id === 'qr1')!.available).toBe(false); // never returns

        const rocks = after.nodes.filter((n) => n.kind === 'rock');
        expect(rocks.length).toBeGreaterThan(0);
        expect(rocks.some((n) => n.available)).toBe(true); // stone is still there to be had
    });

    it('regrowProgress: 1 while available, climbs 0→1 over the regrow duration, 0 forever for an exempt kind', () => {
        const state = run();
        const rock = findNode(state, 'rk1')!;
        expect(regrowProgress(rock, state.gameHoursElapsed)).toBe(1); // available, untouched

        gatherNode(state, 'rk1');
        expect(regrowProgress(rock, rock.depletedAtGameHours!)).toBe(0); // the instant it's spent
        const halfway = rock.depletedAtGameHours! + TUNE.rockRegrowGameHours / 2;
        expect(regrowProgress(rock, halfway)).toBeCloseTo(0.5, 5);
        const done = rock.depletedAtGameHours! + TUNE.rockRegrowGameHours;
        expect(regrowProgress(rock, done)).toBe(1);

        state.tools.axe = true; // crashbox and trees need the axe, or gatherNode refuses (blocked)
        const box = findNode(state, 'box1')!;
        gatherNode(state, 'box1');
        expect(regrowProgress(box, box.depletedAtGameHours! + 1_000_000)).toBe(0); // never — exempt
    });

    it('a gathered node stays spent for a shorter-than-regrow absence, and regrows exactly once the duration elapses', () => {
        const state = run();
        gatherNode(state, 'rk1'); // rockRegrowGameHours = 72

        const shortSeconds = (TUNE.rockRegrowGameHours - 1) * TUNE.dayLengthRealMinutes * 60 / TUNE.gameHoursPerDay;
        const { state: tooSoon } = reconcile(state, shortSeconds);
        expect(tooSoon.nodes.find((n) => n.id === 'rk1')?.available).toBe(false);

        const justEnoughSeconds = (TUNE.rockRegrowGameHours + 0.5) * TUNE.dayLengthRealMinutes * 60 / TUNE.gameHoursPerDay;
        const { state: regrown } = reconcile(state, justEnoughSeconds);
        expect(regrown.nodes.find((n) => n.id === 'rk1')?.available).toBe(true);
        expect(regrown.nodes.find((n) => n.id === 'rk1')?.depletedAtGameHours).toBeNull();
    });

    it('the tree sapling threshold (D-051): a stump below the fraction, a sapling at/above it, both still unavailable', () => {
        const state = run();
        state.tools.axe = true; // trees need the axe, or gatherNode refuses (blocked)
        gatherNode(state, 'tr1');
        const node = findNode(state, 'tr1')!;
        const clockAtStump = node.depletedAtGameHours! + TUNE.treeRegrowGameHours * (TUNE.treeSaplingAtFraction - 0.1);
        const clockAtSapling = node.depletedAtGameHours! + TUNE.treeRegrowGameHours * (TUNE.treeSaplingAtFraction + 0.1);
        expect(regrowProgress(node, clockAtStump)).toBeLessThan(TUNE.treeSaplingAtFraction);
        expect(regrowProgress(node, clockAtSapling)).toBeGreaterThanOrEqual(TUNE.treeSaplingAtFraction);
        expect(regrowProgress(node, clockAtSapling)).toBeLessThan(1); // still regrowing, not yet fellable
    });

    it('driftwood tides: ANY qualifying absence restocks driftwood immediately, regardless of elapsed time', () => {
        const state = run();
        gatherNode(state, 'dw1');

        //  A qualifying absence just past the report threshold — far shorter than
        //  driftwoodRegrowGameHours's own timer would need.
        const { state: after, result } = reconcile(state, TUNE.morningReportMinRealMinutes * 60 + 1);
        expect(result.qualifiesForReport).toBe(true);
        expect(result.driftwoodRestocked).toBe(true);
        expect(after.nodes.find((n) => n.id === 'dw1')?.available).toBe(true);
    });

    it('driftwood does NOT restock on a short online span (no tide, timer not elapsed)', () => {
        const state = run();
        gatherNode(state, 'dw1');
        const { state: after, result } = reconcile(state, 10);
        expect(result.qualifiesForReport).toBe(false);
        expect(result.driftwoodRestocked).toBe(false);
        expect(after.nodes.find((n) => n.id === 'dw1')?.available).toBe(false);
    });

    it('the quarry: repeat-minable, spends real pool, and is FINITE once spent (geology v2)', () => {
        const state = run();
        const quarry = findNode(state, 'qr1')!;
        expect(quarry.pool).toBe(TUNE.quarryStoneCapacity);

        //  Drain it by asking the node, not by assuming a fixed yield per tap. Mastery
        //  (Gate 0 item 3) makes a practised survivor take more per swing, so
        //  `ceil(capacity / yieldPerTap)` is no longer the tap count — but the LAW is
        //  unchanged and is now asserted more strongly than before: **total stone out equals
        //  the pool exactly.** That is the conservation property, and it locks a real bug
        //  this pass introduced and fixed — the first cut of the mastery bonus added stone
        //  to the inventory without drawing it from the pool, creating matter from nothing.
        const stoneBefore = state.inventory.stone;
        let taps = 0;
        while (quarry.available) {
            const before = quarry.pool!;
            const result = gatherNode(state, 'qr1');
            expect(result.ok).toBe(true);
            expect(quarry.pool!).toBeLessThan(before); // every tap spends real pool
            taps += 1;
            expect(taps).toBeLessThan(1000); // never loops forever
        }
        expect(taps).toBeGreaterThan(1); // genuinely repeat-minable, not single-shot
        expect(quarry.pool).toBe(0);
        expect(state.inventory.stone - stoneBefore).toBe(TUNE.quarryStoneCapacity);
        expect(quarry.available).toBe(false); // pool hit exactly 0
        expect(quarry.depletedAtGameHours).not.toBeNull();

        //  GEOLOGY V2: and it does NOT come back. The seam is spent for good; the survival
        //  floor is carried by renewable surface stone instead (see the D-051 test above).
        const longEnough = (TUNE.quarryRegrowGameHours + 500) * TUNE.dayLengthRealMinutes * 60 / TUNE.gameHoursPerDay;
        const { state: after } = reconcile(state, longEnough);
        const seam = after.nodes.find((n) => n.id === 'qr1')!;
        expect(seam.available).toBe(false);
        expect(seam.pool).toBe(0);
    });

    it('gathering the quarry when it cannot yield (blocked) is refused cleanly', () => {
        const state = run();
        const quarry = findNode(state, 'qr1')!;
        quarry.available = false;
        quarry.pool = 0;
        quarry.depletedAtGameHours = state.gameHoursElapsed;
        const result = gatherNode(state, 'qr1');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('spent');
    });

    it('beach salvage: spawnSalvageNode is deterministic and lands within the beach ring', () => {
        const a = spawnSalvageNode(42);
        const b = spawnSalvageNode(42);
        expect(a).toEqual(b); // pure — same seed, same result, always

        const r = Math.hypot(a.x, a.y);
        expect(r).toBeGreaterThanOrEqual(WORLD.beachRadius);
        //  FIX-3 (Living Island Track A): bounded by WALKABLE_RADIUS, not the old, looser
        //  `islandRadius - 2` (120 m) this assertion used to accept — that bound was wide
        //  enough to pass even with the sea-adjacent spawn bug (up to 118 m, 10 m past
        //  WALKABLE_RADIUS' 108 m), which is exactly why it never caught it.
        expect(r).toBeLessThanOrEqual(WALKABLE_RADIUS);
        expect(isWalkablePoint(a.x, a.y)).toBe(true);
        expect(['driftwood', 'cordage', 'stone', 'bundle']).toContain(a.salvageLoot);
        expect(a.available).toBe(true);
        expect(a.depletedAtGameHours).toBeNull();
    });

    it('FIX-3: every salvage spawn is walkable/reachable, across many seeds (property test)', () => {
        //  Harness note (device-level companion to this): every currently-spawned salvage
        //  node should also be confirmed path-reachable from a fixed test origin on-device
        //  — tools/smoke.mjs. This is the brain-level guarantee the geometry itself makes,
        //  independent of rendering: no seed, ever, produces an unwalkable point.
        for (let seed = 0; seed < 500; seed++) {
            const node = spawnSalvageNode(seed);
            expect(isWalkablePoint(node.x, node.y)).toBe(true);
            expect(Math.hypot(node.x, node.y)).toBeLessThanOrEqual(WALKABLE_RADIUS);
        }
    });

    it('beach salvage: reconcile spawns finds over time online, capped at salvageMaxActive, seeded not random', () => {
        const state = run();
        const before = activeSalvageCount(state.nodes);
        expect(before).toBe(0);

        //  A span long enough to cross several spawn intervals but stay online (no report).
        const onlineSeconds = TUNE.morningReportMinRealMinutes * 60 - 1;
        const { state: after } = reconcile(state, onlineSeconds);
        // Short online tick — may or may not cross the first interval; just confirm no crash
        // and the cap is respected either way.
        expect(activeSalvageCount(after.nodes)).toBeLessThanOrEqual(TUNE.salvageMaxActive);

        //  A long absence: enough spawn intervals to hit the cap for certain.
        const { state: later } = reconcile(state, 3 * 24 * 60 * 60);
        expect(activeSalvageCount(later.nodes)).toBe(TUNE.salvageMaxActive);
    });

    it('gathering a salvage node grants the resource its rolled loot says, and it never comes back', () => {
        const state = run();
        const { state: later } = reconcile(state, 3 * 24 * 60 * 60);
        const salvage = later.nodes.find((n) => n.kind === 'salvage')!;
        expect(salvage).toBeTruthy();

        const woodBefore = later.inventory.wood, stoneBefore = later.inventory.stone, fiberBefore = later.inventory.fiber;
        const result = gatherNode(later, salvage.id);
        expect(result.ok).toBe(true);
        expect(salvage.available).toBe(false);

        if (salvage.salvageLoot === 'driftwood') expect(later.inventory.wood).toBe(woodBefore + TUNE.salvageWoodAmount);
        if (salvage.salvageLoot === 'cordage') expect(later.inventory.fiber).toBe(fiberBefore + TUNE.salvageFiberAmount);
        if (salvage.salvageLoot === 'stone') expect(later.inventory.stone).toBe(stoneBefore + TUNE.salvageStoneAmount);
        if (salvage.salvageLoot === 'bundle') {
            expect(later.inventory.wood).toBe(woodBefore + TUNE.salvageBundleWoodAmount);
            expect(later.inventory.stone).toBe(stoneBefore + TUNE.salvageBundleStoneAmount);
            expect(later.inventory.fiber).toBe(fiberBefore + TUNE.salvageBundleFiberAmount);
        }

        //  Exempt from regrowth — this specific find is gone for good (new ones spawn instead).
        const { state: muchLater } = reconcile(later, 30 * 24 * 60 * 60);
        expect(muchLater.nodes.find((n) => n.id === salvage.id)?.available).toBe(false);
    });

    it('reconcile stays pure and deterministic with the renewability law in play', () => {
        const state = run();
        gatherNode(state, 'rk1');
        gatherNode(state, 'dw1');
        const before = JSON.stringify(state);
        const a = reconcile(state, 5 * 24 * 60 * 60);
        const b = reconcile(state, 5 * 24 * 60 * 60);
        expect(JSON.stringify(state)).toBe(before); // never mutated
        expect(a.state).toEqual(b.state); // same input, same output, always
        expect(a.result.nodesRegrewCount).toBe(b.result.nodesRegrewCount);
        expect(a.result.salvageSpawnedCount).toBe(b.result.salvageSpawnedCount);
    });

    it('migration v3→v4 heals an existing save: depleted nodes come back, and new content (the quarry) merges in', () => {
        const state = run();
        state.tools.axe = true; // trees need the axe, or gatherNode refuses (blocked)
        gatherNode(state, 'tr1');
        gatherNode(state, 'rk1');
        //  Simulate a v3 save: no quarry entry, no depletedAtGameHours/salvage fields at all.
        const v3Nodes = state.nodes
            .filter((n) => n.kind !== 'quarry')
            .map(({ id, kind, x, y, available }) => ({ id, kind, x, y, available }));
        const v3Payload = JSON.stringify({
            schemaVersion: 3,
            savedAtMs: 1000,
            state: { ...state, nodes: v3Nodes, schemaVersion: 3, salvageSpawnCount: undefined, nextSalvageSpawnAtGameHours: undefined }
        });

        const migrated = deserialize(v3Payload);
        expect(migrated).not.toBeNull();
        //  Migration always lands at the CURRENT schema version, whatever it is this
        //  cycle — a v3 save now rides the full v3→v4→v5 ladder in one deserialize() call.
        expect(migrated!.state.schemaVersion).toBe(SCHEMA_VERSION);
        expect(migrated!.state.nodes.find((n) => n.id === 'tr1')?.available).toBe(true); // healed
        expect(migrated!.state.nodes.find((n) => n.id === 'rk1')?.available).toBe(true); // healed
        const quarry = migrated!.state.nodes.find((n) => n.id === 'qr1');
        expect(quarry).toBeTruthy(); // new content merged in, even though the old save never had it
        expect(quarry?.pool).toBe(TUNE.quarryStoneCapacity);
    });

    it('a save at the current schema round-trips the renewability fields exactly', () => {
        const state = run();
        gatherNode(state, 'qr1');
        const payload = serialize(state, 1000);
        const restored = deserialize(payload);
        expect(restored!.state.nodes.find((n) => n.id === 'qr1')?.pool).toBe(state.nodes.find((n) => n.id === 'qr1')!.pool);
        expect(restored!.state.salvageSpawnCount).toBe(state.salvageSpawnCount);
        expect(restored!.state.nextSalvageSpawnAtGameHours).toBe(state.nextSalvageSpawnAtGameHours);
    });
});
