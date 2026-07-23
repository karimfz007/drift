/**
 * BRAIN — reconciliation. The DNA (charter §I.8): the world is never simulated in the
 * background; on return we read the elapsed real time and advance the world by math.
 *
 * `reconcile` is a PURE function: same state + same elapsed → identical result, always.
 * It never reads the clock, never mutates its input, and never rolls dice. It is the
 * single path that advances the world, used identically by the update loop (tiny spans)
 * and by a return from a three-day absence (huge spans).
 *
 * Cycle 03 makes it carry four vitals, not one. The span is walked in segments bounded by
 * every event that changes a rate: the day↔night flip, the fire running dry, any vital
 * reaching its floor (which changes whether it drains health), and health itself reaching
 * a bound. Segment ends are absolute clock values, so boundaries are landed on exactly.
 *
 * THE LAW (D-011 / D-025): active play can kill; absence cannot. Online, every floor is 0
 * and health can reach 0 → death. Offline (a report-worthy span), every floor is positive,
 * so health can never reach 0 for any state or elapsed time. Proven by a property test.
 */

import { TUNE, morningReportMinRealSeconds } from '../data/tune';
import { gameHoursFromRealSeconds, hoursUntilNextPhaseChange, timeOfDay } from './clock';
import { cloneState, isPlayerInFireRadius } from './state';
import { deathCauseFrom, healthRatePerGameHour, vitalLowerBound } from './vitals';
import type { GameState, ReconcileResult, TimeOfDay, VitalDrift } from './types';

/** Floating-point guard: spans shorter than this are treated as zero. */
const EPSILON = 1e-9;

/** Safety net. A 3-real-day absence needs a couple of hundred segments; far below this. */
const MAX_SEGMENTS = 5_000_000;

export interface ReconcileOutcome {
    state: GameState;
    result: ReconcileResult;
}

