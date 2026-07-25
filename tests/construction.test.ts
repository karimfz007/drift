import { describe, expect, it } from 'vitest';
import { reconcile } from '../src/brain/reconcile';
import {
    buildShelter,
    buildStorage,
    canBuildShelter,
    canBuildStorage,
    canRepairStructure,
    canSleep,
    createInitialState,
    gatherNode,
    isExhausted,
    isInDisrepair,
    isNearShelter,
    isNearStorage,
    repairStructure,
    respawn,
    shelterShortfall,
    storageShortfall,
    useStorage
} from '../src/brain/state';
import { Session } from '../src/brain/session';
import { MemorySaveRepository } from '../src/brain/save';
import { realSecondsFromGameHours } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';
import { POND } from '../src/data/world';

function run() {
    return createInitialState(0);
}

describe('construction — shelter', () => {
    it('needs wood, stone and fibre, and refuses without them', () => {
        const s = run();
        expect(canBuildShelter(s)).toBe(false);
        expect(shelterShortfall(s)).toEqual({
            wood: TUNE.shelterWoodCost,
            stone: TUNE.shelterStoneCost,
            fiber: TUNE.shelterFiberCost
        });
        expect(buildShelter(s, 10, 10)).toBe(false);
    });

    it('spends exactly the recipe and places the shelter at the given point, full durability', () => {
        const s = run();
        s.inventory.wood = TUNE.shelterWoodCost + 1;
        s.inventory.stone = TUNE.shelterStoneCost;
        s.inventory.fiber = TUNE.shelterFiberCost + 2;
        expect(buildShelter(s, 5, 7)).toBe(true);
        expect(s.shelter).toMatchObject({ built: true, x: 5, y: 7, durability: TUNE.structureDurabilityMax });
        expect(s.inventory.wood).toBe(1);
        expect(s.inventory.stone).toBe(0);
        expect(s.inventory.fiber).toBe(2);
    });

    it('cannot be built twice', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, 0, 0);
        expect(canBuildShelter(s)).toBe(false);
        expect(buildShelter(s, 1, 1)).toBe(false);
    });

    it('canSleep mirrors isNearShelter — a built, nearby shelter only', () => {
        const s = run();
        expect(canSleep(s)).toBe(false);
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        expect(canSleep(s)).toBe(true);
        s.player.x += TUNE.shelterRadius + 5;
        expect(canSleep(s)).toBe(false);
    });

    it('isNearShelter is true only inside shelterRadius of a BUILT shelter', () => {
        const s = run();
        expect(isNearShelter(s)).toBe(false); // not built yet
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        expect(isNearShelter(s)).toBe(true);
        s.player.x += TUNE.shelterRadius + 5;
        expect(isNearShelter(s)).toBe(false);
    });
});

