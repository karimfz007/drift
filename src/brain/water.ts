/**
 * THE WATER — swimming as terrain, not as a cutscene (the Maritime Slice, item 1).
 *
 * For five cycles the sea was a texture. `game.ts` clamped the player to a 108 m disc and the
 * island's edge was the world's edge; the wreck offshore was a promise nobody could walk to.
 * This module makes the water a PLACE — somewhere with its own footing, its own cost, and its
 * own way of killing you — and it does it by adding exactly one new thing to the simulation.
 *
 * WHAT IT DELIBERATELY DOES NOT ADD: a thermal system. Cold-water immersion is `wet` at
 * `wetMax`, full stop. It reaches warmth through `thermal.ts`'s existing evaporative term, the
 * same channel rain would use, so the heat balance keeps exactly one opinion about where a
 * survivor's heat is going and `heatFlowNote` can still name the loss worth fixing. A
 * "water chill rate" beside it would have been a second opinion, and the first night the two
 * disagreed the panel would be confidently wrong. Immersion is wetness; wetness is already
 * modelled; the model is already tested. Use it.
 *
 * WHAT IT ADDS INSTEAD IS WORK. Swimming costs ENERGY at a rate that dwarfs living, scaled by
 * what you are carrying and by how good you have got at it. That is the honest difference
 * between being rained on and being in the sea, and it is the difference the crossing is
 * built out of.
 *
 * ---------------------------------------------------------------------------------------
 * D-011, STRUCTURALLY. Nothing in this module is reachable from `reconcile`.
 *
 * Every cost here is applied by `Session.advanceWater`, which runs on the ONLINE tick and
 * nowhere else — the same enforcement-as-structure the boars, the injuries and the illness
 * already use. There is no code path by which an absence charges a swim stroke, so a player
 * who closes the tab mid-crossing cannot drown while they are gone, and no rescue-teleport,
 * no "you wake up on the beach" special case, and no offline floor for a swim exists to be
 * got wrong. The absence simply does not contain the sea.
 *
 * THE PRICE OF THAT, STATED RATHER THAN HIDDEN: `reconcile` also does not know you are in the
 * water, so it DRIES you while you are away (wet decays; `isAtPond` is false at sea). A
 * survivor who leaves mid-swim comes back dry and warm, and is soaked again on the first
 * online tick. That is absence declining to make a body worse, which is the law, and it is
 * strictly the safe direction. The alternative — teaching `reconcile` about the sea — would
 * put an offline wetness gain into the one function D-011's property test guards, to buy
 * realism in a situation nobody is present for.
 * ---------------------------------------------------------------------------------------
 *
 * THE FAIR-CHALLENGE CONTRACT, kept in this project's own five-stage grammar. The boar
 * telegraphs across unaware / alert / warning / charge / aftermath; illness across well /
 * unsettled / ailing / feverish / gravely-ill; the water across wading / swimming /
 * labouring / spent / going-under. **Three named stages happen before health is touched**,
 * two of them say so in plain language, and the one that takes health is `unsafe-continued`
 * — one of the six causes §12 permits health to move for, and the only one that fits
 * "I kept swimming when I already knew I should not".
 */
import { TUNE } from '../data/tune';
import { WRECK, waterDepthAt } from '../data/world';
import { developCapacity, trainingStimulus, type CapacityScores, type TrainingContext } from './capacities';
import { loadEnergyMultiplierOf } from './body';
import type { GameState } from './types';

/** Where a point stands relative to the sea. Read from the terrain, never from a radius. */
export type WaterZone = 'dry' | 'wading' | 'swimming';

export function waterZoneAt(x: number, y: number): WaterZone {
    const depth = waterDepthAt(x, y);
    if (depth <= 0) return 'dry';
    return depth < TUNE.swimDepthM ? 'wading' : 'swimming';
}

/** The zone the survivor is actually in. */
export function waterZoneOf(state: GameState): WaterZone {
    return waterZoneAt(state.player.x, state.player.y);
}

export function isSwimming(state: GameState): boolean {
    //  ABOARD IS NOT IN. A survivor on a raft is over deep water and out of it, which is the
    //  entire value of the raft; asking the terrain alone would charge them for swimming
    //  while they sit on a deck, and would soak them, and would eventually drown them.
    return !state.raft.aboard && waterZoneOf(state) === 'swimming';
}

export function isInWater(state: GameState): boolean {
    return !state.raft.aboard && waterZoneOf(state) !== 'dry';
}

