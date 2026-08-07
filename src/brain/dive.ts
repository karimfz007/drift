/**
 * DIVING — going under, and getting back up (the Underwater Slice).
 *
 * The Maritime Slice made the sea a place you can be ON. This makes it a place you can be IN.
 * The difference is one resource the surface never charged you for: air.
 *
 * WHAT IT REUSES, WHICH IS ALMOST EVERYTHING. Depth is read from `waterDepthAt`, the same
 * function the shore, the wading band and the swim rule already derive from. Cold comes
 * through `netHeatFlowPerGameHour`'s existing evaporative term, scaled by depth — one new
 * INPUT to the shipped heat balance, not a second opinion about heat. Salvage is ordinary
 * `gatherNode` on ordinary nodes. Development goes through `trainingStimulus` and
 * `developCapacity`, exactly as swimming does.
 *
 * WHAT IT ADDS is the air budget, and that is the whole of the new mechanic: a reserve that
 * only falls while you are under, only refills at the surface, and is the clock every other
 * risk down here is measured against. **Surfacing in time is the skill.** Everything else —
 * the cold, the fumbling, the salvage you did not quite reach — is a reason to stay one
 * moment longer than the air allows.
 *
 * ---------------------------------------------------------------------------------------
 * D-011, BY THE SAME STRUCTURE AS THE BOAR AND THE WRECK.
 *
 * `Session.advanceDive` is the ONLY function that lowers air, and it runs on the online tick
 * and nowhere else. `reconcile` cannot reach it — there is no elapsed-time term on air at all,
 * so no absence of any length can spend a single breath.
 *
 * And the absence path does not merely decline to harm: it SURFACES the diver and restores the
 * reserve (`surfaceOnAbsence`). A survivor who closes the tab underwater has not been holding
 * their breath for eight hours — they came up, because that is what a person does, and because
 * absence making things better is always legal where absence making them worse never is.
 * A property test sweeps arbitrary submerged bodies across three-day absences.
 * ---------------------------------------------------------------------------------------
 *
 * THE FAIR-CHALLENGE CONTRACT, in this project's five-stage grammar — the boar's, the
 * illness's, the water's and the wreck's. **Two spoken warnings before anything is taken**,
 * and the stage that takes it is §12's `unsafe-continued`: a diver who stayed down after being
 * told twice.
 */
import { TUNE } from '../data/tune';
import { waterDepthAt } from '../data/world';
import { developCapacity, trainingStimulus, type CapacityScores, type TrainingContext } from './capacities';
import type { GameState } from './types';

/** How deep the water is under a point, clamped at zero on dry land. */
export function depthAt(x: number, y: number): number {
    return Math.max(0, waterDepthAt(x, y));
}

/** How deep the survivor could go here. Zero anywhere they cannot submerge at all. */
export function divableDepthOf(state: GameState): number {
    //  Aboard the raft you are on the water, not in it — the same rule `isSwimming` keeps.
    if (state.raft.aboard) return 0;
    return depthAt(state.player.x, state.player.y);
}

/** Deep enough to be worth going under? Below this a dive is a duck, not a descent. */
export function canSubmerge(state: GameState): boolean {
    return divableDepthOf(state) >= TUNE.diveMinDepthM;
}

/**
 * How much air this body holds.
 *
 * `breathWaterConfidence`'s SECOND producer reads it here, and its first — swimming — is what
 * fills it. A practised diver holds meaningfully more, and never without limit: §12's boundary
 * for this capacity is "does not extend human physiology without limit", so the gain is a
 * bounded fraction of the base rather than a multiplier that runs away.
 */
export function airCapacityOf(capacities: CapacityScores): number {
    const c = clamp01(capacities.breathWaterConfidence / 100);
    return TUNE.diveAirCapacityBase * (1 + TUNE.diveAirCapacityFromConfidence * c);
}

/**
 * THE FIVE STAGES. `surfaced` is the absence of the situation rather than a stage of it, kept
 * out of the grammar so a reading can never describe a diver who is not under.
 *
 * `holding` is deliberately SILENT. A game that narrates every ordinary moment has no way left
 * to raise its voice, and the two warnings below only work because the stage before them says
 * nothing — the same reasoning that keeps `swimming` quiet in `water.ts`.
 */
export type DiveStage = 'surfaced' | 'holding' | 'burning' | 'failing' | 'blacking-out';

export function diveStageOf(state: GameState): DiveStage {
    if (!state.dive.submerged) return 'surfaced';
    const air = state.dive.air;
    if (air <= 0) return 'blacking-out';
    if (air <= TUNE.diveFailingAir) return 'failing';
    if (air <= TUNE.diveBurningAir) return 'burning';
    return 'holding';
}

/** One plain sentence, or null when there is nothing worth saying. */
export function diveNote(stage: DiveStage): string | null {
    switch (stage) {
        case 'surfaced': return null;
        case 'holding': return null;
        case 'burning': return 'Your chest is starting to burn. The surface is up there somewhere.';
        case 'failing': return 'You are fumbling. Go UP, now, and take nothing with you.';
        case 'blacking-out': return 'The light narrows. You are drowning.';
        default: return null;
    }
}

/** Is the water taking health right now? Exactly one stage may, and it is the last. */
export function isDrowningAt(stage: DiveStage): boolean {
    return stage === 'blacking-out';
}

export interface DiveCosts {
    /** Air per game hour. Positive is a DRAIN. */
    airPerGameHour: number;
    /** Health per game hour. Non-zero only at `blacking-out`. */
    healthPerGameHour: number;
    stage: DiveStage;
    depthM: number;
}

