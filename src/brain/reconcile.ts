/**
 * BRAIN — reconciliation. The DNA (charter §I.8): the world is never simulated in the
 * background; on return we read the elapsed real time and advance the world by math.
 *
 * `reconcile` is a PURE function: same state + same elapsed → identical result, always.
 * It never reads the clock, never mutates its input, and never rolls dice. It is the
 * single path that advances the world, used identically by the update loop (tiny spans)
 * and by a return from a three-day absence (huge spans).
 *
 * The span is walked in segments bounded by the only three things that change the rates:
 * the day↔night flip, the fire running dry, and the end of the span itself. Segment ends
 * are absolute clock values, so boundaries are landed on exactly and never drift.
 */

import { TUNE, morningReportMinRealSeconds } from '../data/tune';
import { gameHoursFromRealSeconds, hoursUntilNextPhaseChange, timeOfDay } from './clock';
import { cloneState, isPlayerInFireRadius } from './state';
import type { GameState, ReconcileResult, TimeOfDay } from './types';

/** Floating-point guard: spans shorter than this are treated as zero. */
const EPSILON = 1e-9;

/** Safety net. A 3-real-day absence needs ~150 segments; this can never legitimately trip. */
const MAX_SEGMENTS = 1_000_000;

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

    // Offline fairness (charter §II.10 / D-011): an absence long enough to earn a report
    // may sting, but it may not bottom the player out. The floor can never *raise* warmth.
    //
    // The gate is deliberately the length of THIS call, which makes the floor a rule about
    // absence rather than about elapsed time (D-025): the frame loop calls this with
    // millisecond spans, so a player sitting in front of the screen doing nothing gets the
    // full consequence, while a player who closed the app gets the mercy. Presence is
    // agency; absence is not. Cycle 02 confirms or overturns this when warmth gains stakes.
    const qualifiesForReport = elapsedRealSeconds >= morningReportMinRealSeconds;
    const lowerBound = qualifiesForReport ? Math.min(state.warmth, TUNE.warmthOfflineFloor) : 0;

    const startClock = state.gameHoursElapsed;
    const endClock = startClock + totalGameHours;

    let clock = startClock;
    let warmth = state.warmth;
    let fuel = state.fire.fuel;
    let fireWentOutAtGameHours: number | null = null;
    let dawnBroke = false;
    let nightFell = false;
    let floorHeld = false;
    let segments = 0;

    while (endClock - clock > EPSILON && segments++ < MAX_SEGMENTS) {
        const nightNow = timeOfDay(clock).isNight;
        const lit = next.fire.built && fuel > 0;

        const phaseBoundary = clock + hoursUntilNextPhaseChange(clock);
        const burnOut = lit ? clock + fuel * TUNE.fireBurnGameHoursPerWood : Infinity;
        const segmentEnd = Math.min(endClock, phaseBoundary, burnOut);
        const step = segmentEnd - clock;

        // The one warmth rule: inside a lit fire's radius warmth recovers; otherwise the
        // night takes it; daylight without fire is neutral this cycle.
        const ratePerHour = lit && sheltered
            ? TUNE.warmthRegenPerGameHourAtFire
            : nightNow
                ? -TUNE.warmthDrainPerGameHourNight
                : 0;

        const unclamped = warmth + ratePerHour * step;
        if (unclamped < lowerBound - EPSILON) floorHeld = true;
        warmth = Math.min(TUNE.warmthMax, Math.max(lowerBound, unclamped));

        if (lit && step > 0) {
            fuel = Math.max(0, fuel - step / TUNE.fireBurnGameHoursPerWood);
            if (fuel <= EPSILON) {
                fuel = 0;
                if (fireWentOutAtGameHours === null) fireWentOutAtGameHours = segmentEnd;
            }
        }

        const nightThen = timeOfDay(segmentEnd).isNight;
        if (nightNow && !nightThen) dawnBroke = true;
        if (!nightNow && nightThen) nightFell = true;

        clock = segmentEnd;
    }

    const woodBurned = Math.max(0, state.fire.fuel - fuel);

    next.gameHoursElapsed = endClock;
    next.warmth = roundWarmth(warmth);
    next.fire.fuel = fuel;
    next.lastSeenMs = state.lastSeenMs + Math.round(elapsedRealSeconds * 1000);

    return {
        state: next,
        result: {
            elapsedRealSeconds,
            elapsedGameHours: totalGameHours,
            warmthBefore: state.warmth,
            warmthAfter: next.warmth,
            floorHeld,
            fireLitBefore,
            fireLitAfter: next.fire.built && next.fire.fuel > 0,
            fireWentOutAtGameHours,
            woodBurned,
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
 * Warmth is displayed to one decimal at most; rounding here keeps long reconciles from
 * accumulating float dust and keeps save round-trips exact.
 */
function roundWarmth(value: number): number {
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
