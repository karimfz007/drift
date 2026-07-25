import { describe, expect, it } from 'vitest';
import {
    axeChopMultiplierFor,
    buildShelter,
    craftAxe,
    craftTorch,
    createInitialState,
    rollGrade,
    shelterWarmthMultiplierFor,
    torchBurnGameHoursFor
} from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { ItemGrade } from '../src/brain/types';

const ALL_GRADES: ItemGrade[] = ['crude', 'serviceable', 'refined', 'exceptional'];

describe('grades — rolled once at craft time, plain stated odds (Ch.1 v3, D-055)', () => {
    it('always returns one of the four grades, for any seed', () => {
        for (let seed = 0; seed < 500; seed++) {
            expect(ALL_GRADES).toContain(rollGrade(seed));
        }
    });

    it('is deterministic — the same seed always rolls the same grade', () => {
        for (let seed = 0; seed < 20; seed++) {
            expect(rollGrade(seed)).toBe(rollGrade(seed));
        }
    });

    it('roughly matches the tuned odds over many seeds (a property test, not exact)', () => {
        const counts: Record<ItemGrade, number> = { crude: 0, serviceable: 0, refined: 0, exceptional: 0 };
        const total = 20_000;
        for (let seed = 0; seed < total; seed++) counts[rollGrade(seed)] += 1;
        expect(counts.crude / total).toBeCloseTo(TUNE.gradeOddsCrude, 1);
        expect(counts.serviceable / total).toBeCloseTo(TUNE.gradeOddsServiceable, 1);
        expect(counts.refined / total).toBeCloseTo(TUNE.gradeOddsRefined, 1);
        expect(counts.exceptional / total).toBeCloseTo(TUNE.gradeOddsExceptional, 1);
    });

    it('craftRollCount advances by exactly one per craft, seeding each roll uniquely', () => {
        const s = createInitialState(0);
        expect(s.craftRollCount).toBe(0);
        s.inventory.wood = 99;
        s.inventory.fiber = 99;
        craftTorch(s);
        expect(s.craftRollCount).toBe(1);
        s.inventory.stone = 99;
        s.inventory.sharpblade = 99;
        craftAxe(s);
        expect(s.craftRollCount).toBe(2);
    });

    it("'serviceable' reproduces every pre-grade constant EXACTLY — a migrated item feels unchanged", () => {
        expect(axeChopMultiplierFor('serviceable')).toBe(1);
        expect(torchBurnGameHoursFor('serviceable')).toBe(TUNE.torchBurnGameHours);
        expect(shelterWarmthMultiplierFor('serviceable')).toBe(0.5);
    });

    it('exactly one stat moves per item type — crude is worse, exceptional is better, monotonically', () => {
        //  Axe: fell speed — LOWER multiplier is faster/better.
        expect(axeChopMultiplierFor('crude')).toBeGreaterThan(axeChopMultiplierFor('serviceable'));
        expect(axeChopMultiplierFor('serviceable')).toBeGreaterThan(axeChopMultiplierFor('refined'));
        expect(axeChopMultiplierFor('refined')).toBeGreaterThan(axeChopMultiplierFor('exceptional'));

        //  Torch: burn duration — HIGHER multiplier is better (burns longer).
        expect(torchBurnGameHoursFor('crude')).toBeLessThan(torchBurnGameHoursFor('serviceable'));
        expect(torchBurnGameHoursFor('serviceable')).toBeLessThan(torchBurnGameHoursFor('refined'));
        expect(torchBurnGameHoursFor('refined')).toBeLessThan(torchBurnGameHoursFor('exceptional'));

        //  Shelter: warmth-drain multiplier — LOWER is better (drains less).
        expect(shelterWarmthMultiplierFor('crude')).toBeGreaterThan(shelterWarmthMultiplierFor('serviceable'));
        expect(shelterWarmthMultiplierFor('serviceable')).toBeGreaterThan(shelterWarmthMultiplierFor('refined'));
        expect(shelterWarmthMultiplierFor('refined')).toBeGreaterThan(shelterWarmthMultiplierFor('exceptional'));
    });

    it('craftAxe rolls a grade and stores it on tools.axeGrade', () => {
        const s = createInitialState(0);
        s.inventory.wood = 99;
        s.inventory.sharpblade = 99;
        s.inventory.fiber = 99;
        craftAxe(s);
        expect(ALL_GRADES).toContain(s.tools.axeGrade);
    });

    it('buildShelter rolls a grade and stores it on shelter.grade', () => {
        const s = createInitialState(0);
        s.inventory.wood = 99;
        s.inventory.stone = 99;
        s.inventory.fiber = 99;
        buildShelter(s, 0, 0);
        expect(ALL_GRADES).toContain(s.shelter.grade);
    });
});
