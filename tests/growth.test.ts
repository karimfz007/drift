/**
 * THE GROWTH REPORT (director's playtest, FIX 1) — surfacing what Stage B built.
 *
 * Stage B shipped eight capacities and three crossings with no way to see any of them; this
 * is the reading layer, and it lives in the brain precisely so these assertions can exist.
 * The depth-dial admission test is a claim about CONTENT — perceive, influence, narrate — and
 * content asserted only by markup is asserted by nobody, which is how the Build button and
 * Try-Combining both shipped unreachable.
 *
 * The sharpest test here is the negative one: **no player-facing string may contain a raw
 * score**. A castaway does not know they are at 34, and a screen that says so has turned a
 * body into a character sheet — the exact thing §12's capacities exist instead of.
 */
import { describe, expect, it } from 'vitest';
import { capacityLines, crossLines, growthReport, standingOf } from '../src/brain/growth';
import { CAPACITIES, freshCapacities, type CapacityScores } from '../src/brain/capacities';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

function withCapacity(c: string, v: number): CapacityScores {
    return { ...freshCapacities(), [c]: v } as CapacityScores;
}

function knowing(domain: string, understanding: number): GameState {
    const s = createInitialState(0);
    s.knowledge.domains[domain as 'construction'] = { technique: 0, understanding, adaptation: 0 };
    return s;
}

describe('PERCEIVE — you can tell where you stand, without a number', () => {
    it('four bands, ordered, and a fresh castaway is at the bottom of all of them', () => {
        expect(standingOf(TUNE.capacityInnateFloor)).toBe('as you landed');
        expect(standingOf(TUNE.capacityInnateFloor + 1)).toBe('finding it easier');
        expect(standingOf(TUNE.standingStrongerAt)).toBe('noticeably stronger');
        expect(standingOf(TUNE.standingPractisedAt)).toBe('practised');
        for (const line of capacityLines(freshCapacities())) {
            expect(line.standing, line.capacity).toBe('as you landed');
        }
    });

    it('NO PLAYER-FACING STRING CARRIES A RAW SCORE', () => {
        //  The one that matters. Scores exist on the report for the harness; nothing a
        //  player reads may contain one, at any value, for any capacity.
        for (const score of [0, 7, 34, 41, 55, 70, 99, 100]) {
            for (const c of CAPACITIES) {
                const line = capacityLines(withCapacity(c, score)).find((l) => l.capacity === c)!;
                const shown = `${line.label} ${line.standing} ${line.where} ${line.how}`;
                expect(shown, `${c}@${score}`).not.toContain(String(score));
                expect(shown).not.toMatch(/\d+\s*%/);
            }
        }
    });

    it('every capacity gets a label a person would use, not its identifier', () => {
        for (const line of capacityLines(freshCapacities())) {
            expect(line.label, line.capacity).not.toBe(line.capacity);
            expect(line.label[0]).toBe(line.label[0].toUpperCase());
        }
    });

    it('all eight are present — the panel shows the body, not a selection from it', () => {
        expect(capacityLines(freshCapacities())).toHaveLength(8);
    });
});

describe('INFLUENCE — you know what would move it', () => {
    it('every line says what develops it, in §12\'s own words', () => {
        for (const line of capacityLines(freshCapacities())) {
            expect(line.how.length, line.capacity).toBeGreaterThan(20);
        }
    });

    it('and the how is per-capacity, never one generic sentence repeated', () => {
        const hows = new Set(capacityLines(freshCapacities()).map((l) => l.how));
        expect(hows.size).toBe(8);
    });
});

describe('NARRATE — you can say what happened and why', () => {
    it('all three crossings appear, each with §15\'s own plain sentence', () => {
        const lines = crossLines(createInitialState(0), freshCapacities());
        expect(lines).toHaveLength(3);
        for (const l of lines) {
            expect(l.note.length, l.title).toBeGreaterThan(20);
            expect(l.title).not.toBe(l.id);
        }
    });

    it('an unachieved crossing NAMES the missing half — never "requirements not met"', () => {
        const bodyOnly = crossLines(knowing('construction', 0), withCapacity('strength', 100))
            .find((l) => l.id === 'heavy-construction-control')!;
        expect(bodyOnly.achieved).toBe(false);
        expect(bodyOnly.missing).toContain('understanding');

        const knowOnly = crossLines(knowing('construction', 100), freshCapacities())
            .find((l) => l.id === 'heavy-construction-control')!;
        expect(knowOnly.missing).toContain('body');
    });

    it('an achieved one says so and stops naming what is missing', () => {
        const crossed = crossLines(knowing('construction', 100), withCapacity('strength', 100))
            .find((l) => l.id === 'heavy-construction-control')!;
        expect(crossed.achieved).toBe(true);
        expect(crossed.missing).toBeNull();
    });
});

describe('the summary is honest about a fresh castaway', () => {
    it('says nothing has changed yet, rather than inventing encouragement', () => {
        const r = growthReport(createInitialState(0), freshCapacities());
        expect(r.summary).toContain('not changed you yet');
        //  ...and no fake progress: no "level", no percentage.
        expect(r.summary.toLowerCase()).not.toContain('level');
        expect(r.summary).not.toMatch(/\d+\s*%/);
    });

    it('counts what has actually shifted once something has', () => {
        const r = growthReport(createInitialState(0), withCapacity('strength', 55));
        expect(r.summary).toContain('1 of 8');
    });

    it('and mentions a crossing only when one has really come together', () => {
        const none = growthReport(createInitialState(0), withCapacity('strength', 55));
        expect(none.summary).not.toContain('come together');
        const crossed = growthReport(knowing('construction', 100), withCapacity('strength', 100));
        expect(crossed.summary).toContain('come together');
    });

    it('the report carries scores for the harness, but the panel reads bands', () => {
        const r = growthReport(createInitialState(0), withCapacity('strength', 55));
        expect(r.capacities.find((l) => l.capacity === 'strength')!.score).toBe(55);
    });
});