export function reconcile(state: GameState, elapsedRealSeconds: number): ReconcileOutcome {
    const next = cloneState(state);
    const timeBefore = timeOfDay(state.gameHoursElapsed);
    const fireLitBefore = state.fire.built && state.fire.fuel > 0;
    const sheltered = isPlayerInFireRadius(state);

    // Zero (or nonsensical) elapsed time changes nothing at all.
    if (!(elapsedRealSeconds > 0) || !Number.isFinite(elapsedRealSeconds)) {
        return { state: next, result: emptyResult(state, timeBefore, fireLitBefore, sheltered) };
    }

    const totalGameHours = gameHoursFromRealSeconds(elapsedRealSeconds);
    const qualifiesForReport = elapsedRealSeconds >= morningReportMinRealSeconds;
    const online = !qualifiesForReport;

    // D-011 floors: offline, every vital drifts to a floor and stops; online, to 0.
    // Never higher than where the vital already was — absence may not *raise* a vital.
    const warmthBound = vitalLowerBound(state.warmth, TUNE.warmthOfflineFloor, qualifiesForReport);
    const thirstBound = vitalLowerBound(state.thirst, TUNE.thirstOfflineFloor, qualifiesForReport);
    const hungerBound = vitalLowerBound(state.hunger, TUNE.hungerOfflineFloor, qualifiesForReport);
    const healthBound = vitalLowerBound(state.health, TUNE.healthOfflineFloor, qualifiesForReport);

    const startClock = state.gameHoursElapsed;
    const endClock = startClock + totalGameHours;

    let clock = startClock;
    let warmth = state.warmth;
    let thirst = state.thirst;
    let hunger = state.hunger;
    let health = state.health;
    let fuel = state.fire.fuel;

    let fireWentOutAtGameHours: number | null = null;
    let dawnBroke = false;
    let nightFell = false;
    let floorHeld = false;
    let diedDuringSpan = false;
    let deathCause: string | null = null;
    let segments = 0;

    while (endClock - clock > EPSILON && segments++ < MAX_SEGMENTS) {
        const nightNow = timeOfDay(clock).isNight;
        const lit = next.fire.built && fuel > 0;

        // Rates for this segment (per game hour). They stay constant until a boundary.
        const warmthRate = lit && sheltered
            ? TUNE.warmthRegenPerGameHourAtFire
            : nightNow
                ? -TUNE.warmthDrainPerGameHourNight
                : 0;
        const thirstRate = -TUNE.thirstDrainPerGameHour;
        const hungerRate = -TUNE.hungerDrainPerGameHour;
        const healthRate = healthRatePerGameHour(thirst, hunger, warmth, health, online);

        // The next boundary: the soonest event that changes any rate, in game hours from here.
        let step = endClock - clock;
        step = Math.min(step, hoursUntilNextPhaseChange(clock));
        if (lit) step = Math.min(step, fuel * TUNE.fireBurnGameHoursPerWood);
        step = Math.min(step, timeToBound(warmth, warmthRate, warmthBound, TUNE.warmthMax));
        step = Math.min(step, timeToBound(thirst, thirstRate, thirstBound, TUNE.thirstMax));
        step = Math.min(step, timeToBound(hunger, hungerRate, hungerBound, TUNE.hungerMax));
        step = Math.min(step, timeToBound(health, healthRate, healthBound, TUNE.healthMax));
        step = Math.max(step, 0);

        // Advance every vital across the segment, then clamp to its band.
        warmth = clampBand(warmth + warmthRate * step, warmthBound, TUNE.warmthMax);
        thirst = clampBand(thirst + thirstRate * step, thirstBound, TUNE.thirstMax);
        hunger = clampBand(hunger + hungerRate * step, hungerBound, TUNE.hungerMax);
        health = clampBand(health + healthRate * step, healthBound, TUNE.healthMax);

        if (warmthRate < 0 && warmth <= warmthBound + EPSILON && warmthBound > 0) floorHeld = true;
        if (thirst <= thirstBound + EPSILON && thirstBound > 0) floorHeld = true;
        if (hunger <= hungerBound + EPSILON && hungerBound > 0) floorHeld = true;
        if (healthRate < 0 && health <= healthBound + EPSILON && healthBound > 0) floorHeld = true;

        if (lit && step > 0) {
            fuel = Math.max(0, fuel - step / TUNE.fireBurnGameHoursPerWood);
            if (fuel <= EPSILON) {
                fuel = 0;
                if (fireWentOutAtGameHours === null) fireWentOutAtGameHours = clock + step;
            }
        }

        const nightThen = timeOfDay(clock + step).isNight;
        if (nightNow && !nightThen) dawnBroke = true;
        if (!nightNow && nightThen) nightFell = true;

        clock += step;

        // Death: only online (the floor makes healthBound > 0 offline, so this cannot trip).
        if (online && health <= EPSILON) {
            health = 0;
            diedDuringSpan = true;
            deathCause = deathCauseFrom(thirst, hunger, warmth);
            break;
        }

        // A zero-length step with the span not finished would spin forever; guard it.
        if (step <= EPSILON && endClock - clock > EPSILON) {
            // Nudge past a boundary we are sitting exactly on.
            clock += EPSILON;
        }
    }

    // If we died, the clock stops at the death; otherwise it reaches the span's end.
    const finalClock = diedDuringSpan ? clock : endClock;

    next.gameHoursElapsed = finalClock;
    next.warmth = round(warmth);
    next.thirst = round(thirst);
    next.hunger = round(hunger);
    next.health = round(health);
    next.fire.fuel = fuel;
    next.lastSeenMs = state.lastSeenMs + Math.round(elapsedRealSeconds * 1000);

    const drifts: VitalDrift[] = [
        driftOf('warmth', state.warmth, next.warmth, warmthBound),
        driftOf('thirst', state.thirst, next.thirst, thirstBound),
        driftOf('hunger', state.hunger, next.hunger, hungerBound),
        driftOf('health', state.health, next.health, healthBound)
    ];

    return {
        state: next,
        result: {
            elapsedRealSeconds,
            elapsedGameHours: totalGameHours,
            warmthBefore: state.warmth,
            warmthAfter: next.warmth,
            floorHeld,
            thirstBefore: state.thirst,
            thirstAfter: next.thirst,
            hungerBefore: state.hunger,
            hungerAfter: next.hunger,
            healthBefore: state.health,
            healthAfter: next.health,
            drifts,
            diedDuringSpan,
            deathCause,
            fireLitBefore,
            fireLitAfter: next.fire.built && next.fire.fuel > 0,
            fireWentOutAtGameHours,
            woodBurned: Math.max(0, state.fire.fuel - fuel),
            shelteredByFire: sheltered,
            timeBefore,
            timeAfter: timeOfDay(next.gameHoursElapsed),
            dawnBroke,
            nightFell,
            qualifiesForReport
        }
    };
}

/**
 * Game hours until a value moving at `rate` reaches `lower` (falling) or `max` (rising).
 * Infinity when it never will. Always > 0 for a value strictly inside its band.
 */
function timeToBound(value: number, rate: number, lower: number, max: number): number {
    if (rate < 0 && value > lower) return (value - lower) / -rate;
    if (rate > 0 && value < max) return (max - value) / rate;
    return Infinity;
}

function clampBand(value: number, lower: number, max: number): number {
    return Math.min(max, Math.max(lower, value));
}

function driftOf(
    vital: VitalDrift['vital'],
    before: number,
    after: number,
    bound: number
): VitalDrift {
    return { vital, before, after, floorHeld: bound > 0 && after <= bound + 1e-6 && after < before };
}

/** Six-decimal rounding: keeps long reconciles free of float dust and save round-trips exact. */
function round(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

function emptyResult(
    state: GameState,
    timeBefore: TimeOfDay,
    fireLitBefore: boolean,
    sheltered: boolean
): ReconcileResult {
    return {
        elapsedRealSeconds: 0,
        elapsedGameHours: 0,
        warmthBefore: state.warmth,
        warmthAfter: state.warmth,
        floorHeld: false,
        thirstBefore: state.thirst,
        thirstAfter: state.thirst,
        hungerBefore: state.hunger,
        hungerAfter: state.hunger,
        healthBefore: state.health,
        healthAfter: state.health,
        drifts: [],
        diedDuringSpan: false,
        deathCause: null,
        fireLitBefore,
        fireLitAfter: fireLitBefore,
        fireWentOutAtGameHours: null,
        woodBurned: 0,
        shelteredByFire: sheltered,
        timeBefore,
        timeAfter: timeBefore,
        dawnBroke: false,
        nightFell: false,
        qualifiesForReport: false
    };
}
