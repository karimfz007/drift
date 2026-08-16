/**
 * WHAT YOU HAVE EARNED STAYS ON THE LIST.
 *
 * The ruling: once a recipe is genuinely DEMONSTRATED it is a permanent row, whatever is in the
 * survivor's hands. Running out of stone is a shortfall to be shown, not a reason to un-know a
 * thing. `revealedInPanel` reads the ladder and the ladder reads blueprints, so this is already
 * true by construction — and that is exactly the kind of "true by construction" that stops being
 * true the first time someone adds an inventory term to a gate. These tests are the tripwire.
 *
 * THE SCOPE BOUNDARY IS THE OTHER HALF and is asserted just as hard: a recipe nobody has
 * demonstrated stays absent no matter how full the pockets are. "List what is earned" must never
 * drift into "list the catalogue" — Law 95 is what the invention pivot is made of.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import { revealedInPanel } from '../src/brain/reveal';
import { allRecipes } from '../src/brain/recipes';
import { ladderFor } from '../src/brain/ladder';

const MATERIALS = ['wood', 'stone', 'fiber', 'sharpblade', 'coconut'] as const;

const fresh = (): GameState => {
    const s = createInitialState(1_770_000_000_000);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    return s;
};
const stock = (s: GameState, n: number) => {
    for (const m of MATERIALS) (s.inventory as unknown as Record<string, number>)[m] = n;
};
const demonstrate = (s: GameState, id: string) => {
    s.blueprints.push({
        recipeId: id, name: id, version: 1, discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
};

describe('the Build panel lists everything earned, regardless of what is held', () => {
    it('EVERY recipe: demonstrated once means listed forever, even at zero materials', () => {
        for (const r of allRecipes()) {
            const s = fresh();
            demonstrate(s, r.id);
            stock(s, 0);
            expect(ladderFor(s, r.id), `${r.id} lost its rung`).toBe('demonstrated');
            expect(revealedInPanel(s, r.id), `${r.id} vanished from the panel at zero materials`).toBe(true);
        }
    });

    it('...and the answer does not change with the size of the pile', () => {
        //  The tripwire proper. If an inventory term ever enters this gate, one of these
        //  quantities will disagree with the others and this fails loudly.
        for (const r of allRecipes()) {
            const seen = new Set<boolean>();
            for (const n of [0, 1, 2, 5, 99]) {
                const s = fresh();
                demonstrate(s, r.id);
                stock(s, n);
                seen.add(revealedInPanel(s, r.id));
            }
            expect([...seen], `${r.id} is gated on how much is held`).toEqual([true]);
        }
    });

    it('SCOPE — full pockets and nothing demonstrated reveals NOTHING (Law 95)', () => {
        const s = fresh();
        stock(s, 99);
        //  A bare state must not be suspecting anything either, or this asserts the wrong thing.
        s.knowledge.nullPairs = [];
        const leaked = allRecipes().map((r) => r.id).filter((id) => revealedInPanel(s, id));
        expect(leaked, 'the panel offered something nobody has worked out').toEqual([]);
    });

    it('SCOPE — a recipe merely SUSPECTED is still not a row', () => {
        //  `conceptually-suspected` is rung 3 and the panel gate is rung 4. A suspicion earns a
        //  prompt, never a product — the whole distinction the invention pivot rests on.
        const s = fresh();
        stock(s, 99);
        for (const r of allRecipes()) {
            if (ladderFor(s, r.id) === 'conceptually-suspected') {
                expect(revealedInPanel(s, r.id), `${r.id} was revealed on a suspicion`).toBe(false);
            }
        }
    });
});
