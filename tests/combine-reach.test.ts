/**
 * TRY-COMBINE'S ARITY, AND THE DEFECT UNDERNEATH IT (director's playtest, FIX 2).
 *
 * The question asked was whether the two-item cap was design or an artificial limit. Reading
 * it answered something worse: `relationshipFor` returned the FIRST recipe whose slots two
 * materials could fill, and wood+stone fits `shelter`, `storage` AND `stonehammer` — so it
 * always answered "shelter", and the other two were **unreachable by any sequence of
 * combinations whatsoever**. Four hundred rounds of every pair, maxed knowledge, full
 * materials: axe, shelter, torch. Nothing else, ever.
 *
 * Before Stage 2b that was a curiosity, because the catalogue handed those rows over anyway.
 * After the pivot it is a broken spine — no stone hammer means no knapped blade, which means
 * the axe blueprint mints and can never be built.
 *
 * So the first test here is REACHABILITY, and it is the one that matters: play a run, try
 * things, and every recipe with a discovery route must eventually be arrivable. It fails on
 * the pre-fix tree.
 */
import { describe, expect, it } from 'vitest';
import { EXPERIMENT_CHOICE, canExperimentWith, hasUnknownRival, makeChosen, recipesMatching, resolveRecipe, tryCombineWith } from '../src/brain/experiment';
import { DISCOVERY_ROUTES } from '../src/brain/discovery';
import { ALL_MATERIAL_KINDS } from '../src/brain/materials';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { GameState, MaterialKind } from '../src/brain/types';

function capable(): GameState {
    const s = createInitialState(0);
    for (const d of Object.keys(s.knowledge.domains)) {
        s.knowledge.domains[d as 'construction'] = { technique: 100, understanding: 100, adaptation: 100 };
    }
    return s;
}

/**
 * DERIVED, not tabulated — the correction the Maritime Slice forced.
 *
 * This stocked four material kinds by name and probed six hand-written sets. The raft's route
 * needs coconut, which the probe never held and never tried, so a test whose whole claim is
 * *"every recipe with a discovery route can be arrived at"* reported the raft unreachable
 * while the raft was fine. **The probe was the thing that was wrong**, and it would have been
 * wrong silently for any future route too.
 *
 * Stocking every kind and probing every route's own `makings` means a new route cannot be
 * added without this test actually covering it — which is what the test always claimed.
 */
function restock(s: GameState): void {
    for (const k of ALL_MATERIAL_KINDS) s.inventory[k] = 50;
    s.energy = 100; s.hunger = 100; s.thirst = 100;
}

const SETS: MaterialKind[][] = [
    //  The original six, kept verbatim: they encode the specific ties this file exists to
    //  pin down (storage vs stonehammer, spear vs axe) and deriving them away would lose that.
    ['wood', 'stone'], ['wood', 'fiber'], ['wood', 'sharpblade'], ['stone', 'fiber'],
    ['wood', 'stone', 'fiber'], ['wood', 'sharpblade', 'fiber'],
    //  ...plus whatever every route actually asks for.
    ...DISCOVERY_ROUTES.map((r) => r.makings),
];

/**
 * P0-C — "A RUN THAT KEEPS TRYING" NOW HAS TO ANSWER A QUESTION, and this helper is what makes
 * that explicit rather than hidden.
 *
 * The director's ruling is that staged materials matching a plan the survivor HOLDS must name
 * the attempt and wait — at one match, not just at two. So a bare `tryCombineWith` loop stalls
 * the moment the first plan is earned: every later pass returns `choose` and commits nothing.
 * THIS TEST IS WHAT CAUGHT THAT, going red on `fishingline` — a recipe walled off behind a plan
 * the survivor already had — and it is why `EXPERIMENT_CHOICE` exists at all.
 *
 * A survivor who wants to invent declines the named thing and tries something else, so that is
 * exactly what the probe does: take the question, and answer it the way someone still
 * experimenting would. Nothing here reaches past the brain's own front door.
 */
function keepTrying(s: GameState, set: MaterialKind[]): void {
    const first = tryCombineWith(s, set);
    if (first.outcome !== 'choose') return;
    //  Decline the known plan and experiment — the ordinary discovery path, unchanged.
    if (hasUnknownRival(s, set)) makeChosen(s, set, EXPERIMENT_CHOICE);
}

describe('REACHABILITY — everything with a discovery route can actually be arrived at', () => {
    it('a run that keeps trying reaches EVERY routed recipe, stone hammer included', () => {
        const s = capable();
        for (let i = 0; i < 400; i++) {
            restock(s);
            for (const set of SETS) keepTrying(s, set);
        }
        const reached = new Set(s.blueprints.map((b) => b.recipeId));
        for (const route of DISCOVERY_ROUTES) {
            expect(reached.has(route.recipeId), `${route.recipeId} is unreachable`).toBe(true);
        }
    });

    it('and the spine specifically: the hammer is arrivable, so the blade is, so the axe is', () => {
        const s = capable();
        for (let i = 0; i < 400; i++) {
            restock(s);
            for (const set of SETS) keepTrying(s, set);
        }
        const reached = new Set(s.blueprints.map((b) => b.recipeId));
        expect(reached.has('stonehammer'), 'no hammer means no blade means no axe').toBe(true);
        expect(reached.has('axe')).toBe(true);
    });
});

