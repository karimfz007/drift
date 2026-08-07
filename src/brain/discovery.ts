/**
 * DISCOVERY ROUTES — how a castaway comes to suspect a thing is possible (Slice 2B Stage A).
 *
 * The pre-scan that opened this stage found the real shape of the problem: emptying the
 * manufacture catalogue is not a deletion, it is a DEPENDENCY INVERSION. Thirty-one harness
 * checks — and a new player's entire first night — run *through* the catalogue: craft the axe,
 * fell a tree, open the crash box, find the flask, and so on. Delete the list before a route
 * exists to each thing on it and the game becomes uncompletable. So the routes come first.
 *
 * THE PATTERN, per the shaping: **need + property + affordance.** All three, never fewer:
 *
 *   - **need** is a pressure the survivor is actually under, read from live state. Cold at
 *     night. Wood they cannot cut. More than they can carry. Not a quest flag — a fact.
 *   - **affordance** is having the makings in hand. You do not wonder how to lash something
 *     together while holding nothing.
 *   - **property** is what the material tells you when handled, which `affordance.ts` already
 *     supplies — and which, deliberately, never names a finished answer.
 *
 * WHAT THIS DOES AND DOES NOT DO. It moves a recipe from `physically-possible` to
 * `conceptually-suspected` — it makes the survivor *wonder*, and gives Try-Combine something
 * to be about. It never mints a blueprint, never names the product, and never puts a row in
 * the Build panel. The player still has to try the thing. That boundary is the whole pivot:
 * the game may tell you that you are cold and that fibre holds a knot; it may not tell you to
 * build a lean-to.
 *
 * INTERIM SIGNAL, stated so it is not mistaken for the design: "has handled this material" is
 * currently read from what the survivor carries, because inspection is not yet persisted.
 * When it is, `handled` becomes a real record of what was inspected rather than what is in
 * the pack. The routes below do not change when that lands; only this one predicate does.
 */
import { TUNE } from '../data/tune';
import type { GameState, MaterialKind } from './types';
import { timeOfDay } from './clock';

export interface DiscoveryRoute {
    recipeId: string;
    /** The pressure that makes this worth thinking about, in the player's own terms. */
    need: (state: GameState) => boolean;
    /** What must be in hand for the question to even arise. */
    makings: MaterialKind[];
    /** Why this need and these materials belong together — shown when the suspicion forms. */
    prompt: string;
}

/**
 * The routes, one per craftable that would otherwise need a catalogue row.
 *
 * Each need is a real reading of state, not a flag. That matters: a need the player does not
 * feel is a tutorial prompt wearing a mechanic's clothes, and it would put the catalogue back
 * one sentence at a time.
 */