/**
 * THE FIVE STAGES. `ashore` is the sixth name and the absence of the situation, not a stage
 * of it — kept out of the exposure grammar so a reading can never say "you are ashore" about
 * a survivor who is not.
 */
export type SwimStage = 'ashore' | 'wading' | 'swimming' | 'labouring' | 'spent' | 'going-under';

export function swimStageOf(state: GameState): SwimStage {
    const zone = state.raft.aboard ? 'dry' : waterZoneOf(state);
    if (zone === 'dry') return 'ashore';
    if (zone === 'wading') return 'wading';
    //  Deep water. Which of the four deep stages is a question about the reserve, and the
    //  order below IS the contract: two spoken warnings, then harm.
    if (state.energy <= 0) return 'going-under';
    if (state.energy <= TUNE.swimSpentEnergy) return 'spent';
    if (state.energy <= TUNE.swimLabouringEnergy) return 'labouring';
    return 'swimming';
}

/**
 * One plain sentence, or null when the water has nothing to say. Null for `swimming` on
 * purpose: a game that narrates every ordinary moment has no way left to raise its voice, and
 * the two warnings below only work because the stage before them is quiet.
 */
export function swimNote(stage: SwimStage): string | null {
    switch (stage) {
        case 'wading': return 'The water is round your legs. It is colder than it looked.';
        case 'swimming': return null;
        case 'labouring': return 'Your arms are getting heavy. The shore is a long way back.';
        case 'spent': return 'You have nothing left. Get to something solid.';
        case 'going-under': return 'You are going under.';
        default: return null;
    }
}

/** Is the water taking health right now? Exactly one stage may, and it is the last one. */
export function isDrowning(stage: SwimStage): boolean {
    return stage === 'going-under';
}

/**
 * How much of the swim's energy cost this survivor's breath/water confidence buys off.
 *
 * §12's boundary for this capacity — "does not extend human physiology without limit" — is
 * why this is a bounded FRACTION of the cost rather than a subtraction: a practised swimmer
 * moves more efficiently and panics less, and at 100 they still pay 65% of the work. There is
 * no score at which the sea becomes free.
 */
export function swimEfficiencyOf(capacities: CapacityScores): number {
    const c = clamp01(capacities.breathWaterConfidence / 100);
    return 1 - TUNE.swimConfidenceEnergyRelief * c;
}

export interface WaterCosts {
    /** Energy per game hour. Positive is a DRAIN — the caller subtracts. */
    energyPerGameHour: number;
    /** Health per game hour. Positive is a drain. Non-zero only at `going-under`. */
    healthPerGameHour: number;
    /** Where wetness is being driven. `null` means "leave wetness alone". */
    wetTarget: number | null;
    stage: SwimStage;
}

/**
 * What the water charges, per game hour, for standing in it right now.
 *
 * Load multiplies the swim exactly as it multiplies the ambient drain — `loadEnergyMultiplierOf`
 * is Ch.6's own function, reused rather than re-derived, so a heavy pack costs the same shape
 * of extra in the water as it does on the path and `light` is still exactly 1.
 */
export function waterCostsFor(state: GameState): WaterCosts {
    const stage = swimStageOf(state);
    if (stage === 'ashore') {
        return { energyPerGameHour: 0, healthPerGameHour: 0, wetTarget: null, stage };
    }
    if (stage === 'wading') {
        //  Wading soaks you to the waist, not over your head. Driving `wet` all the way to
        //  the ceiling here would make the shallows exactly as cold as the open sea and erase
        //  the only gradient the shore ramp exists to create.
        return {
            energyPerGameHour: TUNE.wadeEnergyDrainPerGameHour * loadEnergyMultiplierOf(state),
            healthPerGameHour: 0,
            wetTarget: TUNE.wetMax * 0.6,
            stage,
        };
    }
    const work = TUNE.swimEnergyDrainPerGameHour
        * loadEnergyMultiplierOf(state)
        * swimEfficiencyOf(state.capacities);
    return {
        energyPerGameHour: work,
        healthPerGameHour: isDrowning(stage) ? TUNE.swimGoingUnderHealthPerGameHour : 0,
        //  MAXIMAL WETNESS, immediately. Immersion is not a rate — you are either under the
        //  surface or you are not — and the pond's `wetGainPerGameHourInPond` gradient exists
        //  to model wading into fresh water, which is a different act.
        wetTarget: TUNE.wetMax,
        stage,
    };
}

