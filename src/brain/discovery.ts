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
        //  FIRE'S OWN ROUTE, AND THE ONE WHOSE NEED IS NOW UNCONDITIONAL — director's ruling.
        //
        //  It read `isNight || warmth < low`, so the thought was only available to a survivor
        //  who was already cold or already in the dark. That is a defensible model of NEED and
        //  a bad model of DISCOVERY: a person holding a stick and a handful of dry fibre in
        //  full daylight can work out what they are for, and making them wait for dusk to be
        //  allowed to think it is the game withholding an idea until its cue.
        //
        //  So the route now fires on the makings alone. Everything else about the scaffold is
        //  unchanged: `makings` still gates it on wood AND fibre genuinely in hand, the prompt
        //  still names a need and a material and never the product, and it still produces a
        //  SUSPICION rather than a row — `revealedInPanel` requires `demonstrated`, which only
        //  making one can give. Law 113 (scaffold the basics) and Law 95 (never name what is
        //  unworked-out) both hold; what changes is that the clock no longer decides when a
        //  survivor is permitted to have the idea.
        recipeId: 'torch',
        need: () => true,
        makings: ['wood', 'fiber'],
        prompt: 'Dry fibre, and something to wrap it around. That would take a flame and hold it.',
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
        //  KNAPPING — THE HINGE OF THE WHOLE TOOL TREE, AND THE ONE RECIPE WITH NO ROUTE.
        //
        //  ITEM 3's real gap, found by reproducing the director's exact inventory (6 wood, 25
        //  stone, 5 fibre): the axe wants `{tag:'blade'}` and wood+stone+fibre resolves to a
        //  SHELTER, so the axe was never refused by a gate — it simply was not what he was
        //  holding the makings of. The chain is hammer -> knap -> blade -> axe, and the axe's
        //  own route needs `sharpblade > 0`, so it cannot speak until the blade exists.
        //
        //  Knap sat between them saying nothing. It is deliberately blueprint-less (a standing
        //  gate: known the moment you own a hammer, see `isRecipeKnown`), and being unroutable
        //  was treated as following from that — but "known" and "mentioned" are different
        //  facts, and a survivor holding a hammer and a pile of stone was told about neither
        //  the blade nor what it was for. Every other rung of that tree has a route; this one
        //  is the rung the axe hangs from.
        recipeId: 'knap',
        need: (s) => s.inventory.stonehammer > 0 && s.inventory.stone > 0 && s.inventory.sharpblade === 0,
        makings: ['stonehammer', 'stone'],
        prompt: 'The hammer is for more than breaking. Struck right, stone comes away with an edge.',
    },
    {
        //  THE WORK MAT (SESSION 1). The need is the one the axe route creates and could not
        //  answer: a survivor holding haft, head and binding has been TOLD, by the gate's own
        //  refusal, that two hands cannot hold three things — and until this route existed
        //  nothing in the game ever mentioned a work surface again. D-176 shipped the gate and
        //  its enabler together and still left the enabler unhinted, which is the same
        //  reachability gap one layer up: buildable, and unfindable.
        //
        //  Felt when the survivor is carrying more than two things worth putting together.
        recipeId: 'workmat',
        need: (s) => !s.workspace.built && s.inventory.fiber > 0 && s.inventory.stone > 0,
        makings: ['fiber', 'stone'],
        prompt: 'Work on the ground and the ground takes half of it. Somewhere flat, and dry.',
    },
    {
        //  THE BENCH (SESSION 1). Needs a mat under it, and a hammer to drive the pegs — so
        //  the need reads exactly the state a survivor is in when they have laid a surface and
        //  found it is still only two hands' worth of help.
        recipeId: 'workbench',
        need: (s) => s.workspace.built && s.workspace.tier === 'mat'
            && s.inventory.stonehammer > 0 && s.inventory.wood > 0,
        makings: ['wood', 'stonehammer'],
        prompt: 'A surface holds nothing back. Legs, braced, and a top that will not move.',
    },
    {
        //  Stone that will not break by hand. Felt when you are holding stone and want an edge.
        recipeId: 'stonehammer',
        need: (s) => s.inventory.stonehammer === 0 && s.inventory.stone > 0,
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
        //  SESSION 4 — the third making is a PONTOON now, not four coconuts. The need is
        //  untouched, because it was always right: what makes a survivor think about a raft is
        //  having felt how far that water is.
        makings: ['wood', 'fiber', 'pontoon'],
        prompt: 'You have felt how far that water is. A deck, cord to bind it, and something under it that floats.',
    },
    {
        //  THE PONTOON (Session 4) — and the need is the raft's need one step earlier.
        //
        //  READ FROM THE BODY, like the raft's own: a survivor who has been in the sea knows
        //  what will not hold them up. The prompt names a PROBLEM and never the product — the
        //  pivot law this file's header states — so it wonders about what floats rather than
        //  announcing "you can make a hollowed float".
        //
        //  It sits BEFORE the raft in this list on purpose: routes are read in order, and the
        //  thing you need first should be the thing you are told about first.
        recipeId: 'pontoon',
        need: (s) => s.capacities.breathWaterConfidence > TUNE.capacityInnateFloor,
        makings: ['wood', 'fiber', 'sharpblade', 'stonehammer'],
        prompt: 'A log holds a body up until it soaks. Hollowed out and plugged at both ends, it would hold much more.',
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
