/**
 * BRAIN — the world clock. Real-time anchored: one clock, online and offline.
 * Pure functions of TUNE and elapsed game hours. Zero Phaser.
 */

import { TUNE, gameHoursPerRealSecond, realSecondsPerGameHour } from '../data/tune';
import type { TimeOfDay } from './types';

export { gameHoursPerRealSecond, realSecondsPerGameHour };

/** Game hours advanced by a span of real seconds. */
export function gameHoursFromRealSeconds(realSeconds: number): number {
    return realSeconds * gameHoursPerRealSecond;
}

/** Real seconds a span of game hours takes. */
export function realSecondsFromGameHours(gameHours: number): number {
    return gameHours * realSecondsPerGameHour;
}

/** True if this hour-of-day is night. Night wraps midnight: [nightStart, 24) ∪ [0, dayStart). */
export function isNightAtHour(hourOfDay: number): boolean {
    const h = wrapHour(hourOfDay);
    return h >= TUNE.nightStartHour || h < TUNE.dayStartHour;
}

/** Read the clock at a point in the run. */
export function timeOfDay(gameHoursElapsed: number): TimeOfDay {
    const absolute = TUNE.startHourOfDay + gameHoursElapsed;
    const dayNumber = Math.floor(absolute / TUNE.gameHoursPerDay);
    const hourOfDay = wrapHour(absolute);
    return { hourOfDay, dayNumber, isNight: isNightAtHour(hourOfDay) };
}

/**
 * Game hours from `gameHoursElapsed` until the next day↔night flip.
 * Always > 0, so segment-stepping in reconcile always makes progress.
 */
export function hoursUntilNextPhaseChange(gameHoursElapsed: number): number {
    const h = timeOfDay(gameHoursElapsed).hourOfDay;
    const boundary = isNightAtHour(h) ? TUNE.dayStartHour : TUNE.nightStartHour;
    let delta = boundary - h;
    while (delta <= 0) {
        delta += TUNE.gameHoursPerDay;
    }
    return delta;
}

/** "19:30" — for the HUD and the morning report. No information by colour alone. */
export function formatClock(gameHoursElapsed: number): string {
    const { hourOfDay } = timeOfDay(gameHoursElapsed);
    const hours = Math.floor(hourOfDay);
    const minutes = Math.floor((hourOfDay - hours) * 60);
    return `${pad2(hours)}:${pad2(minutes)}`;
}

/** "8 hours", "45 minutes", "2 days 3 hours" — plain prose for the report. */
export function formatRealDuration(realSeconds: number): string {
    const totalMinutes = Math.floor(realSeconds / 60);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    const minutes = totalMinutes - days * 60 * 24 - hours * 60;

    const parts: string[] = [];
    if (days > 0) parts.push(plural(days, 'day'));
    if (hours > 0) parts.push(plural(hours, 'hour'));
    if (parts.length < 2 && minutes > 0) parts.push(plural(minutes, 'minute'));
    if (parts.length === 0) return 'less than a minute';
    return parts.join(' ');
}

/** "6 hours" of game time — the in-fiction span. */
export function formatGameHours(gameHours: number): string {
    const whole = Math.floor(gameHours);
    if (whole >= 1) {
        const minutes = Math.round((gameHours - whole) * 60);
        if (minutes >= 30) return `about ${plural(whole + 1, 'hour')}`;
        return `about ${plural(whole, 'hour')}`;
    }
    const minutes = Math.max(1, Math.round(gameHours * 60));
    return `about ${plural(minutes, 'minute')}`;
}

function plural(n: number, unit: string): string {
    return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function wrapHour(hour: number): number {
    const wrapped = hour % TUNE.gameHoursPerDay;
    return wrapped < 0 ? wrapped + TUNE.gameHoursPerDay : wrapped;
}
