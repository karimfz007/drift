/**
 * THE ONE BODY RESOLVER — every activity in the game, through one causal function.
 *
 * WHAT WAS WRONG, and it was not that any piece was missing. All three shipped:
 *
 *   - `workload.ts` — §13's multiplicative formula and its five channels ([[D-089]])
 *   - `thermal.ts`  — the exposure chain, net heat flow per game hour (Law 118)
 *   - `reconcile.ts` — the passage of time over a body
 *
 * But only two of them were WIRED. `thermal.ts` feeds reconcile; `workload.ts` fed nothing
 * but `bodyReport.ts`, which is a *report*. The formula the Body Model chapter was built
 * around described the game without governing it, and meanwhile the actual cost of chopping a
 * tree was a flat subtraction: `energy -= energyCostTreeChop * loadMultiplier`, one channel,
 * one line, in `gatherNode`. **A model nothing flows through is documentation, not a system.**
 *
 * THE DIVISION THIS ESTABLISHES, which is the whole point of the unification:
 *
 *   AN ACTIVITY DECLARES ONLY WHAT IT IS — a base demand, how long it takes, how hard it is
 *   being pushed, whether the tool is fit for it. Facts about the ACT.
 *
 *   THE BODY SUPPLIES WHAT IT COSTS *THIS BODY, HERE* — load, impairment, environment. Facts
 *   about the SURVIVOR and the PLACE.
 *
 * Before this, every call site mixed the two by hand and each mixed them differently: gather
 * multiplied by load and ignored cold, walking looked at exhaustion and ignored load, and
 * nothing outside reconcile knew the weather existed. Any new activity had to re-derive the
 * whole set and would get it subtly wrong — the recurring shape this codebase already knows
 * as *a law enforced in one layer is enforced nowhere*.
 *
 * CALIBRATION: SHIPPED NUMBERS ARE REPRODUCED, NOT REPLACED. This is a unification, and a
 * unification that changes the answers is a rewrite wearing a smaller word. Each activity's
 * `baseDemand` is DERIVED from the constant that priced it before — see `demandFor` — so the
 * energy channel returns exactly what the flat subtraction did, to the floating-point bit.
 * `tests/resolver.test.ts` proves that equivalence per activity rather than asserting it.
 *
 * WHAT IS GENUINELY NEW, stated plainly rather than smuggled in: the other four channels are
 * now LIVE for every activity, where before they were computed nowhere. Work now costs
 * hydration and accrues nutrition debt, and the heat it produces enters the exposure chain
 * instead of being discarded. That is the causality §13 always described; it was simply not
 * connected. It is tuned from the same constants, and F3's certified envelope is re-measured
 * against it rather than assumed to survive.
 */
import { TUNE } from '../data/tune';
import { loadEnergyMultiplierOf } from './body';
import { netHeatFlowPerGameHour, thermalStrain, type HeatFlow, type ThermalContext } from './thermal';
import {
    channelsFor, healthHarmFrom, workloadOf,
    type WorkHazard, type WorkloadChannels, type WorkloadFactors,
} from './workload';
import type { GameState } from './types';

/**
 * WHAT AN ACTIVITY KNOWS ABOUT ITSELF. Deliberately small: if a field here could be read off
 * the survivor or the world instead, it does not belong — that is the boundary that stops
 * call sites from re-deriving the body's own terms and disagreeing about them.
 */
export interface ActivityDeclaration {
    /** What the survivor is doing. Carried through for the report and the trace. */
    id: string;
    /** §13's base demand of the act itself, before anything about the body modifies it. */
    baseDemand: number;
    /** How long it goes on, in game hours. */
    durationGameHours: number;
    /** How hard it is being pushed. 1 = steady working pace. */
    pace?: number;
    /** Ground underfoot: level sand vs slope vs mud. */
    terrain?: number;
    /** A blunt axe costs more than a sharp one for the same felled tree. */
    toolInefficiency?: number;
    /** A NAMED hazard, if this act carries one. The only route from work to health. */
    hazard?: WorkHazard | null;
    /** 0..1. Ignored unless `hazard` is set. */
    hazardSeverity?: number;
}

/** Everything one activity does to one body. Pure data — the caller applies it. */
export interface BodyEffect {
    activity: string;
    /** §13's single multiplicative line, after the body's own terms are folded in. */
    workload: number;
    /** The factors actually used, so a report can explain the number rather than assert it. */
    factors: WorkloadFactors;
    channels: WorkloadChannels;
    /** The exposure chain WITH this activity's metabolic heat included. */
    heatFlow: HeatFlow;
    /** Health harm, and ONLY from a named hazard. Zero for all ordinary work. */
    healthHarm: number;
}

/**
 * IMPAIRMENT — how much this body is fighting itself. §13's term, read from the survivor
 * rather than declared by the act, because a tired cold survivor pays more for the identical
 * swing and no call site should have to remember that.
 *
 * Deliberately bounded: an impaired body works harder, never impossibly hard. An unbounded
 * term would let a bad state multiply into an unpayable cost, which reads to a player as the
 * game breaking rather than as their body failing.
 */
export function impairmentOf(state: GameState): number {
    const fatigueShare = clamp01(state.fatigue / TUNE.fatigueMax);
    const woundShare = 1 - clamp01(state.health / TUNE.healthMax);
    const coldShare = thermalStrain(state.warmth) === 'hypothermic' ? 1
        : thermalStrain(state.warmth) === 'cold' ? 0.5 : 0;
    const worst = Math.max(fatigueShare, woundShare, coldShare);
    return 1 + worst * (TUNE.impairmentMaxMultiplier - 1);
}

