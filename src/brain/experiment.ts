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
 * IS THIS RECIPE SOMETHING THE SURVIVOR KNOWS — THE ONE PLACE THAT QUESTION IS ANSWERED.
 *
 * SEVEN CALL SITES ASKED THIS SEPARATELY (this file's own history — see [[D-174]] for the
 * six-then-seven count), all as `state.blueprints.some((bp) => bp.recipeId === X)` — correct
 * for every recipe except one. `knap` is deliberately blueprint-less: `canKnapSharpblade`
 * (state.ts) is "a standing gate," known the moment the survivor owns the stone hammer, with
 * no discovery step and no plan object ever minted for it. That did NOT change when the
 * hammer itself moved into `Inventory` (item 3, this batch, widening knap to a real two-slot
 * recipe) — a recipe having a REAL second slot and a recipe MINTING a blueprint are different
 * facts, and this predicate has only ever answered the second one.
 *
 * ONE PREDICATE, not an eighth copy. `combineSlate`, `hasUnknownRival`, `resolveRecipe`'s
 * tie-break, and `makeChosen`'s guard all read this, so there is exactly one place "known" is
 * decided and they cannot drift apart from each other or from `knownRecipes` — wait, RULING
 * (C1), this newer batch: there is no `knownRecipes` any more, see item 3's own ledger entry.
 * This predicate answers only what the SLATE names, never what a browsable list would have.
 */
function isRecipeKnown(state: GameState, recipeId: string): boolean {
    if (state.blueprints.some((bp) => bp.recipeId === recipeId)) return true;
    return recipeId === 'knap' && state.inventory.stonehammer > 0;
}

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
    const known = pool.filter((r) => isRecipeKnown(state, r.id));
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
/**
 * EVERY RECIPE THIS PILE IS ACTUALLY ABOUT — the exact-arity narrowing, in one place.
 *
 * Four copies of these three lines had drifted across this file, and the staging surface needs
 * to ask this question twice for different reasons: which of them the survivor HOLDS, and how
 * many there are ALTOGETHER. The second is what the generic branch was missing.
 */
export function matchPool(materials: MaterialKind[]): Recipe[] {
    const candidates = recipesMatching(materials);
    if (candidates.length === 0) return [];
    const exact = candidates.filter((r) => r.slots.length === materials.length);
    return exact.length > 0 ? exact : candidates;
}

export function heldMatches(state: GameState, materials: MaterialKind[]): Recipe[] {
    return matchPool(materials).filter((r) => isRecipeKnown(state, r.id));
}

/**
 * WHAT THIS PILE COULD BECOME, LIVE — the crafting redesign's whole data contract.
 *
 * The old surface staged a pile, committed, and THEN said something. This one answers before
 * anything is spent and updates as the selection changes, so a survivor can see what they are
 * holding rather than discover it afterwards.
 *
 * LAW 95 IS ENFORCED BY THE TYPE, NOT BY THE RENDERER, and that is the load-bearing decision
 * in this whole change. An unknown outcome contributes to `unknownCount` — an INTEGER — and to
 * nothing else. There is no id, no name, no domain, no material signature, no ordering that
 * could be correlated back: a body cannot leak an identity it was never handed, however
 * carelessly it renders. Every previous version of this rule lived in a sentence somebody had
 * to remember not to write, and this project has three decisions' worth of evidence about how
 * that ends. A count cannot be un-remembered into a name.
 *
 * KNOWN outcomes carry their display name, because the survivor has made one and naming what
 * you already know is not a spoiler — that has been the line since [[D-156]].
 */
export interface KnownOutcome {
    recipeId: string;
    /** The player-facing name. Safe: they have demonstrated this one. */
    name: string;
}

export interface CombineSlate {
    /** Named, selectable, committable via `makeChosen`. */
    known: KnownOutcome[];
    /**
     * HOW MANY other things this pile makes. Existence and count ONLY — never identity.
     * If you are tempted to widen this to carry anything else, re-read the note above.
     */
    unknownCount: number;
}

/**
 * THE OUTCOMES THAT GO IN THE WORLD RATHER THAN IN YOUR HANDS.
 *
 * A short explicit set, deliberately not derived from `domain === 'construction'`: the domain
 * is about what KNOWLEDGE a thing trains, and reading placement off it would silently enrol the
 * next construction recipe into a placement flow nobody wired. If something belongs here,
 * someone types it here — the same rule `SURVIVAL_BASIC` follows and for the same reason.
 */
//  `workmat` JOINS THESE TWO; `workbench` DELIBERATELY DOES NOT. The mat is sited — it is the
//  moment the survivor decides where the work happens. The bench then upgrades that mat IN
//  PLACE and is never sited separately, because asking "where does the bench go" when a mat
//  is already lying there would be asking a question whose answer is already on the ground.
//  Same shape [[D-165]] ruled for the shelter: improvements make THIS one better.
export const PLACED_OUTCOMES: ReadonlySet<string> = new Set(['shelter', 'storage', 'workmat']);