describe('construction — storage', () => {
    it('needs wood and stone only — no fibre gate', () => {
        const s = run();
        expect(canBuildStorage(s)).toBe(false);
        expect(storageShortfall(s)).toEqual({ wood: TUNE.storageWoodCost, stone: TUNE.storageStoneCost });
        s.inventory.wood = TUNE.storageWoodCost;
        s.inventory.stone = TUNE.storageStoneCost;
        expect(canBuildStorage(s)).toBe(true);
        expect(buildStorage(s, 3, 4)).toBe(true);
        expect(s.storage).toMatchObject({ built: true, x: 3, y: 4, durability: TUNE.structureDurabilityMax, stored: { wood: 0, stone: 0, fiber: 0 } });
    });

    it('the disjoint-state rule: carrying raw materials deposits; empty-handed withdraws', () => {
        const s = run();
        s.inventory.wood = TUNE.storageWoodCost;
        s.inventory.stone = TUNE.storageStoneCost;
        buildStorage(s, s.player.x, s.player.y);

        //  Carrying wood/stone/fiber -> deposits everything.
        s.inventory.wood = 4;
        s.inventory.stone = 2;
        s.inventory.fiber = 6;
        const deposit = useStorage(s);
        expect(deposit).toEqual({ ok: true, action: 'deposit', moved: { wood: 4, stone: 2, fiber: 6 } });
        expect(s.inventory).toMatchObject({ wood: 0, stone: 0, fiber: 0 });
        expect(s.storage.stored).toEqual({ wood: 4, stone: 2, fiber: 6 });

        //  Empty-handed, crate holds some -> withdraws a batch per resource.
        const withdraw = useStorage(s);
        expect(withdraw.ok).toBe(true);
        expect(withdraw.action).toBe('withdraw');
        expect(s.inventory.wood).toBe(Math.min(4, TUNE.storageWithdrawBatch));
        expect(s.storage.stored.wood).toBe(4 - Math.min(4, TUNE.storageWithdrawBatch));
    });

    it('refuses when there is nothing to deposit and nothing stored', () => {
        const s = run();
        s.inventory.wood = TUNE.storageWoodCost;
        s.inventory.stone = TUNE.storageStoneCost;
        buildStorage(s, s.player.x, s.player.y);
        s.inventory.wood = 0; s.inventory.stone = 0; s.inventory.fiber = 0;
        expect(useStorage(s)).toEqual({ ok: false, action: null, moved: {} });
    });

    it('refuses on an unbuilt crate', () => {
        const s = run();
        expect(useStorage(s)).toEqual({ ok: false, action: null, moved: {} });
    });

    it('isNearStorage matches the interact radius of a built crate', () => {
        const s = run();
        s.inventory.wood = TUNE.storageWoodCost;
        s.inventory.stone = TUNE.storageStoneCost;
        buildStorage(s, 100, 100);
        expect(isNearStorage(s)).toBe(false);
        s.player = { x: 100, y: 100 };
        expect(isNearStorage(s)).toBe(true);
    });
});

describe('construction — upkeep: disrepair, never deletion', () => {
    it('durability decays over elapsed game hours via reconcile, and pauses at 0 (never negative)', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        const hoursToZero = TUNE.structureDurabilityMax / TUNE.structureDurabilityDecayPerGameHour;
        const { state } = reconcile(s, realSecondsFromGameHours(hoursToZero * 3));
        expect(state.shelter.durability).toBe(0);
        expect(isInDisrepair(state.shelter)).toBe(true);
    });

    it('repair spends one wood per tap, restores durability, and is blocked out of range or without wood', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        s.shelter.durability = 10;
        expect(canRepairStructure(s, 'shelter')).toBe(true);
        const woodBefore = s.inventory.wood;
        expect(repairStructure(s, 'shelter')).toBe(true);
        expect(s.inventory.wood).toBe(woodBefore - 1);
        expect(s.shelter.durability).toBe(10 + TUNE.repairDurabilityPerWood);

        s.inventory.wood = 0;
        expect(canRepairStructure(s, 'shelter')).toBe(false);
        expect(repairStructure(s, 'shelter')).toBe(false);

        s.inventory.wood = 5;
        s.player.x += TUNE.shelterRadius + 5;
        expect(canRepairStructure(s, 'shelter')).toBe(false);
    });

    it('repair never exceeds full durability', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        //  Below the repair threshold (so canRepairStructure applies) but close enough to
        //  max that +repairDurabilityPerWood would overshoot without the cap.
        s.shelter.durability = TUNE.structureDurabilityMax * TUNE.structureRepairThresholdFraction - 2;
        repairStructure(s, 'shelter');
        expect(s.shelter.durability).toBe(TUNE.structureDurabilityMax);
    });

    it('at 0 durability, the shelter warmth-relief bonus pauses (drain matches unsheltered rate)', () => {
        const near = run();
        near.inventory.wood = 99; near.inventory.stone = 99; near.inventory.fiber = 99;
        buildShelter(near, near.player.x, near.player.y);
        near.shelter.durability = 0;
        const { state: nearAfter } = reconcile(near, 60); // 1 real minute (well under the report threshold), night, no fire

        const far = run();
        const { state: farAfter } = reconcile(far, 60);

        expect(nearAfter.warmth).toBeCloseTo(farAfter.warmth, 9);
    });
});

