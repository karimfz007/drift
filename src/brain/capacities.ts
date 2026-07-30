/**
 * §12 — THE SIX-INDICATOR CORRECTION AND THE EIGHT LONG-TERM CAPACITIES (Slice 2B Stage B).
 *
 * Two halves of one idea. The six bars a player already reads stay exactly as they are in
 * player language and are CORRECTED in simulation — each one now says what it really
 * represents and, more usefully, what it must never be allowed to mean. Underneath them sit
 * eight long-term capacities that no bar shows: the difference between a survivor who has
 * been here two days and one who has been here two months.
 *
 * WHY THE "MUST NOT MEAN" COLUMN IS THE LOAD-BEARING ONE. Every failure mode §12 names is a
 * shortcut a designer reaches for under deadline. Health as a general price for ordinary work
 * is the big one — it turns every action into a slow suicide and makes resting the only
 * correct verb. Hunger as calories-per-swing turns eating into a twitch chore. Thirst as a
 * bare timer makes heat and effort cosmetic. Energy conflated with stamina collapses two
 * genuinely different clocks into one. So the boundaries are written as CODE here, not as
 * prose in a design document, and the tests below assert them from the outside.
 *
 * THE COUNT CHANGED, and the register says so rather than carrying both silently: v2.3 lists
 * **eight** capacities. This SUPERSEDES the **seven** from v0.9's reception (Strength /
 * Stamina / Dexterity / Mobility / Perception / Reasoning / Composure). Three of those were
 * not capacities at all — Stamina is a current reserve, and Perception and Reasoning are
 * knowledge-side, which is where they now live. `SUPERSEDED_V09_CAPACITIES` keeps the old
 * list in code so the evolution is legible at the point of change and nobody re-derives the
 * seven from an archived charter.
 *
 * WHAT THIS MODULE DOES NOT DO: it never decays. Capacities are the body's own record of work
 * done, and disuse is handled by `confidence.ts` — a separate layer, deliberately — because
 * losing timing is not the same as losing tissue. See that module's header for the boundary.
 */
import { TUNE } from '../data/tune';

export type Capacity =
    | 'strength'
    | 'endurance'
    | 'loadTolerance'
    | 'mobilityBalance'
    | 'coordinationDexterity'
    | 'breathWaterConfidence'
    | 'acclimatization'
    | 'generalResilience';

/** The eight, in §12's own order. */
export const CAPACITIES: Capacity[] = [
    'strength', 'endurance', 'loadTolerance', 'mobilityBalance',
    'coordinationDexterity', 'breathWaterConfidence', 'acclimatization', 'generalResilience',
];

/**
 * v0.9's seven, kept in code so the supersession is visible where it matters rather than only
 * in a ledger entry. Stamina left because it is a CURRENT RESERVE, not a capacity — §12 is
 * explicit that endurance is the capacity that shapes it. Perception and Reasoning left
 * because they are knowledge, and knowledge already has a home.
 */
export const SUPERSEDED_V09_CAPACITIES = [
    'Strength', 'Stamina', 'Dexterity', 'Mobility', 'Perception', 'Reasoning', 'Composure',
] as const;

export interface CapacitySpec {
    /** What actually develops it — §12's "Developed by". */
    developedBy: string;
    improves: string;
    /** The boundary. Every entry here is a claim the code must be unable to make. */
    doesNotDo: string;
}

export const CAPACITY_SPEC: Record<Capacity, CapacitySpec> = {
    strength: {
        developedBy: 'progressive force work, lifting, striking, climbing, heavy control, plus recovery',
        improves: 'safe force, short load handling, tool control',
        doesNotDo: 'eliminate mass or joint risk',
    },
    endurance: {
        developedBy: 'sustained walking, paddling, swimming, labour at appropriate intensity, plus recovery',
        improves: 'stamina capacity and recovery',
        doesNotDo: 'prevent dehydration or sleep need',
    },
    loadTolerance: {
        developedBy: 'progressive, well-fitted carriage across real routes',
        improves: 'pack comfort, gait economy, tissue tolerance',
        doesNotDo: 'make maximum overload good training',
    },
    mobilityBalance: {
        developedBy: 'varied terrain, climbing, crouching, boat motion, recovery practice',
        improves: 'stability, efficient movement, fall avoidance',
        doesNotDo: 'ignore injury or bad footing',
    },
    coordinationDexterity: {
        developedBy: 'cutting, knotting, sewing, fitting, aiming, instrument work',
        improves: 'precision and lower handling error',
        doesNotDo: 'replace knowledge or correct tools',
    },
    breathWaterConfidence: {
        developedBy: 'staged swimming and diving, and rescue practice',
        improves: 'calm, efficient movement, safer decisions',
        doesNotDo: 'extend human physiology without limit',
    },
    acclimatization: {
        developedBy: 'gradual repeated heat, cold and sea exposure with recovery',
        improves: 'thermoregulation and work tolerance',
        doesNotDo: 'grant immunity or persist indefinitely',
    },
    generalResilience: {
        developedBy: 'diverse activity, nutrition, sleep, treatment, low chronic burden',
        improves: 'recovery quality and illness resistance',
        doesNotDo: 'act as a refillable health bonus',
    },
};

