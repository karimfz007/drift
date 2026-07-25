/**
 * BRAIN — recipe slots and the null-outcome combination journal (Ch.1 v3, D-055).
 *
 * Every craftable is expressed as a small list of SLOTS (a role, like "handle" or
 * "blade"), each requiring a material family or tag rather than one hardcoded resource
 * name — "recipes may match on primary OR any tag." This pass's actual crafting math
 * (canCraftAxe et al. in state.ts) is UNCHANGED and still checks exact resource counts —
 * deliberately: today's slots are each satisfied by exactly one material kind (disjoint
 * tags, by design), so re-deriving cost-gating through the slot system would risk an
 * already-tested path for zero behavioural gain this pass. The slots exist here so the
 * MATCHING capability is real and exercised (not just declared), and so the null-outcome
 * journal below has real slot/material pairs to evaluate.
 */

import { TUNE } from '../data/tune';
import { materialSatisfies, type MaterialRequirement } from './materials';
import type { GameState, MaterialKind } from './types';

export interface RecipeSlot {
    id: string;
    require: MaterialRequirement;
    amount: number;
}

export interface Recipe {
    id: string;
    slots: RecipeSlot[];
}

/** Every recipe this pass knows about — one place, so the journal below (and any future
 *  caller) can walk them all without a call-site update per new recipe. */
export function allRecipes(): Recipe[] {
    return [
        {
            id: 'torch',
            slots: [
                { id: 'torch-handle', require: { tag: 'woodwork' }, amount: TUNE.torchWoodCost },
                { id: 'torch-binding', require: { tag: 'textile' }, amount: TUNE.torchFiberCost }
            ]
        },
        {
            id: 'axe',
            slots: [
                { id: 'axe-handle', require: { tag: 'woodwork' }, amount: TUNE.axeWoodCost },
                { id: 'axe-blade', require: { tag: 'blade' }, amount: TUNE.axeSharpbladeCost },
                { id: 'axe-binding', require: { tag: 'textile' }, amount: TUNE.axeFiberCost }
            ]
        },
        {
            id: 'shelter',
            slots: [
                { id: 'shelter-frame', require: { tag: 'woodwork' }, amount: TUNE.shelterWoodCost },
                { id: 'shelter-walls', require: { tag: 'masonry' }, amount: TUNE.shelterStoneCost },
                { id: 'shelter-binding', require: { tag: 'textile' }, amount: TUNE.shelterFiberCost }
            ]
        },
        {
            id: 'storage',
            slots: [
                { id: 'storage-frame', require: { tag: 'woodwork' }, amount: TUNE.storageWoodCost },
                { id: 'storage-walls', require: { tag: 'masonry' }, amount: TUNE.storageStoneCost }
            ]
        },
        {
            id: 'stonehammer',
            slots: [
                { id: 'stonehammer-handle', require: { tag: 'woodwork' }, amount: TUNE.stoneHammerWoodCost },
                { id: 'stonehammer-head', require: { tag: 'masonry' }, amount: TUNE.stoneHammerStoneCost }
            ]
        },
        {
            id: 'knap',
            slots: [{ id: 'knap-input', require: { tag: 'masonry' }, amount: TUNE.knapStoneCost }]
        }
    ];
}

const MATERIAL_KINDS: MaterialKind[] = ['wood', 'stone', 'fiber', 'berries', 'coconut', 'shellfish', 'sharpblade'];

function pairKey(slotId: string, kind: MaterialKind): string {
    return `${slotId}|${kind}`;
}

/**
 * Walk every recipe slot against every material kind the player currently holds
 * (`inventory[kind] > 0`). A pair already in the journal is skipped — "a repeat attempt
 * against a known-null pair short-circuits... instantly." A held kind that does NOT
 * satisfy a slot is a genuine null outcome: journaled, and a knowledge event fires (Ch.2's
 * stub hook — trying is itself knowledge). A held kind that DOES satisfy a slot is not an
 * "attempt" in the failed sense and is never journaled; matching is cheap and re-checked
 * plainly every time, same as any other gate in this game.
 */
export function recordCombinationAttempts(state: GameState): void {
    for (const recipe of allRecipes()) {
        for (const slot of recipe.slots) {
            for (const kind of MATERIAL_KINDS) {
                if (state.inventory[kind] <= 0) continue;
                const key = pairKey(slot.id, kind);
                if (state.knowledge.nullPairs.includes(key)) continue;
                if (materialSatisfies(kind, slot.require)) continue;
                state.knowledge.nullPairs.push(key);
                state.knowledge.events.push({
                    kind: 'combination-tried',
                    detail: `${kind} does not satisfy ${recipe.id}'s ${slot.id} requirement`,
                    gameHoursElapsed: state.gameHoursElapsed
                });
            }
        }
    }
}