/**
 * What being under costs, per game hour.
 *
 * DEEPER IS DEARER, and it is one term rather than a table: the air rate scales with depth,
 * because a diver at ten metres is working against more water than one at three. That single
 * multiplier is what makes depth FELT rather than merely displayed.
 */
export function diveCostsFor(state: GameState): DiveCosts {
    const stage = diveStageOf(state);
    const depthM = divableDepthOf(state);
    if (stage === 'surfaced') {
        return { airPerGameHour: 0, healthPerGameHour: 0, stage, depthM };
    }
    const depthFactor = 1 + depthM * TUNE.diveAirCostPerMetre;
    return {
        airPerGameHour: TUNE.diveAirDrainPerGameHour * depthFactor,
        //  §12: health may move for `unsafe-continued`, and staying down after two spoken
        //  warnings is precisely that. Every gentler stage returns 0, so ordinary diving is
        //  never "a general price paid for ordinary work".
        healthPerGameHour: isDrowningAt(stage) ? TUNE.diveDrowningHealthPerGameHour : 0,
        stage,
        depthM,
    };
}

/** Air recovered per game hour at the surface. Fast — a breath is quick; the descent is not. */
export function airRecoveryPerGameHour(): number {
    return TUNE.diveAirRecoveryPerGameHour;
}

/**
 * DISORIENTATION, made mechanical rather than narrated.
 *
 * At `failing` a diver fumbles: everything they do down here slows. It is the third named
 * threat and it is deliberately NOT a camera trick or a hidden control inversion — this game's
 * honest-systems rail forbids misleading a player about real state, and a spun camera is
 * exactly that. What a failing diver actually loses is coordination, so what the model takes
 * is speed, through the multiplier the water already owns.
 */
export function diveSpeedMultiplierOf(state: GameState): number {
    const stage = diveStageOf(state);
    if (stage === 'surfaced') return 1;
    if (stage === 'failing' || stage === 'blacking-out') return TUNE.diveFumblingSpeedMultiplier;
    return TUNE.diveSpeedMultiplier;
}

/**
 * THE COLD, through the SHIPPED heat balance.
 *
 * This returns the depth a `ThermalContext` should carry, and nothing else — the arithmetic
 * lives in `netHeatFlowPerGameHour` beside every other heat term, so there remains exactly one
 * opinion about where a body's warmth is going. A second "dive chill" rate would have been a
 * rival to it, and the first night the two disagreed the rest card would be confidently wrong.
 */
export function submergedDepthForThermal(state: GameState): number {
    return state.dive.submerged ? divableDepthOf(state) : 0;
}

// ---------------------------------------------------------------------------
// Going under, and coming up.
// ---------------------------------------------------------------------------

export function submerge(state: GameState): boolean {
    if (state.dive.submerged || !canSubmerge(state)) return false;
    state.dive.submerged = true;
    return true;
}

export function surface(state: GameState): boolean {
    if (!state.dive.submerged) return false;
    state.dive.submerged = false;
    return true;
}

/**
 * What an ABSENCE does to a diver: it brings them up, with their breath back.
 *
 * Absence making things BETTER is always legal; the law only forbids the other direction. A
 * survivor who closed the tab underwater did not hold their breath for eight hours, and
 * modelling that they did would be inventing harm out of not playing — which is the exact
 * thing [[D-011]] exists to forbid.
 */
export function surfaceOnAbsence(state: GameState): void {
    state.dive.submerged = false;
    state.dive.air = airCapacityOf(state.capacities);
}

// ---------------------------------------------------------------------------
// Development — `breathWaterConfidence`'s SECOND producer.
// ---------------------------------------------------------------------------

/**
 * Whether this span under counted as training, in `capacities.ts`'s own vocabulary.
 *
 * Every leg is §12's, not invented here. Blacking out is not recoverable, so it trains nothing
 * — work a body cannot recover from is damage wearing training's clothes. `failing` is
 * overload for the same reason the water's `spent` is: crediting it would make diving to the
 * edge of drowning the optimal way to get better at diving, which is the shape of every grind
 * this project has refused.
 */
export function diveTrainingContext(stage: DiveStage): TrainingContext {
    return {
        recoverable: stage !== 'blacking-out',
        meaningfulStimulus: stage === 'holding' || stage === 'burning',
        overloaded: stage === 'failing' || stage === 'blacking-out',
    };
}

/**
 * Develop what a span underwater develops.
 *
 * `breathWaterConfidence` — §12's "staged swimming and DIVING" — plus `mobilityBalance`, which
 * §12 develops through "varied terrain ... recovery practice"; moving a body in three
 * dimensions against water is exactly that. Swimming was this capacity's first producer; this
 * is the second, and it is the one the capacity was actually named for.
 */
export function developFromDiving(
    capacities: CapacityScores, stage: DiveStage, gameHours: number,
): CapacityScores {
    if (!(gameHours > 0)) return capacities;
    const ctx = diveTrainingContext(stage);
    //  A bout is a DURATION, so a 30 fps client and a 60 fps client develop identically.
    const bouts = gameHours / TUNE.diveBoutGameHours;
    let next = capacities;
    for (const capacity of ['breathWaterConfidence', 'mobilityBalance'] as const) {
        const stimulus = trainingStimulus(capacity, ctx);
        if (stimulus > 0) next = developCapacity(next, capacity, stimulus * bouts);
    }
    return next;
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
