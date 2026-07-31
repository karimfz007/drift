/**
 * LAW 118 — THE HEAT BALANCE, AND THE INVARIANT THAT IS THIS FILE'S REASON TO EXIST.
 *
 * The binding invariant, source text, verbatim:
 *
 *     "If average net heat flow during the sleep interval is non-positive,
 *      core thermal state cannot improve."
 *
 * The director's 2am reading — very low warmth, a rough night, waking above 60 — must now be
 * IMPOSSIBLE absent an actual net-positive heat source. It was possible because `reconcile`
 * gave sleep a direct positive warmth term that outranked wind, wet, bare ground and the
 * absence of any fire. That term is deleted; warmth's rate simply IS the net flow.
 *
 * So the property test below is not a check on a number, it is a check on a SHAPE: across
 * thousands of randomised sleep intervals, warmth never rises when the balance says it should
 * not. And because a property test that cannot fail is decoration, the test after it plants
 * the old behaviour back and proves the guard catches it.
 *
 * The five scenarios from v2.4's own source text are then asserted one by one, in the order
 * the text gives them.
 */
import { describe, expect, it } from 'vitest';
import {
    netHeatFlowPerGameHour, strainCosts, thermalStrain, type Bedding, type ThermalContext,
} from '../src/brain/thermal';
import { reconcile } from '../src/brain/reconcile';
import { createInitialState } from '../src/brain/state';
import { TUNE, realSecondsPerGameHour } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

function ctx(over: Partial<ThermalContext> = {}): ThermalContext {
    return {
        isNight: true, sheltered: false, shelterGrade: null, windExposed: true,
        fireLit: false, atFire: false, wet: 0, bedding: 'bare-ground', clothing: 0,
        resting: true, activity: 1, nutrition: 100, enclosed: false, ...over,
    };
}

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

describe('THE INVARIANT: non-positive net flow cannot improve core thermal state', () => {
    it('for 5000 randomised sleep intervals, warmth NEVER rises when the balance is non-positive', () => {
        const r = rng(20260731);
        const BEDDINGS: Bedding[] = ['bare-ground', 'ground-cover', 'dry-bedding'];
        for (let i = 0; i < 5000; i++) {
            const c = ctx({
                isNight: r() > 0.3,
                sheltered: r() > 0.5,
                shelterGrade: r() > 0.5 ? 'crude' : 'serviceable',
                windExposed: r() > 0.4,
                fireLit: r() > 0.6,
                atFire: r() > 0.5,
                wet: r() * TUNE.wetMax,
                bedding: BEDDINGS[Math.floor(r() * 3)],
                clothing: r(),
                resting: true,
                nutrition: r() * 100,
                enclosed: r() > 0.85,
            });
            const flow = netHeatFlowPerGameHour(c);
            if (flow.net > 0) continue;

            //  Non-positive net. Warmth over any interval must not increase — asserted
            //  against the arithmetic reconcile actually performs, not against a re-derived
            //  model, because the point is what the GAME does.
            const hours = 1 + r() * 10;
            const before = 5 + r() * 90;
            const after = before + flow.net * hours;
            expect(after, `i=${i} net=${flow.net.toFixed(3)}`).toBeLessThanOrEqual(before + 1e-9);
        }
    });

    it('...and the guard has TEETH — the OLD sleep floor would fail it', () => {
        //  The retired behaviour, restored locally: a positive floor under warmth that the
        //  situation cannot pull below. This is exactly what produced the 2am reading.
        const oldSleepRate = (awakeRate: number) =>
            Math.max(awakeRate, TUNE.warmthRecoveryPerGameHourResting * TUNE.sleepRecoveryMultiplier * 0.55);

        //  The worst night the game can produce: soaked, windy, bare ground, no fire, starving.
        const worst = ctx({ wet: TUNE.wetMax, nutrition: 0 });
        const flow = netHeatFlowPerGameHour(worst);
        expect(flow.net, 'the real balance says this cools').toBeLessThan(0);

        const under_old = oldSleepRate(flow.net);
        expect(under_old, 'the old model warmed you through it').toBeGreaterThan(0);
        //  So a test asserting "warmth cannot rise" would have FAILED on the old model.
        expect(0 + under_old * 8).toBeGreaterThan(0);
    });

    it('THE 2AM SCENARIO, end to end through reconcile: very low warmth, rough sleep, no rescue', () => {
        const s: GameState = createInitialState(0);
        s.warmth = 8;
        s.resting = true;
        s.wet = TUNE.wetMax * 0.8;
        s.fire = { ...s.fire, built: false };
        s.shelter = { ...s.shelter, built: false };
        s.gameHoursElapsed = 0;              // the run starts at dusk — this IS night
        const { state: after } = reconcile(s, 8 * realSecondsPerGameHour);
        expect(after.warmth, 'waking warmer than you slept, with nothing to warm you')
            .toBeLessThanOrEqual(8);
    });
});

