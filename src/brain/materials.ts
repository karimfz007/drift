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

export type MaterialTag = 'fuel' | 'woodwork' | 'textile' | 'masonry' | 'blade' | 'food';

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
    coconut: { primary: 'organic', tags: ['food'] },
    shellfish: { primary: 'organic', tags: ['food'] },
    /** Knapped from raw stone (Ch.1 v3) — a refined material, not gathered directly. */
    sharpblade: { primary: 'mineral', tags: ['blade'] }
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
