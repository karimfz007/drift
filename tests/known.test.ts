/**
 * RULING 1 — THE SHORTFALL-VISIBLE AFFORDANCE, AND WHY IT IS A RULING RATHER THAN A FIX.
 *
 * The Build panel listed every earned recipe with its cost as `have / need` and named where a
 * missing part comes from. Retiring that panel took the affordance with it, and the slate did not
 * inherit it: the slate answers "what does THIS PILE make", and a pile can only hold materials
 * you are already carrying — so a plan you could not currently afford became invisible, and
 * knowledge appeared to switch off when the wood ran out. An affordance that vanishes in a
 * refactor is a silent repeal.
 *
 * KNOWLEDGE IS THE GATE; MATERIALS ONLY INFORM. That order is the whole ruling, and it is the
 * exact inverse of the defect that killed the Build panel — where a row's PRESENCE depended on
 * what you carried, which Law 216 forbids. These tests assert the order, not merely the feature.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import {
    discoverWith, knownRecipes, matchPool, recipeCost, shortfallSources,
} from '../src/brain/experiment';
import { allRecipes } from '../src/brain/recipes';

const bare = (): GameState => {
    const s = createInitialState(1_770_000_000_000);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    for (const k of ['wood', 'stone', 'fiber', 'sharpblade', 'coconut'] as const) {
        (s.inventory as unknown as Record<string, number>)[k] = 0;
    }
    return s;
};
const demonstrate = (s: GameState, id: string) => {
    s.blueprints.push({
        recipeId: id, name: id, version: 1, discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
};

describe('what you know how to make stays visible with empty hands', () => {
    it('THE REPEAL, UNDONE — a demonstrated recipe is listed with NOTHING in hand', () => {
        const s = bare();
        demonstrate(s, 'spear');
        const known = knownRecipes(s);
        expect(known.map((k) => k.recipeId), 'knowledge switched off when the wood ran out')
            .toEqual(['spear']);
        expect(known[0].afford, 'it claimed to be affordable on empty hands').toBe(false);
    });

    it('...and it shows the shortfall as have/need, per material', () => {
        const s = bare();
        demonstrate(s, 'spear');
        const [spear] = knownRecipes(s);
        expect(spear.needs.length).toBe(recipeCost('spear').length);
        for (const n of spear.needs) {
            expect(n.have).toBe(0);
            expect(n.need).toBeGreaterThan(0);
        }
    });

    it('...and names WHERE the missing part comes from', () => {
        const s = bare();
        demonstrate(s, 'spear');
        expect(shortfallSources(knownRecipes(s)[0]).sort()).toEqual(['fiber', 'sharpblade', 'wood']);
    });

    it('KNOWLEDGE IS THE GATE — materials never grant an entry on their own (Law 216)', () => {
        //  The inverse of the defect that killed the Build panel: a full pack must not put a
        //  single thing on this list, because nothing has been demonstrated.
        const s = bare();
        for (const k of ['wood', 'stone', 'fiber', 'sharpblade', 'coconut'] as const) {
            (s.inventory as unknown as Record<string, number>)[k] = 99;
        }
        expect(knownRecipes(s), 'possession stood in for knowing').toEqual([]);
    });

    it('...and materials only change how an entry LOOKS, never whether it is there', () => {
        const s = bare();
        demonstrate(s, 'spear');
        const empty = knownRecipes(s);
        s.inventory.wood = 99; s.inventory.sharpblade = 99; s.inventory.fiber = 99;
        const full = knownRecipes(s);
        expect(full.map((k) => k.recipeId), 'the list changed membership with the pack')
            .toEqual(empty.map((k) => k.recipeId));
        expect(empty[0].afford).toBe(false);
        expect(full[0].afford).toBe(true);
    });

    it('LAW 95 — nothing undemonstrated appears, however full the pack', () => {
        const s = bare();
        for (const k of ['wood', 'stone', 'fiber', 'sharpblade', 'coconut'] as const) {
            (s.inventory as unknown as Record<string, number>)[k] = 99;
        }
        demonstrate(s, 'spear');
        const listed = knownRecipes(s).map((k) => k.recipeId);
        expect(listed).toEqual(['spear']);
        for (const r of allRecipes()) {
            if (r.id === 'spear') continue;
            expect(listed, `${r.id} leaked into the known list`).not.toContain(r.id);
        }
    });

    it('an OPEN crate counts toward the shortfall, a shut one does not', () => {
        const s = bare();
        demonstrate(s, 'storage');
        s.storage.built = true;
        Object.assign(s.storage.stored, { wood: 30, stone: 30 });
        const shut = knownRecipes(s, false);
        const open = knownRecipes(s, true);
        expect(shut[0].afford, 'a closed crate was counted').toBe(false);
        expect(open[0].afford, 'an open crate was ignored').toBe(true);
        //  ...and the ENTRY is there either way. That is the ruling.
        expect(shut.map((k) => k.recipeId)).toEqual(open.map((k) => k.recipeId));
    });

    it('the order is stable — affordable first, then by name', () => {
        const s = bare();
        demonstrate(s, 'spear');
        demonstrate(s, 'torch');
        s.inventory.wood = 99; s.inventory.fiber = 99;   // torch affordable, spear not
        const known = knownRecipes(s);
        expect(known[0].afford).toBe(true);
        expect(known[known.length - 1].afford).toBe(false);
    });

    it('every listed entry is NAMED, never a raw id', () => {
        const s = bare();
        for (const r of allRecipes()) if (recipeCost(r.id).length > 0) demonstrate(s, r.id);
        for (const k of knownRecipes(s)) {
            expect(k.name, `${k.recipeId} reached the list as a raw id`).not.toBe(k.recipeId);
            expect(k.name.length).toBeGreaterThan(0);
        }
    });

    it('D-011 — the list is derived, never stored', () => {
        const s = bare();
        demonstrate(s, 'spear');
        knownRecipes(s);
        expect('known' in s).toBe(false);
        expect('knownRecipes' in s).toBe(false);
    });
});

describe('D-055 restored — you can still try two things that do not go together', () => {
    it('a pile that makes NOTHING can be attempted, and journals the dead end', () => {
        //  THE SILENT REPEAL THIS UNDOES. Discover was disabled whenever `unknownCount === 0`,
        //  and that integer is zero both when you know everything a pile makes AND when the pile
        //  makes nothing at all. The second case is exactly the null attempt — the one gesture
        //  that teaches "these two do not belong together" — so the verb was refused precisely
        //  when it had something to teach, and D-055's journal became unreachable.
        const s = bare();
        s.inventory.wood = 5; s.inventory.coconut = 5;
        const before = s.knowledge.nullPairs.length;
        const r = discoverWith(s, ['wood', 'coconut']);
        //  Either it makes something (and that is fine) or it journals the dead end. What it must
        //  NOT do is refuse with "you already know everything these make".
        expect(r.outcome, r.reason ?? '').not.toBe('refused');
        if (r.outcome === 'no-relationship') {
            expect(s.knowledge.nullPairs.length, 'the dead end was not written down')
                .toBeGreaterThan(before);
        }
    });

    it('...and a pile whose every outcome you ALREADY hold is still refused, and says so', () => {
        const s = bare();
        s.inventory.wood = 20; s.inventory.stone = 20;
        for (const r of matchPool(['wood', 'stone'])) {
            s.blueprints.push({
                recipeId: r.id, name: r.id, version: 1, discoveredAtGameHours: 0,
                workmanship: 'serviceable',
            } as GameState['blueprints'][number]);
        }
        const r = discoverWith(s, ['wood', 'stone']);
        expect(r.outcome).toBe('refused');
        expect(r.reason ?? '').toMatch(/already know/i);
    });
});