describe('how a tie is broken, and why in that order', () => {
    it('an EXACT cover beats a partial one — fibre in the pile means the shelter', () => {
        //  wood+stone+fiber fills all three of the shelter's slots and only part of nothing
        //  else, so there is nothing to be ambiguous about.
        expect(resolveRecipe(capable(), ['wood', 'stone', 'fiber'])?.id).toBe('shelter');
    });

    it('SOMETHING NEW beats something already known', () => {
        //  storage and stonehammer are both exactly woodwork+masonry — genuinely
        //  indistinguishable by materials at ANY arity, which is why arity alone was never
        //  the fix. A survivor who already has the store's plan and puts wood and stone
        //  together again is trying the other thing.
        const s = capable();
        s.blueprints = [{
            id: 'bp-storage', name: 'Store', recipeId: 'storage', inputs: ['wood'],
            version: 1, workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 1,
        }];
        expect(resolveRecipe(s, ['wood', 'stone'])?.id).toBe('stonehammer');
    });

    it('then the NEED decides — the discovery routes doing real work, not decorating a hint', () => {
        const s = capable();
        //  A hammer already owned kills that suspicion; arms full keeps the store's alive.
        s.tools.stoneHammer = true;
        s.storage.built = false;
        s.inventory.wood = 5; s.inventory.stone = 5; s.inventory.fiber = 5;
        expect(resolveRecipe(s, ['wood', 'stone'])?.id).toBe('storage');
    });

    it('a tie with nothing left to separate it ROTATES, rather than picking a permanent winner', () => {
        const s = capable();
        const seen = new Set<string>();
        for (let i = 0; i < 8; i++) {
            s.experimentCount = i;
            const r = resolveRecipe(s, ['wood', 'stone']);
            if (r) seen.add(r.id);
        }
        expect(seen.size, 'a permanent winner is what made the other one unreachable')
            .toBeGreaterThan(1);
    });

    it('...and rotation is DETERMINISTIC — same counter, same answer', () => {
        const a = capable(); a.experimentCount = 3;
        const b = capable(); b.experimentCount = 3;
        expect(resolveRecipe(a, ['wood', 'stone'])?.id).toBe(resolveRecipe(b, ['wood', 'stone'])?.id);
    });
});

describe('matching: each material fills a DISTINCT slot', () => {
    it('two sticks are not a handle and a binding', () => {
        //  Duplicates are refused at the gate, but the matcher must be right on its own too:
        //  a greedy assignment gets this wrong whenever a material fits more than one slot,
        //  and wood fits the frame AND the handle of several recipes.
        expect(recipesMatching(['wood', 'wood']).map((r) => r.id)).toEqual([]);
    });

    it('more materials than slots matches nothing', () => {
        expect(recipesMatching(['wood', 'stone', 'fiber', 'sharpblade']).map((r) => r.id))
            .not.toContain('storage');
    });

    it('wood+stone really is ambiguous across three recipes — the root of the defect', () => {
        const ids = recipesMatching(['wood', 'stone']).map((r) => r.id).sort();
        expect(ids).toContain('storage');
        expect(ids).toContain('stonehammer');
        expect(ids).toContain('shelter');
    });
});

describe('the gate, at two to four', () => {
    const stocked = () => { const s = capable(); restock(s); return s; };

    it('accepts two, three and four', () => {
        for (const n of [2, 3, 4]) {
            const set = (['wood', 'stone', 'fiber', 'sharpblade'] as MaterialKind[]).slice(0, n);
            expect(canExperimentWith(stocked(), set), `${n}`).toBeNull();
        }
    });

    it('refuses one, and says so plainly', () => {
        expect(canExperimentWith(stocked(), ['wood'])).toBeTruthy();
    });

    it('refuses more than the spec\'s ceiling', () => {
        const tooMany = (['wood', 'stone', 'fiber', 'sharpblade', 'berries'] as MaterialKind[]);
        const why = canExperimentWith(stocked(), tooMany);
        expect(why).toBeTruthy();
        expect(why).toContain(String(TUNE.combineMaxInputs));
    });

    it('refuses duplicates, and refuses what is not in hand', () => {
        expect(canExperimentWith(stocked(), ['wood', 'wood'])).toBeTruthy();
        const s = capable();
        s.inventory.wood = 5; s.inventory.stone = 0; s.energy = 100;
        expect(canExperimentWith(s, ['wood', 'stone'])).toBeTruthy();
    });

    it('the two-argument form still works — one execution path, no second behaviour', () => {
        const s = stocked();
        const r = tryCombineWith(s, ['wood', 'fiber']);
        expect(r.ok).toBe(true);
    });
});
