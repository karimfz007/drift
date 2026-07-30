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
import type { GameState } from './types';
import { canRepairStructure, isAtPond, isInDisrepair } from './state';

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

export type VerbTarget = 'pond' | 'shelter' | 'storage' | 'fire';

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
function shelterVerbs(state: GameState): VerbOption[] {
    const built = state.shelter.built;
    const notBuilt = built ? null : 'There is no shelter here yet.';
    return [
        {
            id: 'sleep',
            label: 'Sleep',
            available: built && !isInDisrepair(state.shelter),
            reason: notBuilt ?? (isInDisrepair(state.shelter) ? 'It has fallen in. Mend it first.' : null),
        },
        {
            id: 'mend',
            label: 'Mend',
            available: built && canRepairStructure(state, 'shelter'),
            reason: notBuilt
                ?? (state.shelter.durability >= TUNE.structureDurabilityMax
                    ? 'It is sound. Nothing to mend.'
                    : state.inventory.wood < 1
                        ? 'You need wood to mend it.'
                        : null),
        },
    ];
}

/**
 * Storage. Reached by a detour through the Build card, which is why tapping the box was
 * never the way in. Opening it is the ordinary act and stays the default; mending is the
 * second segment, and appears only when it is actually needed.
 */
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
    ];
}

/** Fire. Feeding it is the ordinary act; lighting a torch needs one in hand. */
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
    ];
}
