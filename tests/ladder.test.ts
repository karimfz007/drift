/**
 * THE SIX-STATE KNOWLEDGE LADDER (Slice 2B Stage A, D-086 canon).
 *
 * The ladder is a READING of the shipped discovery spine, not a second store. That is the
 * property worth guarding hardest: if it ever needs its own persisted field to answer, it has
 * become a parallel system, and the first time the two disagree the player is told a
 * confident lie about their own knowledge. So these tests drive real state through the real
 * verbs and ask the ladder what it sees — never by writing a ladder value anywhere.
 */
import { describe, expect, it } from 'vitest';
import {
    LADDER_ORDER, arbitraryFailureAllowed, atLeast, executionIsReliable, gradeVarianceAllowed,
    ladderFor, migratedLadderFor, rung, type LadderState,
} from '../src/brain/ladder';
import { createInitialState } from '../src/brain/state';
import { allRecipes, recipeDomain } from '../src/brain/recipes';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState } from '../src/brain/types';

const RECIPE = 'torch';   // a real shipped recipe id

function withBlueprint(s: GameState, recipeId: string): GameState {
    const plan: Blueprint = {
        id: `bp-${recipeId}`, name: 'A plan', recipeId, inputs: ['wood'], version: 1,
        workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 3,
    };
    s.blueprints = [...s.blueprints, plan];
    return s;
}

describe('the ladder is ordered, and comparisons are rung comparisons', () => {
    it('the six states are in canon order, ascending', () => {
        expect(LADDER_ORDER).toEqual([
            'physically-possible', 'found-intact', 'conceptually-suspected',
            'demonstrated', 'understood', 'documented',
        ]);
    });

    it('atLeast is a real ordering, not string comparison', () => {
        expect(atLeast('understood', 'demonstrated')).toBe(true);
        expect(atLeast('demonstrated', 'understood')).toBe(false);
        expect(atLeast('documented', 'physically-possible')).toBe(true);
        //  Alphabetically 'demonstrated' < 'physically-possible'; by rung it is higher. A
        //  string compare would get this backwards, which is why rung() exists.
        expect(rung('demonstrated')).toBeGreaterThan(rung('physically-possible'));
    });
});

describe('the ladder READS the shipped spine — it stores nothing of its own', () => {
    it('a fresh survivor is at physically-possible for everything', () => {
        const s = createInitialState(1);
        for (const r of allRecipes()) expect(ladderFor(s, r.id)).toBe('physically-possible');
    });

    it('a minted blueprint alone lifts a recipe to DEMONSTRATED', () => {
        //  Nothing is written to a ladder field — a blueprint is added through the same shape
        //  Try-Combine mints, and the reading changes because the spine changed.
        const s = withBlueprint(createInitialState(2), RECIPE);
        expect(ladderFor(s, RECIPE)).toBe('demonstrated');
    });

    it('a blueprint PLUS deep understanding of its domain reaches DOCUMENTED', () => {
        const s = withBlueprint(createInitialState(3), RECIPE);
        const domain = recipeDomain(RECIPE)!;
        s.knowledge.domains[domain].understanding = TUNE.ladderUnderstoodAt;
        expect(ladderFor(s, RECIPE)).toBe('documented');
    });

    it('understanding WITHOUT a blueprint does not skip the rungs below it', () => {
        //  You cannot understand your way past having never made the thing. Knowing the
        //  theory of cordage is not the same as having twisted any.
        const s = createInitialState(4);
        const domain = recipeDomain(RECIPE)!;
        s.knowledge.domains[domain].understanding = 100;
        expect(ladderFor(s, RECIPE)).not.toBe('documented');
        expect(atLeast(ladderFor(s, RECIPE), 'demonstrated')).toBe(false);
    });

    it('a journaled dead end is real knowledge — it reaches conceptually-suspected', () => {
        const s = createInitialState(5);
        const domain = recipeDomain(RECIPE)!;
        s.knowledge.nullPairs = ['wood|fiber'];
        s.knowledge.domains[domain].technique = 5;
        expect(ladderFor(s, RECIPE)).toBe('conceptually-suspected');
    });

    it('the ladder never DROPS as the spine grows — knowledge is not lost by learning more', () => {
        //  Property: every step that adds to the spine must leave the rung equal or higher.
        //  A survivor who journals a failure and then succeeds must not slide backwards.
        const s = createInitialState(6);
        const domain = recipeDomain(RECIPE)!;
        const seen: LadderState[] = [ladderFor(s, RECIPE)];

        s.knowledge.nullPairs = ['wood|fiber'];
        s.knowledge.domains[domain].technique = 5;
        seen.push(ladderFor(s, RECIPE));

        withBlueprint(s, RECIPE);
        seen.push(ladderFor(s, RECIPE));

        s.knowledge.domains[domain].understanding = TUNE.ladderUnderstoodAt;
        seen.push(ladderFor(s, RECIPE));

        for (let i = 1; i < seen.length; i++) {
            expect(rung(seen[i])).toBeGreaterThanOrEqual(rung(seen[i - 1]));
        }
        //  WITNESS (D-066 a): the sequence must actually have climbed, or this proves nothing.
        expect(rung(seen[seen.length - 1])).toBeGreaterThan(rung(seen[0]));
    });
});

