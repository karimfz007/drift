/**
 * §12 — THE SIX-INDICATOR CORRECTION AND THE EIGHT CAPACITIES (Slice 2B Stage B).
 *
 * The tests that earn their place here are the "must not mean" ones. Every failure §12 names
 * is a shortcut a designer reaches for under deadline, and prose in a bible does not stop
 * anyone — so each boundary is asserted from outside the module, against the shipped code
 * that would have to break to violate it.
 *
 * The load-bearing one is health. If health becomes a general price for ordinary work, every
 * action turns into slow suicide and resting becomes the only correct verb. `workload.ts`
 * already returns a health channel of exactly 0 for every ordinary action; this file asserts
 * the same law from the indicator side, so the two cannot drift apart quietly.
 */
import { describe, expect, it } from 'vitest';
import {
    CAPACITIES, CAPACITY_SPEC, INDICATOR_MEANING, SUPERSEDED_V09_CAPACITIES,
    developCapacity, freshCapacities, healthMayChangeFrom, staminaCeilingFor,
    trainingStimulus,
} from '../src/brain/capacities';
import { channelsFor, healthHarmFrom, workloadOf } from '../src/brain/workload';
import { TUNE } from '../src/data/tune';

describe('the count changed, and the code says so', () => {
    it('EIGHT capacities, in §12 order', () => {
        expect(CAPACITIES).toEqual([
            'strength', 'endurance', 'loadTolerance', 'mobilityBalance',
            'coordinationDexterity', 'breathWaterConfidence', 'acclimatization',
            'generalResilience',
        ]);
        expect(CAPACITIES).toHaveLength(8);
    });

    it('superseding v0.9\'s SEVEN, which is kept in code so the evolution is legible', () => {
        expect(SUPERSEDED_V09_CAPACITIES).toHaveLength(7);
        //  Stamina left because it is a current RESERVE, not a capacity. Perception and
        //  Reasoning left because they are knowledge, which already has a home.
        expect(SUPERSEDED_V09_CAPACITIES).toContain('Stamina');
        expect(CAPACITIES as string[]).not.toContain('stamina');
    });

    it('every capacity carries all three of §12\'s columns, none left blank', () => {
        for (const c of CAPACITIES) {
            const spec = CAPACITY_SPEC[c];
            expect(spec.developedBy.length, c).toBeGreaterThan(10);
            expect(spec.improves.length, c).toBeGreaterThan(10);
            expect(spec.doesNotDo.length, c).toBeGreaterThan(10);
        }
    });

    it('starts at a floor, never at zero', () => {
        const fresh = freshCapacities();
        for (const c of CAPACITIES) expect(fresh[c]).toBe(TUNE.capacityInnateFloor);
        expect(TUNE.capacityInnateFloor).toBeGreaterThan(0);
    });
});

describe('THE CORRECTION: health is not the price of ordinary work', () => {
    it('the indicator says so in its own definition', () => {
        expect(INDICATOR_MEANING.health.mustNotMean).toContain('ordinary work');
    });

    it('and the workload model agrees — no ordinary action costs health, at any intensity', () => {
        //  Swept rather than spot-checked: the failure this guards against is a health cost
        //  that only appears at the extremes, which a single mild sample would miss.
        for (const duration of [0.1, 1, 4, 12]) {
            for (const pace of [0.5, 1, 1.5, 2]) {
                for (const load of [1, 1.5, 2.5]) {
                    const w = workloadOf({
                        baseDemand: 1, durationGameHours: duration, pace, loadFactor: load,
                        terrain: 1.4, environment: 1.3, toolInefficiency: 1.5, impairment: 1.2,
                    });
                    //  The workload must be a real number, not NaN. The first cut of this
                    //  sweep used the wrong field names, so every factor read `undefined`
                    //  and the health assertion passed against a NaN workload — a vacuous
                    //  green, which is hazard #2 wearing a sweep's clothes.
                    expect(Number.isFinite(w), `workload d${duration}`).toBe(true);
                    expect(channelsFor(w, 2).health, `d${duration} p${pace} l${load}`).toBe(0);
                }
            }
        }
    });

    it('health moves ONLY for the six named causes', () => {
        for (const cause of ['injury', 'illness', 'toxic', 'thermal-injury', 'collapse', 'unsafe-continued']) {
            expect(healthMayChangeFrom(cause), cause).toBe(true);
        }
        for (const notACause of ['chopping', 'walking', 'carrying', 'crafting', 'work', 'ordinary']) {
            expect(healthMayChangeFrom(notACause), notACause).toBe(false);
        }
    });

    it('and the harm function agrees: no hazard, no harm', () => {
        expect(healthHarmFrom(null, 1)).toBe(0);
        expect(healthHarmFrom('injury', 1)).toBeGreaterThan(0);
    });
});

