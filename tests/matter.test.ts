/**
 * LAW 128 — A FAILED ATTEMPT TRANSFORMS MATTER (Slice 2C).
 *
 * The pre-scan in [[D-092]] found that this law's phrasing points the wrong way for us. It
 * reads as a prohibition — *"must NEVER simply delete intact inputs on failure"* — and we
 * were not violating it. We were doing nothing at all: inputs came out of a failed attempt
 * completely untouched, because materials are consumed only on success. So what these tests
 * guard is the **positive** half.
 *
 * Two properties carry the weight, and they pull in opposite directions on purpose:
 *
 *   1. **A failure ALWAYS changes something.** Otherwise the world is indifferent to what
 *      you did to it and the same stone can be hammered forever.
 *   2. **Loss is EARNED and ANNOUNCED.** §11 names *"a rare critical part deleted by a hidden
 *      failed-craft roll"* as an automatic whole-game failure condition, so a unit may only
 *      go after wear the player was told about — never on the first attempt, never silently.
 */
import { describe, expect, it } from 'vitest';
import { COMBINE_ALWAYS_SUCCEEDS } from '../src/brain/experiment';
import {
    freshMatterWear, isNearlySpent, stressedMaterial, transformOnFailure, transformationFor,
} from '../src/brain/matter';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { GameState, MaterialKind } from '../src/brain/types';
//  STAGE-THEN-CONFIRM. Since the never-auto-commit ruling, `tryCombineWith` returns a
//  QUESTION and spends nothing; the attempt happens when the survivor answers it. These tests
//  exercise attempts, so they answer it — see tests/helpers/confirmed.ts.
import { attemptConfirmed } from './helpers/confirmed';

function stocked(): GameState {
    const s = createInitialState(0);
    s.inventory.wood = 10; s.inventory.stone = 10; s.inventory.fiber = 10; s.inventory.sharpblade = 10;
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    return s;
}

describe('a failure always changes SOMETHING', () => {
    it('wear appears on the material the attempt actually stressed', () => {
        const s = stocked();
        const out = transformOnFailure(s, ['wood', 'fiber'])!;
        expect(out).not.toBeNull();
        expect(s.matterWear[out.material]).toBe(TUNE.matterWearPerFailure);
        expect(out.consumed).toBe(false);
    });

    it('the stressed material is the one being WORKED, not the one worked against', () => {
        //  A lashing that slips has strained the cord, not the timber it was tied around;
        //  a blade takes the edge damage before anything else does.
        expect(stressedMaterial(['wood', 'sharpblade'])).toBe('sharpblade');
        expect(stressedMaterial(['wood', 'stone'])).toBe('stone');
        expect(stressedMaterial(['wood', 'fiber'])).toBe('fiber');
        expect(stressedMaterial(['wood'])).toBe('wood');
        expect(stressedMaterial([])).toBeNull();
    });

    it('every material has a physically sensible transformation, and it is STABLE', () => {
        //  Chosen per material rather than rolled: a player who has cracked one stone should
        //  recognise the next one. Same stuff, same failure.
        const kinds: MaterialKind[] = ['wood', 'stone', 'fiber', 'sharpblade', 'coconut', 'shellfish', 'berries'];
        for (const k of kinds) {
            expect(transformationFor(k), k).toBeTruthy();
            expect(transformationFor(k)).toBe(transformationFor(k));
        }
        expect(transformationFor('sharpblade')).toBe('blunted');
        expect(transformationFor('wood')).toBe('cracked');
    });

    it('and the outcome says so in plain language, naming the material', () => {
        const out = transformOnFailure(stocked(), ['stone', 'wood'])!;
        expect(out.note.toLowerCase()).toContain('stone');
        expect(out.note).not.toMatch(/\d/);
    });

    it('nothing to transform reports null rather than throwing', () => {
        const s = createInitialState(0);
        expect(transformOnFailure(s, [])).toBeNull();
        expect(transformOnFailure(s, ['wood']), 'none in hand').toBeNull();
    });
});

