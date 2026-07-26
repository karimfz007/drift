/**
 * BRAIN — Try-Combining and Blueprints (v0_7 §10.6, D-063). Pure TypeScript.
 *
 * §10.6's shape, held to deliberately: *"The game presents a bounded design question, not
 * arbitrary procedural crafting."* So there are **no invented recipes here**. A combination
 * is valid only if the existing Ch.1 recipe tree (`recipes.ts`) already says those two
 * materials satisfy two different slots of the same recipe. Everything else is a null
 * outcome, and a null outcome teaches through D-055's journal — nothing else.
 *
 * What an attempt costs (win or lose): energy, game time, hunger, thirst. Charged on EVERY
 * attempt, which is what stops brute-force enumeration from being free. A repeat of a pair
 * already known to be null is free ONLY because the journal already knows the answer, so
 * there is nothing to try — never because trying is cheap.
 *
 * Everything routes through machinery that already exists:
 *   - the outcome check is `materialSatisfies` against `allRecipes()` (Ch.1),
 *   - a failure is journaled by the same `nullPairs`/`KnowledgeEvent` path as D-055,
 *   - knowledge gain is Ch.2's `applyLearningEvent` — no parallel XP system,
 *   - the confidence curve reads Ch.2's own Technique score, so practice compounds through
 *     the progression that already exists rather than a second one.
 *
 * A success mints a **Blueprint**: §10.6's "named plan". Per §10.6 it records material
 * assumptions, workmanship, and authorship, and reproduces *the relationships* — a later
 * maker does not inherit the original's quality for free, which is why `workmanship` is
 * stored as evidence and never re-applied.
 */

import { TUNE } from '../data/tune';
import { applyLearningEvent, tryFactorsFor } from './knowledge';
import { materialSatisfies } from './materials';
import { allRecipes, type Recipe } from './recipes';
import type { Blueprint, GameState, ItemGrade, KnowledgeDomain, MaterialKind } from './types';

export type ExperimentOutcome =
    | 'invented' // a real combination, and it worked — a Blueprint is minted
    | 'failed-attempt' // a real combination, but this attempt did not come off
    | 'no-relationship' // these two do not belong together; journaled as a null
    | 'already-known' // this pair has been tried before — free, because the answer is known
    | 'refused'; // could not attempt at all

export interface ExperimentResult {
    ok: boolean;
    outcome: ExperimentOutcome;
    /** Why an attempt was refused, in words the UI can show directly (D-042's fail-loud law). */
    reason: string | null;
    blueprint: Blueprint | null;
    /** The recipe the pair belongs to, when they belong to one at all. */
    recipeId: string | null;
    /** What the attempt actually cost — surfaced so the cost is never invisible. */
    spent: { energy: number; gameHours: number; hunger: number; thirst: number } | null;
}

function refuse(reason: string): ExperimentResult {
    return { ok: false, outcome: 'refused', reason, blueprint: null, recipeId: null, spent: null };
}

/**
 * Does the Ch.1 tree already say these two materials belong together? True only when they
 * satisfy **two different slots of the same recipe** — a pair that both fit the same slot
 * are alternatives, not partners, and that is not an invention.
 */
export function relationshipFor(a: MaterialKind, b: MaterialKind): Recipe | null {
    if (a === b) return null;
    for (const recipe of allRecipes()) {
        for (const slotA of recipe.slots) {
            if (!materialSatisfies(a, slotA.require)) continue;
            for (const slotB of recipe.slots) {
                if (slotB.id === slotA.id) continue;
                if (materialSatisfies(b, slotB.require)) return recipe;
            }
        }
    }
    return null;
}

/** The journal key for an attempted pair. Order-independent, because trying wood+fibre and
 *  fibre+wood is the same experiment — sorted so the pair has exactly one identity. */
export function experimentPairKey(a: MaterialKind, b: MaterialKind): string {
    return [a, b].sort().join('+');
}

