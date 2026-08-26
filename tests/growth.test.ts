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
import { DOMAIN_LABEL, DOMAIN_LABEL_SHORT, DORMANT_DOMAINS, capacityLines, crossLines, domainLines, domainStandingOf, growthReport, standingOf } from '../src/brain/growth';
import { KNOWLEDGE_DOMAINS } from '../src/brain/knowledge';
import { readoutRows } from '../src/brain/readout';
import { readFileSync, readdirSync } from 'node:fs';
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

describe('THE SEVEN DOMAINS — the fourth system that had no way in', () => {
    /**
     * Ch.2's domains shipped with producers, gates and mastery multipliers and no reading
     * layer at all. The only way to learn where a domain stood was to walk into a refusal —
     * which is exactly how the boat's "you do not know hull work well enough yet" became a
     * dead end for a player who had no idea seamanship was a thing they had.
     */
    it('reads all seven, in the model\u2019s own order, and never invents an eighth', () => {
        const lines = domainLines(createInitialState(0));
        expect(lines.map((l) => l.domain)).toEqual(KNOWLEDGE_DOMAINS);
        expect(lines).toHaveLength(7);
    });

    it('every row can be read: a name, where you stand, and what moves it', () => {
        for (const l of domainLines(createInitialState(0))) {
            expect(l.label.length, `${l.domain} has no name`).toBeGreaterThan(2);
            expect(l.where.length, `${l.domain} does not say where you stand`).toBeGreaterThan(10);
            expect(l.how.length, `${l.domain} does not say what moves it`).toBeGreaterThan(10);
        }
    });

    it('NOT ONE RAW SCORE REACHES THE PLAYER — the same law the capacities keep', () => {
        //  The sharpest test in this file, applied to the new rows. `score` rides on the line
        //  for the harness; nothing a player reads may contain a digit.
        for (const l of domainLines(createInitialState(0))) {
            for (const [field, text] of [['label', l.label], ['where', l.where], ['how', l.how]] as const) {
                expect(text, `${l.domain}.${field} leaks a number: "${text}"`).not.toMatch(/\d/);
            }
        }
    });

    it('THE BANDS ARE CALIBRATED FOR KNOWLEDGE, not borrowed from the capacities', () => {
        //  THE BUG THIS PINS. `handsReading` banded knowledge technique with `standingOf`,
        //  whose thresholds belong to a scale with floor 10, stronger at 40, practised at 70.
        //  A domain starts at 5 and reaches about 19 after twelve events — every maritime act
        //  the game contains, done once — so every domain read as barely-moved forever.
        expect(domainStandingOf(TUNE.knowledgeInnateFloor)).toBe('as you landed');
        expect(domainStandingOf(TUNE.knowledgeInnateFloor + 1)).toBe('finding it easier');
        expect(domainStandingOf(TUNE.domainStandingAroundAt)).toBe('noticeably stronger');
        expect(domainStandingOf(TUNE.domainStandingPractisedAt)).toBe('practised');

        //  The boat's own gate is the reference point the tuning was counted against: a
        //  survivor who can survey a hull must not be told they are no different.
        //  The boat’s own gate is the reference the tuning was counted against, and it is
        //  where the two calibrations visibly disagree: a survivor who can read a hull has
        //  done real seamanship, and the capacity bands still file them under the band a
        //  survivor reaches after a single event.
        expect(domainStandingOf(TUNE.boatSeamanshipTechnique)).toBe('noticeably stronger');
        expect(standingOf(TUNE.boatSeamanshipTechnique), 'the two scales did not actually differ here')
            .toBe('finding it easier');
        //  ...and the capacity scale cannot reach its next band until 40, which at ~1.35 a
        //  turn with decaying headroom is well over thirty events — more maritime work than
        //  the island contains. That is the sense in which it was flat.
        expect(TUNE.standingStrongerAt).toBeGreaterThan(TUNE.domainStandingPractisedAt);
    });

    it('...and the readout rows moved with it, because they were the ones that were wrong', () => {
        const s = createInitialState(0);
        s.knowledge.domains.harvestingFabrication.technique = TUNE.boatSeamanshipTechnique;
        const row = readoutRows(s).find((r) => r.label === 'With the axe');
        expect(row, 'the axe row went missing').toBeTruthy();
        expect(row!.reading.standing).not.toBe('as you landed');
        //  ...and the bar leaves the left edge, which it could not while it divided from the
        //  capacity floor: a score of 14 measured from 10 is a fifth of the progress it is.
        expect(row!.reading.progress).toBeGreaterThan(0);
    });

    it('A DORMANT DOMAIN SAYS SO, and the claim is checked against the real producers', () => {
        const lines = domainLines(createInitialState(0));
        const dormant = lines.filter((l) => l.dormant).map((l) => l.domain);
        expect(dormant).toEqual([...DORMANT_DOMAINS]);

        //  THE CLAIM IS NOT TAKEN ON TRUST. A domain called dormant that something quietly
        //  trains would be the same defect as a comment outliving its premise — the screen
        //  telling a survivor nothing here asks this of them while the score climbs. So the
        //  shipped source is read: no producer may name a dormant domain, by any route.
        const sources = readdirSync('src/brain').filter((f) => f.endsWith('.ts'))
            .map((f) => readFileSync(`src/brain/${f}`, 'utf8'));
        for (const dead of DORMANT_DOMAINS) {
            for (const src of sources) {
                //  Strip comments, so prose ABOUT the domain does not read as a producer —
                //  several files discuss `electricalRadio` at length precisely to say that
                //  nothing feeds it, and those sentences must not trip this.
                const code = src
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/\/\/.*$/gm, '');
                expect(code, `something trains ${dead}, which the panel calls dormant`)
                    .not.toMatch(new RegExp(`(recordTrying|applyLearningEvent)\\([^)]*${dead}`));
                expect(code, `${dead} is a recipe or node domain, which the panel calls dormant`)
                    .not.toMatch(new RegExp(`domain:\\s*'${dead}'`));
            }
        }
        //  ...and it carries no band, because "as you landed" beside a thing that cannot be
        //  learned here is a zero on a stat sheet rather than an honest sentence.
        for (const l of lines.filter((x) => x.dormant)) {
            expect(l.where).toMatch(/nothing/i);
        }
    });

    it('the report carries them, so the panel has something to render', () => {
        const report = growthReport(createInitialState(0), freshCapacities());
        expect(report.domains).toHaveLength(7);
        expect(report.capacities, 'the capacities were displaced').toHaveLength(CAPACITIES.length);
    });

    it('ONE VOCABULARY, TWO REGISTERS — both label maps cover all seven and neither is empty', () => {
        //  `game.ts` kept its own short map and it was the second name for one set of things.
        for (const d of KNOWLEDGE_DOMAINS) {
            expect(DOMAIN_LABEL[d], `${d} has no long name`).toBeTruthy();
            expect(DOMAIN_LABEL_SHORT[d], `${d} has no short name`).toBeTruthy();
        }
    });
});
