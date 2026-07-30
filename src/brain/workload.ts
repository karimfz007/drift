/**
 * THE BODY–WORK RELATIONSHIP — Bible v2.3 §13, the workload formula (Slice 2B Stage B).
 *
 * The law this replaces is the one §14 forbids by name: **no activity may be authored as
 * "-5 food, +2 strength."** That shape is why the current simulation says things the body
 * model does not mean — a swing of an axe removing calories directly, thirst running on a
 * timer that never heard of heat, health paying for ordinary work.
 *
 * §13 gives the formula and it is binding:
 *
 *     workload = base demand × duration × pace × load factor × terrain
 *                × environment × tool inefficiency × impairment
 *
 * ...and then routes that single number into CHANNELS, which is the part that actually
 * corrects the model. The channels are not interchangeable and three of them carry rules that
 * the old shape got exactly backwards:
 *
 *   - **nutrition is DELAYED and ACCUMULATED**, never an instant per-action subtraction. You
 *     do not lose a meal per swing; you build a debt that becomes hunger later.
 *   - **health is touched ONLY by real injury, illness, toxic or thermal harm, collapse, or
 *     continued unsafe work.** Ordinary hard labour is never a health cost. §12's table says
 *     it plainly: health must not mean "a general price paid for ordinary work".
 *   - **stamina and energy are different things.** Stamina is a seconds-to-minutes reserve
 *     for the current effort; energy is alertness and sleep pressure. §12 lists confusing
 *     them as the specific error to avoid.
 *
 * This module computes; it does not apply. Keeping it pure means the formula can be tested
 * against the spec directly, and means a caller cannot quietly reach past a channel to poke
 * health because it happened to be convenient.
 */
import { TUNE } from '../data/tune';

/**
 * The multiplicative terms of §13, each defaulting to 1 — a neutral term is "this factor is
 * not in play", so an activity declares only what it actually involves.
 */
export interface WorkloadFactors {
    /** Base demand of the act itself, before anything modifies it. */
    baseDemand: number;
    /** How long it goes on, in game hours. */
    durationGameHours: number;
    /** How hard it is being pushed. 1 = steady working pace. */
    pace?: number;
    /** What is being carried, as a multiplier on effort — see `loadFactorFor`. */
    loadFactor?: number;
    /** Ground: level sand vs slope vs mud. */
    terrain?: number;
    /** Heat, cold, wind, wet. */
    environment?: number;
    /** A blunt axe costs more than a sharp one for the same felled tree. */
    toolInefficiency?: number;
    /** Injury, pain, cold hands, exhaustion. */
    impairment?: number;
}

/** Where a workload goes. Each channel is its own thing; none is a synonym for another. */
export interface WorkloadChannels {
    /** Immediate draw on the seconds-to-minutes reserve. */
    stamina: number;
    /** Sweat and respiratory loss, intensified by heat and clothing. */
    hydration: number;
    /** Alertness spent and recovery debt accrued. */
    energy: number;
    /**
     * DELAYED, ACCUMULATED nutrition demand — a debt, not an instant subtraction. §13 is
     * explicit that this is not calories removed per swing.
     */
    nutritionDebt: number;
    /** Metabolic heat produced. Positive warms; the environment decides what that is worth. */
    thermalGain: number;
    /**
     * ALWAYS ZERO from ordinary work. Health moves only through `healthHarmFrom`, which
     * requires an actual hazard. Present here so the shape is explicit rather than absent —
     * a reader should see that work does not touch it, not have to notice a missing field.
     */
    health: 0;
}

/** The one multiplicative line from §13, with neutral defaults. */
export function workloadOf(f: WorkloadFactors): number {
    return f.baseDemand
        * f.durationGameHours
        * (f.pace ?? 1)
        * (f.loadFactor ?? 1)
        * (f.terrain ?? 1)
        * (f.environment ?? 1)
        * (f.toolInefficiency ?? 1)
        * (f.impairment ?? 1);
}

/**
 * Route a workload into its channels.
 *
 * `heat` scales the hydration channel specifically, because §13 singles out sweat loss as
 * intensified by heat, humidity, clothing, illness and salt — thirst is not a timer that runs
 * independently of what the body is doing or where it is doing it.
 */
export function channelsFor(workload: number, heat = 1): WorkloadChannels {
    return {
        stamina: workload * TUNE.workStaminaPerUnit,
        hydration: workload * TUNE.workHydrationPerUnit * heat,
        energy: workload * TUNE.workEnergyPerUnit,
        nutritionDebt: workload * TUNE.workNutritionDebtPerUnit,
        thermalGain: workload * TUNE.workThermalGainPerUnit,
        health: 0,
    };
}

/**
 * The ONLY route from work to health, and it requires a named hazard.
 *
 * §12's table: health must not mean "a general price paid for ordinary work". So this takes
 * a hazard, not a workload — there is deliberately no way to spend health by working hard.
 */