export function hasTried(state: GameState, a: MaterialKind, b: MaterialKind): boolean {
    return state.knowledge.nullPairs.includes(experimentPairKey(a, b));
}

/**
 * The confidence curve (§10.6, "repetition raises success rate and speed"). Read off Ch.2's
 * existing Technique score for the relevant domain, so practice compounds through the one
 * progression the game already has. Capped below certainty — an experiment is never a
 * formality.
 */
export function successChanceFor(state: GameState, domain: KnowledgeDomain): number {
    const technique = state.knowledge.domains[domain].technique;
    const chance = TUNE.experimentBaseSuccessChance + technique * TUNE.experimentSuccessPerTechnique;
    return Math.min(TUNE.experimentMaxSuccessChance, chance);
}

/** How long this attempt takes, in game hours. Slower while unpractised, easing toward the
 *  base as Technique climbs — the "and speed" half of the same curve. */
export function experimentGameHoursFor(state: GameState, domain: KnowledgeDomain): number {
    const technique = state.knowledge.domains[domain].technique;
    const t = Math.max(0, Math.min(1, technique / TUNE.knowledgeScoreMax));
    const multiplier = TUNE.experimentSlowStartMultiplier + (1 - TUNE.experimentSlowStartMultiplier) * t;
    return TUNE.experimentGameHours * multiplier;
}

/** A small deterministic hash — the same technique `deadfallYield`/`rollGrade` already use,
 *  so an experiment's result is reproducible and never `Math.random()`. */
