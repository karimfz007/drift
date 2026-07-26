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
export function loadBandForKg(kg: number): LoadBand {
    if (kg > TUNE.loadHeavyAtKg) return 'heavy';
    if (kg > TUNE.loadWorkingAtKg) return 'working';
    return 'light';
}

export function loadBandOf(state: GameState): LoadBand {
    return loadBandForKg(carriedWeightKg(state));
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

export function loadEnergyMultiplierOf(state: GameState): number {
    return loadEnergyMultiplierFor(loadBandOf(state));
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

// ---- Death cost + lesson ------------------------------------------------

/**
 * The cause-specific line shown on waking. Every one of these names what actually killed
 * the castaway and what would have prevented it — a lesson, not a scold, and never a claim
 * about game state that isn't true. Falls through to a generic line for any cause string a
 * future chapter introduces, so a new death cause can never produce an empty message.
 */
export function respawnMessageFor(cause: string): string {
    const c = cause.toLowerCase();
    if (c.includes('thirst') && c.includes('hunger')) return 'You went without water and food too long. The pond is inland, west of the trees — and the flask carries a drink with you.';
    if (c.includes('thirst')) return 'Thirst took you. Water is the fastest need to come round again — keep the flask full before heading inland.';
    if (c.includes('hunger')) return 'Hunger took you. Berries, coconuts, and shellfish are all within a short walk of the shore.';
    if (c.includes('cold')) return 'The cold took you. A lit fire — or a roof over your head — is what stands between you and a night like that one.';
    return 'You woke on the sand, weaker but whole. The island keeps what you built.';
}

/**
 * What a death costs: a floored fraction of each CARRIED loose resource stack, and nothing
 * else. Returns the amounts removed (for the death log) without mutating — the caller
 * applies it, so this stays a pure calculation that a test can check in isolation.
 *
 * `Math.floor` means a stack of 1–3 loses nothing at all: rounding never wipes a small
 * stack, and the poorest castaway is never the one punished hardest.
 */
export function deathResourceLoss(state: GameState): Partial<Record<MaterialKind, number>> {
    const lost: Partial<Record<MaterialKind, number>> = {};
    for (const kind of MASS_KINDS) {
        const take = Math.floor(state.inventory[kind] * TUNE.deathResourceLossFraction);
        if (take > 0) lost[kind] = take;
    }
    return lost;
}
