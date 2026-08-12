/**
 * INJURY — the first real wound content in the game. Drop 2.
 *
 * Drop 1 shipped harm as a bare NUMBER on purpose: a connected charge took health and nothing
 * else, and that boundary was named rather than blurred. This is the other half. A boar that
 * hits you now leaves something you carry around afterwards, and the difference between the
 * two is the difference between losing a fight and being hurt in one.
 *
 * THREE CONDITIONS, each with its own clock and its own answer:
 *
 *   BLEEDING — the urgent one. Costs health continuously until it is bound or it clots on its
 *   own. It is the only condition with a treatment, because it is the only one where doing
 *   nothing is a decision with a cost attached.
 *
 *   LIMP — the mobility one. Slows the survivor down while it lasts. Cannot be treated; it
 *   heals with time, which is what makes it a consequence rather than a chore.
 *
 *   PAIN — the legible one. Feeds `impairmentOf` in the resolver, so every activity costs
 *   more while it lasts. It reuses a term that already exists and is already property-tested,
 *   which is why pain needs no new machinery to be FELT: a hurt survivor's whole day gets
 *   more expensive, in a currency the game already speaks.
 *
 * PROPORTIONATE, DELIBERATELY. Three conditions, one treatment, no infection model, no
 * per-limb anatomy — that is the parked localized-injury dossier, not this. What this needs
 * to be is REAL and FELT, not exhaustive.
 *
 * D-011 IS ABSOLUTE, and bleeding is the sharpest test this game has given it: a condition
 * that drains health over time is exactly the mechanic that would kill an absent player.
 * `settleInjuriesOffline` clots everything and is the only injury function reconcile's
 * absence path may call — the same structural shape `settleOffline` uses for the boars. You
 * cannot bleed to death with the game closed, and it is enforced by there being no code path
 * that could.
 */
import { TUNE } from '../data/tune';
import type { GameState, InjuryState } from './types';

/** No injuries. The state a fresh survivor lands on, and what treatment returns you toward. */
export function freshInjuries(): InjuryState {
    return { bleeding: 0, limp: 0, pain: 0 };
}

export function isInjured(inj: InjuryState): boolean {
    return inj.bleeding > 0 || inj.limp > 0 || inj.pain > 0;
}

/**
 * WHAT A CONNECTED CHARGE LEAVES. Severity scales with the damage actually taken, so a
 * glancing hit on a healthy survivor is not the same event as being run down while already
 * hurt — the injury reports the fight rather than a constant.
 */
export function injuriesFromCharge(current: InjuryState, damage: number): InjuryState {
    const severity = Math.max(0, Math.min(1, damage / TUNE.boarChargeDamage));
    return {
        //  Conditions STACK rather than replace: being gored twice is worse than once, which
        //  is the whole reason to disengage after the first hit instead of trading.
        bleeding: Math.min(TUNE.injuryBleedMax, current.bleeding + severity * TUNE.injuryBleedFromCharge),
        limp: Math.min(TUNE.injuryLimpMaxGameHours, current.limp + severity * TUNE.injuryLimpFromCharge),
        pain: Math.min(TUNE.injuryPainMax, current.pain + severity * TUNE.injuryPainFromCharge),
    };
}

/**
 * ONE SPAN OF TIME, ONLINE. Bleeding costs health and slowly clots; limp and pain simply
 * fade. Returns the next conditions and the health this span cost.
 */
export function stepInjuries(inj: InjuryState, gameHours: number): { next: InjuryState; healthLost: number } {
    if (gameHours <= 0 || !isInjured(inj)) return { next: inj, healthLost: 0 };
    const healthLost = inj.bleeding * TUNE.injuryBleedHealthPerGameHour * gameHours;
    return {
        next: {
            //  Clots on its own eventually — an untreated wound is dangerous, not a death
            //  sentence, and a bleed with no natural end would make fibre a hard requirement
            //  for surviving an animal the player is supposed to be able to simply avoid.
            bleeding: Math.max(0, inj.bleeding - TUNE.injuryBleedClotPerGameHour * gameHours),
            limp: Math.max(0, inj.limp - gameHours),
            pain: Math.max(0, inj.pain - TUNE.injuryPainFadePerGameHour * gameHours),
        },
        healthLost,
    };
}

/**
 * D-011's ENFORCEMENT POINT. Everything clots the moment a span counts as an absence.
 *
 * Not "bleeds more slowly" and not "bleeds to the floor" — STOPS. A player who closes the
 * game while bleeding and returns a week later finds a scar, not a corpse. This is the only
 * injury function reconcile's absence path may call, which is the same structure the boars
 * use, for the same reason: the guarantee should be impossible to break by accident rather
 * than merely checked for.
 */
export function settleInjuriesOffline(_inj: InjuryState): InjuryState {
    return { bleeding: 0, limp: 0, pain: 0 };
}

/** Can the survivor bind a wound? Fibre, and something to bind. */
/**
 * P0-2 — WHY YOU CANNOT BIND, in one sentence, or null when you can.
 *
 * Written because the Vitals tab said *"Bleeding — bind it with fibre at the shelter"* and
 * `canBindWound` has never had a location term: the prose sent a bleeding survivor on a walk
 * they did not need to take, and offered no button when they got there. Both halves of that are
 * fixed by having the readout ask the RULE what is missing instead of describing it from memory.
 */
export function bindBlocker(state: GameState): string | null {
    if (state.injuries.bleeding <= 0) return null;
    if (state.inventory.fiber < TUNE.injuryBindFiberCost) {
        return `You would need ${TUNE.injuryBindFiberCost} fibre to bind it.`;
    }
    return null;
}

export function canBindWound(state: GameState): boolean {
    return state.injuries.bleeding > 0 && state.inventory.fiber >= TUNE.injuryBindFiberCost;
}

/**
 * BIND IT. The one treatment, and it only touches bleeding — a bandage does nothing for a
 * limp or for pain, which is both true and the reason those two read as time rather than as
 * inventory.
 */
export function bindWound(state: GameState): boolean {
    if (!canBindWound(state)) return false;
    state.inventory.fiber -= TUNE.injuryBindFiberCost;
    state.injuries = { ...state.injuries, bleeding: 0 };
    return true;
}

/** How much the limp slows movement, as a multiplier. 1 when unhurt. */
export function limpSpeedMultiplierOf(inj: InjuryState): number {
    if (inj.limp <= 0) return 1;
    return TUNE.injuryLimpSpeedMultiplier;
}

/** One plain sentence about the worst of it, for the HUD. Null when whole. */
export function injuryNote(inj: InjuryState): string | null {
    if (inj.bleeding > 0) return 'You are bleeding. Bind it with fibre.';
    if (inj.limp > 0) return 'Your leg is bad. You are slower than you should be.';
    if (inj.pain > 0) return 'Everything hurts. Every job is costing you more.';
    return null;
}
