/**
 * §15 — CROSS-SYSTEM DEVELOPMENT (Slice 2B Stage B).
 *
 * "Capability comes from CROSSED evidence, not single-stat thresholds." The tests that matter
 * are therefore the NEGATIVE ones: a maxed body leg with no understanding must not unlock the
 * capability, and a maxed knowledge leg with no body must not either. If either half alone
 * ever opens the gate, §15 has been implemented as a stat check wearing its vocabulary.
 *
 * The second thing worth guarding is subtler and it is the sentence most likely to be lost in
 * a later refactor: **reasoning never replaces force — it changes WHERE force is applied.**
 * A crossed survivor still needs the strength. What they gain is leverage, direction, staging
 * and a way to retreat. So `forceStillRequired` is asserted true at every level, including
 * `crossed`, and the leverage multiplier is asserted to be a discount rather than a bypass.
 */
import { describe, expect, it } from 'vitest';
import {
    CROSS_SPECS, allCrossReadings, crossReading, effectiveForceMultiplier, forceStillRequired,
    type CrossCapability,
} from '../src/brain/crossdev';
import { freshCapacities, type CapacityScores } from '../src/brain/capacities';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

const HIGH = 100;
const LOW = 0;

function body(capacity: string, value: number): CapacityScores {
    return { ...freshCapacities(), [capacity]: value } as CapacityScores;
}

function knowing(domain: string, understanding: number): GameState {
    const s = createInitialState(0);
    s.knowledge.domains[domain as 'construction'] = {
        technique: 0, understanding, adaptation: 0,
    };
    return s;
}

describe('§15\'s three named combinations exist and cross real shipped systems', () => {
    it('all three, each naming a body leg and a knowledge leg', () => {
        expect(CROSS_SPECS.map((s) => s.id)).toEqual([
            'heavy-construction-control', 'sustained-expedition', 'precise-repairable-components',
        ]);
    });

    it('each knowledge leg is a real shipped domain, not a new parallel score', () => {
        const shipped = new Set(Object.keys(createInitialState(0).knowledge.domains));
        for (const spec of CROSS_SPECS) {
            expect(shipped.has(spec.domain), spec.id).toBe(true);
        }
    });

    it('each body leg is one of §12\'s eight capacities', () => {
        const eight = new Set(Object.keys(freshCapacities()));
        for (const spec of CROSS_SPECS) expect(eight.has(spec.capacity), spec.id).toBe(true);
    });

    it('an unknown capability reports nothing rather than throwing', () => {
        expect(crossReading(createInitialState(0), freshCapacities(), 'nope' as CrossCapability))
            .toBeNull();
    });
});

describe('NEITHER LEG ALONE — the whole of §15 in three pairs', () => {
    for (const spec of CROSS_SPECS) {
        it(`${spec.id}: a maxed body with no understanding does NOT unlock it`, () => {
            const r = crossReading(knowing(spec.domain, LOW), body(spec.capacity, HIGH), spec.id)!;
            expect(r.level).toBe('body-only');
            expect(r.safeControl).toBe(false);
            expect(r.note).toBe(spec.bodyAlone);
        });

        it(`${spec.id}: maxed understanding with no body does NOT unlock it either`, () => {
            const r = crossReading(knowing(spec.domain, HIGH), body(spec.capacity, LOW), spec.id)!;
            expect(r.level).toBe('knowledge-only');
            expect(r.safeControl).toBe(false);
            expect(r.note).toBe(spec.knowledgeAlone);
        });

        it(`${spec.id}: crossed, and only crossed, grants safe control`, () => {
            const r = crossReading(knowing(spec.domain, HIGH), body(spec.capacity, HIGH), spec.id)!;
            expect(r.level).toBe('crossed');
            expect(r.safeControl).toBe(true);
            expect(r.note).toBe(spec.grants);
        });

        it(`${spec.id}: neither leg reads as neither, and says so plainly`, () => {
            const r = crossReading(knowing(spec.domain, LOW), body(spec.capacity, LOW), spec.id)!;
            expect(r.level).toBe('neither');
            expect(r.safeControl).toBe(false);
        });
    }

    it('SWEPT — across the whole threshold grid, safeControl requires BOTH legs', () => {
        //  The spot checks above use 0 and 100. This walks the actual boundary, which is
        //  where an off-by-one in a single comparison would hide.
        for (const spec of CROSS_SPECS) {
            for (let cap = 0; cap <= 100; cap += 5) {
                for (let und = 0; und <= 100; und += 5) {
                    const r = crossReading(knowing(spec.domain, und), body(spec.capacity, cap), spec.id)!;
                    const expected = cap >= TUNE.crossCapacityThreshold
                        && und >= TUNE.crossUnderstandingThreshold;
                    expect(r.safeControl, `${spec.id} cap${cap} und${und}`).toBe(expected);
                }
            }
        }
    });

    it('the knowledge leg reads UNDERSTANDING, not technique — the half that transfers', () => {
        const spec = CROSS_SPECS[0];
        const s = createInitialState(0);
        //  Plenty of having-done-it, no idea why it worked. That does not transfer to a load
        //  you have never lifted, which is exactly what §15 is arguing about.
        s.knowledge.domains[spec.domain as 'construction'] = {
            technique: 100, understanding: 0, adaptation: 100,
        };
        expect(crossReading(s, body(spec.capacity, HIGH), spec.id)!.safeControl).toBe(false);
    });
});

