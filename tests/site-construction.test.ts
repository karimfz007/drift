/**
 * CONTEXTUAL CONSTRUCTION — THE SITE AS A DECISION (§9.6, Slice 2C Boundary 2).
 *
 * Separate from `construction.test.ts`, which owns the SHIPPED build/repair/durability
 * behaviour. This file owns §9.6's new claim: not "can a shelter be built" but "is WHERE it
 * goes a real choice".
 *
 * A global Build button could raise a shelter from anywhere, which told the player that the
 * site does not matter — and if the site does not matter, then drainage, wind, distance to
 * water and the shape of the ground are all decoration. So the tests that carry weight here
 * are the REFUSALS: ground too close to what already stands, a pattern never demonstrated,
 * matter not staged. If any of those stops refusing, the surface has quietly become a menu
 * again with a nicer name.
 *
 * The second load-bearing property is the ORDER of the reasons. §9.6 lists its preconditions
 * in sequence, and a player must be told the FIRST thing in their way rather than whichever
 * check happened to run last — the same nearest-true-reason rule Ch.2 item 6 established.
 */
import { describe, expect, it } from 'vitest';
import {
    DECLARED_OUTCOMES, OUTCOME_SPECS, availableOutcomes, hasPatternFor, readSite,
    siteHasAnything, siteIsViable,
} from '../src/brain/construction';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState } from '../src/brain/types';

function demonstrated(s: GameState, ...recipeIds: string[]): GameState {
    for (const recipeId of recipeIds) {
        const plan: Blueprint = {
            id: `bp-${recipeId}`, name: 'A plan', recipeId, inputs: ['wood'], version: 1,
            workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 3,
        };
        s.blueprints = [...s.blueprints, plan];
    }
    return s;
}

function stocked(s: GameState): GameState {
    s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
    return s;
}

const FAR = { x: 200, y: 200 };

describe('§9.6 speaks in human outcomes, not object names', () => {
    it('every offered outcome is named as a NEED, never as the thing it produces', () => {
        for (const spec of OUTCOME_SPECS) {
            expect(spec.label.toLowerCase()).not.toContain(spec.recipeId.toLowerCase());
            expect(spec.label.toLowerCase()).not.toContain('shelter');
            expect(spec.label.toLowerCase()).not.toContain('crate');
        }
    });

    it('the six are fixed — two ship, four are declared and never offered', () => {
        //  A seventh outcome would mean the player is choosing objects again. And an outcome
        //  you can pick and not get is worse than one that is not offered, so the four with
        //  no demonstrated pattern behind them stay declared rather than stubbed.
        expect(OUTCOME_SPECS).toHaveLength(2);
        expect(DECLARED_OUTCOMES).toHaveLength(4);
        const shipped = OUTCOME_SPECS.map((s) => s.outcome);
        for (const d of DECLARED_OUTCOMES) expect(shipped).not.toContain(d);
    });
});

describe('THE SITE IS A DECISION — the refusals', () => {
    it('open ground far from everything is viable', () => {
        expect(siteIsViable(createInitialState(0), FAR.x, FAR.y)).toBe(true);
    });

    it('ground too close to a standing shelter is REFUSED', () => {
        const s = createInitialState(0);
        s.shelter = { ...s.shelter, built: true, x: 10, y: 10 };
        expect(siteIsViable(s, 10, 10)).toBe(false);
        expect(siteIsViable(s, 10 + TUNE.constructionMinSpacingM - 0.1, 10)).toBe(false);
        expect(siteIsViable(s, 10 + TUNE.constructionMinSpacingM + 0.1, 10)).toBe(true);
    });

    it('...and to a store, and to a fire — everything standing claims its ground', () => {
        const s = createInitialState(0);
        s.storage = { ...s.storage, built: true, x: 30, y: 30 };
        expect(siteIsViable(s, 30.5, 30)).toBe(false);
        const f = createInitialState(0);
        f.fire = { ...f.fire, built: true, x: 50, y: 50 };
        expect(siteIsViable(f, 50.5, 50)).toBe(false);
    });

    it('a site refusal reads as a site refusal, and says which way to move', () => {
        const s = stocked(demonstrated(createInitialState(0), 'shelter'));
        s.storage = { ...s.storage, built: true, x: 0, y: 0 };
        const r = readSite(s, OUTCOME_SPECS[0], 0.5, 0);
        expect(r.blocked).toBe('bad-site');
        expect(r.buildable).toBe(false);
        expect(r.reason).toContain('Step away');
    });
});

