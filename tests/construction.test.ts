import { describe, expect, it } from 'vitest';
import { reconcile } from '../src/brain/reconcile';
import { loadBandOf, loadEnergyMultiplierForKg, loadEnergyMultiplierOf, loadSpeedMultiplierForKg } from '../src/brain/body';
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
    shelterShortfall,
    storageShortfall,
    useStorage,
    isShelteredSleep} from '../src/brain/state';
import { Session } from '../src/brain/session';
import { MemorySaveRepository } from '../src/brain/save';
import { realSecondsFromGameHours } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';
import { comfortableBody, fullBody } from './_baseline';
import { closeSurvivor } from '../src/brain/succession';
import { SPAWN } from '../src/data/world';
import { POND } from '../src/data/world';

function run() {
    return fullBody(createInitialState(0));
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

    //  REWRITTEN, not deleted: sleeping used to REQUIRE a built, nearby shelter, and the
    //  director asked for the ground to be a valid (worse) bed. `canSleep` is now always
    //  true and `isShelteredSleep` carries the distinction that used to be a gate.
    it('sleeping is always allowed; isShelteredSleep is what tracks the roof', () => {
        const s = run();
        expect(canSleep(s)).toBe(true);              // no shelter at all — still allowed
        expect(isShelteredSleep(s)).toBe(false);
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        expect(isShelteredSleep(s)).toBe(true);      // under the roof
        s.player.x += TUNE.shelterRadius + 5;
        expect(canSleep(s)).toBe(true);              // still allowed, just rough
        expect(isShelteredSleep(s)).toBe(false);
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

    //  THE DEAD-ZONE REGRESSION (Gate 0 closing pass, 2026-07-27). Two successive attempts
    //  to rank mending against sleeping left a band where the shelter could not be mended by
    //  ANY input: availability was gated below 90% durability, pre-emption was gated below
    //  40%, and the secondary control did not exist yet — so between 40% and 90% nothing
    //  could mend it, and since a repair is +15 a shelter that had decayed past 40 sat capped
    //  near 55/100 permanently. Both gates are deleted; this walks the whole range to prove
    //  there is no band left. It fails on the pre-fix tree at durability 90..99 (blocked by
    //  the availability threshold) — verified by reverting before trusting it (D-066 b).
    it('mending is reachable at EVERY durability below full — no dead zone anywhere', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        const max = TUNE.structureDurabilityMax;
        const unreachable: number[] = [];
        for (let d = 1; d < max; d += 1) {
            s.shelter.durability = d;
            if (!canRepairStructure(s, 'shelter')) unreachable.push(d);
        }
        expect(unreachable).toEqual([]);
    });

    it('a whole structure cannot be mended, and mending still needs wood and range', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        s.shelter.durability = TUNE.structureDurabilityMax;
        expect(canRepairStructure(s, 'shelter')).toBe(false); // nothing to mend
        s.shelter.durability = 50;
        s.inventory.wood = 0;
        expect(canRepairStructure(s, 'shelter')).toBe(false); // no material
        s.inventory.wood = 5;
        s.player.x += TUNE.shelterRadius + 5;
        expect(canRepairStructure(s, 'shelter')).toBe(false); // out of reach
    });

    it('repair never exceeds full durability', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        //  Close enough to max that +repairDurabilityPerWood would overshoot without the cap.
        //  (This used to sit just under the old availability threshold; that threshold is
        //  gone, so the case is now simply "nearly whole".)
        s.shelter.durability = TUNE.structureDurabilityMax - 2;
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
    //  MEASURED ON A THERMALLY COMFORTABLE BODY, not a full-bar one. These assert what an
    //  ACTIVITY costs, and the One Body Resolver charges an environment multiplier on top —
    //  so a survivor at `warmthMax`, which is heat-strain, legitimately pays 1.3x. Measuring
    //  the act's own price requires a body with no body-term in play. See `_baseline.ts`.
    const run = () => comfortableBody(createInitialState(0));

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
        //  Ch.6 (D-058): the tuned cost is now SCALED by the load band the castaway is in
        //  when the swing happens (energy is charged before the yield lands, so the
        //  multiplier reflects what was already being carried going in). Each step captures
        //  the live multiplier rather than assuming `light`, so this stays an exact-cost
        //  assertion instead of being loosened into a tolerance.
        const step = (id: string, tuned: number) => {
            const before = s.energy;
            const multiplier = loadEnergyMultiplierOf(s);
            gatherNode(s, id);
            expect(s.energy).toBeCloseTo(before - tuned * multiplier, 9);
        };
        step('df1', TUNE.energyCostDeadfallGather); // deadfall
        step('rk1', TUNE.energyCostRockMine); // rock
        step('qr1', TUNE.energyCostQuarryMine); // quarry, one tap
        step('cp1', TUNE.energyCostCoconutGather); // coconut palm
        step('box1', TUNE.energyCostCrashboxOpen); // crash box
    });

    it('Ch.6 — an UNENCUMBERED castaway pays exactly the pre-Ch.6 tuned cost, to the digit', () => {
        //  The "invisible until earned" guarantee: a `light` band multiplies by exactly 1,
        //  so carry weight cannot silently retune D-052's numbers for a player who isn't
        //  actually carrying anything.
        const s = run();
        expect(loadBandOf(s)).toBe('light');
        const before = s.energy;
        gatherNode(s, 'df1');
        expect(s.energy).toBe(before - TUNE.energyCostDeadfallGather);
    });

    it('Ch.6 — the same swing costs strictly more under a heavy pack than empty-handed', () => {
        const light = run();
        const heavy = run();
        heavy.inventory.stone = 40; // 80 kg — comfortably past loadHeavyAtKg
        expect(loadBandOf(light)).toBe('light');
        expect(loadBandOf(heavy)).toBe('heavy');

        const lightBefore = light.energy;
        gatherNode(light, 'rk1');
        const lightCost = lightBefore - light.energy;

        const heavyBefore = heavy.energy;
        gatherNode(heavy, 'rk1');
        const heavyCost = heavyBefore - heavy.energy;

        expect(heavyCost).toBeGreaterThan(lightCost);
        //  D-059: weight-aware, not band-aware — 40 stone is 80 kg, i.e. 2.5 overload steps
        //  past the Heavy threshold, so the real multiplier exceeds the bare band figure.
        //  This assertion previously encoded the saturating behaviour that WAS the bug.
        expect(heavyCost).toBeCloseTo(lightCost * loadEnergyMultiplierForKg(80), 9);
    });

    it('D-059 REGRESSION — carrying far more keeps costing more; the top band no longer saturates', () => {
        //  The director's report: 100 rock produced no observable effect. It read `heavy`,
        //  exactly as 16 rock did, and the two were byte-identical. Now they are not.
        const modest = run();
        const enormous = run();
        modest.inventory.stone = 16; // 32 kg — just past the Heavy threshold
        enormous.inventory.stone = 100; // 200 kg — the reported case
        expect(loadBandOf(modest)).toBe('heavy');
        expect(loadBandOf(enormous)).toBe('heavy'); // same BAND...

        const modestBefore = modest.energy;
        gatherNode(modest, 'rk1');
        const modestCost = modestBefore - modest.energy;

        const enormousBefore = enormous.energy;
        gatherNode(enormous, 'rk1');
        const enormousCost = enormousBefore - enormous.energy;

        expect(enormousCost).toBeGreaterThan(modestCost); // ...but no longer the same COST
        expect(loadSpeedMultiplierForKg(200)).toBeLessThan(loadSpeedMultiplierForKg(32));
    });

    it('D-059 — no load, however absurd, can ever approach a soft-lock on foot', () => {
        //  The speed floor is a safety rail: a castaway must always be able to walk home and
        //  put the load down.
        for (const kg of [200, 1000, 100_000]) {
            expect(loadSpeedMultiplierForKg(kg)).toBeGreaterThanOrEqual(TUNE.loadOverloadSpeedFloor);
        }
        expect(TUNE.loadOverloadSpeedFloor).toBeGreaterThan(0);
    });

    it('the quarry (repeat-minable) charges energy on EVERY tap, not just the first', () => {
        const s = run();
        //  Same Ch.6 note as above — and this one genuinely crosses a band mid-test as the
        //  stone piles up, which is exactly the behaviour worth locking: the third tap costs
        //  more than the first because the castaway is now hauling what the first two gave.
        let expected = 0;
        const before = s.energy;
        for (let i = 0; i < 3; i++) {
            expected += TUNE.energyCostQuarryMine * loadEnergyMultiplierOf(s);
            gatherNode(s, 'qr1');
        }
        expect(s.energy).toBeCloseTo(before - expected, 9);
        expect(loadBandOf(s)).not.toBe('light'); // it really did get heavier along the way
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

    it('sleeps rough with no shelter at all, and still produces a report', () => {
        //  Was: "refuses when not near a built shelter". The refusal is gone by design —
        //  what remains is that the rough sleep is a real, reported rest.
        const s = run();
        s.energy = 10;
        const session = sessionAt(s);
        const report = session.sleep(0);
        expect(report).not.toBe(null);
        expect(session.state.energy).toBeGreaterThan(10);
    });

    it('advances the clock by sleepDurationGameHours and RECOVERS energy along a rate (Ch.6 replaced the instant refill)', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        s.energy = 10;
        const session = sessionAt(s);
        const before = session.state.gameHoursElapsed;
        const report = session.sleep(1000);
        expect(session.state.gameHoursElapsed).toBeCloseTo(before + TUNE.sleepDurationGameHours, 6);
        //  This assertion used to read `toBe(TUNE.energyMax)` — C05 set energy to full
        //  outright on waking. Ch.6 (D-058) replaced that with a recovery RATE: energy
        //  climbs by the tuned amount over the slept hours and is capped by the ceiling,
        //  so waking from 10 lands short of full rather than teleporting to it.
        const gained = TUNE.energyRecoveryPerGameHourResting * TUNE.sleepRecoveryMultiplier * TUNE.sleepDurationGameHours;
        expect(session.state.energy).toBeCloseTo(Math.min(TUNE.energyMax, 10 + gained), 4);
        expect(session.state.energy).toBeLessThan(TUNE.energyMax);
        expect(session.state.energy).toBeGreaterThan(10);
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

describe('succession — you arrive at the SEA, never at the shelter (Slice 3)', () => {
    //  This describe used to be "respawn — the shelter becomes home once built", and Slice 3
    //  INVERTS it rather than adjusting it. Under the interim mercy, waking at your own
    //  shelter was right: it was still you, and the shelter was still home. It is not you
    //  now. A successor who materialised inside a stranger's shelter would skip the entire
    //  discovery — the walk up the beach IS how they find out someone lived here, and
    //  "Someone lived here" has to be something they SEE, not something they start inside.

    it('with no shelter, the successor washes ashore at the spawn point', () => {
        const s = run();
        s.player = { x: 40, y: -30 };
        const { next } = closeSurvivor(s, 'thirst');
        expect(next.player).toEqual({ x: SPAWN.x, y: SPAWN.y });
    });

    it('...and with a shelter standing, they STILL wash ashore at the sea', () => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, 22, -14);
        s.player = { x: 40, y: -30 };
        const { next } = closeSurvivor(s, 'thirst');
        expect(next.shelter.built, 'the shelter itself persists').toBe(true);
        expect(next.player).toEqual({ x: SPAWN.x, y: SPAWN.y });
        expect(next.player).not.toEqual({ x: 22, y: -14 });
    });

    it('Slice 3: a death does not wake anyone — the arrival profile is what lands', () => {
        //  Was: "energy wakes at respawnVitalFraction". Nobody wakes now. What this checks is
        //  that the successor lands on the authored profile rather than on leftovers of the
        //  body that died — the wet, spent, half-dead numbers must not leak through.
        const s = run();
        s.energy = 5;
        s.wet = 90;
        const { next } = closeSurvivor(s, 'thirst');
        expect(next.energy).toBe(TUNE.energyMax * TUNE.arrivalEnergyFraction);
        expect(next.wet).toBe(TUNE.wetMax * TUNE.arrivalWetFraction);
    });
});

describe('sleeping rough — anywhere, always worse (director request)', () => {
    //  A tired human can lie down anywhere. The shelter's value is that lying down under it
    //  is BETTER, not that lying down is otherwise forbidden. Rates are scaled by
    //  `groundSleepRecoveryMultiplier`; the weather half needs no new machinery, because a
    //  survivor who is not under a roof already interacts with wet/warmth normally.
    const sleepFrom = (nearShelter: boolean) => {
        const s = run();
        s.inventory.wood = 99; s.inventory.stone = 99; s.inventory.fiber = 99;
        buildShelter(s, s.player.x, s.player.y);
        if (!nearShelter) { s.player.x += TUNE.shelterRadius + 30; }
        s.energy = 10;
        s.fatigue = 80;
        s.resting = true;
        const elapsed = TUNE.sleepDurationGameHours * TUNE.dayLengthRealMinutes * 60 / TUNE.gameHoursPerDay;
        return reconcile(s, elapsed).state;
    };

    it('you can sleep with no shelter at all — it is never refused', () => {
        const s = run();
        expect(s.shelter.built).toBe(false);
        expect(canSleep(s)).toBe(true);
        expect(isShelteredSleep(s)).toBe(false);
    });

    it('REPORT — a rough sleep genuinely recovers, and genuinely recovers LESS', () => {
        const sheltered = sleepFrom(true);
        const rough = sleepFrom(false);
        const shelteredGain = sheltered.energy - 10;
        const roughGain = rough.energy - 10;
        console.log(`\n  GROUND SLEEP — energy gained over one full sleep:\n    sheltered ${shelteredGain.toFixed(1)}\n    rough     ${roughGain.toFixed(1)}  (${((roughGain / shelteredGain) * 100).toFixed(0)}% of a sheltered night)\n`);
        expect(roughGain).toBeGreaterThan(0);              // it is a real rest
        expect(roughGain).toBeLessThan(shelteredGain);     // and a worse one
        //  Fatigue sheds too, but less.
        expect(rough.fatigue).toBeLessThan(80);
        expect(rough.fatigue).toBeGreaterThan(sheltered.fatigue);
    });

    //  C3 finding F5 on D-073: the assertion below used to be `energy > 10` and
    //  `fatigue < 80` — which passes on a **45% nerf** to the recovery rate, proven by
    //  experiment. It detected gross breakage and nothing else, while being cited in the
    //  ledger as the guard protecting shelter-sleep's value. It now bounds the RATE against
    //  the tune table, so any change to the sheltered numbers has to be deliberate.
    it('shelter-sleep is UNCHANGED — the rate is bounded, not merely non-zero', () => {
        const sheltered = sleepFrom(true);
        //  The bound is an ABSOLUTE number, deliberately not derived from the tune values it
        //  is guarding. Deriving it was my first attempt and it reproduced the exact flaw
        //  C3 found: an expectation computed from `energyRecoveryPerGameHourResting` scales
        //  with any nerf to it, so a 45% cut still passed. A hard figure cannot do that.
        //
        //  84 is Ch.6's own shipped arithmetic: 8 game hours x 7/hour x 1.5 = 84. If the
        //  tune changes, this test FAILS and someone has to decide that on purpose — which
        //  is the entire job of a guard on a value the ledger promises is unchanged.
        const SHELTERED_SLEEP_ENERGY_GAIN = 84;
        const actualGain = sheltered.energy - 10;
        expect(actualGain).toBeGreaterThan(SHELTERED_SLEEP_ENERGY_GAIN * 0.98);
        expect(actualGain).toBeLessThanOrEqual(SHELTERED_SLEEP_ENERGY_GAIN * 1.02);
    });
});
