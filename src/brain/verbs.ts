/**
 * THE RADIAL CIRCLE — what a tap can do here, and why it cannot do the rest (Slice 2).
 *
 * The rule the whole slice rests on: **a tap is the default verb, always.** The circle opens
 * on HOLD. A castaway taps the pond and drinks whether or not they carry a flask, taps their
 * shelter and sleeps whether or not they carry mending wood — capability adds options to the
 * hold, and never taxes the tap.
 *
 * WHY IT LIVES IN THE BRAIN. Two interim hacks are being retired here, and both existed
 * because the body had no way to ask "what are my options at this thing?" — shelter's mend
 * and sleep were dispatched from inside the Build card, and storage was reached by a detour
 * through that same card. Each was a single-verb workaround for a missing plural. Answering
 * the plural question is a pure function of state, so it belongs here, where it can be
 * tested; the body's job is to draw the answer and route the tap.
 *
 * BLOCKED SEGMENTS STATE THEIR REASON, in Ch.2's nearest-true-reason language: a segment the
 * survivor cannot use is shown greyed with the ONE truest obstacle, never hidden and never
 * given a generic "you can't do that". Hiding it teaches nothing; a vague reason teaches
 * less than nothing, because the player invents a wrong rule and plays against it.
 */
import { TUNE } from '../data/tune';
import { canBrewRemedy, isIll } from './illness';
import type { GameState } from './types';
import { canBoardRaft, canMakeJournal, canRepairStructure, canThrustAt, isAtPond, isInDisrepair, journalShortfall, leaveRaftIsIntoWater } from './state';
import { canBindWound } from './injury';
import { defectPlace, worstDefect } from './upkeep';
import { handlineBlocker, haulNetBlocker, nearestSpot, setNetBlocker, spearFishBlocker } from './fishing';
import { nearestBoar } from './fauna';
import { droppedWithinReach } from './dropped';
import { readWrite } from './journal';

/** A single segment of the circle — or, when it is the only one, simply what a tap does. */
export interface VerbOption {
    id: string;
    /** Imperative, in the player's language. "Drink", not "consume water". */
    label: string;
    /** Can it be used right now? A false here is shown, greyed, never removed. */
    available: boolean;
    /**
     * The ONE truest obstacle, when blocked. Ch.2's nearest-true-reason rule: name the thing
     * standing closest to the player's intent, not the first condition the code happened to
     * check. Null when available.
     */
    reason: string | null;
}

export type VerbTarget = 'pond' | 'shelter' | 'storage' | 'fire' | 'boar' | 'dropped' | 'raft' | 'fishingspot';

/**
 * Does the survivor know how to fish? A capability, not an inventory item — Slice 2's
 * acceptance case turns on it, and the six-state ladder (D-086) will later replace this
 * boolean with a position on that ladder rather than a yes/no.
 */
export function canFish(state: GameState): boolean {
    return state.tools.fishingLine === true;
}

/**
 * Everything the survivor could want to do at this target, available or not.
 *
 * Order is stable and meaningful: the most ordinary act first, so the default verb of a
 * one-option target is also the first segment of a three-option one. A player who learns
 * "tap the pond to drink" keeps that muscle memory after the circle appears.
 */
export function verbsFor(state: GameState, target: VerbTarget): VerbOption[] {
    switch (target) {
        case 'pond': return pondVerbs(state);
        case 'shelter': return shelterVerbs(state);
        case 'storage': return storageVerbs(state);
        case 'fire': return fireVerbs(state);
        case 'boar': return boarVerbs(state);
        case 'dropped': return droppedVerbs(state);
        case 'raft': return raftVerbs(state);
        case 'fishingspot': return fishingSpotVerbs(state);
    }
}

/** The verbs a tap could actually perform — what the circle would show as usable. */
export function availableVerbs(state: GameState, target: VerbTarget): VerbOption[] {
    return verbsFor(state, target).filter((v) => v.available);
}

