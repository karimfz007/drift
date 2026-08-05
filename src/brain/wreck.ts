/**
 * THE WRECK — what the crossing arrives at, and what it costs to linger (the Wreck Slice).
 *
 * The Maritime Slice made the wreck REACHABLE and deliberately left it a destination marker:
 * you got there, it was recorded, and there was nothing to do. This gives it a body of work
 * and a reason to be careful.
 *
 * WHAT IT REUSES, WHICH IS EVERYTHING. The wreck's parts are ordinary `wreckpart` nodes in
 * `createNodes()`, worked with the same `gatherNode` verb as a tree, costing effort through
 * the same One Body Resolver, depleting and regrowing on the same clock machinery. There is
 * no exploration mechanic here. `explore the wreck` means: paddle out, move around a
 * structure, and use the verb this game has always had, in a place it has never worked.
 *
 * WHAT THIS MODULE ADDS is the one thing the island has no equivalent for: **the hull is not
 * inert.** Every part you take shifts what is left. That is the answer to "the crossing is
 * already tuned so a full reserve gets you there and not back — what makes the WRECK itself
 * a decision", and it is why lingering is a choice rather than a free harvest.
 *
 * ---------------------------------------------------------------------------------------
 * D-011, STRUCTURALLY, and by a different mechanism than the water's.
 *
 * `water.ts` keeps absence safe by living only on the online tick. Instability keeps it safe
 * by a stronger property: **it has no elapsed-time term that can RAISE it.** It rises by
 * `disturb()`, which is called from `gatherNode` — a player action, impossible offline — and
 * it falls by `settleOverGameHours`, which `reconcile` applies. So an absence can only ever
 * make the wreck SAFER, and that is not a check anyone has to remember: there is no code path
 * that could do otherwise. A property test asserts it across arbitrary states and spans.
 *
 * The harm, likewise, is dealt at the moment of a disturbance and nowhere else. There is no
 * "the wreck collapses while you are away", no timer, and no state a returning player can
 * wake into that they could not have walked away from.
 * ---------------------------------------------------------------------------------------
 *
 * THE FAIR-CHALLENGE CONTRACT, in this project's five-stage grammar — the same one the boar,
 * illness and the water already keep. **Two spoken warnings before anything is taken**, and
 * the stage that takes it does so at the moment the survivor chooses to work one more part.
 */
import { TUNE } from '../data/tune';
import { WRECK } from '../data/world';
import type { GameState, WreckState } from './types';

/**
 * How settled the hull is. Five stages; the first three cost nothing.
 *
 * `sound` and `shifting` are quiet on purpose. A game that narrates every ordinary moment has
 * no way left to raise its voice — the same reasoning that keeps `swimming` silent in
 * `water.ts` and a nascent illness from displacing exhaustion in the goal line.
 */
export type HullStage = 'sound' | 'shifting' | 'groaning' | 'giving-way' | 'coming-down';

export function hullStageOf(wreck: WreckState): HullStage {
    const v = wreck.instability;
    if (v >= TUNE.wreckInstabilityMax) return 'coming-down';
    if (v >= TUNE.wreckGivingWayAt) return 'giving-way';
    if (v >= TUNE.wreckGroaningAt) return 'groaning';
    if (v > 0) return 'shifting';
    return 'sound';
}

/** One plain sentence, or null when the hull has nothing to say. */
export function hullNote(stage: HullStage): string | null {
    switch (stage) {
        case 'sound': return null;
        case 'shifting': return null;
        case 'groaning': return 'The hull groans and settles under you. It does not like being taken apart.';
        case 'giving-way': return 'Metal is tearing somewhere below the waterline. Take what you have and go.';
        case 'coming-down': return 'The wreck shifts hard, and takes a piece of you with it.';
        default: return null;
    }
}

/** Is this stage one that will HURT the next time the survivor works a part? */
export function hullWillBite(stage: HullStage): boolean {
    return stage === 'giving-way' || stage === 'coming-down';
}

/**
 * Working a part shifts the hull. Pure — returns the next state, never mutates.
 *
 * This is the ONLY function in the codebase that raises instability, and it takes no elapsed
 * time. That is the D-011 guarantee stated as a signature rather than as a comment.
 */
export function disturb(wreck: WreckState, atGameHours: number): WreckState {
    return {
        ...wreck,
        instability: Math.min(
            TUNE.wreckInstabilityMax,
            wreck.instability + TUNE.wreckInstabilityPerPart,
        ),
        lastDisturbedAtGameHours: atGameHours,
    };
}

/**
 * The sea puts it back. Applied by `reconcile` over any span, online or offline, because
 * settling is absence making things BETTER and needs no special path.
 *
 * Clamped at zero and monotonically non-increasing by construction: there is no branch here
 * that can return a higher instability than it was given, whatever the elapsed time.
 */
export function settleOverGameHours(wreck: WreckState, gameHours: number): WreckState {
    if (!(gameHours > 0) || wreck.instability <= 0) return wreck;
    const settled = Math.max(0, wreck.instability - TUNE.wreckSettlePerGameHour * gameHours);
    return { ...wreck, instability: settled };
}

/** What a shift costs a survivor caught by it. Zero at every stage that has not been warned. */
export interface HullHarm {
    health: number;
    bleeding: number;
}

export function harmFromWorking(wreck: WreckState): HullHarm {
    //  Read the stage the survivor is working AT, before this action's own disturbance —
    //  they were told about this hull, and it is the hull they were told about that bites.
    //  Reading it after would charge them for a stage they were never warned of, which is
    //  precisely the contract this grammar exists to keep.
    return hullWillBite(hullStageOf(wreck))
        ? { health: TUNE.wreckShiftHealth, bleeding: TUNE.wreckShiftBleeding }
        : { health: 0, bleeding: 0 };
}

/** Is the survivor close enough to the wreck for its state to be worth reading? */
export function atWreckSite(state: GameState): boolean {
    return Math.hypot(state.player.x - WRECK.x, state.player.y - WRECK.y)
        <= TUNE.wreckArrivalRadiusM;
}

/**
 * The player-facing reading, for the goal line. Null anywhere but the wreck — a survivor on
 * the beach does not need to be told about a hull 115 m away, and saying so would make the
 * warning that matters just another line of ambient text.
 */
export function wreckNoteFor(state: GameState): string | null {
    if (!atWreckSite(state)) return null;
    return hullNote(hullStageOf(state.wreck));
}