describe('D-086 shaping (b) — DETERMINISM BY STATE', () => {
    it('at understood and above, execution is reliable', () => {
        expect(executionIsReliable('understood')).toBe(true);
        expect(executionIsReliable('documented')).toBe(true);
        expect(executionIsReliable('demonstrated')).toBe(false);
    });

    it('ARBITRARY FAILURE IS ILLEGAL from demonstrated up — the half that keeps it fair', () => {
        //  The distinction the shaping draws: someone who has made a thing work may make a
        //  WORSE one, but must not be handed a coin flip that produces nothing. Quality
        //  variance reads as craft; existence variance reads as a broken game.
        expect(arbitraryFailureAllowed('physically-possible')).toBe(true);
        expect(arbitraryFailureAllowed('conceptually-suspected')).toBe(true);
        expect(arbitraryFailureAllowed('demonstrated')).toBe(false);
        expect(arbitraryFailureAllowed('understood')).toBe(false);
        expect(arbitraryFailureAllowed('documented')).toBe(false);
    });

    it('grade variance is legal exactly where inexperience is honest', () => {
        expect(gradeVarianceAllowed('demonstrated')).toBe(true);
        expect(gradeVarianceAllowed('understood')).toBe(true);
        //  Documented work is recorded practice; the wobble is gone.
        expect(gradeVarianceAllowed('documented')).toBe(false);
        expect(gradeVarianceAllowed('conceptually-suspected')).toBe(false);
    });

    it('the two predicates never both permit chaos at the same rung', () => {
        //  Property across the whole ladder: nowhere may execution be unreliable AND
        //  arbitrary failure be legal AND grade variance be legal all at once — that
        //  combination is just "anything can happen", which is the opposite of a system.
        for (const s of LADDER_ORDER) {
            const chaos = !executionIsReliable(s) && arbitraryFailureAllowed(s) && gradeVarianceAllowed(s);
            expect(chaos).toBe(false);
        }
    });
});

describe('D-086 shaping (c) — MIGRATION enters at demonstrated, never zero', () => {
    it('a previously-crafted type arrives at demonstrated', () => {
        expect(migratedLadderFor(true)).toBe('demonstrated');
    });

    it('a type never crafted arrives at the bottom, as it should', () => {
        expect(migratedLadderFor(false)).toBe('physically-possible');
    });

    it('migration never resets someone below where they already stood', () => {
        //  The reasoning is the player's, not the schema's: they DID make that axe. A system
        //  change that forgets it is the game calling them a liar about their own past.
        expect(rung(migratedLadderFor(true))).toBeGreaterThanOrEqual(rung('demonstrated'));
        expect(arbitraryFailureAllowed(migratedLadderFor(true))).toBe(false);
    });
});