/**
 * THE DEFAULT-VERB LAW (C1, binding, governs the circle everywhere).
 *
 * **A tap ALWAYS fires the context's default verb** — the most frequent, most expected action
 * for that object. **The circle opens on HOLD**, or on a tap only when no sensible default is
 * available. Never both: a tap must not sometimes act and sometimes ask.
 *
 * This supersedes my first cut, which opened the circle on tap whenever two or more options
 * were available. That rule had a defect class in it, and C1 named it: a survivor carrying
 * wood who taps their shelter got a menu instead of sleep, so the single most frequent action
 * in the game silently became two taps. Counting options is not the same as knowing which one
 * the player wanted, and "more than one thing is possible" is a terrible reason to stop
 * doing the obvious one.
 *
 * The frequent-verb-slowdown pattern this exists to prevent, stated so it can be swept for:
 * **an object's most common action must never become slower because a rarer one became
 * possible.** Acquiring a capability may add options; it may never tax the ordinary act.
 */
const DEFAULT_VERB: Record<VerbTarget, string> = {
    //  Thirst is why you walk to water. Filling a flask is the errand you run while you are
    //  there — real, frequent, and still not the reason you came.
    pond: 'drink',
    //  Sleep is what a shelter is FOR. Mending is maintenance you do because you noticed.
    shelter: 'sleep',
    //  You open a box to see what is in it. Mending it is the rarer act, by a wide margin.
    storage: 'open-store',
    //  A fire is fed. Lighting a torch from it is occasional and only ever briefly possible.
    fire: 'feed-fire',
    //  A boar is not a thing you idly interact with. The default verb is the only verb
    //  that makes sense while one is in front of you, and it needs a spear in your hands.
    boar: 'thrust',
    //  A stack on the ground has exactly one thing you want from it.
    dropped: 'pick-up',
    //  THE MARITIME SLICE. `board` and `leave` are DISJOINT — you are either standing on it
    //  or you are not, and exactly one is ever available — so this circle can never reach
    //  two segments, let alone the five that broke the fire's ([[D-119]]'s verb-count
    //  ceiling). The same disjoint shape the shelter's sleep/mend and the store's
    //  deposit/withdraw already use, and the reason the raft costs the radial nothing.
    raft: 'board-raft',
    //  FISHING — the HANDLINE is the default, and it is the default because it is the
    //  baseline: the cheapest tool, the gentlest on the water, and the one a survivor will
    //  have first. The other two are deliberate acts reached by a hold, which is the same
    //  bargain the pond already strikes (tap to drink; hold for the flask and the line).
    fishingspot: 'cast-line',
};

/**
 * What a TAP does here. The declared default when it is available; otherwise the single
 * remaining option if there is exactly one; otherwise null, and only then does a tap ask.
 */
export function defaultVerb(state: GameState, target: VerbTarget): VerbOption | null {
    const usable = availableVerbs(state, target);
    const declared = usable.find((v) => v.id === DEFAULT_VERB[target]);
    if (declared) return declared;
    //  The default is blocked. One remaining option is still unambiguous — a survivor whose
    //  shelter has collapsed taps it and mends it, because that is the only thing to do.
    return usable.length === 1 ? usable[0] : null;
}

/**
 * Does a TAP open the circle? Only when there is no sensible default to fire — i.e. the
 * declared default is unavailable AND more than one alternative remains, so the game genuinely
 * cannot know which was wanted.
 */
export function tapOpensCircle(state: GameState, target: VerbTarget): boolean {
    return defaultVerb(state, target) === null && availableVerbs(state, target).length > 1;
}

/**
 * Does a HOLD open the circle? Whenever there is more than one thing to choose between.
 * This is the deliberate route to the rarer verbs, and it costs nothing to the frequent one.
 */
export function holdOpensCircle(state: GameState, target: VerbTarget): boolean {
    return availableVerbs(state, target).length > 1;
}

/** The declared default for a target, whether or not it is currently available. */
export function declaredDefaultVerbId(target: VerbTarget): string {
    return DEFAULT_VERB[target];
}

// ---- the targets ---------------------------------------------------------

/**
 * The canonical acceptance case. No flask and no line: drink only, no circle. Add a flask:
 * drink or fill, the circle divides in two. Add a fishing line: three segments.
 */
/**
 * THE RAFT'S CIRCLE. Two verbs that can never both be available, so it is a one-segment
 * circle that changes which segment it is — see `DEFAULT_VERB` above for why that matters
 * against [[D-119]]'s ceiling.
 *
 * `leave` states where you would land, because stepping off a hundred metres out is a
 * decision and it must never be a surprise. The reason field is doing its Ch.2
 * nearest-true-reason job in the one case that can actually block: too far to climb on.
 */
