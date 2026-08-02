import { describe, expect, it } from 'vitest';
import {
    buildFire,
    canBuildFire,
    canFeedFire,
    craftStoneHammer,
    createInitialState,
    deadfallYield,
    feedFire,
    fireBurnHoursRemaining,
    gatherNode,
    isFireLit,
    isSheltered,
    knapSharpblade
} from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import { closeSurvivor } from '../src/brain/succession';
import { SPAWN } from '../src/data/world';

function run() {
    return createInitialState(0);
}

describe('state — the fresh run', () => {
    it('starts at the waterline WASHED ASHORE — hurt, soaked, empty-handed, at dusk', () => {
        //  THIS TEST CODIFIED THE DEFECT. It read "full on every vital" and asserted
        //  `warmthMax`/`thirstMax`/`hungerMax`/`healthMax`, which is exactly the "100% spawn"
        //  the director reported. It passed on every run of the slice that was supposed to
        //  fix it, because Laws 115-117 were wired into succession and never into the first
        //  life — and a green test asserting the old behaviour is how that goes unnoticed.
        //
        //  Inverted, not deleted: the assertion that a castaway lands compromised is exactly
        //  as load-bearing as the one it replaces, and it must fail loudly if anyone restores
        //  full bars for "a gentler opening".
        const s = run();
        expect(s.player).toEqual({ x: SPAWN.x, y: SPAWN.y });
        expect(s.warmth).toBe(TUNE.warmthMax * TUNE.arrivalWarmthFraction);
        expect(s.thirst).toBe(TUNE.thirstMax * TUNE.arrivalThirstFraction);
        expect(s.hunger).toBe(TUNE.hungerMax * TUNE.arrivalHungerFraction);
        expect(s.health).toBe(TUNE.healthMax * TUNE.arrivalHealthFraction);
        expect(s.energy).toBe(TUNE.energyMax * TUNE.arrivalEnergyFraction);
        expect(s.wet).toBe(TUNE.wetMax * TUNE.arrivalWetFraction);
        //  ...and NOT full, stated separately so the intent survives a tuning pass that
        //  happens to move a fraction to 1.0 by accident.
        for (const [have, max] of [[s.warmth, TUNE.warmthMax], [s.thirst, TUNE.thirstMax],
            [s.hunger, TUNE.hungerMax], [s.health, TUNE.healthMax], [s.energy, TUNE.energyMax]]) {
            expect(have, 'a castaway who washed ashore has not survived anything yet').toBeLessThan(max);
        }
        expect(s.inventory.wood).toBe(0);
        expect(s.tools.axe).toBe(false);
        expect(s.skills.woodcutting.level).toBe(1);
        expect(s.gameHoursElapsed).toBe(0);
        expect(s.fire.built).toBe(false);
    });

    it('the FIRST life and a SUCCESSOR land identically — one arrival, one source', () => {
        //  The structural guarantee behind the fix. The profile lived in `closeSurvivor` and
        //  nowhere else, so the two arrivals could differ — and did, completely. Comparing
        //  them here means any future edit that touches one and not the other fails, which is
        //  the only thing that keeps `arrival.ts` honest about being the single source.
        const first = run();
        const successor = closeSurvivor(run(), 'thirst').next;
        for (const k of ['warmth', 'thirst', 'hunger', 'health', 'energy', 'wet'] as const) {
            expect(successor[k], `${k} differs between the first life and a successor`).toBe(first[k]);
        }
    });

    it('has every node kind the pressure loop needs', () => {
        const kinds = new Set(run().nodes.map((n) => n.kind));
        for (const kind of ['driftwood', 'deadfall', 'tree', 'rock', 'berrybush', 'coconutpalm', 'reed', 'shellfish', 'crashbox']) {
            expect(kinds.has(kind as never)).toBe(true);
        }
    });

    it('leaves everything the axe recipe needs reachable by hand — gather, then knap the blade (Ch.1 v3, D-055)', () => {
        const s = run();
        //  Gather all the pre-axe nodes and confirm they cover the tier: enough raw
        //  materials for the stone hammer, then enough stone left over to knap a blade.
        for (const node of s.nodes) {
            if (node.kind === 'tree' || node.kind === 'crashbox') continue;
            gatherNode(s, node.id);
        }
        expect(s.inventory.wood).toBeGreaterThanOrEqual(TUNE.axeWoodCost + TUNE.stoneHammerWoodCost);
        expect(s.inventory.stone).toBeGreaterThanOrEqual(TUNE.stoneHammerStoneCost + TUNE.knapStoneCost);
        expect(s.inventory.fiber).toBeGreaterThanOrEqual(TUNE.axeFiberCost);

        expect(craftStoneHammer(s)).toBe(true);
        expect(knapSharpblade(s)).toBe(true);
        expect(s.inventory.sharpblade).toBeGreaterThanOrEqual(TUNE.axeSharpbladeCost);
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

    it('coconut palms give coconut and the pre-axe husk fibre, and train foraging', () => {
        const s = run();
        const result = gatherNode(s, 'cp1');
        expect(result.ok).toBe(true);
        expect(result.gained.coconut).toBe(1);
        expect(result.gained.fiber).toBe(TUNE.palmHuskFiberYield);
        expect(result.skill).toBe('foraging');
    });

    it('reeds are the obvious fibre source — a plain tap, no axe (D-043)', () => {
        const s = run();
        const reed = s.nodes.find((n) => n.kind === 'reed')!;
        const result = gatherNode(s, reed.id);
        expect(result.ok).toBe(true);
        expect(result.gained.fiber).toBe(TUNE.reedFiberYield);
        expect(result.skill).toBe('foraging');
    });

    it('reeds alone can cover the axe recipe fibre by hand, no palm needed', () => {
        const s = run();
        let fiber = 0;
        for (const reed of s.nodes.filter((n) => n.kind === 'reed')) {
            fiber += gatherNode(s, reed.id).gained.fiber ?? 0;
        }
        expect(fiber).toBeGreaterThanOrEqual(TUNE.axeFiberCost);
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
