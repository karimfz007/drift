import { describe, expect, it } from 'vitest';
import { reconcile } from '../src/brain/reconcile';
import { buildFire, createInitialState } from '../src/brain/state';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

const HOUR = 3600;
const DAY = 86400;

function fresh(): GameState {
    return createInitialState(1_700_000_000_000);
}

describe('vitals — the three clocks drain at their tuned rates', () => {
    it('thirst and hunger fall linearly with game time', () => {
        const oneGameHour = realSecondsPerGameHour;
        const { state } = reconcile(fresh(), oneGameHour);
        expect(state.thirst).toBeCloseTo(TUNE.thirstMax - TUNE.thirstDrainPerGameHour, 6);
        expect(state.hunger).toBeCloseTo(TUNE.hungerMax - TUNE.hungerDrainPerGameHour, 6);
    });

    it('thirst reaches empty in about three game-days (Rule of Threes)', () => {
        const gameDays = TUNE.thirstMax / TUNE.thirstDrainPerGameHour / TUNE.gameHoursPerDay;
        expect(gameDays).toBeGreaterThan(2.5);
        expect(gameDays).toBeLessThan(3.5);
    });
});

describe('vitals — empty vitals drain health, and they STACK (online)', () => {
    //  Half a game hour = 75 real s, under the 120 s report threshold → an ONLINE span,
    //  where floors are 0 and health can actually drain. Noon (hour 12) keeps warmth
    //  neutral so only the vitals we empty on purpose are in play.
    const halfHour = realSecondsPerGameHour * 0.5;

    it('one empty vital drains health at the single rate', () => {
        const s = fresh();
        s.thirst = 0;
        s.gameHoursElapsed = 12; // daytime — warmth neutral
        const { state } = reconcile(s, halfHour);
        expect(state.health).toBeCloseTo(
            TUNE.healthMax - TUNE.healthDrainPerGameHourPerEmptyVital * 0.5,
            5
        );
    });

    it('two empty vitals drain health twice as fast', () => {
        const s = fresh();
        s.thirst = 0;
        s.hunger = 0;
        s.gameHoursElapsed = 12;
        const { state } = reconcile(s, halfHour);
        expect(state.health).toBeCloseTo(
            TUNE.healthMax - 2 * TUNE.healthDrainPerGameHourPerEmptyVital * 0.5,
            5
        );
    });

    it('empty warmth adds its own health drain on top', () => {
        const s = fresh();
        s.thirst = 0;
        s.hunger = 0;
        s.warmth = 0;
        s.gameHoursElapsed = 12;
        const { state } = reconcile(s, halfHour);
        const expectedRate = 2 * TUNE.healthDrainPerGameHourPerEmptyVital + TUNE.warmthEmptyHealthDrainPerGameHour;
        expect(state.health).toBeCloseTo(TUNE.healthMax - expectedRate * 0.5, 5);
    });

    it('health recovers, online, while no vital is empty', () => {
        const s = fresh();
        s.health = 50;
        s.gameHoursElapsed = 12; // daytime, nothing draining
        const { state } = reconcile(s, halfHour);
        expect(state.health).toBeCloseTo(50 + TUNE.healthRegenPerGameHour * 0.5, 5);
    });
});

describe('vitals — death is possible in active play', () => {
    it('health reaching zero online reports a death, with a cause', () => {
        const s = fresh();
        s.thirst = 0;
        s.hunger = 0;
        s.warmth = 0;
        s.health = 1; // one hit from gone
        s.gameHoursElapsed = 12;
        //  A SHORT (online) span: under the report threshold, so floors are 0 and death is
        //  real. The three empty vitals drain health fast; one game-hour is far more than
        //  enough, but must stay online to count as active play.
        const shortOnline = TUNE.morningReportMinRealMinutes * 60 - 1; // 119 real s
        const { state, result } = reconcile(s, shortOnline);
        expect(result.diedDuringSpan).toBe(true);
        expect(state.health).toBe(0);
        expect(result.deathCause).toBeTruthy();
        expect(result.deathCause).toMatch(/cold|thirst|hunger/);
    });

    it('names the cause from whichever vitals were empty', () => {
        const s = fresh();
        s.thirst = 0;
        s.hunger = TUNE.hungerMax;
        s.warmth = TUNE.warmthMax;
        s.health = 0.5;
        s.gameHoursElapsed = 12;
        const shortOnline = TUNE.morningReportMinRealMinutes * 60 - 1;
        const { result } = reconcile(s, shortOnline);
        expect(result.deathCause).toBe('thirst');
    });
});