function raftVerbs(state: GameState): VerbOption[] {
    const built = state.raft.built;
    const near = canBoardRaft(state);
    const aboard = state.raft.aboard;
    return [
        {
            id: 'board-raft',
            label: 'Climb aboard',
            available: built && !aboard && near,
            reason: !built ? 'You have no raft.'
                : aboard ? 'You are already on it.'
                    : 'Too far — get alongside it first.',
        },
        {
            id: 'leave-raft',
            label: leaveRaftIsIntoWater(state) ? 'Slip into the water' : 'Step ashore',
            available: aboard,
            reason: aboard ? null : 'You are not on the raft.',
        },
    ];
}

/**
 * THE FISHING SPOT'S CIRCLE — four segments, three methods.
 *
 * Computed against the NEAREST spot rather than an id passed in, the same shape `boarVerbs`
 * uses for the thrust. That keeps `verbsFor`'s signature untouched, and it is honest: a
 * survivor standing at the water fishes THIS water, not one they have selected from a list.
 *
 * EVERY SEGMENT IS SHOWN, blocked ones greyed with their one truest reason, because the
 * reasons are the teaching here. "Too deep to stand and strike" is how a player learns that
 * spear-fishing is a wading act without ever reading a rule, and hiding it would leave them
 * concluding the spear is broken at the reef.
 */
function fishingSpotVerbs(state: GameState): VerbOption[] {
    const spot = nearestSpot(state);
    const depleted = spot !== null && !spot.available;
    return [
        {
            id: 'cast-line',
            label: 'Cast a line',
            available: handlineBlocker(state) === null,
            reason: handlineBlocker(state),
        },
        {
            //  Reeling in appears only while a line is actually out, so it never clutters
            //  the circle of a survivor who has not cast one.
            ...(state.fishing.line
                ? { id: 'reel-in', label: 'Reel it in', available: true, reason: null }
                : { id: 'set-net', label: 'Set the net', available: setNetBlocker(state) === null, reason: setNetBlocker(state) }),
        },
        ...(state.fishing.line
            ? [{ id: 'set-net', label: 'Set the net', available: setNetBlocker(state) === null, reason: setNetBlocker(state) }]
            : []),
        ...(state.fishing.net
            ? [{ id: 'haul-net', label: 'Haul the net', available: haulNetBlocker(state) === null, reason: haulNetBlocker(state) }]
            : []),
        {
            //  THE SPEAR'S SECOND TARGET. No new tool and no new verb — this is Drop 1's
            //  spear and Drop 1's thrust, given water to be aimed at. That is why this
            //  method cost a fraction of what the other two did.
            id: 'spear-fish',
            label: 'Strike at a fish',
            available: spearFishBlocker(state) === null,
            reason: spearFishBlocker(state) ?? (depleted ? 'This water is fished out. Give it time.' : null),
        },
    ];
}

function pondVerbs(state: GameState): VerbOption[] {
    const atPond = isAtPond(state);
    const notThere = atPond ? null : 'You are not at the water.';
    return [
        {
            id: 'drink',
            label: 'Drink',
            available: atPond && state.thirst < TUNE.thirstMax,
            reason: notThere ?? (state.thirst >= TUNE.thirstMax ? 'You are not thirsty.' : null),
        },
        {
            id: 'fill-flask',
            label: 'Fill flask',
            available: atPond && state.tools.flask && state.tools.flaskSips < TUNE.flaskCapacitySips,
            //  Nearest true reason: no flask beats a full flask, because a survivor without
            //  one needs to know the flask is the missing thing, not that it would be full.
            reason: notThere
                ?? (!state.tools.flask
                    ? 'You have nothing to carry water in.'
                    : state.tools.flaskSips >= TUNE.flaskCapacitySips ? 'The flask is already full.' : null),
        },
        {
            //  THE POND'S OWN FISH SEGMENT, which existed from Slice 2 and never did
            //  anything. It now routes to the same handline the fishing spot beside the pond
            //  offers, so a player who taps the water they already drink from finds the verb
            //  where they looked for it — and the spot's ring is right there to teach them
            //  where fishing actually happens.
            id: 'fish',
            label: 'Fish',
            available: atPond && canFish(state),
            reason: notThere ?? (!canFish(state) ? 'You have no line to fish with.' : null),
        },
    ];
}