/**
 * WORK THAT RESTS ON THE GROUND RATHER THAN IN TWO HANDS — the exemption that keeps Law 220
 * from taking the first night away.
 *
 * Law 220 caps a bare-handed survivor at two controlled relations, and three of this game's
 * recipes want three materials: `axe`, `shelter` and `raft`. Applied without an exemption
 * that would gate a night-one SHELTER behind a workbench nobody could yet build — which is
 * not what §6.1 says at all. Its W0 row is titled *"Ground relation"* and lists `flat stone`
 * and `stump` among its own forms: a structure you build ON THE GROUND is already resting on
 * a work surface, and the ground holds it while your hands work. The raft is the same case
 * (it is lashed together on the beach, and `raftBlocker` already refuses it anywhere else).
 *
 * The AXE is the one genuine two-hand job in that list — haft, head and binding, held
 * together at once — and it is exactly the example the amendment sheet reaches for: *"the
 * workbench is the thing that holds what your second hand cannot."* So the axe is what the
 * third relation buys, and it is the only thing this slice takes away from bare hands.
 *
 * Typed here rather than derived, the same rule `SURVIVAL_BASIC` and `PLACED_OUTCOMES` follow:
 * if something belongs here, someone types it here and says why.
 */
export const GROUND_WORK: ReadonlySet<string> = new Set(['shelter', 'storage', 'workmat', 'raft']);

/** Does committing to this outcome need somewhere to put it? */
export function isPlaced(recipeId: string): boolean {
    return PLACED_OUTCOMES.has(recipeId);
}

export function combineSlate(state: GameState, materials: MaterialKind[]): CombineSlate {
    const pool = matchPool(materials);
    const known: KnownOutcome[] = [];
    let unknownCount = 0;
    for (const recipe of pool) {
        if (isRecipeKnown(state, recipe.id)) {
            known.push({ recipeId: recipe.id, name: recipeDisplayName(recipe.id) });
        } else {
            unknownCount += 1;
        }
    }
    return { known, unknownCount };
}

/**
 * EVERYTHING WITHIN REACH OF THIS COMBINE — held, plus an OPEN container's contents.
 *
 * THE SCOPE IS THE OPEN BOX AND NOTHING ELSE. `withStorage` is true only while a survivor is
 * standing at a built crate with it open in front of them; walking away closes it and the reach
 * shrinks back to what is carried. This is deliberately not a general "combine from anywhere"
 * rule — a crate you remember owning is not a crate you can reach into.
 *
 * ONE MAP, not two lists, because everything downstream — `matchPool`, the slate, the gate, the
 * charge — already speaks in "how much of this kind is there". Merging at the source means the
 * whole combine path is reused unchanged rather than taught about a second source.
 */
export interface CombineReach {
    counts: Partial<Record<MaterialKind, number>>;
    withStorage: boolean;
}

export function reachFor(state: GameState, storageOpen: boolean): CombineReach {
    const withStorage = storageOpen && state.storage.built;
    const counts: Partial<Record<MaterialKind, number>> = { ...state.inventory };
    if (withStorage) {
        for (const [kind, count] of Object.entries(state.storage.stored)) {
            if (typeof count !== 'number' || count <= 0) continue;
            const k = kind as MaterialKind;
            counts[k] = (counts[k] ?? 0) + count;
        }
    }
    return { counts, withStorage };
}

/**
 * SPEND ONE OF A KIND, held first and the box second.
 *
 * The order is the simplest rule that is also the right one: what is in your hands is what your
 * hands reach for. It matters only when a material is split across both, and choosing HELD
 * FIRST means a survivor who empties the box into a build still ends up carrying less, never
 * mysteriously more. Returns false if there was none anywhere — the caller has already gated on
 * the reach, so that is a bug rather than a refusal, and it fails loudly by doing nothing.
 */
export function spendFromReach(state: GameState, kind: MaterialKind, withStorage: boolean): boolean {
    //  THE ONE CATALYST, THE ONE EXCEPTION (ITEM 3, this batch). The stone hammer is staged
    //  and combined exactly like any other material — that is the whole point of moving it
    //  into `Inventory` — but it is USED, not used UP: [[D-172]]'s own ruling, "the hammer is
    //  the tool, and it was never consumed," predates this migration and does not bend for it.
    //  Confirmed present, not merely present-and-unconsumed: this returns `true` (the slot IS
    //  satisfied) without touching the count, so a staged pile of `[stonehammer, stone]`
    //  charges one stone and leaves the hammer exactly as it was.
    if (kind === 'stonehammer') return (state.inventory.stonehammer ?? 0) > 0;
    if ((state.inventory[kind] ?? 0) > 0) { state.inventory[kind] -= 1; return true; }
    if (withStorage) {
        const stored = state.storage.stored as Partial<Record<MaterialKind, number>>;
        if ((stored[kind] ?? 0) > 0) { stored[kind] = (stored[kind] ?? 0) - 1; return true; }
    }
    return false;
}

