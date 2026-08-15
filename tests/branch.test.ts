/**
 * THE THREE-WAY BRANCH, ONE CASE AT A TIME.
 *
 * The previous rounds proved "does it ask" and never "does it ask CORRECTLY" — which is the gap
 * the director named. Each case asserts the MESSAGE, not just that a question happened, because
 * the whole defect is a branch collapsing into the wrong sentence.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import { heldMatches, matchPool, namingQuestionFor, tryCombineWith } from '../src/brain/experiment';

const fresh = (): GameState => {
    const s = createInitialState(1_770_000_000_000);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    return s;
};
const plan = (s: GameState, id: string) => {
    s.blueprints.push({
        recipeId: id, name: id, version: 1, discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
};

describe('the staging question takes the branch the pile deserves', () => {
    it('CASE 1 — exactly one KNOWN outcome names that outcome, not the generic line', () => {
        const s = fresh();
        s.inventory.wood = 14; s.inventory.sharpblade = 6;
        plan(s, 'spear');
        const msg = tryCombineWith(s, ['wood', 'sharpblade']).reason ?? '';
        expect(msg).toMatch(/trying to make/i);
        expect(msg).toMatch(/fire-hardened spear/i);
        expect(msg, 'the generic line reached a known-single-outcome pile').not.toMatch(/put them together/i);
    });

    it('CASE 2 — more than one KNOWN outcome lists every one of them', () => {
        const s = fresh();
        s.inventory.wood = 14; s.inventory.stone = 13;
        plan(s, 'storage'); plan(s, 'stonehammer');
        const offered = heldMatches(s, ['wood', 'stone']).map((r) => r.id);
        expect(offered).toContain('storage');
        expect(offered).toContain('stonehammer');
        const msg = tryCombineWith(s, ['wood', 'stone']).reason ?? '';
        expect(msg).toMatch(/which are you making/i);
        expect(msg, 'a multi-outcome pile fell to the generic line').not.toMatch(/put them together/i);
    });

    it('CASE 3 — zero known is the ONLY case that gets the generic line', () => {
        const s = fresh();
        s.inventory.wood = 14; s.inventory.sharpblade = 6;
        expect(heldMatches(s, ['wood', 'sharpblade'])).toEqual([]);
        const msg = tryCombineWith(s, ['wood', 'sharpblade']).reason ?? '';
        expect(msg).toMatch(/put them together/i);
        expect(msg, 'it named a product nobody has worked out').not.toMatch(/spear|axe|hammer|crate/i);
    });

    it("THE DIRECTOR'S PILE — 14 wood + 13 stone genuinely makes TWO things, and says so", () => {
        //  The half the generic branch used to leave out. He was told only "put them together",
        //  then handed one of two possible outcomes with no sign the other existed.
        const s = fresh();
        s.inventory.wood = 14; s.inventory.stone = 13;
        const pool = matchPool(['wood', 'stone']).map((r) => r.id);
        expect(pool).toContain('storage');
        expect(pool).toContain('stonehammer');
        expect(pool.length, 'this pile is supposed to be ambiguous').toBeGreaterThanOrEqual(2);

        const msg = tryCombineWith(s, ['wood', 'stone']).reason ?? '';
        expect(msg, 'the survivor was not told there was a choice').toMatch(/more than one thing here/i);
        //  ...and Law 95 still holds: neither product is named.
        expect(msg).not.toMatch(/storage|crate|hammer/i);
    });

    it('...and a pile with only ONE possible outcome does not claim there are several', () => {
        const s = fresh();
        s.inventory.wood = 14; s.inventory.sharpblade = 6;
        expect(matchPool(['wood', 'sharpblade']).map((r) => r.id)).toEqual(['spear']);
        expect(tryCombineWith(s, ['wood', 'sharpblade']).reason ?? '').not.toMatch(/more than one thing/i);
    });

    it('the three branches are mutually exclusive — no pile can take two of them', () => {
        const NAMED = /trying to make/i, LIST = /which are you making/i, GENERIC = /put them together/i;
        for (const msg of [
            namingQuestionFor([], 1), namingQuestionFor([], 2),
            namingQuestionFor(matchPool(['wood', 'sharpblade']), 1),
            namingQuestionFor(matchPool(['wood', 'stone']), 2),
        ]) {
            const hits = [NAMED, LIST, GENERIC].filter((r) => r.test(msg)).length;
            expect(hits, `"${msg}" matched ${hits} branches`).toBe(1);
        }
    });
});
