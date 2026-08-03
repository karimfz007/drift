/**
 * BRAIN — Ch.6, "The Body Model" (D-058). Pure TypeScript, zero rendering engine.
 *
 * Three systems, all of them soft states rather than new death vectors:
 *
 *  1. CARRY WEIGHT — every carried material and owned tool has a mass; the total sorts the
 *     castaway into one of three load bands, which scale movement speed and energy cost.
 *     The energy half deliberately REUSES D-052/D-055's existing plumbing (the ambient
 *     drain in reconcile.ts and `effortEnergyCostFor`'s per-gather charge) by multiplying
 *     them, rather than introducing a second, parallel drain that would have to be kept in
 *     sync with the first forever.
 *
 *  2. FATIGUE — accrues while ONLINE and in energy debt, sheds with rest, and reads out in
 *     three perceivable stages. **It is not part of the health-drain path**, by design:
 *     that is what keeps D-011's offline-death-impossible law structurally intact with a
 *     new body state added, exactly as energy's own C05 scope-out did.
 *
 *  3. DEATH COST — a small, floored fraction of CARRIED loose resource stacks, and nothing
 *     else. Tools survive, stored goods survive, skills survive, and `KnowledgeState`
 *     survives — Ch.2's amendment B is a standing law, and this is simply the second
 *     system that has to respect it.
 *
 * THE OFFLINE LAW, restated for this chapter (the Ch.6 analogue of Ch.2's amendment B):
 * absence may cost warmth or hunger, but it may never make the BODY worse. `reconcile` is
 * structurally forbidden from raising fatigue across a qualifying absence — see the
 * explicit `qualifiesForReport` branch there, and the property test in tests/vitals.test.ts
 * that locks it alongside the offline-death-impossible law itself.
 */

import { TUNE } from '../data/tune';
import type { GameState, MaterialKind } from './types';

// ---- Carry weight -------------------------------------------------------

/**
 * Every carried material kind. Derived from `TUNE.materialMassKg`'s OWN keys rather than
 * hand-listed, and typed as `MaterialKind[]` — so adding a material to `Inventory` without
 * giving it a mass is a compile error at the TUNE table (the record is
 * `Record<MaterialKind, number>`), and adding one to the TUNE table without adding it to
 * `Inventory` is a compile error here. C3 noted the previous hand-written array carried no
 * such guarantee: it merely looked exhaustive, and a new material would have silently
 * weighed nothing.
 */
const MASS_KINDS = Object.keys(TUNE.materialMassKg) as MaterialKind[];

/** Total carried mass in kg: every resource stack at its per-unit mass, plus the fixed
 *  mass of each owned tool. The torch counts only while owned (it is consumed, not stored),
 *  matching how `torch.owned` already gates its carriage in the body (D-052). */
export function carriedWeightKg(state: GameState): number {
    let kg = 0;
    for (const kind of MASS_KINDS) kg += state.inventory[kind] * TUNE.materialMassKg[kind];
    if (state.tools.axe) kg += TUNE.toolMassKg.axe;
    if (state.tools.flask) kg += TUNE.toolMassKg.flask;
    if (state.tools.stoneHammer) kg += TUNE.toolMassKg.stoneHammer;
    if (state.torch.owned) kg += TUNE.toolMassKg.torch;
    return kg;
}

export type LoadBand = 'light' | 'working' | 'heavy';

/** Which band a given mass falls in. Boundaries are inclusive-below: exactly
 *  `loadWorkingAtKg` is still Light, so a threshold is a ceiling you cross, not one you
 *  sit on ambiguously. */
export function loadBandForKg(kg: number, hasBackpack = true): LoadBand {
    //  ITEM 1 — no pack, less capacity. Both thresholds drop rather than a hard cap being
    //  imposed: a survivor without a backpack can still carry everything they could before,
    //  it simply costs them sooner. A cap would refuse pickups, which is a refusal the
    //  player did not choose; a shifted band is a cost they can feel and act on.
    const shift = hasBackpack ? 0 : TUNE.backpackLoadPenaltyKg;
    if (kg > TUNE.loadHeavyAtKg - shift) return 'heavy';
    if (kg > TUNE.loadWorkingAtKg - shift) return 'working';
    return 'light';
}

export function loadBandOf(state: GameState): LoadBand {
    return loadBandForKg(carriedWeightKg(state), state.tools.backpack);
}

/** Walk-speed multiplier for a band. Applied on top of `walkSpeedMps`, stacking with the
 *  existing exhaustion multiplier — the base constant itself never changes (D-051's own
 *  rule for the fast-movement toggle, applied again here). */
export function loadSpeedMultiplierFor(band: LoadBand): number {
    return TUNE.loadSpeedMultiplier[band];
}

/** Energy-cost multiplier for a band — multiplies the ambient drain AND every effortful
 *  gather's own tuned cost. `light` is exactly 1, so an unencumbered castaway behaves
 *  bit-for-bit as they did before Ch.6 existed. */
export function loadEnergyMultiplierFor(band: LoadBand): number {
    return TUNE.loadEnergyMultiplier[band];
}

