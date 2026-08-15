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
import { suspicionFor } from './discovery';
import { transformOnFailure, type MatterOutcome } from './matter';
import { allRecipes, type Recipe, type RecipeSlot } from './recipes';
import type { Blueprint, GameState, ItemGrade, KnowledgeDomain, MaterialKind } from './types';

export type ExperimentOutcome =
    | 'invented' // a real combination, and it worked — a Blueprint is minted
    | 'failed-attempt' // a real combination, but this attempt did not come off
    | 'no-relationship' // these two do not belong together; journaled as a null
    | 'already-known' // this pair has been tried before — free, because the answer is known
    //  P0-1 — the pile makes two things the survivor ALREADY KNOWS how to make, so the game
    //  refuses to pick for them. Not a failure and not an attempt: nothing is spent, and the
    //  body offers the options `knownMatches` returns.
    | 'choose'
    | 'refused'; // could not attempt at all

export interface ExperimentResult {
    ok: boolean;
    outcome: ExperimentOutcome;
    /** Why an attempt was refused, in words the UI can show directly (D-042's fail-loud law). */
    reason: string | null;
    blueprint: Blueprint | null;
    /** The recipe the pair belongs to, when they belong to one at all. */
    recipeId: string | null;
    /** Law 128: what the failed attempt did to the matter. Null on any non-failure path. */
    matter?: MatterOutcome | null;
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

/**
 * Every recipe the given materials could be an attempt at — each material satisfying a
 * DISTINCT slot, because two sticks do not fill a handle slot and a binding slot between them.
 *
 * A small backtracking assignment rather than a greedy one: greedy matching gets this wrong
 * whenever a material satisfies more than one slot, and several of ours do (wood is
 * `woodwork` for every recipe that has a frame AND a handle).
 */
export function recipesMatching(materials: MaterialKind[]): Recipe[] {
    const out: Recipe[] = [];
    for (const recipe of allRecipes()) {
        if (materials.length > recipe.slots.length) continue;
        if (assignable(materials, recipe.slots, new Set())) out.push(recipe);
    }
    return out;
}

/** "wood and fibre", or "wood, stone and fibre" — plain English at any arity. */
function describeSet(materials: MaterialKind[]): string {
    if (materials.length <= 1) return materials[0] ?? 'those';
    return `${materials.slice(0, -1).join(', ')} and ${materials[materials.length - 1]}`;
}

function assignable(materials: MaterialKind[], slots: RecipeSlot[], used: Set<string>): boolean {
    if (materials.length === 0) return true;
    const [head, ...rest] = materials;
    for (const slot of slots) {
        if (used.has(slot.id)) continue;
        if (!materialSatisfies(head, slot.require)) continue;
        used.add(slot.id);
        if (assignable(rest, slots, used)) return true;
        used.delete(slot.id);
    }
    return false;
}

/**
 * WHICH recipe an attempt is actually about, when the materials fit more than one.
 *
 * THE DEFECT THIS EXISTS FOR, found in the director's playtest and worse than the question
 * that prompted the look. `relationshipFor` returned the FIRST recipe whose slots two
 * materials could fill, and wood+stone fits `shelter`, `storage` AND `stonehammer` — so it
 * always answered "shelter" and the other two were **unreachable by any sequence of
 * combinations whatsoever**. Four hundred rounds of every pair, with maxed knowledge and full
 * materials, minted exactly three recipes: axe, shelter, torch.
 *
 * Before Stage 2b that was a curiosity, because the catalogue handed those rows over anyway.
 * After the pivot it is a **broken spine**: no stone hammer means no knapped blade, which
 * means the axe blueprint mints and can never be built. The harness missed it because the
 * progression checks grant their blueprints directly — an affordance that is honest for
 * testing tree-felling and that masked this exactly.
 *
 * The resolution order, and why each step is there:
 *   1. **An exact cover wins.** If the materials fill every slot of one recipe and only part
 *      of another, the survivor is plainly attempting the first. This alone separates
 *      shelter (3 slots) from storage (2) once fibre is in the pile.
 *   2. **Then what they are actually SUSPECTING.** `storage` and `stonehammer` are both
 *      exactly woodwork+masonry — genuinely indistinguishable by materials, at any arity. So
 *      the tie breaks on the NEED, which `discovery.ts` already computes: arms full and
 *      nowhere to put things resolves to the store, stone that will not yield resolves to the
 *      hammer. That is the discovery routes' "need" leg doing real work rather than decorating
 *      a hint.
 *   3. **Otherwise the first**, unchanged, so nothing that worked before behaves differently.
 */
/**
 * P0-1 — WHEN THE SURVIVOR ALREADY KNOWS TWO ANSWERS, THE CHOICE IS THEIRS.
 *
 * THE DEFECT, director-confirmed in play: five wood and five stone silently became STORAGE
 * when he wanted a STONE HAMMER. Both are exactly woodwork+masonry, so nothing separates them
 * by arity, and `resolveRecipe`'s last tie-break rotates on `experimentCount` — a rule that is
 * right for DISCOVERY and wrong for a survivor who already holds both plans. Bible §11.4 step
 * 4 is "choose/apply an operation", and the choosing was the game's.
 *
 * THE LINE IS KNOWN VERSUS UNKNOWN, and it is the whole of the ruling. A recipe the survivor
 * has a blueprint for is a thing they know how to make; two of those from one pile is a
 * QUESTION, and the game must ask it. A recipe they have never made is not an option to be
 * offered — offering it would name the product and hand over the catalogue, which is what
 * Law 95 and the invention pivot forbid. So this returns known matches ONLY, and everything
 * about the discovery path below is untouched: unknown patterns still resolve exactly as they
 * did, still show property hints and nothing else.
 *
 * Fewer than two known matches means there is nothing to ask about, and the caller proceeds.
 */
export function knownMatches(state: GameState, materials: MaterialKind[]): Recipe[] {
    const candidates = recipesMatching(materials);
    if (candidates.length <= 1) return [];
    //  Exact-arity first, the same narrowing `resolveRecipe` does — a three-slot recipe is not
    //  an answer to a two-material pile just because it overlaps.
    const exact = candidates.filter((r) => r.slots.length === materials.length);
    const pool = exact.length > 0 ? exact : candidates;
    const known = pool.filter((r) => state.blueprints.some((bp) => bp.recipeId === r.id));
    return known.length >= 2 ? known : [];
}

/**
 * P0-C — EVERY PLAN THE SURVIVOR HOLDS THAT THIS PILE WOULD MAKE. One is enough.
 *
 * THE RULING THIS IMPLEMENTS, and it is wider than P0-1's. P0-1 fixed the case where TWO known
 * answers were silently arbitrated, and drew the line at two because one match was "nothing to
 * ask about". The director's ruling is that there is still something to SAY: staged materials
 * that match a plan you hold must NAME THE ATTEMPT and wait, even when the match is unique.
 * Committing silently is the same defect at arity one — the survivor's hands move before they
 * have agreed to anything, and the first they know of it is the outcome.
 *
 * SO THE THRESHOLD DROPS FROM TWO TO ONE, and nothing else about the shape changes: same
 * exact-arity narrowing, same blueprint gate, same list. `knownMatches` stays exactly as it was
 * and stays the ambiguity question specifically — two callers, two questions, neither guessing
 * at the other's meaning.
 *
 * UNKNOWN PATTERNS ARE UNTOUCHED, and that boundary is the whole safety of this. A recipe the
 * survivor has never made is not named and not offered: naming it would hand over the catalogue,
 * which is exactly what Law 95 and the invention pivot forbid. So a pile that matches nothing
 * held still resolves and commits as it always did — discovery stays a thing you walk into,
 * and confirmation is only ever asked about knowledge you already own.
 */
export function heldMatches(state: GameState, materials: MaterialKind[]): Recipe[] {
    const candidates = recipesMatching(materials);
    if (candidates.length === 0) return [];
    const exact = candidates.filter((r) => r.slots.length === materials.length);
    const pool = exact.length > 0 ? exact : candidates;
    return pool.filter((r) => state.blueprints.some((bp) => bp.recipeId === r.id));
}

/** Is this pile a question rather than an attempt? */
export function isAmbiguousToPlayer(state: GameState, materials: MaterialKind[]): boolean {
    return knownMatches(state, materials).length >= 2;
}

/**
 * P0-C — must this pile be NAMED and agreed to before anything is spent?
 *
 * True whenever the survivor holds at least one plan this pile would make. Deliberately a
 * separate predicate from `isAmbiguousToPlayer` rather than a widened one: "which of these two?"
 * and "are you making this?" are different questions asked in different words, and collapsing
 * them would make the single-match case inherit the plural phrasing.
 */
export function needsNaming(state: GameState, materials: MaterialKind[]): boolean {
    return heldMatches(state, materials).length >= 1;
}

/**
 * THE QUESTION, IN THE RIGHT WORDS FOR HOW MANY ANSWERS THERE ARE.
 *
 * Named here rather than in the body because it is a claim about content — the director's
 * ruling is specifically that the attempt is NAMED ("you are trying to make an axe"), and a
 * sentence that must contain a particular thing is a sentence a test can hold to account.
 */
export function namingQuestionFor(offered: Recipe[]): string {
    if (offered.length >= 2) return 'You know two ways to use these. Which are you making?';
    const only = offered[0];
    return only
        ? `You are trying to make ${indefinite(recipeDisplayName(only.id))}. Go ahead?`
        : 'Which are you making?';
}

/**
 * P0-C — THE OPTION THAT KEEPS INVENTION ALIVE, and the reason this batch has one more moving
 * part than the ruling literally asked for.
 *
 * THE RULING TAKEN LITERALLY SOFT-LOCKS THE TREE, and the shipped reachability test is what
 * proved it rather than an argument. "Name the held plan and wait, even when other outcomes are
 * still unknown" means a pile you know ONE answer for always resolves to that answer — so the
 * moment a survivor holds the storage plan, wood+stone can only ever be storage, and the stone
 * hammer standing behind it becomes permanently unreachable. `tests/combine-reach.test.ts` went
 * red on `fishingline` the first time this ran, which is exactly that: a recipe walled off
 * behind a plan the survivor already had.
 *
 * P0-1 never hit this because its threshold was TWO known matches; with one known and one
 * unknown it fell through to `resolveRecipe`, whose second tie-break deliberately prefers the
 * thing you have NOT made yet. Dropping the threshold to one removed the only door invention
 * had.
 *
 * SO THE QUESTION GETS A SECOND ANSWER: the held plan, named — and "try something else", which
 * runs the discovery path exactly as it ran before. This does not leak the catalogue and cannot:
 * the option is a REFUSAL, not a product. It says nothing about what else these make, or
 * whether anything else does; the survivor is declining the known thing, not selecting an
 * unknown one, and what they get is whatever experimenting would have got them anyway.
 *
 * Offered ONLY when a rival actually exists, so a pile with exactly one possible outcome asks a
 * plain yes-or-no and never dangles a door with nothing behind it.
 */
export const EXPERIMENT_CHOICE = 'try-something-else';

/** Does this pile have an outcome the survivor has NOT yet worked out? */
export function hasUnknownRival(state: GameState, materials: MaterialKind[]): boolean {
    const candidates = recipesMatching(materials);
    const exact = candidates.filter((r) => r.slots.length === materials.length);
    const pool = exact.length > 0 ? exact : candidates;
    return pool.some((r) => !state.blueprints.some((bp) => bp.recipeId === r.id));
}

/** "a hafted axe" / "an iron nail" — the article the name actually wants. */
function indefinite(name: string): string {
    const lower = name.charAt(0).toLowerCase() + name.slice(1);
    return `${'aeiou'.includes(lower.charAt(0)) ? 'an' : 'a'} ${lower}`;
}

export function resolveRecipe(state: GameState, materials: MaterialKind[]): Recipe | null {
    const candidates = recipesMatching(materials);
    if (candidates.length <= 1) return candidates[0] ?? null;

    const exact = candidates.filter((r) => r.slots.length === materials.length);
    let pool = exact.length > 0 ? exact : candidates;
    if (pool.length === 1) return pool[0];

    //  2. SOMETHING NEW, if there is something new. A survivor who already has the store's
    //  plan and puts wood and stone together again is not re-deriving the store — they are
    //  trying the other thing those two make. Without this, the first winner of a tie wins
    //  it forever and its rival stays unreachable, which is the exact defect above: storage
    //  and stonehammer are BOTH exactly woodwork+masonry, so no arity separates them.
    const undiscovered = pool.filter((r) => !state.blueprints.some((bp) => bp.recipeId === r.id));
    if (undiscovered.length > 0) pool = undiscovered;
    if (pool.length === 1) return pool[0];

    //  3. Then what they are actually SUSPECTING — the discovery routes' "need" leg doing
    //  real work rather than decorating a hint.
    const suspected = pool.filter((r) => suspicionFor(state, r.id)?.suspected === true);
    if (suspected.length === 1) return suspected[0];
    const tied = suspected.length > 0 ? suspected : pool;

    //  4. Still tied — two things the survivor needs equally, made of the same two materials.
    //  Rotate deterministically on the attempt counter rather than picking a permanent winner.
    //  This is not a coin toss dressed up: trying the same pile again and getting somewhere
    //  new is what experimenting IS, and `experimentCount` keeps it reproducible.
    return tied[state.experimentCount % tied.length];
}

/** The journal key for an attempted pair. Order-independent, because trying wood+fibre and
 *  fibre+wood is the same experiment — sorted so the pair has exactly one identity. */
export function experimentPairKey(a: MaterialKind, b: MaterialKind): string {
    return experimentKeyFor([a, b]);
}

/** The same identity rule at any arity: sorted, so a set has exactly one key. */
export function experimentKeyFor(materials: MaterialKind[]): string {
    return [...materials].sort().join('+');
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
    return canExperimentWith(state, [a, b]);
}

/**
 * The N-material gate. Two to four, matching the crafting spec's own stated range — the old
 * hard pair was never the spec, it was the discovery probe's arity, and it turned out to make
 * two recipes permanently unreachable (see `resolveRecipe`).
 */
export function canExperimentWith(state: GameState, materials: MaterialKind[]): string | null {
    if (materials.length < TUNE.combineMinInputs) return 'Pick two different things to try together.';
    if (materials.length > TUNE.combineMaxInputs) return `That is more than you can hold together at once — ${TUNE.combineMaxInputs} at most.`;
    if (new Set(materials).size !== materials.length) return 'Pick two different things to try together.';
    for (const m of materials) {
        if (state.inventory[m] <= 0) return 'You need all of those in hand to try them.';
    }
    if (state.energy < TUNE.experimentEnergyCost) return 'Too spent to concentrate on that right now.';
    return null;
}

/**
 * Attempt to combine two carried materials. Mutates state. Costs are charged on every real
 * attempt, win or lose; a pair already known to be a dead end costs nothing and simply says
 * so, because the knowledge is already yours.
 */
export function tryCombine(state: GameState, a: MaterialKind, b: MaterialKind): ExperimentResult {
    return tryCombineWith(state, [a, b]);
}

/** Two to four materials. `tryCombine` delegates here, so there is one execution path. */
/**
 * P0-1 — MAKE THE ONE THEY PICKED. The same execution path as an ordinary attempt, with the
 * recipe SUPPLIED instead of resolved.
 *
 * Guarded rather than trusted: the choice must be one of the recipes this pile actually makes
 * and one the survivor actually knows, so a body that offered a stale list — or a caller that
 * invented an id — cannot mint something out of nothing.
 */
export function makeChosen(state: GameState, materials: MaterialKind[], recipeId: string): ExperimentResult {
    //  THE GUARD IS "MATCHES AND IS KNOWN", not "is one of two". My first cut checked the
    //  choice against `knownMatches`, which returns nothing at all below two — so naming the
    //  thing you meant was REFUSED whenever the pile was unambiguous, and three shipped tests
    //  caught it at once: a survivor who holds one plan could no longer re-derive it by name.
    //  Naming what you are making is a legal act whenever the recipe genuinely matches the
    //  pile and the survivor genuinely knows it; ambiguity is what makes the game ASK, not
    //  what makes an answer valid.
    //  P0-C — "TRY SOMETHING ELSE" IS A LEGAL ANSWER, and it is the door invention comes
    //  through once a survivor holds a plan for this pile. It resolves through the ORDINARY
    //  discovery path — `tryCombineWith` with no recipe supplied — whose own second tie-break
    //  already prefers what has not been made yet. Nothing is named and nothing is promised: it
    //  is the survivor declining the known thing, and the world answering as it always did.
    if (recipeId === EXPERIMENT_CHOICE) {
        if (!hasUnknownRival(state, materials)) {
            return refuse('You already know everything these make.');
        }
        return tryCombineWith(state, materials, EXPERIMENT_CHOICE);
    }
    const chosen = recipesMatching(materials).find((r) => r.id === recipeId);
    if (!chosen) return refuse('That is not one of the things these make.');
    //  ...and still nothing can be minted out of nothing: an unknown recipe is not choosable,
    //  which is what keeps a body offering a stale list from handing over the catalogue.
    if (!state.blueprints.some((bp) => bp.recipeId === recipeId)) {
        return refuse('You have not worked that out yet.');
    }
    return tryCombineWith(state, materials, recipeId);
}

export function tryCombineWith(state: GameState, materials: MaterialKind[], chosenRecipeId?: string): ExperimentResult {
    const blocked = canExperimentWith(state, materials);
    if (blocked) return refuse(blocked);

    //  P0-1, WIDENED TO P0-C — NEVER COMMIT A PLAN THE SURVIVOR HOLDS WITHOUT NAMING IT FIRST.
    //
    //  P0-1 stopped the game arbitrating between TWO known answers (it silently built storage
    //  when the director wanted a hammer). The director's ruling here is that one known answer
    //  is not silence's excuse either: staged materials matching a plan they hold must name the
    //  attempt and WAIT. So the threshold is `needsNaming` — at least one held plan — and the
    //  single-match case gets its own words rather than the plural ones.
    //
    //  "MATCHES A HELD PLAN WHILE OTHER OUTCOMES ARE STILL UNKNOWN" IS THE SAME BRANCH, not a
    //  third case. `heldMatches` filters to blueprints the survivor owns, so an unknown rival
    //  simply is not in the list: the held one is named, the unknown one is never mentioned,
    //  and agreeing to the named attempt is what the survivor is actually asked. That satisfies
    //  the ruling and Law 95 at once, without the two pulling against each other.
    //
    //  Costs NOTHING here: being asked is not an attempt, and cancelling leaves the pile exactly
    //  as it was.
    if (chosenRecipeId === undefined && needsNaming(state, materials)) {
        return {
            ok: false,
            outcome: 'choose',
            reason: namingQuestionFor(heldMatches(state, materials)),
            blueprint: null,
            recipeId: null,
            spent: null,
        };
    }

    const [a, b] = materials;
    const key = experimentKeyFor(materials);
    //  P0-C — the experiment sentinel is NOT a recipe id and must never be looked up as one:
    //  it means "resolve this the way you always did", so it falls through to `resolveRecipe`
    //  with its undiscovered-first tie-break intact. Looking it up would find nothing and
    //  silently turn a deliberate experiment into a null outcome.
    const recipe = chosenRecipeId !== undefined && chosenRecipeId !== EXPERIMENT_CHOICE
        ? (recipesMatching(materials).find((r) => r.id === chosenRecipeId) ?? null)
        : resolveRecipe(state, materials);

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
                detail: `${describeSet(materials)} do not go together`,
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
            reason: `${describeSet(materials)} do not go together — but now you know that.`,
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
        //  LAW 128's POSITIVE HALF (Slice 2C). The attempt was real and it happened to real
        //  matter, so the matter comes out changed. Before this, a failure cost the body and
        //  left the inputs pristine — which quietly taught that the world is indifferent to
        //  what you do to it, and that you may hammer the same stone forever.
        const matter = transformOnFailure(state, materials);
        return {
            ok: true,
            outcome: 'failed-attempt',
            reason: matter
                ? `Close — it did not hold together this time. ${matter.note}`
                : 'Close — it did not hold together this time. Your hands learned something anyway.',
            matter,
            blueprint: null,
            recipeId: recipe.id,
            spent
        };
    }