describe('vitals — THE LAW: offline death is impossible (property test, A1)', () => {
    //  A deterministic pseudo-random sweep — no Math.random (forbidden in the brain's
    //  world, and it would make failures unreproducible). This is the headline claim of
    //  the whole cycle (D-011): for ANY starting state and ANY elapsed time, a span long
    //  enough to earn a report can never reduce health to zero.
    function rng(seed: number): () => number {
        let s = seed >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 0xffffffff;
        };
    }

    it('for 3000 random states × random long absences, health stays above zero', () => {
        const rand = rng(20260723);
        //  Spans up to 30 game-days: enough day/night cycles to exercise every rate change
        //  many times over. The absurd 1000-day and entering-empty cases get their own
        //  dedicated single-call assertions below (fast individually).
        const offlineSpans = [
            TUNE.morningReportMinRealMinutes * 60, // exactly at the threshold
            10 * 60,
            HOUR,
            8 * HOUR,
            DAY,
            3 * DAY,
            30 * DAY
        ];

        for (let i = 0; i < 3000; i++) {
            const s = createInitialState(0);
            //  Start from anywhere plausible — including on the brink of death, every vital
            //  empty, at any time of day, with or without a lit fire.
            s.health = rand() * TUNE.healthMax; // 0..100, can be a sliver
            if (s.health <= 0) s.health = 0.0001; // alive by definition
            s.thirst = rand() * TUNE.thirstMax;
            s.hunger = rand() * TUNE.hungerMax;
            s.warmth = rand() * TUNE.warmthMax;
            s.gameHoursElapsed = rand() * 240;
            if (rand() < 0.5) {
                s.inventory.wood = TUNE.woodPerFire;
                buildFire(s, s.player.x, s.player.y);
                s.fire.fuel = rand() * TUNE.fireMaxFuel;
            }

            const span = offlineSpans[Math.floor(rand() * offlineSpans.length)];
            const { state, result } = reconcile(s, span);

            expect(result.qualifiesForReport).toBe(true);
            expect(result.diedDuringSpan).toBe(false);
            expect(state.health).toBeGreaterThan(0);
            expect(Number.isFinite(state.health)).toBe(true);
        }
    });

    it('even entering offline with every vital already empty, health holds above zero', () => {
        const s = createInitialState(0);
        s.thirst = 0;
        s.hunger = 0;
        s.warmth = 0;
        s.health = 0.5; // the worst legal entry: a sliver of life, everything empty
        const { state } = reconcile(s, 1000 * DAY);
        expect(state.health).toBeGreaterThan(0);
        //  Health cannot be *raised* by absence, only held; it stays where it entered.
        expect(state.health).toBeLessThanOrEqual(0.5 + 1e-6);
    });

    it('vitals drift to their floors and stop, never below', () => {
        const s = createInitialState(0);
        const { state } = reconcile(s, 30 * DAY);
        expect(state.thirst).toBe(TUNE.thirstOfflineFloor);
        expect(state.hunger).toBe(TUNE.hungerOfflineFloor);
        expect(state.warmth).toBe(TUNE.warmthOfflineFloor);
        expect(state.health).toBeGreaterThanOrEqual(TUNE.healthOfflineFloor);
    });
});

describe('vitals — determinism holds with the new clocks', () => {
    it('same state + same elapsed → identical result', () => {
        for (const span of [1, 75, HOUR, 8 * HOUR, 3 * DAY]) {
            const a = reconcile(fresh(), span);
            const b = reconcile(fresh(), span);
            expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
            expect(JSON.stringify(a.result)).toBe(JSON.stringify(b.result));
        }
    });

    it('never mutates the state it was given', () => {
        const before = fresh();
        before.thirst = 40;
        before.hunger = 30;
        const snapshot = JSON.stringify(before);
        reconcile(before, 3 * DAY);
        expect(JSON.stringify(before)).toBe(snapshot);
    });
});
