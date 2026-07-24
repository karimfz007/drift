import { describe, expect, it } from 'vitest';
import { reconcile } from '../src/brain/reconcile';
import { buildFire, createInitialState, gatherNode } from '../src/brain/state';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

/** A run that has just started: dusk, full warmth, no fire, standing where they washed up. */
function freshRun(): GameState {
    return createInitialState(1_700_000_000_000);
}

/** A run with a 5-wood fire lit at the player's feet. */
function shelteredRun(): GameState {
    const state = freshRun();
    state.inventory.wood = TUNE.woodPerFire;
    buildFire(state, state.player.x, state.player.y);
    return state;
}

describe('reconcile — A1: the acceptance spans', () => {
    it('1 real minute at night with no fire drains exactly the tuned rate', () => {
        const { state, result } = reconcile(freshRun(), MINUTE);
        // 60 real s ÷ 150 s per game hour = 0.4 game hours × 12 warmth/hour = 4.8
        expect(result.elapsedGameHours).toBeCloseTo(0.4, 12);
        expect(state.warmth).toBeCloseTo(TUNE.warmthMax - 4.8, 6);
        expect(state.gameHoursElapsed).toBeCloseTo(0.4, 12);
    });

    it('8 real hours advances 192 game hours and lands warmth on the offline floor', () => {
        const { state, result } = reconcile(freshRun(), 8 * HOUR);
        expect(result.elapsedGameHours).toBeCloseTo(192, 9);
        expect(result.qualifiesForReport).toBe(true);
        expect(result.floorHeld).toBe(true);
        expect(state.warmth).toBe(TUNE.warmthOfflineFloor);
        // 8 game days of nights and dawns both happened.
        expect(result.dawnBroke).toBe(true);
        expect(result.nightFell).toBe(true);
    });

    it('3 real days advances 1728 game hours and still holds the floor', () => {
        const { state, result } = reconcile(freshRun(), 3 * DAY);
        expect(result.elapsedGameHours).toBeCloseTo(1728, 6);
        expect(state.gameHoursElapsed).toBeCloseTo(1728, 6);
        expect(state.warmth).toBe(TUNE.warmthOfflineFloor);
        expect(Number.isFinite(state.warmth)).toBe(true);
    });
});

describe('reconcile — determinism', () => {
    it('same state + same elapsed → identical result, every time', () => {
        const spans = [1, 37, MINUTE, 17 * MINUTE, 8 * HOUR, 3 * DAY];
        for (const span of spans) {
            const a = reconcile(shelteredRun(), span);
            const b = reconcile(shelteredRun(), span);
            expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
            expect(JSON.stringify(a.result)).toBe(JSON.stringify(b.result));
        }
    });

    it('composes: away in one call == the same time ticked frame by frame, while the floor is not in play', () => {
        const oneShot = reconcile(shelteredRun(), 40 * MINUTE).state;

        let stepped = shelteredRun();
        for (let i = 0; i < 40; i++) {
            stepped = reconcile(stepped, MINUTE).state;
        }

        expect(stepped.warmth).toBeCloseTo(oneShot.warmth, 6);
        expect(stepped.fire.fuel).toBeCloseTo(oneShot.fire.fuel, 9);
        expect(stepped.gameHoursElapsed).toBeCloseTo(oneShot.gameHoursElapsed, 9);
    });

    it('clock and fuel compose exactly even when the floor does differ', () => {
        //  The parts that are pure arithmetic must compose no matter what warmth does.
        const oneShot = reconcile(freshRun(), 40 * MINUTE).state;

        let stepped = freshRun();
        for (let i = 0; i < 40; i++) {
            stepped = reconcile(stepped, MINUTE).state;
        }

        expect(stepped.gameHoursElapsed).toBeCloseTo(oneShot.gameHoursElapsed, 9);
        expect(stepped.fire.fuel).toBeCloseTo(oneShot.fire.fuel, 9);
    });

    it('never mutates the state it was given', () => {
        const before = shelteredRun();
        const snapshot = JSON.stringify(before);
        reconcile(before, 3 * DAY);
        expect(JSON.stringify(before)).toBe(snapshot);
    });
});

describe('reconcile — zero and nonsense spans', () => {
    it('zero elapsed changes nothing', () => {
        const before = shelteredRun();
        const { state, result } = reconcile(before, 0);
        expect(JSON.stringify(state)).toBe(JSON.stringify(before));
        expect(result.elapsedGameHours).toBe(0);
        expect(result.qualifiesForReport).toBe(false);
    });

    it('negative, NaN and Infinity elapsed change nothing', () => {
        const before = shelteredRun();
        for (const span of [-1, -DAY, NaN, Infinity]) {
            const { state } = reconcile(before, span);
            expect(JSON.stringify(state)).toBe(JSON.stringify(before));
        }
    });
});