export type WorkHazard = 'injury' | 'illness' | 'toxic' | 'thermal-injury' | 'collapse' | 'unsafe-continued';

export function healthHarmFrom(hazard: WorkHazard | null, severity: number): number {
    if (!hazard) return 0;
    return Math.max(0, severity);
}

// ---- carried load: zones, not a universal kg cap -------------------------

/**
 * §13's five zones. Named rather than numbered because the names carry the meaning: a load
 * is "Training-heavy" relative to THIS person on THIS route, and the same mass is a different
 * zone for a different castaway. §13 is explicit that load is never one universal kg cap.
 */
export type LoadZone = 'free' | 'working' | 'training-heavy' | 'operational-overload' | 'immovable';

export function loadZoneFor(carriedKg: number, capacityKg: number): LoadZone {
    const ratio = capacityKg > 0 ? carriedKg / capacityKg : Infinity;
    if (ratio <= TUNE.loadZoneFreeAt) return 'free';
    if (ratio <= TUNE.loadZoneWorkingAt) return 'working';
    if (ratio <= TUNE.loadZoneTrainingAt) return 'training-heavy';
    if (ratio <= TUNE.loadZoneOverloadAt) return 'operational-overload';
    return 'immovable';
}

/** Effort multiplier for a zone — the `loadFactor` term of the formula. */
export function loadFactorFor(zone: LoadZone): number {
    return TUNE.loadZoneEffortMultiplier[zone];
}

/**
 * IS THIS LOAD A TRAINING STIMULUS, OR JUST DAMAGE?
 *
 * §13: loaded carriage stimulates strength and load tolerance **only within a recoverable
 * range**. Past that it is not training harder, it is injuring. This is the predicate that
 * keeps grinding overload from being the optimal strategy — and §13 asks for exactly that,
 * that intelligent responses to heavy matter be more attractive than grinding.
 */
export function loadTrainsCapacity(zone: LoadZone): boolean {
    return zone === 'working' || zone === 'training-heavy';
}

// ---- walking: the director's explicit rule -------------------------------

export interface WalkOutcome {
    channels: WorkloadChannels;
    /** Endurance stimulus — only when the walk is a meaningful one. */
    trainsEndurance: boolean;
    /** Strength and load-tolerance stimulus — loaded walking, within a recoverable range. */
    trainsStrength: boolean;
    trainsLoadTolerance: boolean;
    /** Why it does or does not train, in the player's language. */
    note: string;
}

/**
 * WALKING, per the director's explicit rule.
 *
 * Unloaded: develops endurance ONLY when distance, pace, terrain and current capacity make it
 * a meaningful stimulus. Spends modest energy and hydration, drains little stamina on level
 * ground, produces body heat.
 *
 * Loaded: slower, more stamina and recovery, more heat and water, more cumulative energy and
 * later hunger — and it CAN stimulate strength and load tolerance, within a recoverable
 * range. The rule that keeps this honest is the last line of §13's walking passage: an expert
 * carrier gets better at managing the same matter, and never becomes a supernatural forklift.
 */
export function walkOutcome(opts: {
    distanceM: number;
    durationGameHours: number;
    zone: LoadZone;
    terrain?: number;
    heat?: number;
    /** The walker's current endurance capacity — a stimulus must exceed what they can already do. */
    enduranceCapacity: number;
}): WalkOutcome {
    const loaded = opts.zone !== 'free';
    const workload = workloadOf({
        baseDemand: TUNE.walkBaseDemand,
        durationGameHours: opts.durationGameHours,
        loadFactor: loadFactorFor(opts.zone),
        terrain: opts.terrain ?? 1,
        environment: opts.heat ?? 1,
    });
    const channels = channelsFor(workload, opts.heat ?? 1);

    //  "Meaningful stimulus" is relative to what this body can already do — the same stroll
    //  that trains a newcomer is a rest day for a seasoned walker. That is why capacity is an
    //  input and not a constant.
    const demandRelativeToCapacity = opts.distanceM / Math.max(1, opts.enduranceCapacity);
    const meaningful = demandRelativeToCapacity >= TUNE.walkStimulusFraction;
    const recoverable = loadTrainsCapacity(opts.zone);

    return {
        channels,
        trainsEndurance: meaningful,
        trainsStrength: loaded && recoverable && meaningful,
        trainsLoadTolerance: loaded && recoverable,
        note: !loaded
            ? (meaningful
                ? 'A real walk. It will tell in your wind.'
                : 'A stroll. Pleasant, but your legs already know this.')
            : recoverable
                ? 'Carrying weight over distance. Slower, thirstier — and it builds.'
                : 'Too much weight to be training. This is only costing you.',
    };
}
