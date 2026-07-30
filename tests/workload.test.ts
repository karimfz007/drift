/**
 * THE WORKLOAD FORMULA — Bible v2.3 §13 (Slice 2B Stage B).
 *
 * §14 forbids authoring an activity as "-5 food, +2 strength". These tests guard the three
 * corrections that shape actually makes, each of which the old simulation had backwards:
 *
 *   1. HEALTH IS NOT A CURRENCY FOR WORK. §12: health must not mean "a general price paid
 *      for ordinary work". No amount of labour may touch it; only a named hazard can.
 *   2. NUTRITION IS DELAYED AND ACCUMULATED, never calories removed per swing.
 *   3. STAMINA AND ENERGY ARE DIFFERENT THINGS. §12 lists conflating them as the error.
 *
 * Property tests rather than spot-checks, because these are laws about ALL activities, and a
 * law checked at one point is a coincidence.
 */
import { describe, expect, it } from 'vitest';
import {
    channelsFor, healthHarmFrom, loadFactorFor, loadTrainsCapacity, loadZoneFor,
    walkOutcome, workloadOf, type LoadZone, type WorkHazard,
} from '../src/brain/workload';
import { TUNE } from '../src/data/tune';

const ZONES: LoadZone[] = ['free', 'working', 'training-heavy', 'operational-overload', 'immovable'];

describe('§13 — the formula is multiplicative, and every term bites', () => {
    it('each factor scales the result, and a neutral factor changes nothing', () => {
        const base = { baseDemand: 10, durationGameHours: 2 };
        const plain = workloadOf(base);
        expect(plain).toBe(20);
        //  Every optional term defaults to 1 — an activity declares only what it involves.
        expect(workloadOf({ ...base, pace: 1, terrain: 1, impairment: 1 })).toBe(plain);
        for (const term of ['pace', 'loadFactor', 'terrain', 'environment', 'toolInefficiency', 'impairment'] as const) {
            expect(workloadOf({ ...base, [term]: 2 })).toBe(plain * 2);
        }
    });

    it('a blunt tool costs more for the same work — tool inefficiency is a real term', () => {
        const sharp = workloadOf({ baseDemand: 10, durationGameHours: 1, toolInefficiency: 1 });
        const blunt = workloadOf({ baseDemand: 10, durationGameHours: 1, toolInefficiency: 1.5 });
        expect(blunt).toBeGreaterThan(sharp);
    });
});

describe('§12/§13 — HEALTH IS NOT A CURRENCY FOR WORK', () => {
    it('no workload, however brutal, spends any health', () => {
        //  Property across an extreme sweep. If any of these produced health loss, the model
        //  would be saying that hard work injures you by definition — which is the exact
        //  meaning §12's table forbids.
        for (const demand of [1, 50, 500]) {
            for (const hours of [0.1, 4, 48]) {
                for (const zone of ZONES) {
                    const w = workloadOf({
                        baseDemand: demand, durationGameHours: hours,
                        loadFactor: loadFactorFor(zone), pace: 2, terrain: 2, impairment: 2,
                    });
                    expect(w).toBeGreaterThan(0);            // WITNESS: real work happened
                    expect(channelsFor(w).health).toBe(0);
                }
            }
        }
    });

    it('health moves ONLY through a named hazard', () => {
        const hazards: WorkHazard[] = ['injury', 'illness', 'toxic', 'thermal-injury', 'collapse', 'unsafe-continued'];
        expect(healthHarmFrom(null, 999)).toBe(0);
        for (const h of hazards) expect(healthHarmFrom(h, 10)).toBe(10);
    });
});

describe('§13 — NUTRITION IS DELAYED, not spent per swing', () => {
    it('work produces a nutrition DEBT, and the channel is named as one', () => {
        const c = channelsFor(workloadOf({ baseDemand: 20, durationGameHours: 1 }));
        expect(c.nutritionDebt).toBeGreaterThan(0);
        //  The shape matters as much as the number: there is no `food` or `hunger` field to
        //  subtract from here. A caller cannot accidentally spend a meal per action.
        expect(Object.keys(c)).not.toContain('hunger');
        expect(Object.keys(c)).not.toContain('food');
    });

    it('the debt scales with the work, so a long haul owes more than a short one', () => {
        const short = channelsFor(workloadOf({ baseDemand: 10, durationGameHours: 1 })).nutritionDebt;
        const long = channelsFor(workloadOf({ baseDemand: 10, durationGameHours: 6 })).nutritionDebt;
        expect(long).toBeGreaterThan(short);
    });
});

