/**
 * CONTEXTUAL CONSTRUCTION (§9.6, Law 126 — Slice 2C Boundary 2).
 *
 * §9.6's sequence, in the order it gives it: **hold a demonstrated pattern carrier · stand at
 * a viable site · stage relevant matter nearby · choose the human outcome · place an initial
 * anchor · build and test.** Construction stops being a row in a global menu and becomes
 * something you do *somewhere*, with your hands, on ground you chose.
 *
 * WHY A GLOBAL BUILD BUTTON WAS ALWAYS WRONG, and not merely unfashionable. A menu that can
 * raise a shelter from anywhere says the site does not matter — so drainage, wind, distance
 * to water and the shape of the ground are all decoration, and the player learns, correctly,
 * that where they build is not a decision. §9.6's whole claim is the opposite: **the site IS
 * the decision**, and the interface has to be the one that makes it.
 *
 * THE HUMAN OUTCOME IS THE UNIT, NOT THE OBJECT. You do not choose "shelter"; you choose what
 * you need — **cover**, **raised sleep**, a **barrier**, **support**, **drainage**, or
 * **storage** — and the pattern you hold decides what that becomes. That is why the outcome
 * list is fixed and the recipe list is not: a survivor knows they need to be out of the rain
 * long before they know what a lean-to is called.
 *
 * WHAT THIS MODULE IS NOT. It never invents a pattern. It reads the SHIPPED spine — a
 * demonstrated blueprint, matter in hand, a site the world allows — and reports whether the
 * next step is possible and, when it is not, which of the six preconditions is missing. The
 * placement itself still runs through `buildShelter`/`buildStorage`, so there is exactly one
 * path that spends materials and exactly one that decides a grade.
 */
import { TUNE } from '../data/tune';
import { atLeast, ladderFor } from './ladder';
import type { GameState, MaterialKind } from './types';

/**
 * §9.6's six human outcomes. **Fixed and closed** — a seventh would mean the player is
 * choosing objects again, which is the thing this replaces.
 */
export type HumanOutcome =
    | 'cover' | 'raised-sleep' | 'barrier' | 'support' | 'drainage' | 'storage';

export interface OutcomeSpec {
    outcome: HumanOutcome;
    /** What a person would say they want. Never the object's name. */
    label: string;
    /** The pattern this outcome resolves to, once one is demonstrated. */
    recipeId: string;
    /** What has to be staged nearby for the attempt to be possible at all. */
    needs: Partial<Record<MaterialKind, number>>;
}

/**
 * Two outcomes ship because two structures do. The other four are DECLARED, not stubbed:
 * naming them here keeps the vocabulary honest — a survivor choosing "cover" is choosing from
 * a real list, not from whatever happens to be implemented — while `availableOutcomes` only
 * ever returns what a demonstrated pattern can actually produce. An outcome you can pick and
 * not get is worse than one that is not offered.
 */
export const OUTCOME_SPECS: OutcomeSpec[] = [
    {
        outcome: 'cover',
        label: 'Somewhere out of the weather',
        recipeId: 'shelter',
        needs: {
            wood: TUNE.shelterWoodCost,
            stone: TUNE.shelterStoneCost,
            fiber: TUNE.shelterFiberCost,
        },
    },
    {
        outcome: 'storage',
        label: 'Somewhere to put things down',
        recipeId: 'storage',
        needs: { wood: TUNE.storageWoodCost, stone: TUNE.storageStoneCost },
    },
];

/** The four §9.6 names with no demonstrated pattern behind them yet. Declared, never offered. */
export const DECLARED_OUTCOMES: HumanOutcome[] = ['raised-sleep', 'barrier', 'support', 'drainage'];

/** Which of §9.6's preconditions is not met. Exactly one is reported: the first one to fix. */
export type BlockedReason =
    | 'no-pattern'      // nothing demonstrated that produces this
    | 'no-matter'       // the staged matter is not there
    | 'bad-site'        // the ground will not take it
    | 'already-built';  // it exists

export interface SiteReading {
    outcome: HumanOutcome;
    label: string;
    recipeId: string;
    /** Can the anchor be placed and the thing built, here, now? */
    buildable: boolean;
    blocked: BlockedReason | null;
    /** One sentence naming what to fix. Never "requirements not met". */
    reason: string | null;
    /** What is short, so the player can go get it rather than guess. */
    missing: Partial<Record<MaterialKind, number>>;
}

/**
 * Is this ground viable? Kept as a pure predicate over what the BRAIN can know — distance
 * from what already stands. Mesh-level clearance stays in the body, where the geometry is,
 * and the body refuses separately; two checks, each owning what it can actually see.
 */