    //  ITEM 4 — THE GAME WAS LYING ABOUT WHAT A SUCCESS COST, AND THIS IS THE LINE.
    //
    //  It read `state.inventory[a] -= 1; state.inventory[b] -= 1;` — the FIRST TWO staged
    //  materials — while the comment above it said "the materials", plural, meaning all of
    //  them. `canExperimentWith` accepts two to FOUR (`combineMaxInputs`), and every recipe
    //  past arity two has been silently under-charging ever since three- and four-material
    //  piles became legal. The axe is wood + blade + BINDING: measured across six successful
    //  inventions, wood fell 40 -> 34 and the blade 40 -> 34 while the fibre sat at 40 the
    //  entire time. The survivor stages three things, is told they made something, and one of
    //  the three is quietly still in the bag.
    //
    //  THIS IS THE ACTUAL "THE GAME LIED" DEFECT, and it is not the one that was reported. The
    //  reported line — "the blade lost its edge" on a failed attempt — turns out to be honest:
    //  `transformOnFailure` really does move `matterWear`, it really does persist, and the
    //  blade really does break on the third failure. What is wrong THERE is legibility, not
    //  truth (see the note in `matter.ts`). What is wrong HERE is truth.
    //
    //  The same shape this project keeps paying for: the pair-only assumption from [[D-063]]
    //  survived the widening to four inputs because the widening happened in the GATE and
    //  nowhere else. A loop is safe at any arity — the gate above rejects duplicates and
    //  requires every material to be in hand, so no stack can be driven negative.
    for (const staged of materials) state.inventory[staged] -= 1;

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
/**
 * THE ONE PLACE A RECIPE GETS A HUMAN NAME.
 *
 * Exported for P0-1's chooser, deliberately rather than duplicated: the two options a survivor
 * is offered must carry the SAME words as the blueprints they already hold, or the circle and
 * the plan are two names for one thing and the player has to work out that they match.
 *
 * NAMING THESE LEAKS NOTHING. The chooser only ever offers recipes the survivor has ALREADY
 * made, so every name in it is a name they gave themselves — which is exactly the gate that
 * keeps Law 95's never-attempted patterns showing property hints and nothing else.
 */
export function recipeDisplayName(recipeId: string): string {
    return blueprintNameFor(recipeId);
}

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

/**
 * WHAT THE PLAYER IS TOLD, and whether it sounds like a win.
 *
 * C3 finding A4 on the F3 remediation: the regression written for F2 locks the BRAIN's
 * outcome contract — and the brain's contract was never broken. F2's actual defect lived
 * in the body, which tested `outcome === 'failed'`, a string that is not one of the five,
 * so `failed-attempt`, `already-known` and `refused` all fell through to the success
 * branch and were announced with the unlock cue. The brain returned the right answer the
 * whole time; the body mistranslated it. So that regression passes on the pre-fix tree,
 * which makes it a contract lock, not a regression — exactly what C3 said.
 *
 * The body cannot be unit-tested here (it imports Babylon; the purity law keeps that out
 * of the brain). So the DECISION moves to where it can be: which words, and whether the
 * unlock cue fires, is brain logic. The body's remaining job is to render this verbatim.
 *
 * Every outcome must yield text — D-042's fail-loud law: silence is not a legal outcome,
 * because a button that says nothing is indistinguishable from a broken one, which is how
 * the whole experimentation feature stayed invisible through D-063.
 */
export interface ExperimentAnnouncement {
    /** The words to show. Never empty. */
    text: string;
    /** True ONLY for a real invention — this is what plays the unlock cue. */
    triumphant: boolean;
    /** `float` reads as a reward; `explain` reads as information. */
    presentation: 'float' | 'explain';
}

export function announcementFor(result: ExperimentResult): ExperimentAnnouncement {
    switch (result.outcome) {
        case 'invented':
            return {
                text: result.blueprint ? `${result.blueprint.name} — you see how it works` : 'Something works',
                triumphant: true,
                presentation: 'float',
            };
        //  P0-1 — a question, not an outcome. The body is expected to open the chooser rather
        //  than announce this; the case exists so the switch stays total AND so a body that
        //  forgets says the question out loud instead of going silent ([[D-042]]).
        case 'choose':
            return {
                text: result.reason ?? 'You know two ways to use these. Which are you making?',
                triumphant: false, presentation: 'explain',
            };
        case 'failed-attempt':
            return {
                //  Law 128: name what the matter did, so a failure leaves evidence the
                //  player can see rather than only a body cost they infer.
                text: result.matter ? `It does not hold. ${result.matter.note}` : 'It does not hold. Not this time.',
                triumphant: false, presentation: 'explain',
            };
        case 'no-relationship':
            return { text: 'Nothing comes of it. You note that down.', triumphant: false, presentation: 'explain' };
        case 'already-known':
            return { text: 'You have tried this before. You know how it goes.', triumphant: false, presentation: 'explain' };
        case 'refused':
            //  A refusal always has a reason worth reading, but never trust it to be non-empty.
            return {
                text: result.reason || 'You cannot try that right now.',
                triumphant: false,
                presentation: 'explain',
            };
    }
}
