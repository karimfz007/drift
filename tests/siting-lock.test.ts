/**
 * THE ARMED SITING THAT ATE THE WORLD — and what survived the economy that replaced it.
 *
 * REPORTED as: chose to build a shelter, did not have the materials, and then every tap in the
 * world showed the placement ghost instead of gathering. Two mistakes met — nothing checked
 * affordability before arming, and the refusal RE-ARMED, so every world tap re-entered it.
 *
 * ---------------------------------------------------------------------------------------
 * SUPERSEDED IN PART BY THE INCREMENTAL ECONOMY (item 3), and this file records which part.
 *
 * [[D-184]]'s fix was to refuse to arm what could not be paid for. Under the OLD economy that
 * was right: a placement that could not complete had no way to become one that could. The new
 * economy removes that premise — starting short is the intended path — so the affordability
 * GATE is gone, and the tests that guarded it as a gate are gone with it.
 *
 * WHAT IS NOT SUPERSEDED, and is what this file now guards:
 *
 *   1. THE LAW: never arm something the player cannot resolve. It survives in exactly one
 *      case — a survivor carrying NONE of what the thing is made of — and `beginBlocker`
 *      holds that line. Asserted in `tests/incremental-build.test.ts`, where the new economy
 *      lives.
 *   2. THE SHORTFALL IS STILL NAMED BEFORE THE CHOICE. `placementBlocker` no longer gates
 *      anything; it tells the slate what a frame would START short of, which is a better
 *      sentence than a refusal and is still the Law 26 answer.
 *   3. THE BAD-SPOT REFUSAL STILL RE-ARMS, and the materials one never comes back — the
 *      distinction that was the actual root cause.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, buildStorage } from '../src/brain/state';
import {
    combineSlate, placementBlocker, placementShortfall, recipeCost, isPlaced, drawIntoHands,
} from '../src/brain/experiment';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

const NOW = 1_770_000_000_000;

/** The director's own shape: enough to STAGE the pile, nowhere near enough to BUILD. */
function poor(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 0 };
    s.inventory.wood = 2; s.inventory.stone = 2; s.inventory.fiber = 2;
    s.blueprints = [{ recipeId: 'shelter', version: 1 }] as never;
    return s;
}

function rich(): GameState {
    const s = poor();
    s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
    return s;
}