describe('energy — the 5th vital (soft debuff, never a death vector)', () => {
    it('drains at the tuned rate through reconcile and never feeds health', () => {
        const s = run();
        const { state } = reconcile(s, realSecondsFromGameHours(1));
        expect(state.energy).toBeCloseTo(TUNE.energyMax - TUNE.energyDrainPerGameHour, 6);
        expect(state.health).toBe(TUNE.healthMax); // untouched even fully online
    });

    it('isExhausted flips at energyLowThreshold', () => {
        const s = run();
        s.energy = TUNE.energyLowThreshold + 1;
        expect(isExhausted(s)).toBe(false);
        s.energy = TUNE.energyLowThreshold;
        expect(isExhausted(s)).toBe(true);
    });

    it('a long offline absence floors energy rather than draining it to 0', () => {
        const s = run();
        const { state, result } = reconcile(s, 3 * 86400);
        expect(result.qualifiesForReport).toBe(true);
        expect(state.energy).toBe(TUNE.energyOfflineFloor);
    });
});

describe('FIX-1 (Living Island Track A) — energy inversion closed', () => {
    it('an effortful (hold-interaction) gather visibly costs energy: felling a tree', () => {
        const s = run();
        s.tools.axe = true; // trees need the axe, or gatherNode refuses
        const before = s.energy;
        const result = gatherNode(s, 'tr1');
        expect(result.ok).toBe(true);
        expect(s.energy).toBe(before - TUNE.energyCostTreeChop);
        expect(s.energy).toBeLessThan(before);
    });

    it('every hold-interaction kind costs its own tuned amount: deadfall, rock, quarry, palm, crash box', () => {
        const s = run();
        s.tools.axe = true;
        const before = s.energy;
        gatherNode(s, 'df1'); // deadfall
        expect(s.energy).toBeCloseTo(before - TUNE.energyCostDeadfallGather, 9);
        const afterDeadfall = s.energy;
        gatherNode(s, 'rk1'); // rock
        expect(s.energy).toBeCloseTo(afterDeadfall - TUNE.energyCostRockMine, 9);
        const afterRock = s.energy;
        gatherNode(s, 'qr1'); // quarry, one tap
        expect(s.energy).toBeCloseTo(afterRock - TUNE.energyCostQuarryMine, 9);
        const afterQuarry = s.energy;
        gatherNode(s, 'cp1'); // coconut palm
        expect(s.energy).toBeCloseTo(afterQuarry - TUNE.energyCostCoconutGather, 9);
        const afterPalm = s.energy;
        gatherNode(s, 'box1'); // crash box
        expect(s.energy).toBeCloseTo(afterPalm - TUNE.energyCostCrashboxOpen, 9);
    });

    it('the quarry (repeat-minable) charges energy on EVERY tap, not just the first', () => {
        const s = run();
        const before = s.energy;
        gatherNode(s, 'qr1');
        gatherNode(s, 'qr1');
        gatherNode(s, 'qr1');
        expect(s.energy).toBeCloseTo(before - 3 * TUNE.energyCostQuarryMine, 9);
    });

    it('an instant tap gather (driftwood, berries, reed, shellfish) costs ZERO energy — only holds are effortful', () => {
        const s = run();
        const before = s.energy;
        gatherNode(s, 'dw1'); // driftwood
        gatherNode(s, 'bb1'); // berrybush
        gatherNode(s, 'rd1'); // reed
        gatherNode(s, 'sf1'); // shellfish
        expect(s.energy).toBe(before); // untouched
    });

    it('an effortful gather never drives energy negative — clamped at 0', () => {
        const s = run();
        s.tools.axe = true;
        s.energy = 1; // less than any single effortful action's cost
        const result = gatherNode(s, 'tr1');
        expect(result.ok).toBe(true);
        expect(s.energy).toBe(0);
    });

    it('REGRESSION-LOCK, direction 2: idle/ambient drain (no action at all) stays the small tuned rate, not the old inflated one', () => {
        //  The other half of the inversion this fix closes: idling must NOT drain energy
        //  any harder than before, now that effortful actions ALSO cost something. Proven
        //  independently of the gather tests above — neither direction is assumed from the
        //  other (per the FIX brief's own instruction).
        const s = run();
        const { state } = reconcile(s, realSecondsFromGameHours(1));
        expect(state.energy).toBeCloseTo(TUNE.energyMax - TUNE.energyDrainPerGameHour, 6);
        expect(TUNE.energyDrainPerGameHour).toBeLessThan(5); // strictly lower than the pre-FIX rate
        //  And a gather's cost is on top of, not instead of, the ambient span it occurs in:
        //  a felled tree during an elapsed hour costs the ambient drain AND the action cost.
        const s2 = run();
        s2.tools.axe = true;
        const { state: afterHour } = reconcile(s2, realSecondsFromGameHours(1));
        gatherNode(afterHour, 'tr1');
        expect(afterHour.energy).toBeCloseTo(TUNE.energyMax - TUNE.energyDrainPerGameHour - TUNE.energyCostTreeChop, 6);
    });
});