describe('LOSS IS EARNED, AND ANNOUNCED — never a hidden roll', () => {
    it('the FIRST failure never costs a unit', () => {
        const s = stocked();
        const before = s.inventory.stone;
        const out = transformOnFailure(s, ['stone', 'wood'])!;
        expect(out.consumed).toBe(false);
        expect(s.inventory.stone).toBe(before);
    });

    it('a unit goes only after wear crosses the threshold, and it takes several attempts', () => {
        const s = stocked();
        const before = s.inventory.stone;
        let consumed = false;
        let attempts = 0;
        while (!consumed && attempts < 20) {
            consumed = transformOnFailure(s, ['stone', 'wood'])!.consumed;
            attempts += 1;
        }
        expect(consumed, 'it does eventually give').toBe(true);
        expect(attempts, 'but never on the first attempt').toBeGreaterThan(1);
        expect(s.inventory.stone).toBe(before - 1);
    });

    it('the survivor is WARNED before it goes', () => {
        const s = stocked();
        expect(isNearlySpent(s, 'stone'), 'fresh').toBe(false);
        let warnedBeforeLoss = false;
        for (let i = 0; i < 20; i++) {
            const warned = isNearlySpent(s, 'stone');
            const out = transformOnFailure(s, ['stone', 'wood'])!;
            if (out.consumed) { warnedBeforeLoss = warned; break; }
        }
        expect(warnedBeforeLoss, 'nearly-spent was true on the attempt that broke it').toBe(true);
    });

    it('breaking is REPORTED as breaking, not silently folded into the same message', () => {
        const s = stocked();
        let breakNote = '';
        for (let i = 0; i < 20; i++) {
            const out = transformOnFailure(s, ['stone', 'wood'])!;
            if (out.consumed) { breakNote = out.note; break; }
        }
        expect(breakNote.toLowerCase()).toContain('broken');
    });

    it('wear is per material — breaking a stone leaves the fibre alone', () => {
        const s = stocked();
        for (let i = 0; i < 12; i++) transformOnFailure(s, ['stone', 'wood']);
        expect(s.matterWear.fiber ?? 0).toBe(0);
        expect(s.inventory.fiber).toBe(10);
    });
});

describe('through the real verb, not just the helper', () => {
    //  PARKED WITH THE FEATURE, NOT DELETED. `COMBINE_ALWAYS_SUCCEEDS` makes every combine and
    //  discovery succeed by explicit direction, so a check that waits for a failure would hang
    //  forever on a product that is behaving exactly as ruled. `skipIf` keys off the SAME
    //  constant the behaviour does, so flipping it back re-arms this in the same edit — the
    //  claim is suspended, never weakened, and Law 128 comes back with its own witness.
    it.skipIf(COMBINE_ALWAYS_SUCCEEDS)('a failed Try-Combine leaves the matter changed and says what happened', () => {
        //  Driven through `tryCombineWith` so this asserts the shipped path. Domains are left
        //  at the innate floor so failures are common; the loop stops at the first one.
        const s = stocked();
        let sawFailure = false;
        for (let i = 0; i < 40 && !sawFailure; i++) {
            s.inventory.wood = 10; s.inventory.fiber = 10; s.energy = 100;
            const before = { ...s.matterWear };
            //  P0-1: attempt normally, and NAME the torch only once the pile has become a
            //  question — which it does after the second invention, because the torch and the
            //  backpack share wood+fibre. Naming it earlier is refused (you cannot choose a
            //  plan you have not worked out), and not naming it later returns `choose`, which
            //  is not an attempt. Either way this stays a real attempt on a real relationship,
            //  which is the claim. Rewritten to the new law rather than deleted, so a silent
            //  revert of P0-1 still fails here.
            //  P0-C widens P0-1: naming is required at ONE held plan, not only at two, so the
            //  predicate that decides whether this pile must be named is `needsNaming`.
            //  `isAmbiguousToPlayer` still answers its own narrower question (which of two?) and
            //  is deliberately not reused here — reading it would fall through to a bare
            //  `tryCombine` that now returns `choose`, and the attempt would never happen.
            //  ONE CALL, NOT A BRANCH. `needsNaming` is now true for any pile that MAKES
            //  something, so branching on it routed an unknown pattern into
            //  `makeChosen('torch')` — correctly refused, so the attempt never happened
            //  and this loop counted zero failures. The helper answers the question the way
            //  the survivor actually would, held or not.
            const r = attemptConfirmed(s, ['wood', 'fiber']);
            if (r.outcome === 'failed-attempt') {
                sawFailure = true;
                expect(r.matter, 'the failure carries a matter outcome').toBeTruthy();
                expect(JSON.stringify(s.matterWear), 'and wear really moved')
                    .not.toBe(JSON.stringify(before));
                expect((r.reason ?? '').toLowerCase()).toMatch(/frayed|split|edge|crushed|broken|spilled|crooked|soaked|charred|bent|seized/);
            }
        }
        expect(sawFailure, 'a failure occurred in 40 attempts').toBe(true);
    });

    it('SUCCESS still consumes, and does NOT wear — the two paths stay separate', () => {
        const s = stocked();
        for (const d of Object.keys(s.knowledge.domains)) {
            s.knowledge.domains[d as 'construction'] = { technique: 100, understanding: 100, adaptation: 100 };
        }
        let sawSuccess = false;
        for (let i = 0; i < 40 && !sawSuccess; i++) {
            s.inventory.wood = 10; s.inventory.fiber = 10; s.energy = 100;
            s.matterWear = freshMatterWear();
            const r = attemptConfirmed(s, ['wood', 'fiber']);
            if (r.outcome === 'invented') {
                sawSuccess = true;
                expect(r.matter ?? null, 'success carries no matter outcome').toBeFalsy();
                expect(s.matterWear.wood ?? 0).toBe(0);
                expect(s.matterWear.fiber ?? 0).toBe(0);
            }
        }
        expect(sawSuccess, 'a success occurred in 40 attempts').toBe(true);
    });
});