describe('reasoning never replaces force — it changes WHERE force is applied', () => {
    it('force is still required at EVERY level, crossed included', () => {
        for (const spec of CROSS_SPECS) {
            for (const [cap, und] of [[LOW, LOW], [HIGH, LOW], [LOW, HIGH], [HIGH, HIGH]]) {
                const r = crossReading(knowing(spec.domain, und), body(spec.capacity, cap), spec.id)!;
                expect(forceStillRequired(r), `${spec.id} ${r.level}`).toBe(true);
            }
        }
    });

    it('crossing is a DISCOUNT on raw effort, never a bypass', () => {
        const spec = CROSS_SPECS[0];
        const crossed = crossReading(knowing(spec.domain, HIGH), body(spec.capacity, HIGH), spec.id)!;
        const alone = crossReading(knowing(spec.domain, LOW), body(spec.capacity, HIGH), spec.id)!;
        const m = effectiveForceMultiplier(crossed);
        expect(m).toBeLessThan(effectiveForceMultiplier(alone));
        //  Strictly above zero: a survivor with good rigging sense is not a crane.
        expect(m).toBeGreaterThan(0);
    });

    it('and without the crossing there is no discount at all', () => {
        const spec = CROSS_SPECS[1];
        for (const [cap, und] of [[LOW, LOW], [HIGH, LOW], [LOW, HIGH]]) {
            const r = crossReading(knowing(spec.domain, und), body(spec.capacity, cap), spec.id)!;
            expect(effectiveForceMultiplier(r)).toBe(1);
        }
    });
});

describe('the readings are plain language, and honest at every level', () => {
    it('every level produces a note the player could act on', () => {
        for (const spec of CROSS_SPECS) {
            for (const [cap, und] of [[LOW, LOW], [HIGH, LOW], [LOW, HIGH], [HIGH, HIGH]]) {
                const r = crossReading(knowing(spec.domain, und), body(spec.capacity, cap), spec.id)!;
                expect(r.note.length, `${spec.id} ${r.level}`).toBeGreaterThan(20);
            }
        }
    });

    it('the body-alone note names the RISK rather than refusing the verb', () => {
        //  §15 is explicit that strength without planning still moves things — briefly, badly,
        //  dangerously. Being told the risk is not the same as being blocked.
        const spec = CROSS_SPECS[0];
        const r = crossReading(knowing(spec.domain, LOW), body(spec.capacity, HIGH), spec.id)!;
        expect(r.note).toContain('moves things');
        expect(r.note).toContain('instability');
    });

    it('all three read at once, for a survivor who is partway into each', () => {
        const s = createInitialState(0);
        const readings = allCrossReadings(s, freshCapacities());
        expect(readings).toHaveLength(3);
        for (const r of readings) expect(r.safeControl).toBe(false);
    });
});
