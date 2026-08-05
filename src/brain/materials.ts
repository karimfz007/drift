/**
 * BRAIN — the material family/tags schema (Ch.1 v3, D-055). Every carried material gets a
 * primary family plus optional secondary tags; a recipe slot matches a held material on
 * primary OR any tag. This pass's own recipes stay disjoint by design (wood/stone/fiber/
 * sharpblade each satisfy exactly one slot, unchanged behaviour from before this schema
 * existed) — the schema is genuinely used (recipes.ts's matching, the null-outcome
 * journal), but it is forward-compatible plumbing for future materials sharing a family or
 * tag (e.g. a later wire/bone pair), not a rebalance of what's craftable today.
 */

import type { MaterialKind } from './types';

export type MaterialFamily = 'organic' | 'mineral';

export type MaterialTag =
    | 'fuel' | 'woodwork' | 'textile' | 'masonry' | 'blade' | 'food' | 'buoyant'
    //  THE WRECK SLICE. `salvaged` marks the wreck-era family as a family — the one thing
    //  every one of them has in common is that it came from out there, and no recipe on this
    //  island can ask for it until someone crosses.
    | 'salvaged'
    /** A sealed medical store. Deliberately its own tag: medicine is not food, and the one
     *  thing that must never happen is a survivor eating it by accident through a shared tag. */
    | 'remedy';

export interface MaterialProfile {
    primary: MaterialFamily;
    tags: MaterialTag[];
}

/** One place, keyed by kind — the same convention `NODE_SPECS` (state.ts) already uses. */
export const MATERIAL_PROFILE: Record<MaterialKind, MaterialProfile> = {
    wood: { primary: 'organic', tags: ['fuel', 'woodwork'] },
    stone: { primary: 'mineral', tags: ['masonry'] },
    fiber: { primary: 'organic', tags: ['textile'] },
    berries: { primary: 'organic', tags: ['food'] },
    //  THE MARITIME SLICE — `buoyant`, and it is a SECOND tag rather than a reuse of `food`.
    //
    //  My first cut gave the raft's float slot `{ tag: 'food' }`, on the reasoning that
    //  coconut is the only food you would lash to anything. That immediately broke a real
    //  standing law, and its own test caught it in one run: *"berries go with nothing — food
    //  satisfies no structural slot."* Under a food slot, wood + fibre + berries resolved to a
    //  RAFT. The law is right and the recipe was wrong: a coconut husk floats and a berry does
    //  not, and that difference is a property of the material, not of the recipe that wants it.
    //
    //  So the property gets named. `food` stays structurally inert exactly as it was, and the
    //  raft's signature ({woodwork, textile, buoyant}) is unique because the tag is.
    coconut: { primary: 'organic', tags: ['food', 'buoyant'] },
    shellfish: { primary: 'organic', tags: ['food'] },
    /** Knapped from raw stone (Ch.1 v3) — a refined material, not gathered directly. */
    sharpblade: { primary: 'mineral', tags: ['blade'] },
    //  DROP 1 — meat is food and nothing else: no tag lets it be built with, so it can
    //  never be lashed into a shelter by a Try-Combining accident.
    meat: { primary: 'organic', tags: ['food'] },

    //  ---- THE WRECK-ERA FAMILY (the Wreck Slice) --------------------------------------
    //
    //  MINERAL, all but one, and that is not decoration: it is what stops them being fuel.
    //  A survivor who could burn hull plate would never need to fell another tree.
    //
    //  THEY CARRY `salvaged` AND NOTHING STRUCTURAL, and that is a correction I made to my
    //  own first cut rather than a default.
    //
    //  I first gave metal `blade` + `masonry`, wiring `textile`, glass `blade` — on the
    //  reasoning that the [[D-055]] tag schema exists precisely so a later material can share
    //  a tag, and this is the moment to spend it. That reasoning is right about the schema and
    //  wrong about THIS pass, because the cost gates in `state.ts` are still exact-kind:
    //  `canCraftAxe` asks for `sharpblade` by name. So a survivor holding hull plate would
    //  Try-Combine wood + metal + fibre, `resolveRecipe` would answer AXE on the `blade` tag,
    //  a blueprint would mint — and the Build panel would then demand a knapped stone blade
    //  they do not have. Discovery promising what the craft gate refuses is [[D-114]]'s exact
    //  defect shape, and I would have been inventing a fresh one.
    //
    //  So they are structurally inert this pass, exactly as `food` is, and their recipes
    //  arrive WITH their tags. The plumbing is not spent by tagging; it is spent by a recipe
    //  asking for `salvaged`, and that is the next pass's job.
    metal: { primary: 'mineral', tags: ['salvaged'] },
    wiring: { primary: 'mineral', tags: ['salvaged'] },
    glass: { primary: 'mineral', tags: ['salvaged'] },
    //  NOT `food`. A shared tag is how a survivor ends up eating the medical supplies by
    //  accident, and `remedy` exists so that can never resolve.
    medicine: { primary: 'organic', tags: ['salvaged', 'remedy'] }
};

/** What a recipe slot requires: a family, a tag, or both (either one satisfies it). */
export interface MaterialRequirement {
    family?: MaterialFamily;
    tag?: MaterialTag;
}

/** True if a held material kind satisfies a slot's requirement — primary OR any tag. */
export function materialSatisfies(kind: MaterialKind, requirement: MaterialRequirement): boolean {
    const profile = MATERIAL_PROFILE[kind];
    if (requirement.family && profile.primary === requirement.family) return true;
    if (requirement.tag && profile.tags.includes(requirement.tag)) return true;
    return false;
}

/**
 * EVERY material kind, in one place (Law 129 / playtest FIX).
 *
 * This exists because a hardcoded copy of it in the body layer omitted `sharpblade`, and that
 * one missing string blocked the whole discovery loop: the axe needs wood + sharpblade +
 * fibre, so a survivor holding a knapped blade could not select it, could not attempt the
 * axe, and could not proceed. The label for it already existed in the UI — only the
 * selectable list had drifted from the type.
 *
 * Anything offering materials to the player derives from HERE. A second list is a second
 * source of truth, and the first time they disagree the player loses a verb with no message.
 */
/**
 * GENUINELY DERIVED, at last. This was a hand-written list sitting under a test named "the
 * combinable list is DERIVED, so it cannot drift again" — it did not derive anything, it
 * merely happened to match, and it took adding `meat` for the gap to show. `MATERIAL_PROFILE` is
 * typed `Record<MaterialKind, MaterialProfile>`, so reading its keys means a new material
 * cannot be added without becoming combinable, which is the drift the original defect
 * (a missing `sharpblade`, which silently broke the whole axe route) actually was.
 */
export const ALL_MATERIAL_KINDS: MaterialKind[] = Object.keys(MATERIAL_PROFILE) as MaterialKind[];