export function siteIsViable(state: GameState, x: number, y: number, exclude?: MovableKind): boolean {
    if (state.shelter.built && exclude !== 'shelter') {
        const d = Math.hypot(state.shelter.x - x, state.shelter.y - y);
        if (d < TUNE.constructionMinSpacingM) return false;
    }
    if (state.storage.built && exclude !== 'storage') {
        const d = Math.hypot(state.storage.x - x, state.storage.y - y);
        if (d < TUNE.constructionMinSpacingM) return false;
    }
    if (state.fire.built && exclude !== 'fire') {
        const d = Math.hypot(state.fire.x - x, state.fire.y - y);
        if (d < TUNE.constructionMinSpacingM) return false;
    }
    //  A FRAME IS TIMBER STANDING IN THE GROUND, so it takes a footprint exactly as the
    //  finished thing does. Without this a crate could be sited on top of a half-built
    //  shelter, and the survivor would have two objects fighting for one tap — which is the
    //  overlap the spacing rule exists to prevent, arriving through the one structure the
    //  rule had never heard of.
    if (state.construction && exclude !== 'construction') {
        const d = Math.hypot(state.construction.x - x, state.construction.y - y);
        if (d < TUNE.constructionMinSpacingM) return false;
    }
    return true;
}

/**
 * WHAT CAN BE PICKED UP AND PUT DOWN AGAIN (item 2, this batch).
 *
 * The workspace is included and is deliberately NOT in the spacing test above: a mat has
 * never been an obstacle to siting anything else, and making it one here would silently
 * change where a shelter may be built, which is a rule change nobody asked for. Moving a mat
 * still has to land on ground the world accepts — that check is the body's, where the mesh is.
 */
export type MovableKind = 'shelter' | 'storage' | 'fire' | 'workspace' | 'construction';

/** Has the survivor demonstrated a pattern that produces this outcome? §9.6's first step. */
export function hasPatternFor(state: GameState, spec: OutcomeSpec): boolean {
    return atLeast(ladderFor(state, spec.recipeId), 'demonstrated');
}

function shortfall(state: GameState, spec: OutcomeSpec): Partial<Record<MaterialKind, number>> {
    const missing: Partial<Record<MaterialKind, number>> = {};
    for (const [kind, need] of Object.entries(spec.needs) as Array<[MaterialKind, number]>) {
        const have = state.inventory[kind] ?? 0;
        if (have < need) missing[kind] = need - have;
    }
    return missing;
}

const MATERIAL_WORD: Record<string, string> = {
    wood: 'wood', stone: 'stone', fiber: 'fibre', sharpblade: 'a sharp blade',
    coconut: 'coconut', shellfish: 'shellfish', berries: 'berries',
};

/**
 * Read one outcome at one site. The order of the checks is the order §9.6 gives, so the
 * reason a player is told is the FIRST thing standing in their way rather than whichever
 * check happened to run last.
 */
export function readSite(
    state: GameState, spec: OutcomeSpec, x: number, y: number,
): SiteReading {
    const base = { outcome: spec.outcome, label: spec.label, recipeId: spec.recipeId };

    const built = spec.recipeId === 'shelter' ? state.shelter.built : state.storage.built;
    if (built) {
        return { ...base, buildable: false, blocked: 'already-built', missing: {},
            reason: 'You have one of these already.' };
    }
    if (!hasPatternFor(state, spec)) {
        return { ...base, buildable: false, blocked: 'no-pattern', missing: {},
            reason: 'You have no pattern for this yet. Put things together and find out how.' };
    }
    const missing = shortfall(state, spec);
    if (Object.keys(missing).length > 0) {
        const parts = (Object.entries(missing) as Array<[MaterialKind, number]>)
            .map(([k, n]) => `${n} more ${MATERIAL_WORD[k] ?? k}`);
        return { ...base, buildable: false, blocked: 'no-matter', missing,
            reason: `Not enough staged here — you need ${parts.join(' and ')}.` };
    }
    if (!siteIsViable(state, x, y)) {
        return { ...base, buildable: false, blocked: 'bad-site', missing: {},
            reason: 'Too close to what is already standing. Step away and try again.' };
    }
    return { ...base, buildable: true, blocked: null, missing: {}, reason: null };
}

/**
 * Everything the survivor could choose HERE. Only outcomes with a demonstrated pattern
 * appear — an outcome you can pick and not get is worse than one that is not offered — and
 * blocked-but-known ones are still returned so the surface can show them greyed with their
 * reason, exactly as the radial circle shows a blocked verb (Slice 2).
 */
export function availableOutcomes(state: GameState, x: number, y: number): SiteReading[] {
    return OUTCOME_SPECS
        .map((spec) => readSite(state, spec, x, y))
        .filter((r) => r.blocked !== 'no-pattern');
}

/** Is there anything at all to offer here? The gate the world-tap path asks before opening. */
export function siteHasAnything(state: GameState, x: number, y: number): boolean {
    return availableOutcomes(state, x, y).length > 0;
}
