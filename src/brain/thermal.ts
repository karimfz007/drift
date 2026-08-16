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
import { EXPOSED, builtShelterProfile, type RefugeProfile } from './vulnerability';
import type { ItemGrade } from './types';

/**
 * An answer is a fraction of a threat removed. It may go NEGATIVE — a bare cave floor is
 * worse than open ground — but it may never exceed 1, because a refuge that removed more than
 * all of a loss would turn that loss into a gain and let the night warm you up.
 */
function clampAnswer(v: number): number {
    return Math.min(1, v);
}

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
    /**
     * HOW DEEP UNDER THE SURFACE THE BODY IS, in metres. Optional, and absent means ZERO —
     * so every caller that predates diving keeps its exact arithmetic, the same
     * "unknown means unchanged" contract `refuge` below already honours.
     *
     * IT SCALES THE EVAPORATIVE TERM RATHER THAN ADDING A NEW ONE. A submerged body is not
     * losing heat by a different mechanism than a soaked one — it is losing it by the same
     * mechanism, harder, because the water is colder and moving. Giving depth its own rate
     * would have put a second opinion about heat beside the first, and `heatFlowNote` could
     * then name the wrong loss as the one worth fixing.
     */
    submergedDepthM?: number;
    /**
     * THE VULNERABILITY MAP, optional by design. Absent means "derive the shipped flat factor
     * from `sheltered`/`shelterGrade`", so every caller that predates the map keeps its exact
     * numbers. A caller that knows about refuges passes one and gets per-threat answers.
     */
    refuge?: RefugeProfile;
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
    //  THE VULNERABILITY MAP (Drop 3 Part 2 item 1). `refuge` answers each threat separately;
    //  when it is ABSENT this derives the shipped flat factor, so all three existing call
    //  sites keep their exact arithmetic and a caller that has not been taught about the map
    //  cannot silently get a different night. Safe direction: unknown means unchanged.
    const refuge = ctx.refuge ?? (ctx.sheltered && ctx.shelterGrade
        ? builtShelterProfile(ctx.shelterGrade)
        : EXPOSED);
    //  Kept as `1 - answered` rather than reading a multiplier, so the two vocabularies meet
    //  in exactly one place instead of at every term below.
    const coldFactor = 1 - clampAnswer(refuge.cold);
    const windFactor = 1 - clampAnswer(refuge.wind);
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
    //  Wind and cold now scale by their OWN answers. For the built lean-to the two are equal
    //  by construction, which is why this reproduces the shipped night exactly; for the cave
    //  they differ, which is the whole point of the map.
    const exposure = nightRaw * coldFactor + windRaw * windFactor;
    const ambient = -TUNE.thermalBaselineLoss + nightRaw * coldFactor;
    const windLoss = windRaw * windFactor;

    //  GROUND. Conduction — and ONLY while actually lying on it. My first cut charged this
    //  to a survivor standing up, which made a calm afternoon cool you through your boots.
    //
    //  The refuge's `groundDamp` answer applies here and may be NEGATIVE: a bare cave floor
    //  conducts worse than open ground. `1 - answered` is therefore allowed above 1, and that
    //  is deliberate — it is the term that makes moving into a cave a trade rather than an
    //  upgrade. Bedding still multiplies it, so the survivor's own fix still works.
    const groundLoss = ctx.resting ? -BEDDING_LOSS[ctx.bedding] * (1 - clampAnswer(refuge.groundDamp)) : 0;

    //  EVAPORATIVE. Being wet, scaled to how wet. Independent of everything else, which is
    //  why a wet night under a good roof can still cool you — but a refuge that answers RAIN
    //  keeps the weather off you in the first place, which the flat factor could not express.
    const wetness = clamp01(ctx.wet / TUNE.wetMax);
    //  DEPTH (the Underwater Slice). One multiplier on the term that already models losing
    //  heat to water. Absent or zero leaves this bit-for-bit what it was.
    const depthChill = 1 + Math.max(0, ctx.submergedDepthM ?? 0) * TUNE.thermalDepthChillPerMetre;
    const evaporativeLoss = -TUNE.thermalWetLoss * wetness * (1 - clampAnswer(refuge.rain)) * depthChill;

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
 * THE COLD'S WARNING GRAMMAR — the same one illness already speaks, not a second one.
 *
 * THE DEFECT, director-confirmed in play: *"died of cold with no warning."* Illness has had a
 * five-stage ladder since the Medicine Slice whose first TWO rungs cost nothing and SAY
 * something — `illnessSymptom` announces a sensation at each crossing, and only past them does
 * health start moving. Cold had the ladder (`thermalStrain`, five rungs, same shape) and no
 * voice at all: `thermalStrain` was read in exactly one place in the whole codebase — deciding
 * whether wet + hypothermic seeds a chill illness — and the only thing the player ever saw was
 * a HUD bar changing colour at 30. Health then drains at 6/hour from the moment warmth hits
 * zero. A hazard that can kill you was the one hazard that never spoke.
 *
 * SO THE RUNGS ARE MAPPED ONTO ILLNESS'S RATHER THAN INVENTED. `cold` is `unsettled`: the body
 * has noticed, nothing is being taken. `hypothermic` is `ailing`: the last warning before it
 * costs. Empty warmth is where health actually starts draining, so that is the crossing the
 * diagnostic voice belongs to — which is why this reads WARMTH and not just the strain: the
 * strain band calls 12 and 0 both "hypothermic", and the difference between them is the whole
 * fair-challenge line.
 *
 * WHAT THEY SAY IS A SENSATION (Law 145, Bible §6.5), exactly as `illnessSymptom` does — no
 * number, no stage word, no instruction. A survivor knows their hands have stopped working
 * before they know what a thermal band is, and the inference is the player's to make.
 *
 * HONEST LIMIT, stated because the parallel is not perfect: cold already contributes to
 * IMPAIRMENT below this line (`impairmentOf` gives `cold` 0.5 and `hypothermic` 1.0), where
 * illness's two warning rungs contribute nothing. So cold's warning rungs are free of HEALTH
 * cost, not free of all cost. Closing that gap is a balance change, not a grammar one, and is
 * not what this fixes.
 */
export type ColdStage = 'warm' | 'chilled' | 'freezing' | 'failing';

export function coldStage(warmth: number): ColdStage {
    if (warmth <= 0) return 'failing';
    if (warmth <= TUNE.thermalHypothermicAt) return 'freezing';
    if (warmth < TUNE.thermalComfortLow) return 'chilled';
    return 'warm';
}

/** Does this rung take health? The line the two warnings sit in front of. */
export function coldCosts(stage: ColdStage): boolean {
    return stage === 'failing';
}

/** What the body feels, at the crossing. Null when there is nothing to say. */
export function coldSymptom(warmth: number): string | null {
    return COLD_FELT[coldStage(warmth)];
}

const COLD_FELT: Record<ColdStage, string | null> = {
    //  Coming right is a crossing too, and worth nothing said — the bar is already climbing.
    warm: null,
    //  FIRST, and free. The body has noticed; nothing is being taken yet.
    chilled: 'The cold is getting into you. Your fingers are slow to answer.',
    //  SECOND, and still free of health. The last warning before it starts costing.
    freezing: 'You are shaking hard and cannot stop. Your hands will barely close.',
    //  PAST THE LINE — the diagnostic voice, because now it IS taking something, and a
    //  survivor who is being killed by the cold is owed the word for it.
    failing: 'The shivering has stopped, and that is worse. The cold is taking you now — get to a fire.',
};

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