/**
 * TAKE `n` OF A KIND OUT OF THE BOX AND INTO YOUR HANDS.
 *
 * The inverse of `spendFromReach`, and it exists because `buildStorage` and `buildShelter` read
 * `state.inventory` and nothing else. Rather than teach two shipped builders about a second
 * source — and every future builder after them — a placed outcome moves what it needs into the
 * hands first and then builds exactly as it always did. That is also what a person does: you
 * take the timber out of the crate before you raise the frame.
 *
 * Moves what it can and reports whether the hands ended up holding enough, so the caller can
 * refuse before anything irreversible happens.
 */
export function drawIntoHands(state: GameState, kind: MaterialKind, need: number, withStorage: boolean): boolean {
    if (!withStorage) return (state.inventory[kind] ?? 0) >= need;
    const stored = state.storage.stored as Partial<Record<MaterialKind, number>>;
    while ((state.inventory[kind] ?? 0) < need && (stored[kind] ?? 0) > 0) {
        stored[kind] = (stored[kind] ?? 0) - 1;
        state.inventory[kind] = (state.inventory[kind] ?? 0) + 1;
    }
    return (state.inventory[kind] ?? 0) >= need;
}

/**
 * WHAT ANY BUILDABLE OUTCOME COSTS — read from the SAME constants the makers charge.
 *
 * Deliberately not derived from the recipe slots. A slot carries a TAG, tags are optional and
 * several raw kinds can satisfy one, so deriving the material would be a clever guess that
 * happens to be right today. What must be true is narrower and checkable: this has to agree
 * with what `buildStorage` and `buildShelter` actually deduct, because the caller tops the
 * hands up by these numbers and those two then spend. `tests/reach.test.ts` asserts the
 * agreement by building one of each and reading the inventory, so a retune that moves one and
 * not the other fails loudly instead of short-changing a survivor.
 */
export function recipeCost(recipeId: string): Array<{ kind: MaterialKind; amount: number }> {
    switch (recipeId) {
        //  PLACED — the two that go in the world.
        case 'storage': return [
            { kind: 'wood', amount: TUNE.storageWoodCost },
            { kind: 'stone', amount: TUNE.storageStoneCost }];
        case 'shelter': return [
            { kind: 'wood', amount: TUNE.shelterWoodCost },
            { kind: 'stone', amount: TUNE.shelterStoneCost },
            { kind: 'fiber', amount: TUNE.shelterFiberCost }];
        //  HAND-HELD — the ones that end up in your hands.
        case 'torch': return [
            { kind: 'wood', amount: TUNE.torchWoodCost },
            { kind: 'fiber', amount: TUNE.torchFiberCost }];
        case 'axe': return [
            { kind: 'wood', amount: TUNE.axeWoodCost },
            { kind: 'sharpblade', amount: TUNE.axeSharpbladeCost },
            { kind: 'fiber', amount: TUNE.axeFiberCost }];
        case 'spear': return [
            { kind: 'wood', amount: TUNE.spearWoodCost },
            { kind: 'sharpblade', amount: TUNE.spearSharpbladeCost },
            { kind: 'fiber', amount: TUNE.spearFiberCost }];
        case 'backpack': return [
            { kind: 'fiber', amount: TUNE.backpackFiberCost },
            { kind: 'wood', amount: TUNE.backpackWoodCost }];
        case 'stonehammer': return [
            { kind: 'wood', amount: TUNE.stoneHammerWoodCost },
            { kind: 'stone', amount: TUNE.stoneHammerStoneCost }];
        //  SESSION 1 — the workspace ladder. The bench lists its TIMBER and not its hammer:
        //  the hammer is a catalyst that `spendFromReach` never decrements, so drawing it
        //  into hands here would top up a material nothing then spends — the same reasoning
        //  that keeps `knap` out of this table entirely.
        case 'workmat': return [
            { kind: 'fiber', amount: TUNE.workmatFiberCost },
            { kind: 'stone', amount: TUNE.workmatStoneCost }];
        case 'workbench': return [
            { kind: 'wood', amount: TUNE.workbenchWoodCost }];
        case 'raft': return [
            { kind: 'wood', amount: TUNE.raftWoodCost },
            { kind: 'fiber', amount: TUNE.raftFiberCost },
            { kind: 'coconut', amount: TUNE.raftCoconutCost }];
        case 'fishingline': return [
            { kind: 'fiber', amount: TUNE.fishingLineFiberCost },
            { kind: 'sharpblade', amount: TUNE.fishingLineBladeCost }];
        case 'net': return [
            { kind: 'fiber', amount: TUNE.netFiberCost },
            { kind: 'sharpblade', amount: TUNE.netSharpbladeCost }];
        //  `knap` still falls through to here, but the reason changed (RULING, C1, this
        //  batch): it stages and combines like everything else above now, yet still has no
        //  case of its own, because `knapSharpblade` — its `Game.MAKERS` entry in game.ts —
        //  is already fully self-sufficient and spends the stone itself. An entry here would
        //  be drawn into hands and then spent AGAIN by the maker; leaving it out is what
        //  keeps this list agreeing with what actually gets deducted, which is the one
        //  invariant this function exists to hold (see the doc comment above).
        default: return [];
    }
}

/** Kept as the placed-only name for readers who want the narrower question. */
export function placedCost(recipeId: string): Array<{ kind: MaterialKind; amount: number }> {
    return isPlaced(recipeId) ? recipeCost(recipeId) : [];
}

