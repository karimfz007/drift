import { describe, expect, it } from 'vitest';
import { Session } from '../src/brain/session';
import { MemorySaveRepository, deserialize } from '../src/brain/save';
import { buildFire } from '../src/brain/state';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';

const T0 = 1_700_000_000_000;

describe('session — A4: quit, wait, reopen', () => {
    it('starts a fresh run and writes a save immediately', () => {
        const repo = new MemorySaveRepository();
        const { session, report, isNewRun } = Session.start(repo, T0);

        expect(isNewRun).toBe(true);
        expect(report).toBeNull();
        expect(session.state.warmth).toBe(TUNE.warmthMax);
        expect(deserialize(repo.read())!.savedAtMs).toBe(T0);
    });

    it('folds the absence in on reopen and produces the report', () => {
        const repo = new MemorySaveRepository();
        const first = Session.start(repo, T0).session;
        first.state.inventory.wood = TUNE.woodPerFire;
        buildFire(first.state, first.state.player.x, first.state.player.y);
        first.persist(T0);

        // Away for 5 real minutes.
        const awayMs = 5 * 60 * 1000;
        const { session, report, isNewRun } = Session.start(repo, T0 + awayMs);

        expect(isNewRun).toBe(false);
        expect(report).not.toBeNull();
        expect(report!.subtitle).toBe('Away 5 minutes');
        // 5 real min = 2 game hours; the fire had 10 game hours in it.
        expect(session.state.gameHoursElapsed).toBeCloseTo(2, 9);
        expect(session.state.fire.fuel).toBeCloseTo(TUNE.woodPerFire - 1, 9);
        expect(session.state.warmth).toBe(TUNE.warmthMax);
    });

    it('stays silent about an absence shorter than the report threshold', () => {
        const repo = new MemorySaveRepository();
        Session.start(repo, T0).session.persist(T0);
        const { report } = Session.start(repo, T0 + 30 * 1000);
        expect(report).toBeNull();
    });

    it('starts a fresh run when the save is unreadable', () => {
        const repo = new MemorySaveRepository();
        repo.write('{ garbage');
        const { session, isNewRun } = Session.start(repo, T0);
        expect(isNewRun).toBe(true);
        expect(session.state.gameHoursElapsed).toBe(0);
    });
});

describe('session — the frame loop uses the same maths', () => {
    it('ticking forward advances the world exactly like an absence', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);

        session.tick(T0 + realSecondsPerGameHour * 1000); // one game hour of foreground play
        expect(session.state.gameHoursElapsed).toBeCloseTo(1, 9);
        expect(session.state.warmth).toBeCloseTo(TUNE.warmthMax - TUNE.warmthDrainPerGameHourNight, 6);
        expect(session.state.trace.activeMs).toBeCloseTo(realSecondsPerGameHour * 1000, 3);
    });

    it('a tick into the past changes nothing but the anchor', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        const warmth = session.state.warmth;
        session.tick(T0 - 5000);
        expect(session.state.warmth).toBe(warmth);
        expect(session.state.lastSeenMs).toBe(T0 - 5000);
    });

    it('keeps the trace across ticks and saves', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);

        session.markFirstMove(820);
        session.markFirstWood(2400);
        session.markFailedTap();
        session.markFailedTap();
        session.tick(T0 + 10_000);
        session.persist(T0 + 10_000);

        const reloaded = Session.start(repo, T0 + 10_000).session;
        expect(reloaded.state.trace.msToFirstMove).toBe(820);
        expect(reloaded.state.trace.msToFirstWood).toBe(2400);
        expect(reloaded.state.trace.failedInteractionTaps).toBe(2);
    });

    it('only records the first of each milestone', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        session.markFirstMove(100);
        session.markFirstMove(999);
        expect(session.state.trace.msToFirstMove).toBe(100);
    });
});

describe('session — resume from a backgrounded tab', () => {
    it('folds in the absence and reports it, without a reload', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        session.state.inventory.wood = TUNE.woodPerFire;
        buildFire(session.state, session.state.player.x, session.state.player.y);
        session.persist(T0);

        const report = session.resume(T0 + 4 * 60 * 1000);
        expect(report).not.toBeNull();
        expect(report!.subtitle).toBe('Away 4 minutes');
        expect(session.state.gameHoursElapsed).toBeCloseTo(1.6, 9);
        //  The save is written on resume, so a crash right afterwards loses nothing.
        expect(deserialize(repo.read())!.state.gameHoursElapsed).toBeCloseTo(1.6, 9);
    });

    it('stays silent for a glance at another app', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        expect(session.resume(T0 + 20_000)).toBeNull();
        expect(session.resume(T0 + 20_000)).toBeNull();   // no time passed at all
    });

    it('does not double-count: resume then tick advances the clock once', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        const away = 5 * 60 * 1000;

        session.resume(T0 + away);
        const afterResume = session.state.gameHoursElapsed;
        session.tick(T0 + away);
        expect(session.state.gameHoursElapsed).toBeCloseTo(afterResume, 9);
        expect(afterResume).toBeCloseTo(2, 9);
    });

    it('keeps the trace across a resume', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        session.markFirstWood(1234);
        session.resume(T0 + 3 * 60 * 1000);
        expect(session.state.trace.msToFirstWood).toBe(1234);
    });
});

describe('session — A6: the control-mode toggle persists', () => {
    it('survives a reload and counts the switch', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        expect(session.state.settings.controlMode).toBe('tap');

        session.setControlMode('joystick', T0);
        expect(session.state.trace.controlModeSwitches).toBe(1);

        const reloaded = Session.start(repo, T0 + 1000).session;
        expect(reloaded.state.settings.controlMode).toBe('joystick');
        expect(reloaded.state.trace.controlModeSwitches).toBe(1);
    });

    it('setting the same mode again is not a switch', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, T0);
        session.setControlMode('tap', T0);
        expect(session.state.trace.controlModeSwitches).toBe(0);
    });
});
