import { describe, expect, it } from 'vitest';
import {
    buildFire,
    canBuildFire,
    canFeedFire,
    createInitialState,
    deadfallYield,
    feedFire,
    fireBurnHoursRemaining,
    gatherNode,
    isFireLit,
    isSheltered
} from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import { SPAWN } from '../src/data/world';

function run() {
    return createInitialState(0);
}

describe('state — the fresh run', () => {
    it('starts at the waterline, full on every vital, empty-handed, at dusk', () => {
        const s = run();
        expect(s.player).toEqual({ x: SPAWN.x, y: SPAWN.y });
        expect(s.warmth).toBe(TUNE.warmthMax);
        expect(s.thirst).toBe(TUNE.thirstMax);
        expect(s.hunger).toBe(TUNE.hungerMax);
        expect(s.health).toBe(TUNE.healthMax);
        expect(s.inventory.wood).toBe(0);
        expect(s.tools.axe).toBe(false);
        expect(s.skills.woodcutting.level).toBe(1);
        expect(s.gameHoursElapsed).toBe(0);
        expect(s.fire.built).toBe(false);
    });

    it('has every node kind the pressure loop needs', () => {
        const kinds = new Set(run().nodes.map((n) => n.kind));
        for (const kind of ['driftwood', 'deadfall', 'tree', 'rock', 'berrybush', 'coconutpalm', 'shellfish', 'crashbox']) {
            expect(kinds.has(kind as never)).toBe(true);
        }
    });

    it('leaves everything the axe recipe needs reachable by hand', () => {
        const s = run();
        //  Gather all the pre-axe nodes and confirm they cover the recipe.
        for (const node of s.nodes) {
            if (node.kind === 'tree' || node.kind === 'crashbox') continue;
            gatherNode(s, node.id);
        }
        expect(s.inventory.wood).toBeGreaterThanOrEqual(TUNE.axeWoodCost);
        expect(s.inventory.stone).toBeGreaterThanOrEqual(TUNE.axeStoneCost);
        expect(s.inventory.fiber).toBeGreaterThanOrEqual(TUNE.axeFiberCost);
    });
});

describe('state — gathering', () => {
    it('driftwood is an instant pickup worth driftwoodTapYield', () => {
        const s = run();
        const result = gatherNode(s, 'dw1');
        expect(result.ok).toBe(true);
        expect(result.gained.wood).toBe(TUNE.driftwoodTapYield);
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
        expect(first.ok).toBe(true);
        const second = gatherNode(s, 'df1');
        expect(second.ok).toBe(false);
        expect(second.reason).toBe('spent');
    });

    it('an unknown node id is simply refused', () => {
        const s = run();
        const result = gatherNode(s, 'nope');
        expect(result.ok).toBe(false);
        expect(s.inventory.wood).toBe(0);
    });
});

describe('state — the axe gate', () => {
    it('refuses to fell a standing tree without the axe, and allows it with', () => {
        const s = run();
        const blocked = gatherNode(s, 'tr1');
        expect(blocked.ok).toBe(false);
        expect(blocked.reason).toBe('need-axe');
        expect(s.inventory.wood).toBe(0);

        s.tools.axe = true;
        const felled = gatherNode(s, 'tr1');
        expect(felled.ok).toBe(true);
        expect(felled.gained.wood).toBe(TUNE.treeWoodYield);
        expect(felled.skill).toBe('woodcutting');
        expect(felled.xpGained).toBe(TUNE.xpPerMeaningfulAction);
    });

    it('the crash box needs the axe, and yields fibre and the flask', () => {
        const s = run();
        expect(gatherNode(s, 'box1').ok).toBe(false);
        s.tools.axe = true;
        const opened = gatherNode(s, 'box1');
        expect(opened.ok).toBe(true);
        expect(opened.foundFlask).toBe(true);
        expect(s.tools.flask).toBe(true);
        expect(s.inventory.fiber).toBeGreaterThanOrEqual(TUNE.crashBoxFiber);
    });

    it('coconut palms give coconut and the pre-axe fibre, and train foraging', () => {
        const s = run();
        const result = gatherNode(s, 'cp1');
        expect(result.ok).toBe(true);
        expect(result.gained.coconut).toBe(1);
        expect(result.gained.fiber).toBe(TUNE.fiberPerCoconutPalm);
        expect(result.skill).toBe('foraging');
    });
});

describe('state — the fire (unchanged from Cycle 01)', () => {
    it('spends exactly woodPerFire and burns for the tuned span', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire + 2;
        expect(buildFire(s, 120, 340)).toBe(true);
        expect(s.inventory.wood).toBe(2);
        expect(s.fire).toMatchObject({ built: true, fuel: TUNE.woodPerFire, x: 120, y: 340 });
        expect(isFireLit(s)).toBe(true);
        expect(fireBurnHoursRemaining(s)).toBe(TUNE.woodPerFire * TUNE.fireBurnGameHoursPerWood);
    });

    it('cannot be built without woodPerFire, or built twice', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire - 1;
        expect(canBuildFire(s)).toBe(false);
        s.inventory.wood = TUNE.woodPerFire * 3;
        expect(buildFire(s, 1, 1)).toBe(true);
        expect(buildFire(s, 2, 2)).toBe(false);
    });

    it('takes one more wood at a time, up to the pit limit', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire;
        buildFire(s, 0, 0);
        s.inventory.wood = 50;
        expect(feedFire(s)).toBe(true);
        expect(s.fire.fuel).toBe(TUNE.woodPerFire + 1);
        while (canFeedFire(s)) feedFire(s);
        expect(s.fire.fuel).toBe(TUNE.fireMaxFuel);
    });
});

describe('state — shelter', () => {
    it('shelter needs a lit fire and the player standing inside its radius', () => {
        const s = run();
        s.inventory.wood = TUNE.woodPerFire;
        buildFire(s, s.player.x, s.player.y);
        expect(isSheltered(s)).toBe(true);

        s.player.x = s.fire.x + TUNE.fireWarmthRadius + 1;
        expect(isSheltered(s)).toBe(false);

        s.player.x = s.fire.x;
        s.fire.fuel = 0;
        expect(isSheltered(s)).toBe(false);
    });
});
