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
            //  THE BACKPACK, restored. It was pulled on a collision theory that was WRONG:
            //  I read one `tryCombineWith` result, saw the torch win the fibre+wood gesture,
            //  and concluded the shared tag set made it permanently unreachable.
            //
            //  `resolveRecipe` has FOUR stages — exact cover, then something-NEW, then the
            //  suspected NEED, then deterministic rotation on `experimentCount`. The second
            //  stage alone settles this: a survivor who already holds the torch's plan and
            //  puts fibre and wood together again is trying the other thing. **No recipe is
            //  permanently unreachable in this matcher**, which is exactly what it was built
            //  to guarantee after `relationshipFor` stranded three of them.
            //
            //  Position therefore does not decide precedence — it only orders the rotation
            //  pool at stage four. Placed with the other made tools because that is where it
            //  belongs to read, not because the slot mattered.
            id: 'backpack',
            domain: 'harvestingFabrication',
            slots: [
                { id: 'pack-body', require: { tag: 'textile' }, amount: TUNE.backpackFiberCost },
                { id: 'pack-frame', require: { tag: 'woodwork' }, amount: TUNE.backpackWoodCost }
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
            //  DROP 1 — THE SPEAR. Enters the world exactly as every post-pivot item does:
            //  by inspection and Try-Combining, never as a row that appears in a menu. Same
            //  slot shape as the axe because it is the same kind of made thing — a haft, a
            //  knapped edge, and lashing — and a survivor who worked out one has genuinely
            //  learned something about the other.
            id: 'spear',
            domain: 'harvestingFabrication',
            //  TWO POSITIONS, and the binding is NOT one of them. The lashing is folded into
            //  the operation — `craftSpear` still spends fibre — rather than occupying a
            //  staged slot.
            //
            //  THE DEFECT THIS CLOSES, and it was never the display bug it was reported as.
            //  The spear shipped with slots byte-identical to the AXE's (woodwork 3 + blade 1
            //  + textile 2), so staging those three materials resolved to the axe every time
            //  and the spear was **unreachable through discovery forever**. Not a position
            //  count — `combineMaxInputs` is 4 — a DUPLICATE SIGNATURE. Two recipes competing
            //  for one gesture, and the matcher can only ever answer with the first.
            //
            //  My Drop 1 reachability proof missed it because it drove `craftSpear()`
            //  directly: it proved the MATERIALS were obtainable, never that the recipe was
            //  DISCOVERABLE. Post-pivot those are different claims, and [[D-090]] means the
            //  second one.
            slots: [
                { id: 'spear-shaft', require: { tag: 'woodwork' }, amount: TUNE.spearWoodCost },
                { id: 'spear-head', require: { tag: 'blade' }, amount: TUNE.spearSharpbladeCost }
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
            //  THE RAFT (the Maritime Slice). Three positions, and the third one is the
            //  reason there are three.
            //
            //  Wood + fibre is already the busiest gesture in the game: the torch holds it
            //  and the backpack holds it. [[D-114]] settled that sharing a tag signature is
            //  legal — stage four of `resolveRecipe` rotates rather than crowning a winner,
            //  so sharing costs an attempt and never access — but THREE recipes on one
            //  gesture is not a discovery, it is a lottery, and a lottery teaches a player
            //  that the world is arbitrary. So the raft gets a signature nobody else has.
            //
            //  It gets it honestly rather than by decoration: coconut husks lashed under a
            //  log deck are what actually floats a raft on an island that has coconut palms
            //  and no barrels, and this island has had coconut palms since Cycle 03 as the
            //  pre-axe fibre source. The signature is unique because `buoyant` is a real
            //  material property nothing else here has — see `materials.ts`, where the first
            //  cut of this slot used `food` instead and the standing "berries go with nothing"
            //  law caught it inside one test run.
            id: 'raft',
            //  Not `construction`. A raft is the first thing this game makes that goes
            //  somewhere, and reading the sea is the domain that governs it — which also
            //  gives §15's `sustained-expedition` crossing (endurance × navigationSeamanship)
            //  the knowledge leg it has never had a producer for.
            domain: 'navigationSeamanship',
            slots: [
                { id: 'raft-deck', require: { tag: 'woodwork' }, amount: TUNE.raftWoodCost },
                { id: 'raft-lashing', require: { tag: 'textile' }, amount: TUNE.raftFiberCost },
                { id: 'raft-float', require: { tag: 'buoyant' }, amount: TUNE.raftCoconutCost }
            ]
        },
        {
            //  FISHING — THE LINE. One slot, one material: fibre, spun.
            //
            //  A UNIQUE SIGNATURE, and it costs nothing to make it unique because nothing
            //  else in the game is textile ALONE. `knap` is the precedent — masonry alone —
            //  and the shape is the same: the simplest made things are the ones a castaway
            //  works out by handling ONE material rather than by pairing two.
            //
            //  This is also the recipe that finally makes `tools.fishingLine` reachable. It
            //  has been in `Tools` since v11 and in the pond's radial circle since Slice 2,
            //  and until now there was no way to obtain one: the verb was permanently greyed
            //  with "You have no line to fish with" and nothing anywhere could change that.
            id: 'fishingline',
            //  Feeding yourself off the land is Survivalcraft, the same domain fire and
            //  foraging train — not fabrication. What is being learned is the FISHING.
            domain: 'survivalcraft',
            //  TWO SLOTS, and the second one exists because of a defect this project has now
            //  found six times. Written first as textile ALONE — `knap` is one slot, so one
            //  slot looked legal — and `canExperimentWith` requires two to four materials, so
            //  a one-slot recipe can never be resolved by Try-Combining. `knap` is exempt
            //  because it is not discovered by combining at all; it is the hammer's own verb.
            //  The line would have been routed, prompted, tested and unreachable.
            //
            //  It SHARES {textile, blade} with the net below, which [[D-114]] settled as
            //  legal: stage four of `resolveRecipe` rotates rather than crowning a winner, so
            //  a shared gesture costs an attempt and never access. Two recipes on a gesture is
            //  precedented twice over (torch/backpack, storage/stonehammer); it is THREE that
            //  the raft's note calls a lottery, and this is two.
            slots: [
                { id: 'line-cord', require: { tag: 'textile' }, amount: TUNE.fishingLineFiberCost },
                { id: 'line-barb', require: { tag: 'blade' }, amount: TUNE.fishingLineBladeCost },
            ]
        },
        {
            //  FISHING — THE NET. A lot of cordage, and an edge to cut it to shape.
            //
            //  {textile, blade} is unique too, and honestly so: every other blade recipe in
            //  the game pairs the edge with WOODWORK, because everything else made with a
            //  blade has a handle. A net has no handle, and that absence is what gives it
            //  its own gesture.
            id: 'net',
            domain: 'survivalcraft',
            slots: [
                { id: 'net-mesh', require: { tag: 'textile' }, amount: TUNE.netFiberCost },
                { id: 'net-cut', require: { tag: 'blade' }, amount: TUNE.netSharpbladeCost },
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
