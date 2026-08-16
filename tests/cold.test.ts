/**
 * THE COLD SPEAKS BEFORE IT TAKES ANYTHING.
 *
 * The director died of cold with no warning. Illness has had a five-stage grammar since the
 * Medicine Slice whose first two rungs cost nothing and SAY something; cold had the same
 * five-rung ladder in `thermalStrain` and no voice at all — read in exactly one place in the
 * whole codebase, to decide whether wet + hypothermic seeds a chill.
 *
 * These lock the contract rather than the wording: two crossings that say something and take no
 * health, before the crossing that takes health.
 */
import { describe, expect, it } from 'vitest';
import { coldCosts, coldStage, coldSymptom } from '../src/brain/thermal';
import { healthRatePerGameHour } from '../src/brain/vitals';
import { TUNE } from '../src/data/tune';

/** Health lost per game hour to cold ALONE — every other vital held full. */
const costOfCold = (warmth: number) =>
    //  `Math.abs`, not a negation: negating a zero rate yields -0, which is not +0 to
    //  `Object.is` and would fail this on a passing product.
    Math.abs(Math.min(0, healthRatePerGameHour(TUNE.thirstMax, TUNE.hungerMax, warmth, 50, true)));

describe('cold warns twice before it costs anything', () => {
    it('the two warning rungs each SAY something', () => {
        expect(coldSymptom(30), 'chilled said nothing').toBeTruthy();
        expect(coldSymptom(6), 'freezing said nothing').toBeTruthy();
        expect(coldStage(30)).toBe('chilled');
        expect(coldStage(6)).toBe('freezing');
        //  Two DIFFERENT sentences: a warning repeated is not a second warning.
        expect(coldSymptom(30)).not.toBe(coldSymptom(6));
    });

    it('...and neither of them takes any health', () => {
        expect(coldCosts(coldStage(30))).toBe(false);
        expect(coldCosts(coldStage(6))).toBe(false);
        expect(costOfCold(30), 'the first warning cost health').toBe(0);
        expect(costOfCold(6), 'the last warning cost health').toBe(0);
    });

    it('...and the rung that DOES cost is the one past both of them', () => {
        expect(coldStage(0)).toBe('failing');
        expect(coldCosts('failing')).toBe(true);
        expect(costOfCold(0), 'the killing rung was free').toBeGreaterThan(0);
        expect(coldSymptom(0), 'the killing rung said nothing').toBeTruthy();
    });

    it('THE FAIR-CHALLENGE LINE — every warmth that costs health has been warned about first', () => {
        //  Walk the whole range. The first costing warmth must be strictly below a warmth that
        //  already had a sensation, or something can kill you before it has spoken.
        let firstCosting: number | null = null;
        let firstSpoken: number | null = null;
        for (let w = TUNE.warmthMax; w >= 0; w -= 1) {
            if (firstSpoken === null && coldSymptom(w)) firstSpoken = w;
            if (firstCosting === null && costOfCold(w) > 0) firstCosting = w;
        }
        expect(firstSpoken, 'nothing ever spoke').not.toBeNull();
        expect(firstCosting, 'nothing ever cost').not.toBeNull();
        expect(firstSpoken as number, 'the cold cost health before it said a word')
            .toBeGreaterThan(firstCosting as number);
    });

    it('being warm says nothing at all', () => {
        expect(coldStage(TUNE.warmthMax)).toBe('warm');
        expect(coldSymptom(TUNE.warmthMax)).toBeNull();
        expect(coldCosts('warm')).toBe(false);
    });

    it('the sensation names no number, no stage word and no band (Law 145)', () => {
        for (const w of [30, 6, 0]) {
            const said = coldSymptom(w) ?? '';
            expect(said, `"${said}" leaked a number`).not.toMatch(/\d/);
            expect(said, `"${said}" leaked a stage word`).not.toMatch(/hypotherm|chilled|freezing|stage|warmth/i);
        }
    });
});