function hash32(seed: number): number {
    let h = seed | 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

function seedFraction(seed: number): number {
    return hash32(seed) / 0x100000000;
}

export function canExperiment(state: GameState, a: MaterialKind, b: MaterialKind): string | null {
    if (a === b) return 'Pick two different things to try together.';
    if (state.inventory[a] <= 0 || state.inventory[b] <= 0) return 'You need both of those in hand to try them.';
    if (state.energy < TUNE.experimentEnergyCost) return 'Too spent to concentrate on that right now.';
    return null;
}

/**
 * Attempt to combine two carried materials. Mutates state. Costs are charged on every real
 * attempt, win or lose; a pair already known to be a dead end costs nothing and simply says
 * so, because the knowledge is already yours.
 */
export function tryCombine(state: GameState, a: MaterialKind, b: MaterialKind): ExperimentResult {
    const blocked = canExperiment(state, a, b);
    if (blocked) return refuse(blocked);

    const key = experimentPairKey(a, b);
    const recipe = relationshipFor(a, b);

    //  A pair already journaled as a dead end short-circuits — D-055's own law, applied to
    //  the experiment verb. Free, because the answer is already known; it is not a discount
    //  on trying, it is the absence of anything left to try.
    if (!recipe && state.knowledge.nullPairs.includes(key)) {
        return {
            ok: true,
            outcome: 'already-known',
            reason: 'You already know those two do not go together.',
            blueprint: null,
            recipeId: null,
            spent: null
        };
    }

    //  Charge the body. Every real attempt, whatever it yields.
    const domain: KnowledgeDomain = recipe ? recipeDomainOf(recipe) : 'harvestingFabrication';
    const gameHours = experimentGameHoursFor(state, domain);
    state.energy = Math.max(0, state.energy - TUNE.experimentEnergyCost);
    state.hunger = Math.max(0, state.hunger - TUNE.experimentHungerCost);
    state.thirst = Math.max(0, state.thirst - TUNE.experimentThirstCost);
    state.gameHoursElapsed += gameHours;
    const spent = {
        energy: TUNE.experimentEnergyCost,
        gameHours,
        hunger: TUNE.experimentHungerCost,
        thirst: TUNE.experimentThirstCost
    };

    const seed = state.experimentCount;
    state.experimentCount += 1;

    //  NO RELATIONSHIP. The Ch.1 tree says these two do not belong together, so this is a
    //  null outcome — journaled exactly as D-055 journals one, teaching through the same
    //  path, and granting the same Understanding-only gain. No new mechanism.
    if (!recipe) {
        if (!state.knowledge.nullPairs.includes(key)) {
            state.knowledge.nullPairs.push(key);
            state.knowledge.events.push({
                kind: 'combination-tried',
                detail: `${a} and ${b} do not go together`,
                gameHoursElapsed: state.gameHoursElapsed
            });
            applyLearningEvent(state, domain, {
                challenge: 0,
                novelty: TUNE.nullOutcomeNoveltyFactor,
                feedback: TUNE.nullOutcomeFeedbackFactor,
                consequence: 0,
                reflection: TUNE.nullOutcomeReflectionFactor
            });
        }
        return {
            ok: true,
            outcome: 'no-relationship',
            reason: `${a} and ${b} do not go together — but now you know that.`,
            blueprint: null,
            recipeId: null,
            spent
        };
    }

    //  A REAL relationship. Whether this particular attempt comes off runs on the confidence
    //  curve, so an unpractised maker genuinely fumbles and a practised one rarely does.
    //  Either way the attempt itself teaches, through Ch.2's evaluator.
    applyLearningEvent(state, domain, tryFactorsFor(state.knowledge.domains[domain]));

    const already = state.blueprints.find((bp) => bp.recipeId === recipe.id);
    const succeeded = seedFraction(seed) < successChanceFor(state, domain);

    if (!succeeded) {
        return {
            ok: true,
            outcome: 'failed-attempt',
            reason: 'Close — it did not hold together this time. Your hands learned something anyway.',
            blueprint: null,
            recipeId: recipe.id,
            spent
        };
    }

    //  Consume the materials only on a success — the prototype is what they became.
    state.inventory[a] -= 1;
    state.inventory[b] -= 1;

    //  §10.5's versioning: re-deriving a plan you already hold bumps its version rather than
    //  minting a duplicate. A plan is one object with a history, not a pile of copies.
    if (already) {
        already.version += 1;
        already.discoveredAtGameHours = state.gameHoursElapsed;
        return {
            ok: true,
            outcome: 'invented',
            reason: `You refine your plan for ${already.name}.`,
            blueprint: already,
            recipeId: recipe.id,
            spent
        };
    }

    const blueprint: Blueprint = {
        id: `bp${seed}`,
        name: blueprintNameFor(recipe.id),
        recipeId: recipe.id,
        inputs: [a, b].sort() as MaterialKind[],
        version: 1,
        //  Recorded as evidence of THIS prototype, never granted to a later maker (§10.6).
        workmanship: workmanshipFor(seed),
        author: 'you',
        discoveredAtGameHours: state.gameHoursElapsed
    };
    state.blueprints.push(blueprint);

    return {
        ok: true,
        outcome: 'invented',
        reason: `You work out how it fits: ${blueprint.name}.`,
        blueprint,
        recipeId: recipe.id,
        spent
    };
}

/** Which domain a recipe trains — reuses `Recipe.domain`, set in Ch.2. */
function recipeDomainOf(recipe: Recipe): KnowledgeDomain {
    return recipe.domain;
}

const GRADE_LADDER: ItemGrade[] = ['crude', 'serviceable', 'refined', 'exceptional'];

/** The prototype's own workmanship, deterministic from the attempt seed. Recorded on the
 *  plan as evidence; never inherited by anyone who later works from it. */
function workmanshipFor(seed: number): ItemGrade {
    return GRADE_LADDER[hash32(seed * 7 + 3) % GRADE_LADDER.length];
}

/** Plain names for the plans the current tree can yield. A plan is a named thing (§10.6),
 *  never "recipe #4". */
function blueprintNameFor(recipeId: string): string {
    switch (recipeId) {
        case 'axe': return 'Hafted axe';
        case 'torch': return 'Bound torch';
        case 'shelter': return 'Lean-to frame';
        case 'storage': return 'Storage crate';
        case 'stonehammer': return 'Stone hammer';
        case 'knap': return 'Knapped blade';
        default: return recipeId;
    }
}