describe('the other five corrections', () => {
    it('hunger is not calories-per-swing — nutrition debt accumulates, it is not charged per action', () => {
        expect(INDICATOR_MEANING.hunger.mustNotMean).toContain('per swing');
        const light = channelsFor(workloadOf({ baseDemand: 1, durationGameHours: 0.1 }));
        //  A brief action produces a debt far smaller than its stamina draw: the delay is the
        //  design, and a debt that tracked stamina one-for-one would be the thing §12 forbids.
        expect(light.nutritionDebt).toBeLessThan(light.stamina);
    });

    it('thirst is not a timer independent of heat and work', () => {
        expect(INDICATOR_MEANING.thirst.mustNotMean).toContain('independent of heat and work');
        const base = workloadOf({ baseDemand: 1, durationGameHours: 1 });
        const cool = channelsFor(base, 1);
        const hot = channelsFor(base, 2);
        expect(hot.hydration).toBeGreaterThan(cool.hydration);
        const harder = channelsFor(workloadOf({ baseDemand: 1, durationGameHours: 1, pace: 2 }), 1);
        expect(harder.hydration).toBeGreaterThan(cool.hydration);
    });

    it('energy is NOT stamina — two channels, moving by different amounts', () => {
        expect(INDICATOR_MEANING.energy.mustNotMean).toContain('stamina');
        const ch = channelsFor(workloadOf({ baseDemand: 1, durationGameHours: 2, pace: 1.5 }));
        expect(ch.energy).not.toBe(ch.stamina);
    });

    it('warmth is not only a cold meter — work produces heat', () => {
        expect(INDICATOR_MEANING.warmth.mustNotMean.toLowerCase()).toContain('overheating');
        expect(channelsFor(workloadOf({ baseDemand: 1, durationGameHours: 2, pace: 1.5 })).thermalGain)
            .toBeGreaterThan(0);
    });

    it('stamina is a RESERVE and endurance is the capacity shaping it', () => {
        expect(INDICATOR_MEANING.stamina.mustNotMean).toContain('long-term endurance');
        expect(staminaCeilingFor(0)).toBe(TUNE.staminaCeilingBase);
        expect(staminaCeilingFor(100)).toBe(TUNE.staminaCeilingMax);
        expect(staminaCeilingFor(50)).toBeGreaterThan(staminaCeilingFor(10));
        //  Endurance raises the ceiling and is never itself spent — no call here reduces it.
    });
});

describe('development, and the boundaries on it', () => {
    const ok = { recoverable: true, meaningfulStimulus: true };

    it('a recoverable, meaningful bout develops the capacity', () => {
        expect(trainingStimulus('strength', ok)).toBeGreaterThan(0);
    });

    it('work the body cannot recover from trains NOTHING — that is damage, not training', () => {
        expect(trainingStimulus('strength', { ...ok, recoverable: false })).toBe(0);
    });

    it('a stroll trains nothing — §13\'s meaningful-stimulus rule', () => {
        expect(trainingStimulus('endurance', { ...ok, meaningfulStimulus: false })).toBe(0);
    });

    it('MAXIMUM OVERLOAD IS NOT GOOD TRAINING — exactly zero, not a small consolation', () => {
        //  §12, load tolerance. Zero rather than a token amount on purpose: the moment
        //  grinding overload is worth ANYTHING, a player who notices will do only that.
        expect(CAPACITY_SPEC.loadTolerance.doesNotDo).toContain('overload');
        for (const c of CAPACITIES) {
            expect(trainingStimulus(c, { ...ok, overloaded: true }), c).toBe(0);
        }
    });

    it('carrying badly trains no load tolerance — §12 says WELL-FITTED', () => {
        expect(trainingStimulus('loadTolerance', { ...ok, wellFitted: false })).toBe(0);
        //  ...and the constraint is specific to that capacity, not a blanket gate.
        expect(trainingStimulus('strength', { ...ok, wellFitted: false })).toBeGreaterThan(0);
    });

    it('MONOTONIC — no stimulus, however shaped, can lower a capacity', () => {
        let scores = freshCapacities();
        const start = { ...scores };
        for (const c of CAPACITIES) {
            for (const stim of [-100, -1, -0.0001, 0]) {
                scores = developCapacity(scores, c, stim);
                expect(scores[c], `${c} @ ${stim}`).toBeGreaterThanOrEqual(start[c]);
            }
        }
        expect(scores).toEqual(start);
    });

    it('and caps at 100 — a body is not a spreadsheet', () => {
        let scores = freshCapacities();
        for (let i = 0; i < 5000; i++) scores = developCapacity(scores, 'strength', 1);
        expect(scores.strength).toBe(100);
    });

    it('developing one capacity never moves another', () => {
        const before = freshCapacities();
        const after = developCapacity(before, 'strength', trainingStimulus('strength', ok));
        for (const c of CAPACITIES) {
            if (c === 'strength') continue;
            expect(after[c], c).toBe(before[c]);
        }
    });
});
