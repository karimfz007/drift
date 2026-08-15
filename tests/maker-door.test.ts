import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/brain/state';
import {} from '../src/brain/experiment';
import { ladderFor } from '../src/brain/ladder';
import { makerOffers, revealedInPanel } from '../src/brain/reveal';
import type { GameState } from '../src/brain/types';
//  STAGE-THEN-CONFIRM. Since the never-auto-commit ruling, `tryCombineWith` returns a
//  QUESTION and spends nothing; the attempt happens when the survivor answers it. These tests
//  exercise attempts, so they answer it — see tests/helpers/confirmed.ts.
import { attemptConfirmed } from './helpers/confirmed';

/** The save a real player actually has: everything the old gate enumerated, already done. */
function fullyEquipped(): GameState {
    const s = createInitialState(0);
    s.tools.axe = true;
    s.tools.stoneHammer = true;
    s.torch.owned = true;
    s.shelter.built = true;
    s.storage.built = true;
    return s;
}

describe('THE MAKER DOOR — D-053 for the third time, and the last', () => {
    /**
     * THE DIRECTOR'S REPORT, REPRODUCED. `9211f5a` fixed the spear's zero-callers defect and
     * the director tested after it and still found nothing. This is why: the body decided the
     * door with a hardcoded list of five product flags, and every one of them is true on a
     * long-running save. The row was revealed, the handler was bound, and the button that
     * opens the room they live in was not drawn.
     *
     * The claim is deliberately about a state nobody had tested — D-053 said in its own words
     * that every harness scenario opens the panel EARLY, before the older items are built.
     */
    it('a fully-equipped survivor still has a route to the maker', () => {
        const s = fullyEquipped();
        expect(makerOffers(s).length, 'the door closed on a survivor who owns everything').toBeGreaterThan(0);
    });

    /**
     * REST IS A REAL OFFER, not a fudge that forces the predicate true.
     *
     * The maker panel is the ONLY entry point to sleeping rough: the circle's `sleep` verb
     * refuses unless you are standing at a shelter. So a survivor with nothing left to make
     * and no shelter to stand at still has something in that room, and closing the door on
     * them would take sleep away entirely.
     */
    it('rest is offered even when there is nothing left to make', () => {
        const s = fullyEquipped();
        s.tools.spear = true;
        s.tools.backpack = true;
        expect(makerOffers(s)).toContain('rest');
    });

    /**
     * THE DIRECTOR'S EXACT CASE, end to end at the brain layer: combine a knapped blade with
     * a wood-type item, and the spear must travel all four links — resolve, mint, climb the
     * ladder, and reach the door as a live offer. The device leg proves the fifth: that it is
     * drawn on a real screen.
     */
    it('knapped blade + wood resolves, mints, reveals, AND reaches the door', () => {
        const s = fullyEquipped();
        s.inventory.wood = 10;
        s.inventory.sharpblade = 3;
        s.inventory.fiber = 10;

        expect(ladderFor(s, 'spear')).toBe('physically-possible');
        expect(makerOffers(s)).not.toContain('spear');

        const res = attemptConfirmed(s, ['wood', 'sharpblade']);

        expect(res.recipeId, 'the combine did not resolve to the spear').toBe('spear');
        expect(s.blueprints.map((b) => b.recipeId), 'no blueprint minted').toContain('spear');
        expect(ladderFor(s, 'spear')).toBe('demonstrated');
        expect(revealedInPanel(s, 'spear')).toBe(true);
        expect(makerOffers(s), 'revealed, and still not offered at the door').toContain('spear');
    });

    /** Made is made: the offer retires once the object exists, or the door never stops nagging. */
    it('the spear stops being an offer once it is owned', () => {
        const s = fullyEquipped();
        s.inventory.wood = 10; s.inventory.sharpblade = 3; s.inventory.fiber = 10;
        attemptConfirmed(s, ['wood', 'sharpblade']);
        expect(makerOffers(s)).toContain('spear');
        s.tools.spear = true;
        expect(makerOffers(s)).not.toContain('spear');
    });

    /**
     * THE GATE MAY NOT GO BACK TO BEING A LIST.
     *
     * D-053 fixed this defect by appending a clause, which is why it recurred twice. This
     * asserts the shape rather than the symptom: the maker's visibility must not be decided
     * by reading product flags in the body. Without it the next craftable re-opens the same
     * hole and no unit test would notice, because the failure is a button that is not drawn.
     */
    it('the body does not decide the door from product flags', async () => {
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/body/game.ts', 'utf8');

        //  ANCHORED ON TEXT THAT EXISTS IN BOTH VERSIONS, and the window is proven non-empty
        //  before anything is asserted about it. My first cut anchored on the FIX's own
        //  wording, so against the pre-fix source `indexOf` returned -1, the slice came back
        //  empty, and the "no product flags" assertion passed on an empty string — a check
        //  that can only pass, which is the Vacuity Law's clause (b) written by hand.
        const from = src.indexOf('FIX (real-device report)');
        const to = src.indexOf('this.hud.update({', from);
        expect(from, 'lost the anchor — this test can no longer see the gate').toBeGreaterThan(-1);
        expect(to).toBeGreaterThan(from);
        const gate = src.slice(from, to);
        expect(gate.length).toBeGreaterThan(200);

        expect(gate, 'the maker gate went back to enumerating products').not.toMatch(
            /if\s*\(!state\.(tools|torch|shelter|storage)\b/
        );
        expect(gate).toContain('makerOffers(state)');
    });
});