describe('§12 — STAMINA AND ENERGY ARE DIFFERENT THINGS', () => {
    it('they are separate channels drawn at different rates', () => {
        const c = channelsFor(workloadOf({ baseDemand: 30, durationGameHours: 1 }));
        expect(c.stamina).toBeGreaterThan(0);
        expect(c.energy).toBeGreaterThan(0);
        //  If these were ever wired to the same rate, conflating them would be undetectable.
        expect(TUNE.workStaminaPerUnit).not.toBe(TUNE.workEnergyPerUnit);
        expect(c.stamina).not.toBe(c.energy);
    });

    it('heat intensifies HYDRATION specifically, not everything equally', () => {
        //  §13 singles out sweat loss as heat-driven. Thirst is not a timer that ignores
        //  where the body is and what it is doing.
        const cool = channelsFor(100, 1);
        const hot = channelsFor(100, 2);
        expect(hot.hydration).toBeGreaterThan(cool.hydration);
        expect(hot.stamina).toBe(cool.stamina);
        expect(hot.nutritionDebt).toBe(cool.nutritionDebt);
    });
});

describe('§13 — load is ZONES relative to the person, never a universal cap', () => {
    it('the same mass is a different zone for a different capacity', () => {
        //  The point of the whole zone model: 20 kg is a working load for one castaway and
        //  an overload for another. A universal kg cap cannot express that.
        expect(loadZoneFor(20, 100)).toBe('free');
        expect(loadZoneFor(20, 30)).toBe('training-heavy');
        expect(loadZoneFor(20, 15)).toBe('immovable');
    });

    it('zones are ordered, and effort rises monotonically with them', () => {
        const efforts = ZONES.map(loadFactorFor);
        expect(efforts).toEqual([...efforts].sort((a, b) => a - b));
        expect(loadFactorFor('immovable')).toBeGreaterThan(loadFactorFor('free'));
    });

    it('GRINDING OVERLOAD IS NOT TRAINING — only a recoverable range builds capacity', () => {
        //  §13 asks that intelligent responses to heavy matter beat grinding. If overload
        //  trained best, the optimal strategy would be to hurt yourself repeatedly.
        expect(loadTrainsCapacity('working')).toBe(true);
        expect(loadTrainsCapacity('training-heavy')).toBe(true);
        expect(loadTrainsCapacity('operational-overload')).toBe(false);
        expect(loadTrainsCapacity('immovable')).toBe(false);
        expect(loadTrainsCapacity('free')).toBe(false);
    });
});

describe("§13 walking — the director's explicit rule", () => {
    const base = { distanceM: 2000, durationGameHours: 1, enduranceCapacity: 1000 };

    it('unloaded walking trains endurance ONLY when it is a meaningful stimulus', () => {
        const real = walkOutcome({ ...base, zone: 'free' });
        expect(real.trainsEndurance).toBe(true);
        expect(real.trainsStrength).toBe(false);       // nothing carried, nothing to press against

        //  The same walk for a body that already does this easily is not training.
        const stroll = walkOutcome({ ...base, distanceM: 100, zone: 'free' });
        expect(stroll.trainsEndurance).toBe(false);
        expect(stroll.note).toMatch(/already know/i);
    });

    it('loaded walking builds stamina AND strength — at real cost', () => {
        const light = walkOutcome({ ...base, zone: 'free' });
        const loaded = walkOutcome({ ...base, zone: 'training-heavy' });
        expect(loaded.trainsStrength).toBe(true);
        expect(loaded.trainsLoadTolerance).toBe(true);
        expect(loaded.trainsEndurance).toBe(true);
        //  "At real cost" is the half that keeps it honest — every channel costs more.
        expect(loaded.channels.stamina).toBeGreaterThan(light.channels.stamina);
        expect(loaded.channels.hydration).toBeGreaterThan(light.channels.hydration);
        expect(loaded.channels.energy).toBeGreaterThan(light.channels.energy);
        expect(loaded.channels.nutritionDebt).toBeGreaterThan(light.channels.nutritionDebt);
        expect(loaded.channels.thermalGain).toBeGreaterThan(light.channels.thermalGain);
    });

    it('overload does NOT become a shortcut to strength — no supernatural forklift', () => {
        //  The last line of §13's walking passage, made a test: an expert carrier gets better
        //  at managing the same matter. Piling on past the recoverable range must not train
        //  faster than working within it, or the optimal play is self-injury.
        const trained = walkOutcome({ ...base, zone: 'training-heavy' });
        const crushed = walkOutcome({ ...base, zone: 'operational-overload' });
        expect(trained.trainsStrength).toBe(true);
        expect(crushed.trainsStrength).toBe(false);
        expect(crushed.trainsLoadTolerance).toBe(false);
        //  ...and it still costs more, so it is strictly worse: more price, no gain.
        expect(crushed.channels.stamina).toBeGreaterThan(trained.channels.stamina);
        expect(crushed.note).toMatch(/only costing/i);
    });

    it('walking never touches health, at any load or distance', () => {
        for (const zone of ZONES) {
            for (const distanceM of [50, 2000, 40000]) {
                expect(walkOutcome({ ...base, distanceM, zone }).channels.health).toBe(0);
            }
        }
    });
});
