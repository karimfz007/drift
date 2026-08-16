/**
 * THE CRAFTING SLATE — what a pile could become, live, and what it must never say.
 *
 * The hard constraint is Law 95: an unknown outcome may communicate EXISTENCE and COUNT, never
 * IDENTITY. The design holds that by making `unknownCount` an integer — there is no field an
 * identity could travel in — so the tests below assert the guarantee at its source rather than
 * checking that some renderer happened to behave.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import {
    COMBINE_ALWAYS_SUCCEEDS, combineSlate, discoverWith, makeChosen, matchPool,
} from '../src/brain/experiment';

const fresh = (): GameState => {
    const s = createInitialState(1_770_000_000_000);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    return s;
};
const demonstrate = (s: GameState, id: string) => {
    s.blueprints.push({
        recipeId: id, name: id, version: 1, discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
};
const stocked = (): GameState => {
    const s = fresh();
    s.inventory.wood = 20; s.inventory.stone = 20; s.inventory.fiber = 20; s.inventory.sharpblade = 20;
    return s;
};

describe('the slate shows everything a pile makes, and names only what is earned', () => {
    it('nothing demonstrated — every outcome is an anonymous slot, and the COUNT is real', () => {
        const s = stocked();
        const slate = combineSlate(s, ['wood', 'stone']);
        expect(slate.known, 'named something nobody has made').toEqual([]);
        //  wood+stone genuinely makes two things; the survivor learns THAT, not which.
        expect(slate.unknownCount).toBe(matchPool(['wood', 'stone']).length);
        expect(slate.unknownCount).toBeGreaterThanOrEqual(2);
    });

    it('LAW 95 — the slate carries no field an unknown identity could travel in', () => {
        const s = stocked();
        const slate = combineSlate(s, ['wood', 'stone']);
        //  The guarantee is structural: `unknownCount` is a number, and `known` is empty here.
        expect(typeof slate.unknownCount).toBe('number');
        expect(Object.keys(slate).sort()).toEqual(['known', 'unknownCount']);
        //  Nothing anywhere in the serialised slate may mention either product.
        expect(JSON.stringify(slate)).not.toMatch(/storage|crate|hammer|stonehammer/i);
    });

    it('...and that holds for every pile in the game, not just the one that prompted it', () => {
        const s = stocked();
        s.inventory.coconut = 20;
        const PILES: string[][] = [
            ['wood', 'stone'], ['wood', 'fiber'], ['wood', 'sharpblade'],
            ['fiber', 'sharpblade'], ['wood', 'fiber', 'stone'], ['wood', 'fiber', 'coconut'],
        ];
        for (const pile of PILES) {
            const slate = combineSlate(s, pile as 'wood'[]);
            expect(slate.known, `${pile.join('+')} named an unearned product`).toEqual([]);
            expect(Object.keys(slate).sort()).toEqual(['known', 'unknownCount']);
        }
    });

    it('one demonstrated — it is NAMED and the rest stay anonymous', () => {
        const s = stocked();
        demonstrate(s, 'storage');
        const slate = combineSlate(s, ['wood', 'stone']);
        expect(slate.known.map((k) => k.recipeId)).toEqual(['storage']);
        expect(slate.known[0].name, 'a raw id reached the slate').not.toBe('storage');
        expect(slate.unknownCount, 'the rival stopped being counted').toBeGreaterThanOrEqual(1);
        expect(JSON.stringify(slate), 'the unknown rival was named').not.toMatch(/hammer/i);
    });

    it('everything demonstrated — no anonymous slots left', () => {
        const s = stocked();
        for (const r of matchPool(['wood', 'stone'])) demonstrate(s, r.id);
        const slate = combineSlate(s, ['wood', 'stone']);
        expect(slate.unknownCount).toBe(0);
        expect(slate.known.length).toBe(matchPool(['wood', 'stone']).length);
    });

    it('the slate is LIVE — a different pile is a different answer', () => {
        const s = stocked();
        demonstrate(s, 'storage');
        const a = combineSlate(s, ['wood', 'stone']);
        const b = combineSlate(s, ['wood', 'sharpblade']);
        expect(a.known.map((k) => k.recipeId)).toEqual(['storage']);
        expect(b.known, 'a stale slate followed the pile change').toEqual([]);
        expect(b.unknownCount).toBe(matchPool(['wood', 'sharpblade']).length);
    });
});

describe('two verbs, two intentions', () => {
    it('COMBINE commits to a known plan and succeeds', () => {
        const s = stocked();
        demonstrate(s, 'storage');
        const before = s.inventory.wood;
        const r = makeChosen(s, ['wood', 'stone'], 'storage');
        expect(r.outcome, r.reason ?? '').toBe('invented');
        expect(r.recipeId).toBe('storage');
        expect(s.inventory.wood, 'a success cost nothing').toBeLessThan(before);
    });

    it('COMBINE still refuses a plan this survivor has NOT demonstrated', () => {
        //  The slate never offers one, but the brain is the guard — a stale surface must not
        //  be able to mint anything.
        const s = stocked();
        const r = makeChosen(s, ['wood', 'stone'], 'storage');
        expect(r.outcome).toBe('refused');
        expect(s.blueprints).toEqual([]);
    });

    it('DISCOVER resolves an unknown without being told which', () => {
        const s = stocked();
        const r = discoverWith(s, ['wood', 'stone']);
        expect(r.outcome, r.reason ?? '').toBe('invented');
        expect(matchPool(['wood', 'stone']).map((x) => x.id)).toContain(r.recipeId);
        expect(s.blueprints.length).toBe(1);
    });

    it('DISCOVER refuses once there is nothing left to find', () => {
        const s = stocked();
        for (const r of matchPool(['wood', 'stone'])) demonstrate(s, r.id);
        const r = discoverWith(s, ['wood', 'stone']);
        expect(r.outcome).toBe('refused');
    });

    it('DISCOVER twice on the same pile finds the OTHER thing', () => {
        //  The undiscovered-first tie-break, reached through the new verb — this is what the
        //  grey slot is promising, so it is asserted rather than assumed.
        const s = stocked();
        const first = discoverWith(s, ['wood', 'stone']);
        const second = discoverWith(s, ['wood', 'stone']);
        expect(first.recipeId).not.toBe(second.recipeId);
        expect(s.blueprints.length).toBe(2);
        expect(combineSlate(s, ['wood', 'stone']).unknownCount).toBe(0);
    });

    it('TEMPORARY — both verbs succeed every time while the constant says so', () => {
        expect(COMBINE_ALWAYS_SUCCEEDS, 'this test is about the parked state').toBe(true);
        for (let i = 0; i < 40; i++) {
            const s = stocked();
            //  A survivor with no practice at all, which is where failure used to live.
            const r = discoverWith(s, ['wood', 'stone']);
            expect(r.outcome, `attempt ${i} came up ${r.outcome}`).toBe('invented');
        }
    });
});
