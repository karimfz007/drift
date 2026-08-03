/**
 * THE COMBINATION-EVIDENCE PREVIEW — three tiers that say genuinely different KINDS of thing.
 *
 * The load-bearing test is the never-attempted one: it must leak no function. That is the
 * invention pivot's whole surface area, and "could hold liquid" is the named counter-example
 * because it reads as a property and is actually the answer.
 */
import { describe, expect, it } from 'vitest';
import { PROPERTY_TERMS, previewFor, propertiesOf, propertyCoverageComplete, tierFor } from '../src/brain/evidence';
import { createInitialState } from '../src/brain/state';
import type { GameState } from '../src/brain/types';

function stocked(): GameState {
    const s = createInitialState(0);
    for (const k of Object.keys(s.inventory) as Array<keyof typeof s.inventory>) s.inventory[k] = 20;
    return s;
}

/**
 * An UNAMBIGUOUS pile. `shelter` is woodwork+masonry+textile — three slots, so an exact cover
 * at three materials, which settles `resolveRecipe` at stage one.
 *
 * My first fixture used wood+fibre with the torch known, and the matcher correctly answered
 * BACKPACK: stage two says a survivor who already holds the torch's plan is trying the other
 * thing. The preview was right and the fixture was ambiguous — the same shape of mistake as
 * every single-probe diagnosis this project has logged.
 */
const PILE = ['wood', 'stone', 'fiber'] as const;

function knowing(recipeId: string, understood = false): GameState {
    const s = stocked();
    s.blueprints = [{ id: 'bp', name: recipeId, recipeId, inputs: ['wood'], version: 1,
        workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 1 } as never];
    if (understood) {
        for (const d of Object.values(s.knowledge.domains)) d.understanding = 100;
    }
    return s;
}

describe('NEVER ATTEMPTED — properties only, and no implied function', () => {
    it('every property named comes from Law 95\'s CLOSED seven-term list', () => {
        //  The closure is the point: a preview that could invent an eighth term could
        //  describe anything, and "describes anything" is how implied function gets back in.
        const s = stocked();
        for (const mats of [['wood'], ['wood', 'stone'], ['fiber', 'sharpblade'], ['meat', 'berries']]) {
            for (const p of previewFor(s, mats as never).properties) {
                expect(PROPERTY_TERMS as readonly string[]).toContain(p);
            }
        }
    });

    it('NEVER names a use, a container, or an outcome — the pivot\'s whole surface', () => {
        const s = stocked();
        //  "could hold liquid" is the spec's own rejected example: it reads as a property and
        //  is actually the answer. Swept alongside every other way of naming a function.
        const banned = /hold liquid|container|vessel|carry water|use(?:d|ful) for|makes? a|you can make|to build/i;
        for (const mats of [['wood', 'fiber'], ['wood', 'stone'], ['fiber', 'sharpblade'], ['coconut', 'fiber']]) {
            const p = previewFor(s, mats as never);
            expect(p.tier).toBe('never-attempted');
            expect(p.lines.join(' '), `leaked a use for ${mats.join('+')}`).not.toMatch(banned);
        }
    });

    it('never names the RECIPE it would resolve to, even though the tier check knows it', () => {
        //  Properties come from the MATERIALS alone. Selecting a description by the answer
        //  would leak just as surely as stating it.
        const s = stocked();
        const p = previewFor(s, PILE as never);
        expect(p.lines.join(' ').toLowerCase()).not.toMatch(/torch|backpack|axe|spear|shelter|storage|hammer/);
    });

    it('every material has properties — a new one cannot arrive undescribed', () => {
        expect(propertyCoverageComplete()).toBe(true);
        expect(propertiesOf('wood').length).toBeGreaterThan(0);
    });
});

describe('DEMONSTRATED — the outcome WITH its uncertainty', () => {
    it('names the outcome but hedges it, and says what it does not know', () => {
        //  The distinction is real, not a formality: having made a thing once is not the same
        //  as understanding it, and the register has to carry that.
        const s = knowing('shelter');
        const p = previewFor(s, PILE as never);
        expect(p.tier).toBe('demonstrated');
        const text = p.lines.join(' ');
        expect(text).toMatch(/probably/i);
        expect(text).toMatch(/could not say yet why/i);
        expect(text).toMatch(/better or worse/i);
    });

    it('does NOT promise reliability — that is the next rung, and it must be earned', () => {
        const s = knowing('shelter');
        const text = previewFor(s, PILE as never).lines.join(' ');
        expect(text).not.toMatch(/reliab|every time|always|guarantee/i);
    });
});

describe('UNDERSTOOD — full reliability, slots and substitutions', () => {
    it('states the outcome plainly, with its functional slots', () => {
        const s = knowing('shelter', true);
        const p = previewFor(s, PILE as never);
        expect(p.tier).toBe('understood');
        const text = p.lines.join(' ');
        expect(text).toMatch(/know how this goes together/i);
        expect(text).toMatch(/takes .*(textile|woodwork|masonry)/i);
        //  Substitution is the payoff of understanding: anything with the same properties.
        expect(text).toMatch(/same properties/i);
    });

    it('...and drops the hedging the tier below required', () => {
        const s = knowing('shelter', true);
        expect(previewFor(s, PILE as never).lines.join(' ')).not.toMatch(/probably/i);
    });
});

describe('THE TIERS ARE ORDERED, and nothing skips', () => {
    it('the same pile reads differently at each rung', () => {
        const fresh = stocked();
        const made = knowing('shelter');
        const known = knowing('shelter', true);
        expect(tierFor(fresh, PILE as never)).toBe('never-attempted');
        expect(tierFor(made, PILE as never)).toBe('demonstrated');
        expect(tierFor(known, PILE as never)).toBe('understood');
    });
});

describe('KNOWN-MULTIPLE-RESULTS IS NOT BUILT (blocked on Boundary 3)', () => {
    it('the module says nothing about multiple results anywhere', async () => {
        //  Conditional on the work-mat entity and Law 127 position 3, which are entirely
        //  unbuilt — Slice 2C closed without them. A UI hinting at it would promise a surface
        //  that does not exist.
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/brain/evidence.ts', 'utf8');
        const api = await import('../src/brain/evidence');
        expect(Object.keys(api).filter((k) => /multiple|variant|outcomes/i.test(k))).toEqual([]);
        //  Named only in the doc comment that says it is NOT built.
        expect(src).toMatch(/KNOWN-MULTIPLE-RESULTS IS NOT BUILT/);
    });
});