/**
 * Shelter. Sleep and Mend were dispatched from inside the Build card — a single-verb hack
 * for a target that always had two things to do. They come here and the Build card loses
 * them; the point is replacement, not a second route to the same place.
 */
/**
 * BINDING A WOUND lives on the SHELTER, not in a menu: it is something you stop and do
 * somewhere, the same reasoning that put the journal on the fire. It is offered only when
 * there is actually blood to stop, so it never clutters the circle of an unhurt survivor.
 */
function bindVerbs(state: GameState): VerbOption[] {
    if (state.injuries.bleeding <= 0) return [];
    return [{
        id: 'bind-wound',
        label: 'Bind the wound',
        available: canBindWound(state),
        reason: canBindWound(state) ? null : `You need ${TUNE.injuryBindFiberCost} fibre to bind it.`,
    }];
}

function shelterVerbs(state: GameState): VerbOption[] {
    const built = state.shelter.built;
    const notBuilt = built ? null : 'There is no shelter here yet.';
    return [
        ...bindVerbs(state),
        {
            id: 'sleep',
            label: 'Sleep',
            available: built && !isInDisrepair(state.shelter),
            reason: notBuilt ?? (isInDisrepair(state.shelter) ? 'It has fallen in. Mend it first.' : null),
        },
        {
            //  ENTROPY & MAINTENANCE (v0.11 §8) — the segment NAMES THE PLACE it would work
            //  on. "Mend" told a survivor a number was low; "Mend the uphill footing" tells
            //  them where the building is failing and what one wood buys, which is the whole
            //  difference between a bar and a maintenance model.
            id: 'mend',
            label: worstDefect(state) ? `Mend ${defectPlace(worstDefect(state)!.id)}` : 'Mend',
            available: built && canRepairStructure(state, 'shelter'),
            reason: notBuilt
                ?? (state.inventory.wood < 1
                    ? 'You need wood to mend it.'
                    //  Nothing outstanding at any named place AND a full bar is the only
                    //  state that genuinely has nothing to do.
                    : (state.shelter.durability >= TUNE.structureDurabilityMax && !worstDefect(state))
                        ? 'It is sound. Nothing to mend.'
                        : null),
        },
    ];
}

/**
 * Storage. Reached by a detour through the Build card, which is why tapping the box was
 * never the way in. Opening it is the ordinary act and stays the default; mending is the
 * second segment, and appears only when it is actually needed.
 */
/**
 * THE STORAGE DECISION, made into two verbs. This is where D-068's actual choice lives: a
 * carried journal is useful to YOU and burns with you; a stored one is useful to WHOEVER
 * COMES NEXT and you cannot write in it from across the island. The game never advises which
 * — it only makes both possible and lets the consequence arrive at the death review.
 */
function journalStorageVerbs(state: GameState, atBox: boolean, notThere: string | null): VerbOption[] {
    if (!state.journal.exists) return [];
    return [{
        id: state.journal.carried ? 'store-journal' : 'take-journal',
        label: state.journal.carried ? 'Leave the journal here' : 'Take the journal',
        available: atBox,
        reason: notThere,
    }];
}

function storageVerbs(state: GameState): VerbOption[] {
    const built = state.storage.built;
    const notBuilt = built ? null : 'There is no store here yet.';
    return [
        {
            id: 'open-store',
            label: 'Open',
            available: built,
            reason: notBuilt,
        },
        {
            id: 'mend-store',
            label: 'Mend',
            available: built && canRepairStructure(state, 'storage'),
            reason: notBuilt
                ?? (state.storage.durability >= TUNE.structureDurabilityMax
                    ? 'It is sound. Nothing to mend.'
                    : state.inventory.wood < 1
                        ? 'You need wood to mend it.'
                        : null),
        },
        ...journalStorageVerbs(state, built, notBuilt),
    ];
}

/**
 * A STACK ON THE GROUND. One verb, because there is only one thing to want — and it names
 * what is there and how long it has, so the despawn clock is never a silent surprise.
 */