export type CapacityScores = Record<Capacity, number>;

export function freshCapacities(): CapacityScores {
    const out = {} as CapacityScores;
    for (const c of CAPACITIES) out[c] = TUNE.capacityInnateFloor;
    return out;
}

// ---------------------------------------------------------------------------
// THE SIX INDICATORS, corrected.
// ---------------------------------------------------------------------------

export type Indicator = 'health' | 'hunger' | 'thirst' | 'energy' | 'warmth' | 'stamina';

export interface IndicatorMeaning {
    represents: string;
    /** The shortcut this indicator must never collapse into. */
    mustNotMean: string;
}

export const INDICATOR_MEANING: Record<Indicator, IndicatorMeaning> = {
    health: {
        represents: 'tissue damage, bleeding, illness, infection, poisoning, burns, impairment',
        mustNotMean: 'a general price paid for ordinary work',
    },
    hunger: {
        represents: 'perceived hunger plus longer-run nutrition and energy availability',
        mustNotMean: 'calories removed per swing',
    },
    thirst: {
        represents: 'perceived thirst plus hydration and electrolyte strain',
        mustNotMean: 'a timer independent of heat and work',
    },
    energy: {
        represents: 'alertness, sleep pressure, cognitive and physical recovery readiness',
        mustNotMean: 'the same thing as stamina',
    },
    warmth: {
        represents: 'cold-to-hot thermal condition, moved by wetness, wind, sun, clothing, shelter, fire and work',
        mustNotMean: 'only a cold meter — overheating matters too',
    },
    stamina: {
        represents: 'seconds-to-minutes capacity for the current intense action',
        mustNotMean: 'long-term endurance skill',
    },
};

/**
 * The health boundary, as a function rather than a sentence.
 *
 * §12's first and most important correction: health is NOT the price of ordinary work. It
 * moves for injury, illness, toxic exposure, thermal injury, collapse, and work continued
 * when it was already unsafe — and for nothing else. `workload.ts` already returns a health
 * channel of exactly 0 for every ordinary action; this is the same law stated where the
 * indicator is defined, so a future author reading either file finds it.
 */
export type HealthCause =
    | 'injury' | 'illness' | 'toxic' | 'thermal-injury' | 'collapse' | 'unsafe-continued';

const HEALTH_CAUSES: ReadonlySet<string> = new Set<HealthCause>([
    'injury', 'illness', 'toxic', 'thermal-injury', 'collapse', 'unsafe-continued',
]);

export function healthMayChangeFrom(cause: string): boolean {
    return HEALTH_CAUSES.has(cause);
}

/**
 * Stamina is a reserve; endurance is a capacity that shapes it. Conflating them is the
 * fourth correction, and this is the one line where the relationship is expressed: a better
 * endurance capacity raises the ceiling of the reserve, and is never itself spent.
 */
export function staminaCeilingFor(endurance: number): number {
    const span = TUNE.staminaCeilingMax - TUNE.staminaCeilingBase;
    return TUNE.staminaCeilingBase + span * clamp01(endurance / 100);
}

// ---------------------------------------------------------------------------
// Development.
// ---------------------------------------------------------------------------

export interface TrainingContext {
    /** Was the effort inside a range the body can actually recover from? */
    recoverable: boolean;
    /** Was it a meaningful stimulus at the survivor's CURRENT capacity, or a stroll? */
    meaningfulStimulus: boolean;
    /** Overload beyond the training range — real work, but not training. */
    overloaded?: boolean;
    /** Carrying badly: a load that is heavy AND poorly fitted trains nothing good. */
    wellFitted?: boolean;
}

/**
 * How much a bout of work actually develops a capacity.
 *
 * Returns 0 rather than a small number in every case §12 forbids, because "a little bit of
 * credit for overloading" is how a boundary becomes a suggestion. Grinding maximum overload
 * must be worth exactly nothing as training, or it becomes the optimal strategy the moment a
 * player notices it is worth anything at all.
 */
export function trainingStimulus(capacity: Capacity, ctx: TrainingContext): number {
    //  Recovery is not a bonus condition, it is the mechanism. Work the body cannot recover
    //  from is damage wearing training's clothes.
    if (!ctx.recoverable) return 0;
    if (!ctx.meaningfulStimulus) return 0;
    //  "Does not make maximum overload good training" — §12, load tolerance.
    if (ctx.overloaded) return 0;
    if (capacity === 'loadTolerance' && ctx.wellFitted === false) return 0;
    return TUNE.capacityGainPerBout;
}

/**
 * Apply a stimulus. MONOTONIC BY CONSTRUCTION — this function cannot lower a score, because
 * `trainingStimulus` cannot return a negative and this clamps at the existing value. Disuse
 * belongs to `confidence.ts`; a body does not forget how to be strong overnight, it loses
 * timing first, and conflating the two is how "skill decay" becomes a punishment for taking
 * a week off.
 */
export function developCapacity(
    scores: CapacityScores, capacity: Capacity, stimulus: number,
): CapacityScores {
    const gain = Math.max(0, stimulus);
    return { ...scores, [capacity]: Math.min(100, scores[capacity] + gain) };
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