/**
 * WHAT THIS SURVIVOR KNOWS HOW TO MAKE, AND WHAT THEY ARE SHORT OF — [[RULING 1]] restored.
 *
 * THE REPEAL THIS UNDOES. The Build panel listed every earned recipe with its cost as `x / n`
 * and named where the missing part comes from, so a survivor could see the whole of what they
 * had learned and what standing between them and it. Retiring that panel took the affordance
 * with it, and the slate did not inherit it: the slate answers "what does THIS PILE make", and
 * a pile can only contain materials you are already holding, so a plan you cannot currently
 * afford became invisible. Three separate checks caught the loss from three directions — a
 * minted blueprint no longer "put the row back", knowledge appeared to "switch off" when the
 * materials ran out, and the gated source hints vanished. An affordance that disappears in a
 * refactor is a silent repeal, which is the thing being corrected.
 *
 * KNOWLEDGE IS THE GATE; MATERIALS ONLY INFORM. That order is the whole ruling and it is the
 * exact inverse of the defect that killed the Build panel, where a row's PRESENCE depended on
 * what you were carrying — Law 216's "no possession may stand in for knowing". So: every
 * demonstrated recipe appears here, always. What changes with the reach is only the SHORTFALL
 * beside it.
 *
 * LAW 95 IS UNTOUCHED. This lists only what the survivor has demonstrated. Unknown patterns are
 * not here at all — they remain the slate's anonymous slots, property-hint-only, and nothing in
 * this structure can name one.
 */
export interface KnownRecipe {
    recipeId: string;
    name: string;
    /** Every material it wants, with how much is within reach right now. */
    needs: Array<{ kind: MaterialKind; need: number; have: number }>;
    /** Can it be made right now? Derived, never a gate on being listed. */
    afford: boolean;
    /**
     * TRUE ONLY FOR KNAP. Every other entry here is a BLUEPRINT — discovered once through
     * Combine, made repeatedly by staging its materials again. Knapping was never discovered
     * at all: `canKnapSharpblade` is `stoneHammer && stone >= cost`, "a standing gate," with
     * no blueprint step and no done-state (D-055) — and its own recipe has exactly ONE
     * material slot, where `canExperimentWith`'s ordinary floor wants two.
     *
     * REPURPOSED (RULING, C1, this batch). It no longer marks "reads a direct-tap action
     * instead of staging" — that shortcut is gone, knap stages and combines like everything
     * else now. It marks the one shape the body's own chip-picker needs to recognise as
     * attemptable from a SINGLE staged material, so a survivor holding only stone still sees
     * a chip to tap and a slate that shows what it makes, rather than "Pick two or more"
     * standing between them and the one recipe that was never a pair to begin with.
     */
    standalone?: boolean;
}

export function knownRecipes(state: GameState, storageOpen = false): KnownRecipe[] {
    const reach = reachFor(state, storageOpen);
    const out: KnownRecipe[] = [];
    //  ONE ENTRY PER RECIPE, not per blueprint record. §10.5 bumps a plan's version rather than
    //  minting a second copy, so duplicates should not exist — but a device check found
    //  "Hafted axe" listed twice, and this list is a statement about what you KNOW. You either
    //  know a thing or you do not; it cannot be known twice.
    const seen = new Set<string>();
    for (const bp of state.blueprints) {
        if (seen.has(bp.recipeId)) continue;
        seen.add(bp.recipeId);
        const cost = recipeCost(bp.recipeId);
        if (cost.length === 0) continue;
        const needs = cost.map(({ kind, amount }) => ({
            kind, need: amount, have: reach.counts[kind] ?? 0,
        }));
        out.push({
            recipeId: bp.recipeId,
            name: recipeDisplayName(bp.recipeId),
            needs,
            afford: needs.every((x) => x.have >= x.need),
        });
    }
    //  KNAP JOINS THE LIST IT WAS NEVER ABLE TO REACH — RULING (C1). Its own recipe has one
    //  slot, and `canExperimentWith` wants two to four, so it could never be discovered by
    //  Combine and never minted a blueprint to be found by the loop above. But "what this
    //  survivor knows how to make" is exactly what owning the hammer already means for
    //  knapping — the gate IS the knowledge, per its own doc comment — so it belongs on this
    //  list on the same terms, gated the same way the Build panel's own row always was.
    //  `isRecipeKnown` is the same question asked the same way — this branch stays because
    //  the row below also needs `have`, which that predicate does not carry.
    if (isRecipeKnown(state, 'knap')) {
        const have = reach.counts.stone ?? 0;
        out.push({
            recipeId: 'knap',
            name: recipeDisplayName('knap'),
            needs: [{ kind: 'stone', need: TUNE.knapStoneCost, have }],
            afford: have >= TUNE.knapStoneCost,
            standalone: true,
        });
    }
    //  Affordable first, then alphabetical — a stable order, so the list does not reshuffle
    //  under the survivor as they pick things up.
    return out.sort((a, b) => (Number(b.afford) - Number(a.afford)) || a.name.localeCompare(b.name));
}

