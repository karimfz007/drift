/**
 * THE RADIAL CIRCLE — what a tap can do here, and why it cannot do the rest (Slice 2).
 *
 * The rule the whole slice rests on: **a tap is the default verb.** When the survivor's
 * capability creates more than one thing worth doing at a target, and only then, the circle
 * divides. One option is never a menu; it is just the verb, and the tap performs it. This is
 * why the circle can be introduced without making the early game slower — a castaway with no
 * flask and no line taps the pond and drinks, exactly as before, and never sees a wheel.
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
 * THE SLICE'S CENTRAL RULE. A tap performs the default verb when there is exactly one thing
 * to do; the circle opens only when capability has produced a genuine choice.
 *
 * Note it counts AVAILABLE options, not total ones. A pond with a blocked "Fill flask"
 * segment still opens no circle for a survivor who has no flask — they would be choosing
 * between one real option and one grey one, which is a menu pretending to be a decision.
 */
export function tapOpensCircle(state: GameState, target: VerbTarget): boolean {
    return availableVerbs(state, target).length > 1;
}

/** What a tap does when it does NOT open a circle. Null if nothing is possible here. */
export function defaultVerb(state: GameState, target: VerbTarget): VerbOption | null {
    const usable = availableVerbs(state, target);
    return usable.length === 1 ? usable[0] : null;
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
