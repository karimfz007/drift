import { describe, expect, it } from 'vitest';
import { MATERIAL_PROFILE, materialSatisfies } from '../src/brain/materials';
import { allRecipes, recordCombinationAttempts } from '../src/brain/recipes';
import { createInitialState } from '../src/brain/state';
import type { MaterialKind } from '../src/brain/types';

const ALL_MATERIAL_KINDS: MaterialKind[] = ['wood', 'stone', 'fiber', 'berries', 'coconut', 'shellfish', 'sharpblade'];

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

    it("today's recipe slots stay disjoint — each is satisfied by exactly one material kind", () => {
        for (const recipe of allRecipes()) {
            for (const slot of recipe.slots) {
                const satisfiers = ALL_MATERIAL_KINDS.filter((kind) => materialSatisfies(kind, slot.require));
                expect(satisfiers.length).toBe(1);
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

    it('every recipe this pass knows about is walked — axe, torch, shelter, storage, stone hammer, knap', () => {
        const ids = allRecipes().map((r) => r.id);
        expect(ids).toEqual(['torch', 'axe', 'spear', 'shelter', 'storage', 'stonehammer', 'knap']);
    });
});
