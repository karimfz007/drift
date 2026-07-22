import { describe, expect, it } from 'vitest';
import {
    canBuildFire,
    canFeedFire,
    buildFire,
    createInitialState,
    deadfallYield,
    feedFire,
    fireBurnHoursRemaining,
    gatherNode,
    isFireLit,
    isSheltered,
    nodeYield
} from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import { SPAWN } from '../src/data/world';

function run() {
    return createInitialState(0);
}

describe('state — the fresh run', () => {
    it('starts at the waterline, warm, empty-handed, at dusk', () => {
        const s = run();
        expect(s.player).toEqual({ x: SPAWN.x, y: SPAWN.y });
        expect(s.warmth).toBe(TUNE.warmthMax);
        expect(s.inventory.wood).toBe(0);
        expect(s.gameHoursElapsed).toBe(0);
        expect(s.fire.built).toBe(false);
        expect(s.settings.controlMode).toBe('tap');
    });

    it('places enough wood on the island to light a fire and feed it', () => {
        const s = run();
        const total = s.nodes.reduce((sum, n) => sum + nodeYield(s, n.id), 0);
        expect(total).toBeGreaterThan(TUNE.woodPerFire);
        expect(s.nodes.filter((n) => n.kind === 'driftwood').length).toBeGreaterThanOrEqual(4);
        expect(s.nodes.filter((n) => n.kind === 'deadfall').length).toBeGreaterThanOrEqual(3);
    });
});

describe('state — gathering', () => {
    it('driftwood is an instant pickup worth driftwoodTapYield', () => {
        const s = run();
        expect(gatherNode(s, 'dw1')).toBe(TUNE.driftwoodTapYield);
        expect(s.inventory.wood).toBe(TUNE.driftwoodTapYield);
    });

    it('deadfall yields between the tuned min and max, deterministically', () => {
        const s = run();
        for (const node of s.nodes.filter((n) => n.kind === 'deadfall')) {
            const yielded = deadfallYield(node.id);
            expect(yielded).toBeGreaterThanOrEqual(TUNE.deadfallYieldMin);
            expect(yielded).toBeLessThanOrEqual(TUNE.deadfallYieldMax);
            expect(deadfallYield(node.id)).toBe(yielded);
        }
    });

    it('a spent node gives nothing the second time', () => {
        const s = run();
        const first = gatherNode(s, 'df1');
        expect(first).toBeGreaterThan(0);
        expect(gatherNode(s, 'df1')).toBe(0);
        expect(s.inventory.wood).toBe(first);
    });

    it('an unknown node id is simply ignored', () => {
        const s = run();
        expect(gatherNode(s, 'nope')).toBe(0);
        expect(s.inventory.wood).toBe(0);
    });
});

describe('state — the fire', () => {
    it('cannot be built without woodPerFire in hand', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire - 1;
        expect(canBuildFire(s)).toBe(false);
        expect(buildFire(s, 100, 100)).toBe(false);
        expect(s.fire.built).toBe(false);
        expect(s.inventory.wood).toBe(TUNE.woodPerFire - 1);
    });

    it('spends exactly woodPerFire and burns for the tuned span', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire + 2;
        expect(buildFire(s, 120, 340)).toBe(true);
        expect(s.inventory.wood).toBe(2);
        expect(s.fire).toMatchObject({ built: true, fuel: TUNE.woodPerFire, x: 120, y: 340 });
        expect(isFireLit(s)).toBe(true);
        expect(fireBurnHoursRemaining(s)).toBe(TUNE.woodPerFire * TUNE.fireBurnGameHoursPerWood);
    });

    it('can only be built once', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire * 3;
        expect(buildFire(s, 1, 1)).toBe(true);
        expect(canBuildFire(s)).toBe(false);
        expect(buildFire(s, 2, 2)).toBe(false);
        expect(s.fire.x).toBe(1);
    });

    it('takes one more wood at a time, up to the pit limit', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire;
        buildFire(s, 0, 0);
        s.inventory.wood = 50;

        expect(feedFire(s)).toBe(true);
        expect(s.fire.fuel).toBe(TUNE.woodPerFire + 1);
        expect(s.inventory.wood).toBe(49);

        while (canFeedFire(s)) feedFire(s);
        expect(s.fire.fuel).toBe(TUNE.fireMaxFuel);
        expect(feedFire(s)).toBe(false);
    });

    it('a burnt-out fire can still be fed back to life', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire;
        buildFire(s, 0, 0);
        s.fire.fuel = 0;
        expect(isFireLit(s)).toBe(false);
        s.inventory.wood = 1;
        expect(feedFire(s)).toBe(true);
        expect(isFireLit(s)).toBe(true);
    });
});

describe('state — shelter', () => {
    it('shelter needs a lit fire and the player standing inside its radius', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire;
        buildFire(s, s.player.x, s.player.y);
        expect(isSheltered(s)).toBe(true);

        s.player.x = s.fire.x + TUNE.fireWarmthRadius - 1;
        expect(isSheltered(s)).toBe(true);

        s.player.x = s.fire.x + TUNE.fireWarmthRadius + 1;
        expect(isSheltered(s)).toBe(false);

        s.player.x = s.fire.x;
        s.fire.fuel = 0;
        expect(isSheltered(s)).toBe(false);
    });
});
