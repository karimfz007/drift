import { describe, expect, it } from 'vitest';
import { composeMorningReport } from '../src/brain/morningReport';
import { reconcile } from '../src/brain/reconcile';
import { buildFire, createInitialState } from '../src/brain/state';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';

const MINUTE = 60;

function shelteredRun() {
    const s = createInitialState(0);
    s.inventory.wood = TUNE.woodPerFire;
    buildFire(s, s.player.x, s.player.y);
    return s;
}

function reportFor(state: ReturnType<typeof shelteredRun>, elapsedRealSeconds: number) {
    const { state: after, result } = reconcile(state, elapsedRealSeconds);
    return composeMorningReport(result, after);
}

describe('morning report — honest, or silent', () => {
    it('produces nothing for an absence below the threshold', () => {
        expect(reportFor(shelteredRun(), 0)).toBeNull();
        expect(reportFor(shelteredRun(), TUNE.morningReportMinRealMinutes * 60 - 1)).toBeNull();
    });

    it('produces a report exactly at the threshold', () => {
        const report = reportFor(shelteredRun(), TUNE.morningReportMinRealMinutes * 60);
        expect(report).not.toBeNull();
        expect(report!.lines.length).toBeGreaterThanOrEqual(3);
    });

    it('tells the truth about a fire that held', () => {
        // 5 wood burns 10 game hours = 1500 real seconds; leave for 5 real minutes.
        const report = reportFor(shelteredRun(), 5 * MINUTE)!;
        const text = report.lines.join(' ');
        expect(text).toMatch(/fire held the whole time/);
        expect(text).toMatch(/still burning/);
        expect(report.subtitle).toBe('Away 5 minutes');
        expect(report.warmth).toBe(TUNE.warmthMax);
    });

    it('tells the truth about a fire that died, and names it as the cause', () => {
        const burnRealSeconds = TUNE.woodPerFire * TUNE.fireBurnGameHoursPerWood * realSecondsPerGameHour;
        const state = shelteredRun();
        state.warmth = 80;
        const report = reportFor(state, burnRealSeconds + 20 * MINUTE)!;
        const text = report.lines.join(' ');

        expect(text).toMatch(/went out at/);
        expect(text).toMatch(/Once the fire died the night took over/);
        expect(text).toMatch(/Warmth fell/);
    });

    it('explains the offline floor instead of hiding it', () => {
        const bare = createInitialState(0);
        const { state: after, result } = reconcile(bare, 3 * 3600);
        const report = composeMorningReport(result, after)!;
        expect(report.lines.join(' ')).toMatch(/held at 15/);
        expect(report.warmth).toBe(TUNE.warmthOfflineFloor);
    });

    it('says plainly when there was no fire at all', () => {
        const bare = createInitialState(0);
        const { state: after, result } = reconcile(bare, 5 * MINUTE);
        const report = composeMorningReport(result, after)!;
        expect(report.lines.join(' ')).toMatch(/no fire/);
    });

    it('titles the report Morning once the sun is up', () => {
        // 12 game hours of night = 1800 real seconds to reach dawn.
        const report = reportFor(shelteredRun(), 12 * realSecondsPerGameHour)!;
        expect(report.title).toBe('Morning');
        expect(report.lines.join(' ')).toMatch(/daylight/);
    });

    it('never invents urgency: no FOMO, no nagging, no exclamation', () => {
        const report = reportFor(shelteredRun(), 40 * MINUTE)!;
        const text = `${report.title} ${report.subtitle} ${report.lines.join(' ')}`;
        expect(text).not.toMatch(/!/);
        expect(text).not.toMatch(/hurry|don't miss|last chance|come back|log in/i);
    });
});
