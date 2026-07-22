import { describe, expect, it } from 'vitest';
import {
    formatClock,
    formatGameHours,
    formatRealDuration,
    gameHoursFromRealSeconds,
    hoursUntilNextPhaseChange,
    isNightAtHour,
    realSecondsFromGameHours,
    realSecondsPerGameHour,
    timeOfDay
} from '../src/brain/clock';
import { TUNE } from '../src/data/tune';

describe('clock — one clock, online and offline', () => {
    it('derives 2.5 real minutes per game hour from dayLengthRealMinutes', () => {
        expect(realSecondsPerGameHour).toBe(150);
        expect(TUNE.dayLengthRealMinutes * 60).toBe(realSecondsPerGameHour * TUNE.gameHoursPerDay);
    });

    it('converts real seconds to game hours and back without drift', () => {
        expect(gameHoursFromRealSeconds(150)).toBe(1);
        expect(gameHoursFromRealSeconds(60)).toBeCloseTo(0.4, 12);
        expect(realSecondsFromGameHours(gameHoursFromRealSeconds(1234.5))).toBeCloseTo(1234.5, 9);
    });

    it('starts the run at dusk on day 0', () => {
        const t = timeOfDay(0);
        expect(t.hourOfDay).toBe(TUNE.startHourOfDay);
        expect(t.dayNumber).toBe(0);
        expect(t.isNight).toBe(true);
    });

    it('treats [18:00, 06:00) as night, wrapping midnight', () => {
        expect(isNightAtHour(18)).toBe(true);
        expect(isNightAtHour(23.99)).toBe(true);
        expect(isNightAtHour(0)).toBe(true);
        expect(isNightAtHour(5.99)).toBe(true);
        expect(isNightAtHour(6)).toBe(false);
        expect(isNightAtHour(12)).toBe(false);
        expect(isNightAtHour(17.99)).toBe(false);
    });

    it('rolls the day over at midnight, not at the start hour', () => {
        expect(timeOfDay(5).dayNumber).toBe(0);   // 23:00, still day 0
        expect(timeOfDay(6).dayNumber).toBe(1);   // 00:00 → day 1
        expect(timeOfDay(6).hourOfDay).toBe(0);
    });

    it('always reports a strictly positive distance to the next phase change', () => {
        for (let h = 0; h < 48; h += 0.25) {
            expect(hoursUntilNextPhaseChange(h)).toBeGreaterThan(0);
        }
        expect(hoursUntilNextPhaseChange(0)).toBe(12);   // dusk → dawn is 12 game hours
        expect(hoursUntilNextPhaseChange(12)).toBe(12);  // dawn → dusk is 12 game hours
    });

    it('formats the clock for the HUD', () => {
        expect(formatClock(0)).toBe('18:00');
        expect(formatClock(0.5)).toBe('18:30');
        expect(formatClock(6)).toBe('00:00');
        expect(formatClock(12)).toBe('06:00');
    });

    it('formats durations as plain prose', () => {
        expect(formatRealDuration(30)).toBe('less than a minute');
        expect(formatRealDuration(60)).toBe('1 minute');
        expect(formatRealDuration(60 * 8)).toBe('8 minutes');
        expect(formatRealDuration(3600 * 8)).toBe('8 hours');
        expect(formatRealDuration(3600 * 24 * 3)).toBe('3 days');
        expect(formatGameHours(6)).toBe('about 6 hours');
        expect(formatGameHours(0.4)).toBe('about 24 minutes');
    });
});