function droppedVerbs(state: GameState): VerbOption[] {
    const near = droppedWithinReach(state)[0];
    if (!near) return [];
    return [{
        id: 'pick-up',
        label: `Pick up ${near.amount} ${near.kind}`,
        available: true,
        reason: null,
    }];
}

/**
 * THE BOAR'S OWN VERB. One entry, deliberately: there is no "inspect", no "wait", no menu of
 * ways to relate to a charging animal. You have a spear and you use it, or you do not have
 * one and the circle says so in the one sentence that matters.
 */
function boarVerbs(state: GameState): VerbOption[] {
    const nearest = nearestBoar(state.boars, state.player.x, state.player.y);
    const inReach = nearest !== null && canThrustAt(state, nearest.id);
    return [
        {
            id: 'thrust',
            label: 'Thrust',
            available: state.tools.spear && inReach,
            reason: !state.tools.spear
                ? 'You have nothing to fight it with.'
                : !inReach ? 'Too far. You would have to close.' : null,
        },
    ];
}

/** "You need 2 more fibre and 1 more wood." Named amounts, never "requirements not met". */
function shortfallReason(missing: Record<string, number>): string | null {
    const parts = Object.entries(missing)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} more ${k === 'fiber' ? 'fibre' : k}`);
    return parts.length === 0 ? null : `You need ${parts.join(' and ')}.`;
}

function fireVerbs(state: GameState): VerbOption[] {
    const built = state.fire.built;
    const notBuilt = built ? null : 'There is no fire here yet.';
    const lit = state.fire.fuel > 0;
    return [
        {
            id: 'feed-fire',
            label: 'Feed',
            available: built && state.inventory.wood > 0,
            reason: notBuilt ?? (state.inventory.wood <= 0 ? 'You have no wood to feed it.' : null),
        },
        {
            id: 'light-torch',
            label: 'Light torch',
            available: built && lit && state.torch.owned && !state.torch.lit,
            reason: notBuilt
                ?? (!state.torch.owned
                    ? 'You have no torch to light.'
                    : !lit ? 'The fire is out.'
                        : state.torch.lit ? 'Your torch is already lit.' : null),
        },
        {
            //  MAKING one is a fire act too: the charcoal to write with comes out of it.
            //  Putting it here rather than in the Build card also means the journal is
            //  discovered where it is used, which is how every other object in this game is
            //  meant to be met.
            id: 'make-journal',
            label: 'Make a journal',
            available: built && lit && canMakeJournal(state),
            reason: notBuilt ?? (!lit ? 'The fire is out — no charcoal to write with.'
                : state.journal.exists ? 'You already have one.'
                    : shortfallReason(journalShortfall(state))),
        },
        //  THE JOURNAL ([[D-068]]) LIVES ON THE FIRE, and nowhere else.
        //
        //  It could have been a Backpack action — it is an object you carry, after all — and
        //  that would have been the easy place to put it. It is on the fire because D-068's
        //  own words are "written by fire": the act needs a PLACE, and putting it in a menu
        //  would have quietly deleted the cost that makes the whole mechanic honest. You have
        //  to have built a fire, be standing at it, and spend the hour there.
        {
            id: 'write-journal',
            label: 'Write',
            available: built && lit && readWrite(state).canWrite,
            //  The journal's own reader already computes the ONE truest obstacle in D-068's
            //  order; re-deriving it here would be a second opinion that eventually disagrees.
            reason: notBuilt ?? (!lit ? 'The fire is out. You cannot write in the dark.' : readWrite(state).reason),
        },
        {
            //  DROP 3 — THE REMEDY, on the fire for the same reason the journal is: it has
            //  to be steeped, so it needs a PLACE and an hour rather than a menu entry.
            //  This is the fifth verb on the fire, which is exactly the load the radial
            //  circle was built to carry — a precedence order could not arbitrate it.
            id: 'brew-remedy',
            label: 'Brew a remedy',
            available: built && lit && canBrewRemedy(state),
            reason: notBuilt ?? (!lit ? 'The fire is out — nothing to steep it over.'
                : !isIll(state.illness) ? 'You are well. Nothing to treat.'
                    : `You need ${TUNE.remedyFiberCost} fibre and ${TUNE.remedyBerryCost} berries.`),
        },
    ];
}
