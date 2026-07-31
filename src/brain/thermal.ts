/**
 * THE HEAT BALANCE (Law 118, Bible v2.4) — and the end of sleep-as-a-special-case.
 *
 * THE DEFECT THIS REPLACES, in the director's own words: very low warmth, a rough night on
 * bare ground, and waking above 60. That was not a tuning miss. `reconcile` gave sleep a
 * DIRECT POSITIVE warmth term —
 *
 *     Math.max(awakeWarmthRate, warmthRecoveryPerGameHourResting × sleepRecoveryMultiplier × restScale)
 *
 * — so lying down set a floor under warmth that the physical situation could never pull
 * below. Wind, wet, bare ground and no fire were all outranked by the act of sleeping. The
 * `Math.max` was written to make sleep "strictly non-harmful", and that intent is the bug:
 * sleeping in the open on a wet night IS harmful, and a model that refuses to say so teaches
 * the player something false about the world.
 *
 * THE BINDING INVARIANT, source text, which `tests/thermal.test.ts` asserts as a property:
 *
 *     "If average net heat flow during the sleep interval is non-positive,
 *      core thermal state cannot improve."
 *
 * It is guaranteed here BY CONSTRUCTION rather than by a clamp bolted on afterwards: warmth's
 * rate simply IS the net flow, so a non-positive net cannot produce a rise. There is no branch
 * anywhere in this module that special-cases sleep, and that absence is the fix.
 *
 * WHAT SLEEP STILL DOES. Everything it did except warm you for free: energy recovers, fatigue
 * sheds, the body repairs. Rest is a metabolic state, not a heater. What sleep changes THERMALLY
 * is real and indirect — a sleeping body produces less metabolic heat than a working one, which
 * makes an unprotected night WORSE, not better. That is `activityHeat` below, and it is the
 * honest version of the term that was deleted.
 *
 * MORE WARMTH IS NOT AUTOMATICALLY BETTER (§12's own correction, and the fifth scenario in
 * v2.4's source text): a sealed shelter with a good fire can push a body past comfortable and
 * into heat strain. `thermalStrain` names that, so warmth stops reading as a score to maximise.
 */
import { TUNE } from '../data/tune';
import type { ItemGrade } from './types';

/** What a body is lying on, and under. The single biggest term on a cold night. */
export type Bedding = 'bare-ground' | 'ground-cover' | 'dry-bedding';

export interface ThermalContext {
    /** Ambient: night radiates heat away, day can add it. */
    isNight: boolean;
    /** A roof overhead — cuts radiative loss. */
    sheltered: boolean;
    /** Which shelter, if any; a better one leaks less. */
    shelterGrade: ItemGrade | null;
    /** Wind reaching the body. A windbreak is not the same thing as a roof. */
    windExposed: boolean;
    /** A fire that is actually burning, and whether the body is close enough to feel it. */
    fireLit: boolean;
    atFire: boolean;
    /** 0..TUNE.wetMax — evaporative loss, the term that turns a survivable night lethal. */
    wet: number;
    bedding: Bedding;
    /** Clothing insulation, 0..1. */
    clothing: number;
    /** Metabolic heat from what the body is doing. Sleeping is the LOWEST, never a bonus. */
    resting: boolean;
    /** How hard the body is working when awake, 1 = steady. */
    activity: number;
    /** Hunger 0..100. An unfed body cannot burn fuel it does not have. */
    nutrition: number;
    /** Enclosed with no ventilation — the fifth scenario's precondition. */
    enclosed: boolean;
}

export interface HeatFlow {
    /** Warmth points per game hour. NEGATIVE is cooling. This IS warmth's rate. */
    net: number;
    /** The parts, so the panel can say WHY rather than showing a bare number. */
    metabolic: number;
    fire: number;
    ambient: number;
    windLoss: number;
    groundLoss: number;
    evaporativeLoss: number;
}

const BEDDING_LOSS: Record<Bedding, number> = {
    //  Conduction into the ground is the term players underestimate and the one that kills.
    //  Bare ground on a cold night takes more heat than the wind does.
    'bare-ground': TUNE.thermalGroundLossBare,
    'ground-cover': TUNE.thermalGroundLossCover,
    'dry-bedding': TUNE.thermalGroundLossBedding,
};

/**
 * Net heat flow per game hour. Every term is a live [TUNE] input; none of them is "is asleep".
 */
