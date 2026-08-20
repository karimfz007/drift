import { describe, expect, it } from 'vitest';
import { ALL_MATERIAL_KINDS, MATERIAL_PROFILE, materialSatisfies } from '../src/brain/materials';
import { allRecipes, recordCombinationAttempts } from '../src/brain/recipes';
import { createInitialState } from '../src/brain/state';

//  `ALL_MATERIAL_KINDS` USED TO BE A LOCAL, HAND-WRITTEN LITERAL HERE — seven names,
//  copied once and never touched again. `materials.ts`'s own doc comment on the exported
//  version tells the exact story of why that shape rots: a hardcoded copy "did not derive
//  anything, it merely happened to match", and it took adding `meat` for the gap to show
//  there. This file had the SAME defect, just never caught: the local list was still
//  missing `shell`, `meat`, `fish`, `metal`, `wiring`, `glass`, `medicine` AND (this batch)
//  `stonehammer` — which silently narrowed "every material kind has a profile" to a
//  seven-item subset and made the disjoint-slots test below blind to `stonehammer`
//  entirely, reading `knap-hammer`'s `{tag:'tool'}` slot as satisfied by nothing. Importing
//  the real, `Object.keys(MATERIAL_PROFILE)`-derived list is what this file should always
//  have done; a second source of truth is the drift, not a convenience.

describe('materials — the family/tags schema (Ch.1 v3, D-055)', () => {
    it('every material kind has a profile', () => {
        for (const kind of ALL_MATERIAL_KINDS) {
            expect(MATERIAL_PROFILE[kind]).toBeTruthy();
            expect(['organic', 'mineral']).toContain(MATERIAL_PROFILE[kind].primary);
        }
    });

    it('matches on primary family', () => {
        expect(materialSatisfies('wood', { family: 'organic' })).toBe(true);
        expect(materialSatisfies('stone', { family: 'organic' })).toBe(false);
        expect(materialSatisfies('stone', { family: 'mineral' })).toBe(true);
    });

    it('matches on any tag', () => {
        expect(materialSatisfies('wood', { tag: 'woodwork' })).toBe(true);
        expect(materialSatisfies('wood', { tag: 'blade' })).toBe(false);
        expect(materialSatisfies('sharpblade', { tag: 'blade' })).toBe(true);
        expect(materialSatisfies('fiber', { tag: 'textile' })).toBe(true);
    });

    it('a requirement with neither family nor tag satisfies nothing', () => {
        expect(materialSatisfies('wood', {})).toBe(false);
    });

    it("today's recipe slots stay disjoint, except the one slot documented to want either of two", () => {
        //  `raft-float` is a NAMED exception, not a fresh hole in the rule. `materials.ts`'s
        //  own doc comment on `coconut`/`shell` says why out loud: a coconut husk floats and
        //  an emptied one still does, so `{tag:'buoyant'}` is deliberately satisfied by
        //  either — that is the whole reason `buoyant` exists as its own tag instead of
        //  reusing `food` (which would also, wrongly, pull in berries). This is what using
        //  the REAL `ALL_MATERIAL_KINDS` (see the import-site comment above) surfaces: the
        //  stale seven-item local list this file used to carry never even included `shell`,
        //  so this genuine two-material slot has been silently untested since `shell` shipped.
        const TWO_IS_CORRECT = new Set(['raft/raft-float']);
        for (const recipe of allRecipes()) {
            for (const slot of recipe.slots) {
                const satisfiers = ALL_MATERIAL_KINDS.filter((kind) => materialSatisfies(kind, slot.require));
                const expected = TWO_IS_CORRECT.has(`${recipe.id}/${slot.id}`) ? 2 : 1;
                expect(satisfiers.length, `${recipe.id}/${slot.id} (${JSON.stringify(slot.require)}) matched [${satisfiers.join(',')}]`).toBe(expected);
            }
        }
    });
});

describe('recipes — the null-outcome combination journal (Ch.1 v3, D-055)', () => {
    it('a held material that does NOT satisfy a slot is journaled as null, with a knowledge event', () => {
        const s = createInitialState(0);
        s.inventory.berries = 1; // organic, tag food — satisfies nothing craftable this pass
        recordCombinationAttempts(s);
        expect(s.knowledge.nullPairs).toContain('axe-blade|berries');
        expect(s.knowledge.events.length).toBeGreaterThan(0);
        expect(s.knowledge.events[0].kind).toBe('combination-tried');
        expect(s.knowledge.events[0].detail).toContain('berries');
    });

    it('a held material that DOES satisfy a slot is never journaled', () => {
        const s = createInitialState(0);
        s.inventory.wood = 5;
        recordCombinationAttempts(s);
        expect(s.knowledge.nullPairs).not.toContain('axe-handle|wood');
        expect(s.knowledge.nullPairs).not.toContain('torch-handle|wood');
    });

    it('a material with zero held count is never evaluated at all', () => {
        const s = createInitialState(0);
        // Nothing held — no pairs, no events.
        recordCombinationAttempts(s);
        expect(s.knowledge.nullPairs).toEqual([]);
        expect(s.knowledge.events).toEqual([]);
    });

    it('a repeat attempt against a known-null pair short-circuits — never journaled twice, no second event', () => {
        const s = createInitialState(0);
        s.inventory.berries = 1;
        recordCombinationAttempts(s);
        const afterFirst = s.knowledge.nullPairs.length;
        const eventsAfterFirst = s.knowledge.events.length;
        recordCombinationAttempts(s); // same held materials, run again
        expect(s.knowledge.nullPairs.length).toBe(afterFirst);
        expect(s.knowledge.events.length).toBe(eventsAfterFirst);
    });

    it('every recipe this pass knows about is walked — axe, torch, shelter, storage, stone hammer, the workspace ladder, raft, knap', () => {
        const ids = allRecipes().map((r) => r.id);
        expect(ids).toEqual(['torch', 'backpack', 'axe', 'spear', 'shelter', 'storage', 'stonehammer',
            //  SESSION 1 — the two rungs of §6.1's ladder that are built.
            'workmat', 'workbench',
            'raft', 'fishingline', 'net', 'knap']);
    });
});