/**
 * How far past the Heavy threshold this load is, in whole-and-fractional overload steps.
 * Zero at or below the threshold, so nothing outside genuine overload is affected at all.
 */
export function overloadStepsForKg(kg: number): number {
    return Math.max(0, (kg - TUNE.loadHeavyAtKg) / TUNE.loadOverloadStepKg);
}

/**
 * The weight-aware multipliers (D-059). The three bands SATURATE — that is the whole root
 * cause of "100 carried rock produced no observable effect": `loadHeavyAtKg` is 30, so 16
 * stone and 100 stone both read `heavy` and were byte-identical, and no inventory cap
 * existed anywhere to stop the pile growing. These add a continuous penalty for every
 * `loadOverloadStepKg` past that threshold, on top of the unchanged band multiplier.
 *
 * `loadOverloadSpeedFloor` is a **safety rail, not a tuning knob**: a castaway must always
 * be able to walk home and put the load down, so no weight can ever approach a soft-lock.
 */
export function loadSpeedMultiplierForKg(kg: number): number {
    const banded = loadSpeedMultiplierFor(loadBandForKg(kg));
    const penalty = overloadStepsForKg(kg) * TUNE.loadOverloadSpeedPenaltyPerStep;
    return Math.max(TUNE.loadOverloadSpeedFloor, banded - penalty);
}

export function loadEnergyMultiplierForKg(kg: number): number {
    const banded = loadEnergyMultiplierFor(loadBandForKg(kg));
    const extra = overloadStepsForKg(kg) * TUNE.loadOverloadEnergyPerStep;
    return Math.min(TUNE.loadOverloadEnergyCeiling, banded + extra);
}

export function loadSpeedMultiplierOf(state: GameState): number {
    return loadSpeedMultiplierForKg(carriedWeightKg(state));
}

export function loadEnergyMultiplierOf(state: GameState): number {
    return loadEnergyMultiplierForKg(carriedWeightKg(state));
}

/** True once the load is past the top band — the point where extra weight starts costing
 *  continuously. Drives the HUD's own carry readout, so the state is perceivable rather
 *  than only felt (the perceivability convention Ch.2 item 6 set). */
export function isOverloaded(state: GameState): boolean {
    return carriedWeightKg(state) > TUNE.loadHeavyAtKg;
}

// ---- Fatigue ------------------------------------------------------------

export type FatigueStage = 'none' | 'mild' | 'moderate' | 'severe';

/** Which of the three perceivable stages (plus "none") a fatigue value reads as. */
export function fatigueStage(fatigue: number): FatigueStage {
    if (fatigue >= TUNE.fatigueSevereAt) return 'severe';
    if (fatigue >= TUNE.fatigueModerateAt) return 'moderate';
    if (fatigue >= TUNE.fatigueMildAt) return 'mild';
    return 'none';
}

export function fatigueStageOf(state: GameState): FatigueStage {
    return fatigueStage(state.fatigue);
}

/**
 * The plain-language status line for a stage, or null below the mild threshold (nothing to
 * say — silence is the honest reading when the body is fine).
 *
 * HONEST-SYSTEMS RAIL (Ch.6's own, stated at the call site as well as in the as-built):
 * this text describes the body's state truthfully and names what helps. The severe stage's
 * "perceptual distortion" named in the chapter is COSMETIC ONLY and is NOT built in this
 * brain-layer slice — see the as-built. Nothing here, and nothing downstream of it, is
 * permitted to alter or misreport a number the player reasons from: vitals, inventory
 * counts, and every other readout stay exactly as true at severe fatigue as at none.
 */
export function fatigueStatusText(stage: FatigueStage): string | null {
    switch (stage) {
        case 'mild': return 'Tired — you could use a proper rest.';
        case 'moderate': return 'Worn down. Sleep would help more than pushing on.';
        case 'severe': return 'Exhausted to the bone. Rest, properly, soon.';
        case 'none': return null;
    }
}

/**
 * True when conditions are good enough for the body to shed fatigue without being asleep:
 * under an intact roof, not freezing, not soaked. This is what makes an ABSENT sheltered
 * unit recover rather than merely hold — the specific case the chapter's mandatory property
 * test names. Deliberately does not require a fire: a roof is its own kind of rest.
 */
export function isRestfulSpot(state: GameState, nearShelter: boolean, shelterInDisrepair: boolean): boolean {
    return nearShelter && !shelterInDisrepair && state.warmth > TUNE.warmthLowThreshold && state.wet < TUNE.wetMax * 0.5;
}

// ---- Death cost + lesson — RETIRED (Slice 3) -----------------------------

//  `respawnMessageFor` and `deathResourceLoss` are GONE with the mechanic they served.
//
//  They belonged to the interim mercy: a death took a floored quarter of each carried stack
//  and printed one cause-specific line. Both assumptions are now false. A death takes
//  EVERYTHING carried, because the body that was carrying it is dead — there is no fraction
//  to compute. And one line is nowhere near enough: `deathReview.ts` gives the whole causal
//  chain, the warnings the bars actually showed, and what was in reach at the time.
//
//  `MASS_KINDS` above stays — carry weight still uses it.
