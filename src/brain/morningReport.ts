/**
 * BRAIN — the morning report. Plain prose composed from reconcile's results.
 *
 * Honest systems (charter §I.8, Ops crew norm 6): the report explains *causes*, never
 * just results; it never manufactures urgency, never hides a number, and never nags the
 * player to come back. If nothing happened, it says so.
 */

import { TUNE } from '../data/tune';
import { formatClock, formatGameHours, formatRealDuration } from './clock';
import type { GameState, ReconcileResult } from './types';

export interface MorningReport {
    title: string;
    /** Sub-heading: how long you were away, in real time. */
    subtitle: string;
    /** One short paragraph per beat, in the order they happened. */
    lines: string[];
    /** The single number the player most wants: warmth now. */
    warmth: number;
}

/**
 * Compose the report for an absence. Returns null when the absence was too short to
 * have a story (TUNE.morningReportMinRealMinutes) — silence is the honest answer.
 */
export function composeMorningReport(
    result: ReconcileResult,
    stateAfter: GameState
): MorningReport | null {
    if (!result.qualifiesForReport) return null;

    const startClock = stateAfter.gameHoursElapsed - result.elapsedGameHours;
    const lines: string[] = [];

    // 1. The passage of time.
    lines.push(
        `You were away ${formatRealDuration(result.elapsedRealSeconds)}. ` +
        `On the island ${formatGameHours(result.elapsedGameHours)} passed — ` +
        `it is now ${formatClock(stateAfter.gameHoursElapsed)}, ` +
        `${result.timeAfter.isNight ? 'still dark' : 'daylight'}.`
    );

    // 2. The fire — the thing the player left running.
    if (!stateAfter.fire.built) {
        lines.push('You had built no fire. Nothing burned while you were gone.');
    } else if (result.fireLitBefore && result.fireLitAfter) {
        lines.push(
            `Your fire held the whole time. ${formatFuel(stateAfter.fire.fuel)} of wood ` +
            `is still burning — ${formatGameHours(remainingBurnHours(stateAfter.fire.fuel))} left in it.`
        );
    } else if (result.fireLitBefore && result.fireWentOutAtGameHours !== null) {
        const burnedFor = result.fireWentOutAtGameHours - startClock;
        lines.push(
            `Your fire burned for ${formatGameHours(burnedFor)} and went out at ` +
            `${formatClock(result.fireWentOutAtGameHours)}. ` +
            `It had ${formatFuel(result.woodBurned)} of wood in it.`
        );
    } else {
        lines.push('Your fire was already out when you left. The pit is cold.');
    }

    // 3. Warmth — stated as cause, then effect.
    lines.push(warmthLine(result));

    // 4. Where the clock stands now.
    if (result.dawnBroke && !result.timeAfter.isNight) {
        lines.push('You made it to daylight. The cold eases until dusk.');
    } else if (result.timeAfter.isNight) {
        lines.push(
            `The night still has ${formatGameHours(hoursUntilDawn(result.timeAfter.hourOfDay))} to run.`
        );
    }

    return {
        title: result.dawnBroke ? 'Morning' : 'While you were gone',
        subtitle: `Away ${formatRealDuration(result.elapsedRealSeconds)}`,
        lines,
        warmth: stateAfter.warmth
    };
}

function warmthLine(result: ReconcileResult): string {
    const before = Math.round(result.warmthBefore);
    const after = Math.round(result.warmthAfter);

    if (after > before) {
        const because = result.shelteredByFire
            ? 'You had stopped inside the firelight, and it did its work'
            : 'The daylight did the work';
        return `${because}. Warmth rose ${before} → ${after}.`;
    }

    if (after < before) {
        const because = result.fireLitBefore && !result.fireLitAfter
            ? 'Once the fire died the night took over'
            : result.shelteredByFire
                ? 'The fire could not keep pace with the cold'
                : 'You were out in the night with nothing between you and it';
        const floor = result.floorHeld
            ? ` You shivered through the worst of it and held at ${after} — you did not go lower.`
            : '';
        return `${because}. Warmth fell ${before} → ${after}.${floor}`;
    }

    return `Warmth is unchanged at ${after}.`;
}

function remainingBurnHours(fuel: number): number {
    return fuel * TUNE.fireBurnGameHoursPerWood;
}

function hoursUntilDawn(hourOfDay: number): number {
    const toDawn = hourOfDay >= TUNE.nightStartHour
        ? TUNE.gameHoursPerDay - hourOfDay + TUNE.dayStartHour
        : TUNE.dayStartHour - hourOfDay;
    return Math.max(0, toDawn);
}

function formatFuel(fuel: number): string {
    const rounded = Math.round(fuel * 10) / 10;
    const shown = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
    return `${shown} ${rounded === 1 ? 'piece' : 'pieces'}`;
}