describe('the reasons come in §9.6\'s own order — the FIRST thing in your way', () => {
    it('no pattern outranks no matter — you cannot be short for a thing you have never made', () => {
        const s = createInitialState(0);              // no blueprint, no materials
        const r = readSite(s, OUTCOME_SPECS[0], FAR.x, FAR.y);
        expect(r.blocked).toBe('no-pattern');
        expect(r.reason).toContain('no pattern');
    });

    it('no matter outranks a bad site — get the wood before worrying about the ground', () => {
        const s = demonstrated(createInitialState(0), 'shelter');
        s.storage = { ...s.storage, built: true, x: 0, y: 0 };   // the site would also refuse
        const r = readSite(s, OUTCOME_SPECS[0], 0.5, 0);
        expect(r.blocked).toBe('no-matter');
    });

    it('already-built outranks everything — nothing else matters if it is standing', () => {
        const s = createInitialState(0);
        s.shelter = { ...s.shelter, built: true, x: 999, y: 999 };
        const r = readSite(s, OUTCOME_SPECS[0], FAR.x, FAR.y);
        expect(r.blocked).toBe('already-built');
    });

    it('a shortfall NAMES the amount and the material, so you can go and get it', () => {
        const s = demonstrated(createInitialState(0), 'shelter');
        s.inventory.wood = 0; s.inventory.stone = 0; s.inventory.fiber = 0;
        const r = readSite(s, OUTCOME_SPECS[0], FAR.x, FAR.y);
        expect(r.blocked).toBe('no-matter');
        expect(r.missing.wood).toBe(TUNE.shelterWoodCost);
        expect(r.reason).toContain('more wood');
        expect(r.reason).not.toContain('requirements');
    });
});

describe('a demonstrated pattern is the gate, and nothing else opens it', () => {
    it('hasPatternFor reads the LADDER, not the inventory', () => {
        const bare = stocked(createInitialState(0));
        expect(hasPatternFor(bare, OUTCOME_SPECS[0]), 'materials are not knowledge').toBe(false);
        expect(hasPatternFor(demonstrated(bare, 'shelter'), OUTCOME_SPECS[0])).toBe(true);
    });

    it('an outcome with no pattern is NOT offered at all', () => {
        const s = stocked(createInitialState(0));
        expect(availableOutcomes(s, FAR.x, FAR.y)).toEqual([]);
        expect(siteHasAnything(s, FAR.x, FAR.y)).toBe(false);
    });

    it('a blocked-but-KNOWN outcome is offered greyed, carrying its reason', () => {
        //  Same rule as the radial circle's blocked segments (Slice 2): shown, not hidden,
        //  carrying the one true reason. Hiding a thing you nearly have teaches nothing.
        const s = demonstrated(createInitialState(0), 'shelter', 'storage');
        s.inventory.wood = 0; s.inventory.stone = 0; s.inventory.fiber = 0;
        const offered = availableOutcomes(s, FAR.x, FAR.y);
        expect(offered).toHaveLength(2);
        for (const o of offered) {
            expect(o.buildable).toBe(false);
            expect(o.reason).toBeTruthy();
        }
        expect(siteHasAnything(s, FAR.x, FAR.y)).toBe(true);
    });

    it('with pattern, matter and clear ground, it is buildable and says nothing is wrong', () => {
        const s = stocked(demonstrated(createInitialState(0), 'shelter'));
        const r = readSite(s, OUTCOME_SPECS[0], FAR.x, FAR.y);
        expect(r.buildable).toBe(true);
        expect(r.blocked).toBeNull();
        expect(r.reason).toBeNull();
    });

    it('EVERY shipped outcome is reachable — the reachability law, per outcome', () => {
        //  D-090's law applied per placement path: a target that cannot be arrived at through
        //  the real acquisition path is a target that does not exist. Each outcome is driven
        //  from nothing to buildable using only a demonstrated pattern and staged matter.
        for (const spec of OUTCOME_SPECS) {
            const s = stocked(demonstrated(createInitialState(0), spec.recipeId));
            const r = readSite(s, spec, FAR.x, FAR.y);
            expect(r.buildable, `${spec.outcome} is unreachable`).toBe(true);
        }
    });
});