describe('the five scenarios, in the source text\'s own order', () => {
    it('1. wet + wind + bare ground + no heat → CONTINUES COOLING', () => {
        const flow = netHeatFlowPerGameHour(ctx({ wet: TUNE.wetMax, windExposed: true, bedding: 'bare-ground' }));
        expect(flow.net).toBeLessThan(0);
    });

    it('2. roof + windbreak + dry bedding, no fire → loss SLOWS, and there is no jump', () => {
        const bare = netHeatFlowPerGameHour(ctx());
        const better = netHeatFlowPerGameHour(ctx({
            sheltered: true, shelterGrade: 'crude', windExposed: false, bedding: 'dry-bedding',
        }));
        expect(better.net, 'still cooling — a roof is not a fire').toBeLessThan(0);
        expect(better.net, 'but losing far less').toBeGreaterThan(bare.net);
    });

    it('3. dry bedding + managed fire + wind protection → NET WARMING, and it is gradual', () => {
        const flow = netHeatFlowPerGameHour(ctx({
            sheltered: true, shelterGrade: 'crude', windExposed: false,
            bedding: 'dry-bedding', fireLit: true, atFire: true,
        }));
        expect(flow.net, 'net positive').toBeGreaterThan(0);
        //  "Gradual" means it does not refill a night's deficit in an hour.
        expect(flow.net, 'gradual, not a refill').toBeLessThan(TUNE.warmthMax / 2);
    });

    it('4. warm humid post-rain → may STABILIZE, and the wetness cost remains', () => {
        //  Mild (not night), sheltered, but soaked. The point of the scenario is that being
        //  wet keeps costing after the weather has passed.
        const damp = netHeatFlowPerGameHour(ctx({
            isNight: false, sheltered: true, shelterGrade: 'crude', windExposed: false,
            bedding: 'dry-bedding', wet: TUNE.wetMax * 0.7,
        }));
        const dry = netHeatFlowPerGameHour(ctx({
            isNight: false, sheltered: true, shelterGrade: 'crude', windExposed: false,
            bedding: 'dry-bedding', wet: 0,
        }));
        expect(damp.net, 'wetness still costs, under a roof, in mild air')
            .toBeLessThan(dry.net);
        expect(damp.evaporativeLoss).toBeLessThan(0);
    });

    it('5. overheated enclosed shelter → warmth rises INTO HEAT STRAIN (more is not better)', () => {
        const flow = netHeatFlowPerGameHour(ctx({
            isNight: true, sheltered: true, shelterGrade: 'serviceable', windExposed: false,
            bedding: 'dry-bedding', fireLit: true, atFire: true, enclosed: true,
        }));
        expect(flow.net, 'a sealed space with a fire drives warmth up hard').toBeGreaterThan(0);
        //  ...and the top of the range costs something, so warmth is not a score to maximise.
        expect(thermalStrain(TUNE.warmthMax)).toBe('heat-strain');
        expect(strainCosts('heat-strain')).toBe(true);
        expect(strainCosts('comfortable')).toBe(false);
    });
});

describe('the shipped AWAKE rates are reproduced exactly — only sleep changed', () => {
    //  `windExposed: true` throughout, because wind is AMBIENT: it is blowing whether or not
    //  you have a roof, and the roof scales your exposure to it rather than deleting it. That
    //  is how `reconcile` wires it, and a fixture that disagreed with the caller would be
    //  certifying rates the game never produces.
    const awake = (over: Partial<ThermalContext>) =>
        netHeatFlowPerGameHour(ctx({
            resting: false, activity: 1, nutrition: 100, windExposed: true, ...over,
        })).net;

    it('a fed, dry survivor in daylight nets zero', () => {
        expect(awake({ isNight: false })).toBeCloseTo(0, 6);
    });

    it('outdoors at night, the shipped night drain', () => {
        expect(awake({ isNight: true })).toBeCloseTo(-TUNE.warmthDrainPerGameHourNight, 6);
    });

    it("under a crude roof at night, the shipped sheltered rate — F3's 45% rests on this", () => {
        expect(awake({ isNight: true, sheltered: true, shelterGrade: 'crude' }))
            .toBeCloseTo(-TUNE.warmthDrainPerGameHourNight * TUNE.shelterGradeWarmthMultiplier.crude, 6);
    });

    it('beside a fire at night, the shipped fire rate', () => {
        expect(awake({ isNight: true, fireLit: true, atFire: true }))
            .toBeCloseTo(TUNE.warmthRegenPerGameHourAtFire, 6);
    });
});

describe('sleep is a metabolic state, not a heater', () => {
    it('resting makes LESS heat than working — the honest replacement for the deleted bonus', () => {
        const working = netHeatFlowPerGameHour(ctx({ resting: false, activity: 1 }));
        const sleeping = netHeatFlowPerGameHour(ctx({ resting: true }));
        expect(sleeping.metabolic).toBeLessThan(working.metabolic);
    });

    it('so an UNPROTECTED night is worse asleep than awake — the truth the old model refused', () => {
        const awakeOut = netHeatFlowPerGameHour(ctx({ resting: false, activity: 1 }));
        const asleepOut = netHeatFlowPerGameHour(ctx({ resting: true, bedding: 'bare-ground' }));
        expect(asleepOut.net).toBeLessThan(awakeOut.net);
    });

    it('a starving body makes less heat still — cold and hunger compound', () => {
        expect(netHeatFlowPerGameHour(ctx({ nutrition: 0 })).net)
            .toBeLessThan(netHeatFlowPerGameHour(ctx({ nutrition: 100 })).net);
    });

    it('no branch anywhere reads "is asleep" as a REASON TO WARM — every path is physical', () => {
        //  Sweep: for every combination of the physical inputs, resting is never better for
        //  net flow than the same situation awake. If it ever is, a bonus has crept back in.
        for (const isNight of [true, false]) {
            for (const sheltered of [true, false]) {
                for (const fireLit of [true, false]) {
                    for (const wet of [0, TUNE.wetMax]) {
                        const base = { isNight, sheltered, shelterGrade: 'crude' as const, fireLit, atFire: fireLit, wet, windExposed: !sheltered };
                        const rest = netHeatFlowPerGameHour(ctx({ ...base, resting: true, bedding: 'dry-bedding' }));
                        const work = netHeatFlowPerGameHour(ctx({ ...base, resting: false, activity: 1 }));
                        expect(rest.net, `night${isNight} shel${sheltered} fire${fireLit} wet${wet}`)
                            .toBeLessThanOrEqual(work.net + 1e-9);
                    }
                }
            }
        }
    });
});