describe('wet — condition, not a vital', () => {
    it('rises fast in the pond and decays on dry land', () => {
        const s = run();
        s.player = { x: POND.x, y: POND.y };
        const { state: wetter } = reconcile(s, realSecondsFromGameHours(0.5));
        expect(wetter.wet).toBeGreaterThan(0);

        const dry = run();
        dry.wet = 50;
        const { state: dried } = reconcile(dry, realSecondsFromGameHours(1));
        expect(dried.wet).toBeLessThan(50);
    });

    it('decays faster within the shelter\'s radius than on open dry land', () => {
        const sheltered = run();
        sheltered.inventory.wood = 99; sheltered.inventory.stone = 99; sheltered.inventory.fiber = 99;
        buildShelter(sheltered, sheltered.player.x, sheltered.player.y);
        sheltered.wet = 80;
        const { state: a } = reconcile(sheltered, realSecondsFromGameHours(1));

        const open = run();
        open.wet = 80;
        const { state: b } = reconcile(open, realSecondsFromGameHours(1));

        expect(a.wet).toBeLessThan(b.wet);
    });

    it('raises warmth\'s night-time drain rate, without touching the fire\'s regen branch', () => {
        const dryState = run();
        dryState.wet = 0;
        const { state: a } = reconcile(dryState, 60); // 1 real minute (well under the report threshold), night, no fire

        const wetState = run();
        wetState.wet = TUNE.wetMax;
        const { state: b } = reconcile(wetState, 60);

        expect(b.warmth).toBeLessThan(a.warmth);
    });
});

describe('sleep — reuses the reconcile spine, never lethal', () => {
    function sessionAt(state: ReturnType<typeof createInitialState>) {
        const repo = new MemorySaveRepository();
        const session = new Session(repo, state);
        return session;
    }

    it('refuses when not near a built shelter', () => {
        const s = run();
        const session = sessionAt(s);
        expect(session.sleep(0)).toBe(null);
    });

    it('advances the clock by sleepDurationGameHours and refills energy on waking', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        s.energy = 10;
        const session = sessionAt(s);
        const before = session.state.gameHoursElapsed;
        const report = session.sleep(1000);
        expect(session.state.gameHoursElapsed).toBeCloseTo(before + TUNE.sleepDurationGameHours, 6);
        expect(session.state.energy).toBe(TUNE.energyMax);
        expect(report).not.toBe(null);
    });

    it('is the safe, floored (offline-style) path — cannot kill even from a sliver of health', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        s.thirst = 0; s.hunger = 0; s.warmth = 0; s.health = 0.5;
        const session = sessionAt(s);
        session.sleep(0);
        expect(session.state.health).toBeGreaterThan(0);
        expect(session.state.trace.deaths).toBe(0);
    });
});

describe('respawn — the shelter becomes home once built', () => {
    it('without a shelter, respawn still washes you ashore at the original spawn', () => {
        const s = run();
        s.player = { x: 40, y: -30 };
        respawn(s, 'thirst');
        expect(s.player.x).toBe(0);
    });

    it('with a built shelter, respawn wakes you there instead', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, 22, -14);
        s.player = { x: 40, y: -30 };
        respawn(s, 'thirst');
        expect(s.player).toEqual({ x: 22, y: -14 });
    });

    it('FIX-2: energy wakes at respawnVitalFraction (not full), wet always resets to 0', () => {
        const s = run();
        s.energy = 5;
        s.wet = 90;
        respawn(s, 'thirst');
        expect(s.energy).toBe(TUNE.energyMax * TUNE.respawnVitalFraction);
        expect(s.wet).toBe(0);
    });
});