describe('reconcile — fire', () => {
    it('exhausts at exactly fuel × fireBurnGameHoursPerWood', () => {
        const burnGameHours = TUNE.woodPerFire * TUNE.fireBurnGameHoursPerWood; // 10
        const burnRealSeconds = burnGameHours * realSecondsPerGameHour;         // 1500

        const justBefore = reconcile(shelteredRun(), burnRealSeconds - 1);
        expect(justBefore.result.fireLitAfter).toBe(true);
        expect(justBefore.state.fire.fuel).toBeGreaterThan(0);

        const exactly = reconcile(shelteredRun(), burnRealSeconds);
        expect(exactly.state.fire.fuel).toBe(0);
        expect(exactly.result.fireLitAfter).toBe(false);
        expect(exactly.result.fireWentOutAtGameHours).toBeCloseTo(burnGameHours, 9);
        expect(exactly.result.woodBurned).toBeCloseTo(TUNE.woodPerFire, 9);

        const wellAfter = reconcile(shelteredRun(), burnRealSeconds * 3);
        expect(wellAfter.state.fire.fuel).toBe(0);
        expect(wellAfter.result.fireWentOutAtGameHours).toBeCloseTo(burnGameHours, 9);
    });

    it('warms the player while it burns, then hands them back to the night', () => {
        const oneGameHour = realSecondsPerGameHour;

        // Start cold so the regen has room to show.
        const cold = shelteredRun();
        cold.warmth = 40;
        const warmed = reconcile(cold, oneGameHour);
        expect(warmed.state.warmth).toBeCloseTo(40 + TUNE.warmthRegenPerGameHourAtFire, 6);
        expect(warmed.result.shelteredByFire).toBe(true);

        // Standing outside the radius, the same fire does nothing for you.
        const away = shelteredRun();
        away.warmth = 40;
        away.player.x = away.fire.x + TUNE.fireWarmthRadius + 1;
        const chilled = reconcile(away, oneGameHour);
        expect(chilled.result.shelteredByFire).toBe(false);
        expect(chilled.state.warmth).toBeCloseTo(40 - TUNE.warmthDrainPerGameHourNight, 6);
    });

    it('reports the fire that was already out before the absence', () => {
        const dead = shelteredRun();
        dead.fire.fuel = 0;
        const { result } = reconcile(dead, 10 * MINUTE);
        expect(result.fireLitBefore).toBe(false);
        expect(result.fireWentOutAtGameHours).toBe(null);
        expect(result.woodBurned).toBe(0);
    });
});

describe('reconcile — warmth clamps', () => {
    it('never exceeds warmthMax however long the fire burns', () => {
        const state = shelteredRun();
        state.fire.fuel = TUNE.fireMaxFuel;
        state.warmth = TUNE.warmthMax - 1;
        const { state: after } = reconcile(state, 10 * MINUTE);
        expect(after.warmth).toBe(TUNE.warmthMax);
    });

    it('bottoms out at zero for short spans that do not earn a report', () => {
        const state = freshRun();
        state.warmth = 2;
        const shortSpan = TUNE.morningReportMinRealMinutes * 60 - 1;
        const { state: after, result } = reconcile(state, shortSpan);
        expect(result.qualifiesForReport).toBe(false);
        expect(after.warmth).toBe(0);
    });

    it('holds the offline fairness floor for absences that do earn a report (D-011)', () => {
        const state = freshRun();
        const { state: after, result } = reconcile(state, 6 * HOUR);
        expect(result.qualifiesForReport).toBe(true);
        expect(after.warmth).toBe(TUNE.warmthOfflineFloor);
        expect(result.floorHeld).toBe(true);
    });

    it('the floor is a rule about ABSENCE, not about elapsed time (D-025)', () => {
        //  C3 audit of C01 found this divergence; D-025 makes it the intended rule rather
        //  than an accident, and this test pins it so it cannot change unnoticed.
        //
        //  One 30-minute absence — a whole 12-hour night — so the floor protects them.
        const away = reconcile(freshRun(), 30 * MINUTE).state;
        expect(away.warmth).toBe(TUNE.warmthOfflineFloor);

        //  The same 20 minutes spent watching the screen, ticked frame by frame: every
        //  call is far below the report threshold, no floor, and the night takes it all.
        //  The player was present the whole time and could have acted at any moment.
        let present = freshRun();
        for (let i = 0; i < 30 * MINUTE; i++) {
            present = reconcile(present, 1).state;
        }
        expect(present.warmth).toBe(0);
        expect(present.warmth).toBeLessThan(away.warmth);
        expect(present.gameHoursElapsed).toBeCloseTo(away.gameHoursElapsed, 6);
    });

    it('never lifts warmth that was already below the floor', () => {
        const state = freshRun();
        state.warmth = 4;
        const { state: after } = reconcile(state, 6 * HOUR);
        expect(after.warmth).toBe(4);
    });

    it('leaves warmth alone in daylight with no fire', () => {
        const state = freshRun();
        state.gameHoursElapsed = 12;      // 06:00, dawn
        state.warmth = 55;
        const { state: after } = reconcile(state, realSecondsPerGameHour * 6); // to noon
        expect(after.warmth).toBe(55);
    });
});

describe('reconcile — the wood is untouched by time', () => {
    it('carries inventory through any absence, and spent nodes stay spent until the renewability law regrows them (D-051)', () => {
        const state = freshRun();
        gatherNode(state, 'dw1');
        gatherNode(state, 'df1');
        const woodBefore = state.inventory.wood;

        //  A short ONLINE span (under the report threshold): no tide, no timer elapsed —
        //  nothing regrows yet.
        const { state: soon } = reconcile(state, 60);
        expect(soon.inventory.wood).toBe(woodBefore);
        expect(soon.nodes.find((n) => n.id === 'dw1')?.available).toBe(false);
        expect(soon.nodes.find((n) => n.id === 'df1')?.available).toBe(false);
        expect(soon.nodes.find((n) => n.id === 'dw2')?.available).toBe(true);

        //  A long absence: both have had time to regrow (D-051 — nothing is globally
        //  exhaustible, only rate/effort). See tests/renewability.test.ts for the full law,
        //  including driftwood's separate tide-restock (which fires on ANY qualifying
        //  absence regardless of elapsed time — not what this longer span is testing).
        const { state: after } = reconcile(state, 3 * DAY);
        expect(after.inventory.wood).toBe(woodBefore);
        expect(after.nodes.find((n) => n.id === 'dw1')?.available).toBe(true);
        expect(after.nodes.find((n) => n.id === 'df1')?.available).toBe(true);
    });
});