/** Where a missing material comes from, in the survivor's own terms. Empty when nothing is short. */
export function shortfallSources(entry: KnownRecipe): MaterialKind[] {
    return entry.needs.filter((x) => x.have < x.need).map((x) => x.kind);
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
export function needsNaming(_state: GameState, materials: MaterialKind[]): boolean {
    //  THE DIRECTOR'S CASE, MEASURED: stone + wood on a fresh life returned
    //  `invented — "You work out how it fits: Stone hammer."` with no ask at all. This read
    //  `heldMatches(...).length >= 1`, so the never-auto-commit rule only ever fired for a plan
    //  the survivor ALREADY HELD — and a first-time pattern, which is most of the game, went
    //  straight to a committed product. "Never build silently" has to mean never.
    //
    //  So the question is asked whenever the pile MAKES anything. What the question can SAY
    //  still depends on what is known — see `namingQuestionFor` — because Law 95 forbids naming
    //  a product nobody has worked out. Naming the ATTEMPT is not naming the outcome.
    return recipesMatching(materials).length >= 1;
}

/**
 * THE QUESTION, IN THE RIGHT WORDS FOR HOW MANY ANSWERS THERE ARE.
 *
 * Named here rather than in the body because it is a claim about content — the director's
 * ruling is specifically that the attempt is NAMED ("you are trying to make an axe"), and a
 * sentence that must contain a particular thing is a sentence a test can hold to account.
 */
export function namingQuestionFor(offered: Recipe[], validCount = 0): string {
    //  THREE CASES, ONE SURFACE. What changes between them is only how much can honestly be
    //  said, which is the whole of Law 95's boundary:
    //
    //    2+ HELD PLANS — every one of them is named in the list beside this question, so the
    //      wording points at that list rather than describing it.
    //    1 HELD PLAN — the attempt is named outright, which is the director's own sentence.
    //    0 HELD PLANS — the ATTEMPT is named, the OUTCOME is not, because nobody has worked it
    //      out yet. "Put these together and see" promises nothing and hides nothing; it is the
    //      same act the survivor was about to perform, with a hand on the door first.
    if (offered.length >= 2) return 'You know more than one way to use these. Which are you making?';
    const only = offered[0];
    if (only) return `You are trying to make ${indefinite(recipeDisplayName(only.id))}. Go ahead?`;

    //  0 HELD, AND THE HALF THIS BRANCH USED TO LEAVE OUT. The director staged 14 wood and 13
    //  stone — which genuinely makes TWO things, a storage crate and a stone hammer — and was
    //  told only "put them together and see", then handed one of the two with no sign the other
    //  had ever been possible. The branch was right; it was simply silent about the choice it
    //  was making on his behalf.
    //
    //  Law 95 forbids NAMING what nobody has worked out, and this does not name them. Saying
    //  there is more than one thing here is a fact about the PILE, not a catalogue of products,
    //  and it is the difference between an honest experiment and a coin flipped behind a
    //  curtain: the survivor now knows that trying again may find something else, which is
    //  exactly what `resolveRecipe`'s undiscovered-first tie-break will actually give them.
    return validCount >= 2
        ? 'You have not worked these out yet, and there is more than one thing here. Put them together and see?'
        : 'You have not worked these out yet. Put them together and see?';
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

/**
 * TEMPORARY, BY EXPLICIT DIRECTION — every combine and every discovery succeeds.
 *
 * EXPORTED so the tests that assert failure can key off THIS constant rather than being
 * deleted or blind-skipped: they are `skipIf(COMBINE_ALWAYS_SUCCEEDS)`, so flipping this back
 * to `false` re-arms both the behaviour and its checks in one edit. A parked feature whose
 * tests have to be remembered separately is a gate with a delay on it, and this codebase has
 * paid for that shape more than once.
 */
export const COMBINE_ALWAYS_SUCCEEDS = true;

/** Does this pile have an outcome the survivor has NOT yet worked out? */
export function hasUnknownRival(state: GameState, materials: MaterialKind[]): boolean {
    return matchPool(materials).some((r) => !isRecipeKnown(state, r.id));
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
    const undiscovered = pool.filter((r) => !isRecipeKnown(state, r.id));
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

/** Is the survivor standing close enough for the work surface to be holding their work? */
export function atWorkspace(state: GameState): boolean {
    const w = state.workspace;
    if (!w.built) return false;
    return Math.hypot(state.player.x - w.x, state.player.y - w.y) <= TUNE.workspaceReachM;
}

/**
 * HOW MANY THINGS THIS SURVIVOR CAN HOLD STEADY, HERE, RIGHT NOW — Law 220 made a number.
 *
 * *"W0 begins with two active relations because the body can stabilize only so much. Added
 * surfaces, clamps, pegs, jigs, and fixtures expand controlled relations. **Experience alone
 * does not create extra invisible hands.**"*
 *
 * That last sentence is why this function reads the WORLD and never the survivor's knowledge,
 * technique or capacities. There is deliberately no term here that practice can move: the
 * third relation is bought with timber and a hammer, or it is not had at all.
 *
 * IT IS ALSO POSITIONAL, and that is the honest reading rather than a convenience. A bench
 * holds what your second hand cannot only while you are standing AT it; a bench across the
 * island is a fact about the island, not about the work in your hands. Walk away and you are
 * back to two, which is what a player would expect of a vice they left behind.
 *
 * RACKED JOINTS COUNT AS NO BENCH. W1's own named failure mode is `rack / overturn`, and a
 * frame that racks under load is not holding anything — so the third relation lapses until
 * the joints are re-tensioned. The bench itself is never destroyed: disrepair, never deletion.
 */
export function relationsFor(state: GameState): number {
    const w = state.workspace;
    if (w.tier === 'bench' && w.jointWear < 1 && atWorkspace(state)) return TUNE.relationsAtBench;
    //  The mat is W0 made real and adds nothing here — see `TUNE.relationsAtMat`'s own note.
    return TUNE.relationsAtW0;
}

/**
 * The N-material gate. Two to four, matching the crafting spec's own stated range — the old
 * hard pair was never the spec, it was the discovery probe's arity, and it turned out to make
 * two recipes permanently unreachable (see `resolveRecipe`).
 */
export function canExperimentWith(
    state: GameState,
    materials: MaterialKind[],
    //  ITEM 2 — the reach, defaulting to HELD ONLY. Every existing caller keeps exactly the
    //  behaviour it had; only a caller that knows a box is open passes anything else.
    storageOpen = false
): string | null {
    //  THE ARITY-1 KNAP EXCEPTION IS RETIRED (ITEM 3, this batch), NOT WIDENED. It stood
    //  here — `isKnapShape`, a single narrow floor-bend for `materials.length === 1` — because
    //  knapping needed the hammer's OWNERSHIP to satisfy a slot no staged material could fill.
    //  Now the hammer IS a staged material (`Inventory.stonehammer`, `materials.ts`'s new
    //  `tool` tag): "stage hammer + stone" is two DISTINCT materials, which the ordinary floor
    //  below already admits with no bend at all. The exception did not move, it stopped being
    //  needed — the same shape D-174's own report used for the axe's stale doc comments,
    //  applied to code that ran rather than prose that only described it.
    if (materials.length < TUNE.combineMinInputs) return 'Pick two different things to try together.';
    if (materials.length > TUNE.combineMaxInputs) return `That is more than you can hold together at once — ${TUNE.combineMaxInputs} at most.`;
    if (new Set(materials).size !== materials.length) return 'Pick two different things to try together.';
    //  ---- LAW 220's THIRD RELATION, THE GATE BOUNDARY 3 WAS ALWAYS WAITING ON ------------
    //
    //  `combineMaxInputs` above is the LADDER'S CEILING (§6.1's W2 "four to six"), and it has
    //  been the only limit in the game since staging shipped — so a bare-handed survivor could
    //  hold four loose parts steady, which is precisely what Law 220 says a body cannot do.
    //  The gate below is the law, finally built; the enabler that lifts it is built in the
    //  same slice, because [[D-092]] settled that "the gate and its enabler are one piece of
    //  work and must ship together" — a gate without a bench makes position 3 unreachable and
    //  fails the reachability-proof law at the first harness check.
    //
    //  GROUND WORK IS EXEMPT, and `GROUND_WORK`'s own doc says why at length: a shelter is
    //  built ON the ground, and §6.1 titles W0 "Ground relation" for exactly that reason.
    //  Asked of the POOL rather than of one resolved recipe, because the survivor has not
    //  chosen yet — if everything this pile could become rests on the ground, the ground can
    //  hold it.
    //
    //  THE REFUSAL NAMES THE ENABLER AND NEVER THE OUTCOME (Law 95, and Law 26's "the world
    //  tells you first"): it says a work surface would hold the rest, which is a fact about
    //  the survivor's hands, and it does not hint at what the pile would have made.
    const relations = relationsFor(state);
    if (materials.length > relations) {
        const pool = matchPool(materials);
        const restsOnTheGround = pool.length > 0 && pool.every((r) => GROUND_WORK.has(r.id));
        if (!restsOnTheGround) {
            if (relations >= TUNE.relationsAtBench) {
                return `You cannot hold ${materials.length} things steady at once, even braced.`;
            }
            //  ---- THE REFUSAL READS THE WORKSPACE (item 1, this batch) ---------------------
            //
            //  REPORTED TWICE as "the axe still does not work at the mat", and the gate was
            //  right both times — a mat is W0 and W0 is two relations. What was wrong is that
            //  the sentence never looked at what the survivor had actually built. A castaway
            //  who has laid a WORK MAT, standing on it, was told "a workbench would hold the
            //  third steady" — and a work mat is, to any reasonable reader, a workbench. The
            //  game named the missing thing in words the survivor believed described the
            //  thing they were standing on, so the truest reason read as a broken button.
            //
            //  Three states, three sentences, each naming the ONE next move: nothing laid,
            //  a mat under you that needs framing, and a mat you have walked away from.
            const w = state.workspace;
            if (w.built && w.tier === 'mat') {
                return atWorkspace(state)
                    ? 'A mat is a surface, not a grip. Framed up on legs it would hold the third piece for you.'
                    : 'Two hands, two things. Your work mat would take a frame — but you are not at it.';
            }
            if (w.built && w.tier === 'bench') {
                //  Standing away from a sound bench, or at a racked one — `relationsFor` has
                //  already decided which, so the sentence only has to say which is true.
                return atWorkspace(state)
                    ? 'The bench joints have gone slack — it moves under the work. Re-lay the surface and frame it again.'
                    : 'Two hands, two things. Your bench is not here to hold the third.';
            }
            return 'Two hands, two things. A workbench would hold the third steady while you work.';
        }
    }
    const reach = reachFor(state, storageOpen);
    for (const m of materials) {
        if ((reach.counts[m] ?? 0) <= 0) {
            return reach.withStorage
                ? 'You need all of those, in hand or in the box.'
                : 'You need all of those in hand to try them.';
        }
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
export function makeChosen(
    state: GameState,
    materials: MaterialKind[],
    recipeId: string,
    storageOpen = false
): ExperimentResult {
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
        return tryCombineWith(state, materials, EXPERIMENT_CHOICE, storageOpen);
    }
    const chosen = recipesMatching(materials).find((r) => r.id === recipeId);
    if (!chosen) return refuse('That is not one of the things these make.');
    //  ...and still nothing can be minted out of nothing: an unknown recipe is not choosable,
    //  which is what keeps a body offering a stale list from handing over the catalogue.
    if (!isRecipeKnown(state, recipeId)) {
        return refuse('You have not worked that out yet.');
    }
    return tryCombineWith(state, materials, recipeId, storageOpen);
}

/**
 * THE DELIBERATE TRIAL — the redesign's second verb, and the reason it is separate.
 *
 * Combine commits to a thing you KNOW. Discover commits to finding out what one of the grey
 * slots is. Splitting them is the whole point of the new surface: the old flow made "make the
 * axe" and "see what happens" the same button press with a question in between, so a survivor
 * who wanted to experiment had to first be offered something they already knew and then
 * decline it. Now the intent is chosen before the act, which is what `EXPERIMENT_CHOICE`
 * always meant and never had a control for.
 *
 * WHICH unknown it lands on is NOT decided here and deliberately so — `resolveRecipe`'s
 * undiscovered-first tie-break and its suspicion/rotation logic already answer that, and they
 * are the same answer the old generic path gave. This adds a door, not a rule.
 */
export function discoverWith(state: GameState, materials: MaterialKind[], storageOpen = false): ExperimentResult {
    const blocked = canExperimentWith(state, materials, storageOpen);
    if (blocked) return refuse(blocked);
    //  REFUSED ONLY WHEN THERE IS GENUINELY NOTHING LEFT TO LEARN — which means the pile HAS
    //  outcomes and you already hold every one of them. A pile that makes NOTHING is not that
    //  case: trying it is how [[D-055]]'s null-outcome journal gets written, and that is a
    //  teaching path, not a dead end. The old guard refused both situations identically and told
    //  a survivor they "already knew everything these make" about two things that make nothing.
    if (matchPool(materials).length > 0 && !hasUnknownRival(state, materials)) {
        return refuse('You already know everything these make.');
    }
    return tryCombineWith(state, materials, EXPERIMENT_CHOICE, storageOpen);
}

export function tryCombineWith(
    state: GameState,
    materials: MaterialKind[],
    chosenRecipeId?: string,
    storageOpen = false
): ExperimentResult {
    const withStorage = reachFor(state, storageOpen).withStorage;
    const blocked = canExperimentWith(state, materials, storageOpen);
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
            reason: namingQuestionFor(heldMatches(state, materials), matchPool(materials).length),
            blueprint: null,
            recipeId: null,
            spent: null,
        };
    }

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
        //  ---- THE ATTEMPT COSTS THE MATTER IT WAS MADE OF ---------------------------
        //
        //  DIRECTOR'S RULING: materials are LOST on a failed attempt, and a success is not a
        //  loss at all — it CONVERTS them into the thing. Until now this branch was the exact
        //  inverse: a pile that makes nothing cost nothing, while a pile that DID make
        //  something spent a unit of each and handed back only a plan. Trial and error was
        //  free and being right was the thing you paid for.
        //
        //  Charged at one unit of each staged kind — the same unit a successful attempt
        //  spends, which is what "at the same amount a successful craft would have cost"
        //  resolves to for a pile that matches no recipe and therefore has no cost table of
        //  its own to read. `spendFromReach` carries the catalyst exception with it, so a
        //  hammer staged as a tool is never eaten by a guess that did not come off.
        for (const m of materials) spendFromReach(state, m, withStorage);
        return {
            ok: true,
            outcome: 'no-relationship',
            reason: `${describeSet(materials)} do not go together — and that cost you the trying.`,
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
    //  ============ TEMPORARY, BY EXPLICIT DIRECTION — NOT A DELETION ============
    //
    //  Every combine and every discovery succeeds, for now. This is a PARKED DESIGN QUESTION,
    //  not a ruling that failure is wrong: what a near-miss should cost, and whether trial and
    //  error should be able to come up empty at all, is being decided separately. Flipping this
    //  one constant back to `false` restores the confidence curve exactly as it was — the curve,
    //  `successChanceFor`, `tryFactorsFor` and the whole learning-from-failure path are
    //  untouched below and above this line.
    //
    //  WHAT THIS COSTS, STATED PLAINLY rather than left for someone to discover: this is the
    //  ONLY caller of `transformOnFailure`, so Law 128's failure-transform — matter wearing,
    //  blades dulling, a stack breaking on the third attempt — has no live caller while this
    //  is true. It is dormant, not removed: `matter.ts`, `matterWear`, the save field and
    //  `tests/matter.test.ts` all stay exactly as they are and come straight back with the
    //  constant. Anyone reading this looking for why blades stopped dulling: it is this line.
    const succeeded = COMBINE_ALWAYS_SUCCEEDS || seedFraction(seed) < successChanceFor(state, domain);

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
    //  ITEM 2 — spent through the reach, held first and the box second. At `storageOpen: false`
    //  this is exactly `state.inventory[staged] -= 1`, which is what it replaced.
    //  ---- WHO PAYS, AND WHEN (DIRECTOR'S RULING, item 7) --------------------------------
    //
    //  *"Upon successful discovery it will deduct the resources and craft the item; upon
    //  failure it only deducts the materials."*
    //
    //  So a DISCOVERY that lands does not pay here. It used to spend one of each staged kind
    //  and hand back a plan — which meant working something out cost matter and produced no
    //  object, and the survivor then paid the recipe's real price a second time to build the
    //  thing they had just worked out. The recipe's OWN cost is charged instead, by the maker
    //  the caller runs, so the total is the price of the item and nothing more.
    //
    //  A PLACED outcome is the deliberate exception and pays nothing here either: a shelter
    //  cannot be handed over without asking where it goes, so it mints the plan, charges at
    //  siting time through its own builder, and is the one case where discovery and building
    //  stay two steps. Ordinary combining (`chosenRecipeId` naming a real recipe) is untouched
    //  and still spends exactly what it always did.
    const isDiscovery = chosenRecipeId === EXPERIMENT_CHOICE;
    if (!isDiscovery) {
        for (const staged of materials) spendFromReach(state, staged, withStorage);
    }

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
        //  A SIXTH INSTANCE OF ITEM 4'S OWN DEFECT CLASS, found while verifying arity-1
        //  support for knap (RULING, C1): this line still hardcoded the FIRST TWO staged
        //  materials — `[a, b].sort()` — exactly the "pair-only assumption survived the
        //  widening to four inputs because the widening happened in the GATE and nowhere
        //  else" bug the comment on the spend loop above already names and fixes there, just
        //  missed here. At arity 1 this produced `[stone, undefined]`, an invalid
        //  `MaterialKind[]`; at arity 3-4 it silently dropped a real input from the record.
        //  Currently inert — grep confirms `Blueprint.inputs` is written and never read
        //  anywhere in src/, so no live behaviour depended on the wrong value — but a
        //  type-unsafe landmine left for whichever future feature reads it first. Fixed the
        //  same way the spend loop was: the whole array, not the first two names for it.
        inputs: [...materials].sort() as MaterialKind[],
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
        //  DIRECTOR'S RULING: it is a SHELTER, and future improvements make THIS shelter
        //  better rather than replacing it with a differently-named tier. Nothing had to be
        //  restructured for that — there is no tier ladder in the model to begin with:
        //  `ShelterState` is one structure with `built`, `durability` and named `defects`, so
        //  "upgrade in place" is already the only thing it can do. "Lean-to" was a word in the
        //  prose, never a rung.
        case 'shelter': return 'Shelter';
        case 'storage': return 'Storage crate';
        case 'stonehammer': return 'Stone hammer';
        case 'knap': return 'Knapped blade';
        //  SESSION 1 — the two rungs of the workspace ladder that are built. Named for what
        //  they physically ARE, never for the capability they carry: "Workbench", never
        //  "Workbench (3 slots)". Law 219/167 is explicit that a bench opens operations and
        //  never recipes, and v2.8's forbidden-UI list names `recipe unlocked by Workbench
        //  Level 2` as an automatic failure — a name that advertised a slot count would be
        //  the same promise wearing a product name's clothes.
        case 'workmat': return 'Work mat';
        case 'workbench': return 'Workbench';
        //  THE FIVE THAT FELL THROUGH TO THE RAW ID. Every recipe added after this table was
        //  written kept its `default` — so the staging circle offered a survivor a position
        //  labelled "spear", lowercase, an internal id showing through as a product name. The
        //  director saw exactly that. A test now walks `allRecipes()` and fails if any id
        //  reaches the default, because a switch nobody is obliged to extend is a switch that
        //  goes stale the next time anything ships.
        case 'spear': return 'Fire-hardened spear';
        case 'backpack': return 'Canvas pack';
        case 'raft': return 'Lashed raft';
        case 'fishingline': return 'Baited line';
        case 'net': return 'Woven net';
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