/**
 * ENVIRONMENT — what the place costs, over and above what the act costs. Cold makes a body
 * spend more to hold temperature; heat makes it spend more to shed it. Comfortable is 1.
 */
export function environmentFactorOf(state: GameState): number {
    const strain = thermalStrain(state.warmth);
    if (strain === 'hypothermic' || strain === 'heat-strain') return TUNE.environmentStrainMultiplier;
    if (strain === 'cold' || strain === 'hot') return TUNE.environmentMildStrainMultiplier;
    return 1;
}

/**
 * THE HYDRATION HEAT TERM. §13 singles out sweat loss as intensified by heat — thirst is not
 * a timer running independently of what the body is doing or where.
 */
function heatFactorOf(state: GameState): number {
    const strain = thermalStrain(state.warmth);
    return strain === 'heat-strain' ? TUNE.hydrationHeatMultiplier
        : strain === 'hot' ? TUNE.hydrationWarmMultiplier : 1;
}

/**
 * THE RESOLVER. One activity, one body, one causal pass.
 *
 * Pure: reads the state, returns the effect, mutates nothing. That is what lets the property
 * tests sweep thousands of bodies through it, and what lets `reconcile` and the verbs share
 * it without either owning it.
 */
export function resolveActivity(
    state: GameState,
    decl: ActivityDeclaration,
    thermalCtx?: Omit<ThermalContext, 'activity' | 'resting' | 'wet' | 'nutrition'>,
): BodyEffect {
    const factors: WorkloadFactors = {
        baseDemand: decl.baseDemand,
        durationGameHours: decl.durationGameHours,
        pace: decl.pace ?? 1,
        //  THE BODY'S OWN TERMS, read here and nowhere else. `loadEnergyMultiplierOf` is the
        //  shipped Ch.6 band multiplier, reused rather than re-derived — the load a survivor
        //  carries must cost the same whether they are chopping or walking.
        loadFactor: loadEnergyMultiplierOf(state),
        terrain: decl.terrain ?? 1,
        environment: environmentFactorOf(state),
        toolInefficiency: decl.toolInefficiency ?? 1,
        impairment: impairmentOf(state),
    };

    const workload = workloadOf(factors);
    const channels = channelsFor(workload, heatFactorOf(state));

    //  THE EXPOSURE CHAIN, WITH THE WORK IN IT. This is the join that did not exist: the heat
    //  a working body makes was computed by `channelsFor` and then thrown away, while
    //  `netHeatFlowPerGameHour` was asked separately what a body at `activity` produces. Two
    //  answers to one question. The activity term now carries the work actually being done.
    const heatFlow = netHeatFlowPerGameHour({
        isNight: thermalCtx?.isNight ?? false,
        sheltered: thermalCtx?.sheltered ?? false,
        shelterGrade: thermalCtx?.shelterGrade ?? null,
        windExposed: thermalCtx?.windExposed ?? false,
        fireLit: thermalCtx?.fireLit ?? false,
        atFire: thermalCtx?.atFire ?? false,
        bedding: thermalCtx?.bedding ?? 'bare-ground',
        clothing: thermalCtx?.clothing ?? 0,
        enclosed: thermalCtx?.enclosed ?? false,
        wet: state.wet,
        nutrition: state.hunger,
        resting: false,
        //  Steady working pace is 1; the declaration's own pace scales it. An activity that
        //  is barely exertion should not claim a labourer's metabolic output.
        activity: Math.max(TUNE.thermalRestingActivity, decl.pace ?? 1),
    });

    return {
        activity: decl.id,
        workload,
        factors,
        channels,
        heatFlow,
        healthHarm: healthHarmFrom(decl.hazard ?? null, decl.hazardSeverity ?? 0),
    };
}

/**
 * APPLY ONE EFFECT TO ONE BODY. Separate from `resolveActivity` on purpose: the resolver
 * answers "what does this cost", this answers "spend it", and keeping them apart means a
 * caller can ask the first question without committing to the second — which is exactly what
 * a "can I afford this?" surface needs, and what a property test needs to sweep freely.
 *
 * Every vital is clamped at its own floor. Low energy has never blocked an action in this
 * game and does not start here: it makes a survivor sluggish, which is a different and more
 * honest kind of pressure than a refusal.
 */
export function applyEffect(state: GameState, effect: BodyEffect): void {
    state.energy = Math.max(0, state.energy - effect.channels.energy);
    state.thirst = Math.max(0, state.thirst - effect.channels.hydration);
    //  NUTRITION IS A DEBT, NOT A SUBTRACTION. §13 is explicit. It lands on hunger over time
    //  rather than per swing, so a hard hour makes you hungry rather than instantly starving.
    state.hunger = Math.max(0, state.hunger - effect.channels.nutritionDebt * TUNE.nutritionDebtSettleShare);
    if (effect.healthHarm > 0) {
        state.health = Math.max(0, state.health - effect.healthHarm);
    }
}

/**
 * THE ACTIVITY CATALOGUE — every effortful act in the game, priced by DERIVATION from the
 * constant that priced it before.
 *
 * `baseDemand = shippedEnergyCost / workEnergyPerUnit`, with `durationGameHours: 1` standing
 * for "one instance of the act". Run back through `workloadOf` and `channelsFor`, the energy
 * channel returns the shipped cost exactly — and `tests/resolver.test.ts` asserts that per
 * activity rather than trusting the algebra.
 *
 * This is rail D's invented-constant rule applied to a whole table at once: not one number
 * here was chosen, and if a shipped cost is ever retuned, its demand follows automatically
 * because it is computed from it rather than copied beside it.
 */
export function demandFor(shippedEnergyCost: number): number {
    return shippedEnergyCost / TUNE.workEnergyPerUnit;
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
