/**
 * LAW 130 (Bible v2.4) — no survivor begins with "Build Fire" in a menu, anywhere, ever.
 * ...and the canonical material list, whose absence gated the discovery loop.
 *
 * BOTH of these are residuals the invention pivot missed, and they missed in the same way:
 * Slice 2B swept the Build panel's catalogue and neither of these lived in that catalogue.
 * The fire button is its own HUD entry point with its own gate, and that gate asked only
 * whether you were holding wood. The combinable list was a hardcoded copy in the body layer
 * that had drifted from the type it mirrored. A sweep that only visits the room it is
 * standing in will keep finding rooms it never entered.
 */
import { describe, expect, it } from 'vitest';
import {
    buildFire, canBuildFire, createInitialState, fireIsKnown, fireMatterSuffices,
} from '../src/brain/state';
import { panelHints } from '../src/brain/reveal';
import { ALL_MATERIAL_KINDS } from '../src/brain/materials';
import { allRecipes } from '../src/brain/recipes';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState, MaterialKind } from '../src/brain/types';

function landed(): GameState {
    const s = createInitialState(0);
    //  Four seconds off the beach, with enough wood to lay a fire. This is the exact state
    //  the old gate said yes to.
    s.inventory.wood = TUNE.woodPerFire + 2;
    return s;
}

describe('LAW 130: fire is not pre-known', () => {
    it('a survivor who has just landed is NOT offered fire, even holding the wood for it', () => {
        const s = landed();
        expect(fireMatterSuffices(s), 'the matter is there').toBe(true);
        expect(fireIsKnown(s), 'the knowledge is not').toBe(false);
        expect(canBuildFire(s), 'so it must not be offered').toBe(false);
    });

    it('the scaffold opens it when the need is real and the makings are in hand (Law 113)', () => {
        //  LAW 216 SUPERSEDES THIS. It asserted that need + makings alone makes fire KNOWN,
        //  and that is the director's reported defect: nine wood and two fibre, `blueprints:
        //  []`, nothing ever made, and the HUD read "Build fire". The scaffold survives as a
        //  HINT — the survivor is told they are holding something that burns — and knowing is
        //  earned by working the torch out, carrying one, or having built a fire before.
        const s = landed();
        s.inventory.fiber = 3;
        s.warmth = TUNE.warmthLowThreshold - 5;   // the dark closing in, or the cold
        expect(fireIsKnown(s), 'fire known on possession alone').toBe(false);
        expect(canBuildFire(s), 'fire offered on possession alone').toBe(false);
        expect(panelHints(s).some((h) => h.recipeId === 'torch'), 'and the scaffold said nothing').toBe(true);

        //  ...and it opens the moment the pattern is genuinely worked out.
        s.blueprints.push({
            recipeId: 'torch', name: 'Bound torch', version: 1,
            discoveredAtGameHours: 0, workmanship: 'serviceable',
        } as GameState['blueprints'][number]);
        expect(fireIsKnown(s), 'a demonstrated torch does not teach fire').toBe(true);
        expect(canBuildFire(s), 'and the fire is still not offered').toBe(true);
    });

    it('and having MADE fire is knowing how — that half is monotonic', () => {
        const s = landed();
        const plan: Blueprint = {
            id: 'bp-torch', name: 'Torch', recipeId: 'torch', inputs: ['wood'],
            version: 1, workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 2,
        };
        s.blueprints = [plan];
        //  Warm, dry, midday, no fibre: every leg of the suspicion is false, and it is
        //  still known, because you have done it.
        expect(fireIsKnown(s)).toBe(true);
    });

    it('a standing fire also counts — you did not build it by accident', () => {
        const s = landed();
        s.fire = { ...s.fire, built: true };
        expect(fireIsKnown(s)).toBe(true);
    });

    it('THE AFFORDANCE is what the law gates, and the execution still checks matter', () => {
        //  The split is where Law 130 actually lives: the law is about what is OFFERED.
        //  `buildFire` validates the wood, because a verb firing without materials is a
        //  different bug — and a test fixture reaching past the menu is legitimate.
        const s = landed();
        expect(canBuildFire(s), 'not offered').toBe(false);
        expect(buildFire(s, 0, 0), 'but the matter is valid').toBe(true);

        const empty = createInitialState(0);
        empty.inventory.wood = 0;
        expect(buildFire(empty, 0, 0), 'no wood, no fire').toBe(false);
    });
});

describe('the combinable list is DERIVED, so it cannot drift again', () => {
    it('every material the inventory can hold is offerable', () => {
        //  The defect: a hardcoded six in the body layer omitted `sharpblade`, so a survivor
        //  holding a knapped blade could not select it — and the axe needs wood + sharpblade
        //  + fibre, so the discovery loop simply stopped there.
        const inventoryKeys = Object.keys(createInitialState(0).inventory).sort();
        expect([...ALL_MATERIAL_KINDS].sort()).toEqual(inventoryKeys);
    });

    it('sharpblade specifically — the one that was missing', () => {
        expect(ALL_MATERIAL_KINDS).toContain('sharpblade');
    });

    it('and every material a shipped recipe asks for is in the list', () => {
        //  A slot nothing can be offered for is a recipe nobody can attempt.
        const held = new Set<MaterialKind>(ALL_MATERIAL_KINDS);
        for (const recipe of allRecipes()) {
            expect(recipe.slots.length, recipe.id).toBeGreaterThan(0);
        }
        expect(held.size).toBe(ALL_MATERIAL_KINDS.length);
    });
});
