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
import { applyLearningEvent, nullOutcomeFactors } from './knowledge';
import { ALL_MATERIAL_KINDS, materialSatisfies, type MaterialRequirement } from './materials';
import type { GameState, KnowledgeDomain, MaterialKind } from './types';

export interface RecipeSlot {
    id: string;
    require: MaterialRequirement;
    amount: number;
}

export interface Recipe {
    id: string;
    /** Ch.2 (v7): which domain this recipe trains — both for a real craft (wired at each
     *  craft function's own call site in state.ts, via `recipeDomain` below) and for a
     *  null-outcome attempt against one of its slots (wired right here). */
    domain: KnowledgeDomain;
    slots: RecipeSlot[];
}

/** Every recipe this pass knows about — one place, so the journal below (and any future
 *  caller) can walk them all without a call-site update per new recipe. */
export function allRecipes(): Recipe[] {
    return [
        {
            id: 'torch',
            //  The torch is a warmth/fire item, not a harvesting tool — Survivalcraft,
            //  the same domain `buildFire`/`feedFire`/`lightTorch` train (Ch.2 item 4's
            //  "warmth/fire" bucket), not Harvesting & fabrication.
            domain: 'survivalcraft',
            slots: [
                { id: 'torch-handle', require: { tag: 'woodwork' }, amount: TUNE.torchWoodCost },
                { id: 'torch-binding', require: { tag: 'textile' }, amount: TUNE.torchFiberCost }
            ]
        },
        {
            id: 'axe',
            //  Fabrication of a harvesting tool — the same domain "knapping" (below)
            //  already trains; leaving it out while knapping counts would be an arbitrary
            //  inconsistency, not scope discipline (Ch.2 as-built states this judgment call).
            domain: 'harvestingFabrication',
            slots: [
                { id: 'axe-handle', require: { tag: 'woodwork' }, amount: TUNE.axeWoodCost },
                { id: 'axe-blade', require: { tag: 'blade' }, amount: TUNE.axeSharpbladeCost },
                { id: 'axe-binding', require: { tag: 'textile' }, amount: TUNE.axeFiberCost }
            ]
        },
        {
            id: 'shelter',
            domain: 'construction',
            slots: [
                { id: 'shelter-frame', require: { tag: 'woodwork' }, amount: TUNE.shelterWoodCost },
                { id: 'shelter-walls', require: { tag: 'masonry' }, amount: TUNE.shelterStoneCost },
                { id: 'shelter-binding', require: { tag: 'textile' }, amount: TUNE.shelterFiberCost }
            ]
        },
        {
            id: 'storage',
            domain: 'construction',
            slots: [
                { id: 'storage-frame', require: { tag: 'woodwork' }, amount: TUNE.storageWoodCost },
                { id: 'storage-walls', require: { tag: 'masonry' }, amount: TUNE.storageStoneCost }
            ]
        },
        {
            id: 'stonehammer',
            //  Fabrication of the tool that unlocks knapping — same reasoning as the axe.
            domain: 'harvestingFabrication',
            slots: [
                { id: 'stonehammer-handle', require: { tag: 'woodwork' }, amount: TUNE.stoneHammerWoodCost },
                { id: 'stonehammer-head', require: { tag: 'masonry' }, amount: TUNE.stoneHammerStoneCost }
            ]
        },
        {
            id: 'knap',
            //  "Knapping" is one of the ruling's own four named Harvesting & fabrication verbs.
            domain: 'harvestingFabrication',
            slots: [{ id: 'knap-input', require: { tag: 'masonry' }, amount: TUNE.knapStoneCost }]
        }
    ];
}

/** Which domain a recipe (by id) trains — the single source of truth `Recipe.domain`
 *  above already is; this just spares every craft call site in state.ts from re-deriving
 *  `allRecipes()` and re-deciding matching logic. Throws on an unknown id — every caller
 *  passes one of the six literal ids `allRecipes()` itself defines, so this can only fire
 *  on a real typo, not a runtime data case worth a soft fallback. */
export function recipeDomain(id: string): KnowledgeDomain {
    const recipe = allRecipes().find((r) => r.id === id);
    if (!recipe) throw new Error(`recipeDomain: unknown recipe id "${id}"`);
    return recipe.domain;
}

//  Was a second hardcoded copy; now the canonical one, so it cannot drift.
const MATERIAL_KINDS: MaterialKind[] = ALL_MATERIAL_KINDS;

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
                //  Ch.2, item 3: wire the existing stub for real. A genuine null attempt
                //  IS knowledge — a small, Understanding-ONLY gain in the recipe's own
                //  domain (Technique stays exactly 0, by `nullOutcomeFactors`'s own zero
                //  challenge — nothing was actually made). Only reachable here because the
                //  three guards above already prove this pair is genuinely new.
                applyLearningEvent(state, recipe.domain, nullOutcomeFactors());
            }
        }
    }
}