export const DISCOVERY_ROUTES: DiscoveryRoute[] = [
    {
        //  Fire's own route, the one the shaping calls out as deliberately scaffolded. The
        //  need is the plainest in the game and arrives on schedule the first night.
        recipeId: 'torch',
        need: (s) => timeOfDay(s.gameHoursElapsed).isNight || s.warmth < TUNE.warmthLowThreshold,
        makings: ['wood', 'fiber'],
        prompt: 'The dark is closing in, and you are holding something that burns.',
    },
    {
        //  Cold at night with no roof. The shelter is the answer to a night, not to a list.
        recipeId: 'shelter',
        need: (s) => !s.shelter.built
            && (timeOfDay(s.gameHoursElapsed).isNight || s.warmth < TUNE.warmthLowThreshold),
        makings: ['wood', 'stone', 'fiber'],
        prompt: 'You will not last the night in the open, and there is timber at your feet.',
    },
    {
        //  Wood you cannot cut. The need is felt at the tree, by a survivor with no edge.
        recipeId: 'axe',
        need: (s) => !s.tools.axe && s.inventory.sharpblade > 0,
        makings: ['wood', 'sharpblade', 'fiber'],
        prompt: 'A blade is no use in the palm of your hand. It wants a handle.',
    },
    {
        //  FISHING — THE LINE. The need is HUNGER standing at water, which is the most
        //  ordinary situation on this island and the reason the line is the baseline method:
        //  a survivor works it out the first time they are hungry beside the pond with fibre
        //  in their hands. One making, because a line IS one material.
        recipeId: 'fishingline',
        need: (s) => s.hunger < TUNE.hungerLowHintAt && s.inventory.fiber > 0 && s.inventory.sharpblade > 0,
        makings: ['fiber', 'sharpblade'],
        prompt: 'There are fish in that water, and cord in your hands.',
    },
    {
        //  FISHING — THE NET. A much later thought, and its need says so: you do not invent
        //  a net until a line has taught you that one fish at a time is not enough. Gated on
        //  OWNING the line rather than on hunger alone, so the two discoveries arrive in the
        //  order that makes the second one meaningful.
        recipeId: 'net',
        need: (s) => s.tools.fishingLine && !s.tools.net && s.inventory.sharpblade > 0,
        makings: ['fiber', 'sharpblade'],
        prompt: 'One hook takes one fish. A wall of cord would take the shoal.',
    },
    {
        //  Stone that will not break by hand. Felt when you are holding stone and want an edge.
        recipeId: 'stonehammer',
        need: (s) => !s.tools.stoneHammer && s.inventory.stone > 0,
        makings: ['wood', 'stone'],
        prompt: 'Stone does not yield to fingers. Something heavier, swung.',
    },
    {
        //  THE RAFT (the Maritime Slice). The need is the hardest one in this file to state
        //  honestly, because the pressure a raft answers is not a vital falling — it is
        //  wanting to be somewhere the water will not let you get to.
        //
        //  So the need is READ FROM THE BODY, not from a flag and not from a quest: the
        //  survivor has been IN the sea. `breathWaterConfidence` above its innate floor means
        //  they have swum far enough, often enough, to have developed something — which means
        //  they have felt exactly how far 115 metres of open water is with only their arms.
        //  A castaway who has never been past their knees has no reason to think about a
        //  raft, and telling them to would be the catalogue coming back one sentence at a
        //  time (see this file's header).
        //
        //  The route deliberately does NOT fire merely for standing on the beach looking at
        //  the wreck. Looking is not a pressure; being out of breath halfway to something is.
        recipeId: 'raft',
        need: (s) => s.capacities.breathWaterConfidence > TUNE.capacityInnateFloor,
        makings: ['wood', 'fiber', 'coconut'],
        prompt: 'You have felt how far that water is. Wood floats, and you are holding the cord to bind it.',
    },
    {
        //  More than you can carry. The most physical need in the game, and the one a player
        //  discovers by being annoyed rather than by being told.
        recipeId: 'storage',
        need: (s) => !s.storage.built && carriedKinds(s) >= TUNE.discoveryStorageKinds,
        makings: ['wood', 'stone'],
        prompt: 'Your arms are full and the island keeps offering. Somewhere to put it down.',
    },
];

/** How many distinct material kinds the survivor is carrying — the "too much" signal. */
function carriedKinds(state: GameState): number {
    const kinds: MaterialKind[] = ['wood', 'stone', 'fiber', 'berries', 'coconut', 'shellfish'];
    return kinds.filter((k) => (state.inventory[k] ?? 0) > 0).length;
}

/**
 * Has this material been handled? See the INTERIM note in the header — read from the pack for
 * now, from a real inspection record once inspection persists.
 */
export function hasHandled(state: GameState, material: MaterialKind): boolean {
    return (state.inventory[material] ?? 0) > 0;
}

export interface Suspicion {
    recipeId: string;
    /** All three legs present — the survivor has reason to wonder. */
    suspected: boolean;
    needFelt: boolean;
    /** Which of the makings are actually in hand. */
    handled: MaterialKind[];
    missing: MaterialKind[];
    /** Shown only when suspected; never names the product. */
    prompt: string | null;
}

export function suspicionFor(state: GameState, recipeId: string): Suspicion | null {
    const route = DISCOVERY_ROUTES.find((r) => r.recipeId === recipeId);
    if (!route) return null;
    const handled = route.makings.filter((m) => hasHandled(state, m));
    const missing = route.makings.filter((m) => !hasHandled(state, m));
    const needFelt = route.need(state);
    //  ALL the makings, not some. Holding one stick is not the beginning of an idea; holding
    //  the stick and the cord at once is.
    const suspected = needFelt && missing.length === 0;
    return {
        recipeId,
        suspected,
        needFelt,
        handled,
        missing,
        prompt: suspected ? route.prompt : null,
    };
}

/** Everything the survivor currently has reason to wonder about. */
export function activeSuspicions(state: GameState): Suspicion[] {
    return DISCOVERY_ROUTES
        .map((r) => suspicionFor(state, r.recipeId))
        .filter((s): s is Suspicion => s !== null && s.suspected);
}

/** Does a discovery route exist for this recipe at all? The catalogue may not be emptied
 *  for anything this returns false for — that is the dependency the pre-scan found. */
export function hasDiscoveryRoute(recipeId: string): boolean {
    return DISCOVERY_ROUTES.some((r) => r.recipeId === recipeId);
}
