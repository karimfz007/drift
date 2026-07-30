/**
 * §15 — CROSS-SYSTEM CHARACTER DEVELOPMENT (Slice 2B Stage B).
 *
 * "Development is not linear — capability comes from CROSSED evidence, not single-stat
 * thresholds." That sentence is the whole module, and it is a rejection of the thing almost
 * every survival game does: a number goes up, a gate opens, and the player has learned to
 * grind rather than to understand.
 *
 * Here a capability needs a BODY leg and a KNOWLEDGE leg, and neither substitutes for the
 * other. §15's own worked example says it best, and the code follows it literally:
 *
 *   Strength WITHOUT planning moves things briefly, tires under poor leverage, and risks
 *   crushing, strain and instability. Strength WITH mechanics and rigging creates leverage,
 *   controls direction, holds between pulls, stages the load, and allows retreat.
 *
 * Note what that does NOT say. It does not say knowledge lets you skip the force. **Reasoning
 * never replaces force — it changes WHERE force is applied.** So the strong-but-unplanned
 * survivor is not blocked from trying; they are told what they are risking. The gate is on
 * SAFE CONTROL, not on effort — `CrossReading.safeControl` is the gated flag, and
 * `forceStillRequired` says the other half out loud.
 *
 * The same shape, twice more. Endurance without logistics tolerates a bad route for longer;
 * endurance with packing, caches, weather and navigation reduces unnecessary mass, picks pace
 * and rest, and preserves the return reserve — because *the game rewards becoming CAPABLE,
 * not merely becoming able to suffer*. And dexterity alone makes a neat thing once; dexterity
 * with material familiarity and workholding makes a component that can be repaired.
 */
import { TUNE } from '../data/tune';
import type { Capacity, CapacityScores } from './capacities';
import type { GameState, KnowledgeDomain } from './types';

export type CrossCapability =
    | 'heavy-construction-control'
    | 'sustained-expedition'
    | 'precise-repairable-components';

export interface CrossSpec {
    id: CrossCapability;
    /** The body leg. */
    capacity: Capacity;
    /** The knowledge leg — a real shipped domain, not a new parallel score. */
    domain: KnowledgeDomain;
    /** What the crossing buys. */
    grants: string;
    /** What the BODY leg alone actually does — never nothing, and never the full thing. */
    bodyAlone: string;
    /** What the KNOWLEDGE leg alone actually does. */
    knowledgeAlone: string;
}

/** §15's three named combinations. */
export const CROSS_SPECS: CrossSpec[] = [
    {
        id: 'heavy-construction-control',
        capacity: 'strength',
        domain: 'construction',
        grants: 'safe control of larger construction and salvage — leverage, direction, staged load, a way to retreat',
        bodyAlone: 'moves things briefly, tires under poor leverage, and risks crushing, strain and instability',
        knowledgeAlone: 'knows where the force should go, and cannot yet put it there',
    },
    {
        id: 'sustained-expedition',
        capacity: 'endurance',
        domain: 'navigationSeamanship',
        grants: 'longer expeditions with better abort judgement — pace and rest chosen, return reserve preserved, the trip repeatable',
        bodyAlone: 'tolerates a bad route for longer, which is not the same as travelling well',
        knowledgeAlone: 'reads the weather and the way home, and runs out of body before reaching either',
    },
    {
        id: 'precise-repairable-components',
        capacity: 'coordinationDexterity',
        domain: 'harvestingFabrication',
        grants: 'precise, REPAIRABLE components — made once well, and mendable after',
        bodyAlone: 'makes a neat thing once, and cannot say why it held or how to mend it',
        knowledgeAlone: 'knows the joint that would hold, and the hands are not steady enough to cut it',
    },
];

export type CrossLevel = 'neither' | 'body-only' | 'knowledge-only' | 'crossed';

export interface CrossReading {
    id: CrossCapability;
    level: CrossLevel;
    /** True ONLY at `crossed` — this is the capability §15 is about. */
    safeControl: boolean;
    capacityScore: number;
    knowledgeScore: number;
    /** Plain language: what the survivor can and cannot do right now, and what it risks. */
    note: string;
}

export function crossReading(
    state: GameState, capacities: CapacityScores, id: CrossCapability,
): CrossReading | null {
    const spec = CROSS_SPECS.find((s) => s.id === id);
    if (!spec) return null;

    const capacityScore = capacities[spec.capacity] ?? 0;
    //  The knowledge leg reads UNDERSTANDING, not technique. Technique is having done it;
    //  understanding is knowing why it worked, which is the half that transfers to a load
    //  you have not lifted before. §15's whole argument is about transfer.
    const knowledgeScore = state.knowledge.domains[spec.domain]?.understanding ?? 0;

    const body = capacityScore >= TUNE.crossCapacityThreshold;
    const known = knowledgeScore >= TUNE.crossUnderstandingThreshold;

    const level: CrossLevel = body && known ? 'crossed'
        : body ? 'body-only'
        : known ? 'knowledge-only'
        : 'neither';

    return {
        id,
        level,
        //  SAFE CONTROL is the gated thing — never the attempt itself. A strong survivor with
        //  no rigging sense may still heave at the beam; §15 says what that costs, and being
        //  told the risk is not the same as being refused the verb.
        safeControl: level === 'crossed',
        capacityScore,
        knowledgeScore,
        note: noteFor(spec, level),
    };
}

function noteFor(spec: CrossSpec, level: CrossLevel): string {
    switch (level) {
        case 'crossed': return spec.grants;
        case 'body-only': return spec.bodyAlone;
        case 'knowledge-only': return spec.knowledgeAlone;
        default: return 'Neither the body nor the understanding is there yet.';
    }
}

export function allCrossReadings(state: GameState, capacities: CapacityScores): CrossReading[] {
    return CROSS_SPECS
        .map((s) => crossReading(state, capacities, s.id))
        .filter((r): r is CrossReading => r !== null);
}

/**
 * Does adding force alone get you there? No — and this function exists to make that
 * answerable rather than merely stated.
 *
 * §15: "reasoning never replaces force, it changes WHERE force is applied." So the crossed
 * survivor still needs the strength; what they gain is leverage, direction, staging and a
 * retreat. A test that asserts this is the difference between implementing §15 and quoting it.
 */
export function forceStillRequired(_reading: CrossReading): boolean {
    //  Unconditionally true, and the parameter stays so the call site reads as a question
    //  about a specific crossing rather than a global constant. There is no reading of any
    //  capability at any level for which the answer is false — that is §15's point, not an
    //  unimplemented branch.
    return true;
}

/**
 * What the crossing actually changes: not whether force is needed, but how much of it has to
 * be raw. Above the crossing, mechanical advantage does part of the work — bounded, because a
 * survivor with good rigging sense is not a crane.
 */
export function effectiveForceMultiplier(reading: CrossReading): number {
    return reading.safeControl ? TUNE.crossLeverageMultiplier : 1;
}