/** Fraction of walking pace available in this zone. 1 on dry land. */
export function waterSpeedMultiplierOf(state: GameState): number {
    if (state.raft.aboard) return TUNE.raftSpeedMultiplier;
    const stage = swimStageOf(state);
    switch (stage) {
        case 'ashore': return 1;
        case 'wading': return TUNE.wadeSpeedMultiplier;
        case 'spent':
        case 'going-under':
            return TUNE.swimSpeedMultiplier * TUNE.swimSpentSpeedMultiplier;
        default: return TUNE.swimSpeedMultiplier;
    }
}

// ---------------------------------------------------------------------------
// DEVELOPMENT — `breathWaterConfidence`'s first real producer.
// ---------------------------------------------------------------------------

/**
 * Whether this span of swimming was TRAINING, in `capacities.ts`'s own vocabulary.
 *
 * Every leg is §12's, not invented here:
 *   - **recoverable** is false once the survivor is going under. Work a body cannot recover
 *     from is damage wearing training's clothes, and `trainingStimulus` returns 0 for it.
 *   - **meaningfulStimulus** is false for wading. Standing in the shallows is not "staged
 *     swimming and diving"; crediting it would make the cheapest, safest act the best trainer,
 *     which is the shape of every grind this project has refused.
 *   - **overloaded** is true once spent. §12's load-tolerance line — "does not make maximum
 *     overload good training" — generalises, and it is the reason a survivor cannot farm this
 *     capacity by swimming themselves to the edge of drowning every night.
 */
export function swimTrainingContext(stage: SwimStage): TrainingContext {
    return {
        recoverable: stage !== 'going-under',
        meaningfulStimulus: stage === 'swimming' || stage === 'labouring',
        overloaded: stage === 'spent' || stage === 'going-under',
    };
}

/**
 * Develop what a span of swimming develops. Returns new scores; never mutates.
 *
 * TWO capacities, both straight out of §12's "developed by" column and neither of them
 * invented for this slice: breath/water confidence is developed by "staged swimming and
 * diving", and endurance by "sustained walking, paddling, swimming ... at appropriate
 * intensity". A swimmer who is training one is training the other, and saying so here costs
 * nothing and is simply what the spec says.
 */
export function developFromSwimming(
    capacities: CapacityScores, stage: SwimStage, gameHours: number,
): CapacityScores {
    if (!(gameHours > 0)) return capacities;
    const ctx = swimTrainingContext(stage);
    //  A BOUT IS A DURATION, not a tick. `capacityGainPerBout` is the shipped unit of
    //  development; `swimBoutGameHours` says how much swimming is one bout, so the gain is a
    //  rate over elapsed time and a 30-fps client and a 60-fps client develop identically.
    const bouts = gameHours / TUNE.swimBoutGameHours;
    let next = capacities;
    for (const capacity of ['breathWaterConfidence', 'endurance'] as const) {
        const stimulus = trainingStimulus(capacity, ctx);
        if (stimulus > 0) next = developCapacity(next, capacity, stimulus * bouts);
    }
    return next;
}

/**
 * Development from paddling. §12 again, verbatim in two places: endurance is developed by
 * "sustained ... paddling", and mobility/balance by "varied terrain, climbing, crouching,
 * **boat motion**, recovery practice". Standing on a raft in a swell is the only boat motion
 * this game has, and it is the reason the raft is not merely a faster swim.
 */
export function developFromPaddling(
    capacities: CapacityScores, gameHours: number,
): CapacityScores {
    if (!(gameHours > 0)) return capacities;
    const ctx: TrainingContext = { recoverable: true, meaningfulStimulus: true };
    const bouts = gameHours / TUNE.swimBoutGameHours;
    let next = capacities;
    for (const capacity of ['endurance', 'mobilityBalance'] as const) {
        const stimulus = trainingStimulus(capacity, ctx);
        if (stimulus > 0) next = developCapacity(next, capacity, stimulus * bouts);
    }
    return next;
}

// ---------------------------------------------------------------------------
// THE CROSSING — distances, read from the world rather than stored.
// ---------------------------------------------------------------------------

/** Metres from here to the wreck. The one number the crossing is about. */
export function distanceToWreck(x: number, y: number): number {
    return Math.hypot(x - WRECK.x, y - WRECK.y);
}

export function isAtWreck(state: GameState): boolean {
    return distanceToWreck(state.player.x, state.player.y) <= TUNE.wreckArrivalRadiusM;
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