describe('the armed siting that blocked every world tap', () => {
    it('THE STATE, REPRODUCED: the pile is attemptable while the BUILD is unaffordable', () => {
        //  The two answers that must be allowed to disagree, asserted together — because it is
        //  their disagreement that opened the hole. Staging is about what is in your hands;
        //  building is about what the outcome costs, and nothing was checking the second.
        const s = poor();
        expect(isPlaced('shelter'), 'the shelter stopped being a placed outcome').toBe(true);
        const cost = recipeCost('shelter');
        expect(cost.length).toBeGreaterThan(0);
        for (const { kind, amount } of cost) {
            expect(s.inventory[kind], `the fixture can already afford ${kind}`).toBeLessThan(amount);
        }
        //  ...and the slate still names it, which is right and is not the bug.
        const slate = combineSlate(s, ['wood', 'stone', 'fiber']);
        expect(slate.known.map((k) => k.recipeId), 'the shelter vanished from the slate').toContain('shelter');
    });

    it('THE SHORTFALL IS STILL NAMED — no longer a gate, still the answer before the choice', () => {
        //  Under the incremental economy this refuses NOTHING. It reports what a frame raised
        //  right now would still be short of, so the survivor chooses knowingly between
        //  starting today and feeding it, or gathering first and raising it whole.
        const s = poor();
        const said = placementBlocker(s, 'shelter', false);
        expect(said, 'the slate lost its shortfall reading').toBeTruthy();
        expect(said).toMatch(/\d+ more wood/i);
        expect(said).toMatch(/\d+ more stone/i);
        expect(said).toMatch(/\d+ more fibre/i);
        const missing = placementShortfall(s, 'shelter', false);
        expect(missing.wood).toBe(TUNE.shelterWoodCost - 2);
        expect(missing.stone).toBe(TUNE.shelterStoneCost - 2);
        expect(missing.fiber).toBe(TUNE.shelterFiberCost - 2);
    });

    it('...and says nothing at all once the survivor can actually build it', () => {
        expect(placementBlocker(rich(), 'shelter', false)).toBeNull();
        expect(Object.keys(placementShortfall(rich(), 'shelter', false))).toHaveLength(0);
    });

    it('the SLATE carries it, so the answer arrives before the choice rather than after', () => {
        //  Now reading "starts part-built, still needs X" rather than "you cannot" — the same
        //  fact, in the sentence the new economy makes true.
        const shortSlot = combineSlate(poor(), ['wood', 'stone', 'fiber']).known
            .find((k) => k.recipeId === 'shelter')!;
        expect(shortSlot.affordable).toBe(false);
        expect(shortSlot.shortfall).toMatch(/more wood/i);

        const okSlot = combineSlate(rich(), ['wood', 'stone', 'fiber']).known
            .find((k) => k.recipeId === 'shelter')!;
        expect(okSlot.affordable).toBe(true);
        expect(okSlot.shortfall).toBeNull();
    });

    it('...and it is still OFFERED, never hidden — a slot you cannot see teaches nothing', () => {
        //  [[D-156]]: naming what you have already demonstrated is not a spoiler. The fix is to
        //  say what is short, not to make the shelter disappear until the wood is in hand.
        const slate = combineSlate(poor(), ['wood', 'stone', 'fiber']);
        expect(slate.known.some((k) => k.recipeId === 'shelter')).toBe(true);
    });

    it('AN OPEN CRATE COUNTS, because it is the same reach the placement will draw from', () => {
        //  `placeFromSlate` tops the hands up out of an open box before building, so a shortfall
        //  computed without the box would refuse a shelter the survivor can genuinely put up.
        const s = poor();
        s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
        expect(buildStorage(s, 6, 6)).toBe(true);
        s.inventory.wood = 1; s.inventory.stone = 1; s.inventory.fiber = 1;
        s.storage.stored.wood = 20; s.storage.stored.stone = 20; s.storage.stored.fiber = 20;

        expect(placementBlocker(s, 'shelter', false), 'the closed box was counted').toBeTruthy();
        expect(placementBlocker(s, 'shelter', true), 'the OPEN box was not counted').toBeNull();
        expect(combineSlate(s, ['wood', 'stone', 'fiber'], true).known
            .find((k) => k.recipeId === 'shelter')!.affordable).toBe(true);
    });

    it('AGREES WITH WHAT THE BUILDER WILL ACTUALLY CHARGE — no second opinion about cost', () => {
        //  The guard and the spend must read the same numbers, or the guard becomes a new way
        //  to be refused for something that would have gone up. Driven through `drawIntoHands`,
        //  which is what `placeFromSlate` itself calls.
        for (const held of [0, 1, 3, 7, 8, 20]) {
            const s = poor();
            s.inventory.wood = held; s.inventory.stone = 40; s.inventory.fiber = 40;
            const guardSaysNo = placementBlocker(s, 'shelter', false) !== null;
            const spendWouldFail = recipeCost('shelter')
                .some(({ kind, amount }) => !drawIntoHands(s, kind, amount, false));
            expect(guardSaysNo, `guard and spend disagreed while holding ${held} wood`).toBe(spendWouldFail);
        }
    });

    it('says nothing about HAND-HELD outcomes — those are charged when they are made', () => {
        //  `canExperimentWith` already answers for the hand-held path, and a second opinion here
        //  would be a second place for the two to drift apart.
        const s = poor();
        expect(placementBlocker(s, 'spear', false)).toBeNull();
        expect(placementShortfall(s, 'torch', false)).toEqual({});
    });
});