export function netHeatFlowPerGameHour(ctx: ThermalContext): HeatFlow {
    //  METABOLIC. A body burns fuel and makes heat. Resting makes the LEAST — this is where
    //  sleep touches temperature, and it touches it downward. An unfed body makes less still,
    //  which is why cold and hunger compound instead of merely coexisting.
    const effort = ctx.resting ? TUNE.thermalRestingActivity : Math.max(TUNE.thermalRestingActivity, ctx.activity);
    const fuelled = clamp01(ctx.nutrition / 100);
    const metabolic = TUNE.thermalMetabolicBase * effort
        * (TUNE.thermalStarvedMetabolicFloor + (1 - TUNE.thermalStarvedMetabolicFloor) * fuelled);

    //  FIRE. Only if it is lit AND the body is near it. A fire across the clearing warms the
    //  clearing. Enclosed, it does more, which is the whole of the fifth scenario.
    const fire = ctx.fireLit && ctx.atFire
        ? TUNE.thermalFireGain * (ctx.enclosed ? TUNE.thermalEnclosedFireMultiplier : 1)
        : 0;

    //  AMBIENT. A baseline loss a fed awake body exactly cancels — that is what makes a mild
    //  day net zero without handing metabolism a free ride — plus, at night, an extra term a
    //  roof reduces. A better roof reduces it more.
    const roofFactor = ctx.sheltered && ctx.shelterGrade
        ? TUNE.shelterGradeWarmthMultiplier[ctx.shelterGrade]
        : 1;
    //  WIND is part of the exposure a roof mitigates, not a separate insult stacked outside
    //  it. My first cut applied it OUTSIDE the roof factor, which made an unsheltered night
    //  cost 15 instead of the shipped 12 and pushed F3's certified reduction from 45% to 56%
    //  — a certified band broken by a term nobody asked to change. A shelter reduces your
    //  exposure to the night AS A WHOLE, so the grade multiplier covers both.
    //
    //  It stays a NAMED term rather than being folded into one number, because `heatFlowNote`
    //  has to be able to say which loss is the one worth fixing, and because a real wind model
    //  will want somewhere to land.
    const windRaw = ctx.windExposed && ctx.isNight
        ? -TUNE.thermalWindLoss * (1 - clamp01(ctx.clothing) * TUNE.thermalClothingWindShield)
        : 0;
    const nightRaw = ctx.isNight ? -TUNE.thermalNightLoss : 0;
    const exposure = (nightRaw + windRaw) * roofFactor;
    const ambient = -TUNE.thermalBaselineLoss + nightRaw * roofFactor;
    const windLoss = windRaw * roofFactor;

    //  GROUND. Conduction — and ONLY while actually lying on it. My first cut charged this
    //  to a survivor standing up, which made a calm afternoon cool you through your boots.
    const groundLoss = ctx.resting ? -BEDDING_LOSS[ctx.bedding] : 0;

    //  EVAPORATIVE. Being wet, scaled to how wet. Independent of everything else, which is
    //  why a wet night under a good roof can still cool you.
    const wetness = clamp01(ctx.wet / TUNE.wetMax);
    const evaporativeLoss = -TUNE.thermalWetLoss * wetness;

    //  Clothing insulates against the passive losses, never against being wet.
    const insulation = 1 - clamp01(ctx.clothing) * TUNE.thermalClothingInsulation;
    //  Insulation blunts the night's bite and the ground, never the baseline the body is built
    //  to cancel — otherwise a coat would make a fed survivor gain heat from nothing.
    const passive = -TUNE.thermalBaselineLoss + exposure * insulation + groundLoss * insulation;

    const net = metabolic + fire + passive + evaporativeLoss;
    return { net, metabolic, fire, ambient, windLoss, groundLoss, evaporativeLoss };
}

/**
 * More warmth is not automatically better (§12). Warmth stops being a score to maximise the
 * moment the top of the range has a cost of its own.
 */
export type ThermalStrain = 'hypothermic' | 'cold' | 'comfortable' | 'hot' | 'heat-strain';

export function thermalStrain(warmth: number): ThermalStrain {
    if (warmth <= TUNE.thermalHypothermicAt) return 'hypothermic';
    if (warmth < TUNE.thermalComfortLow) return 'cold';
    if (warmth <= TUNE.thermalComfortHigh) return 'comfortable';
    if (warmth < TUNE.thermalHeatStrainAt) return 'hot';
    return 'heat-strain';
}

/** Is the survivor paying for being at this temperature, either end? */
export function strainCosts(strain: ThermalStrain): boolean {
    return strain === 'hypothermic' || strain === 'heat-strain';
}

/**
 * One plain sentence about where the heat is going, for the rest card. Names the LARGEST loss
 * rather than listing all of them — a player deciding whether to sleep here needs the one
 * thing to fix, not a table.
 */
export function heatFlowNote(flow: HeatFlow): string {
    if (flow.net > 0) return 'You are gaining heat faster than you are losing it.';
    const losses: Array<[string, number]> = [
        ['the ground taking it', flow.groundLoss],
        ['the wind stripping it', flow.windLoss],
        ['being wet', flow.evaporativeLoss],
        ['the open night', Math.min(0, flow.ambient)],
    ];
    losses.sort((a, b) => a[1] - b[1]);
    const [worst, amount] = losses[0];
    if (amount >= 0) return 'You are holding steady, near enough.';
    return `You are losing heat, mostly to ${worst}.`;
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
