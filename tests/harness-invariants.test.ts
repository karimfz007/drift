/**
 * HARNESS INVARIANTS — rules about `tools/smoke.mjs` itself, checked in seconds.
 *
 * WHY THESE LIVE HERE. The device harness is a 40-section run that takes the better part of an
 * hour, and a defect in the harness reports as a defect in the GAME. This project has now paid
 * for that three times: [[D-124]]'s "the wreck is unworkable" was the aim path guessing at
 * heights; [[D-134]]'s "MARITIME 3d is flaky" was a poll that gave up five seconds early; and
 * `F1` spent a long stretch red because one section zeroed a counter another section was
 * measuring against. Each cost real sessions. Each was a property of the harness SOURCE that a
 * one-second static check could have stated.
 *
 * The precedent is [[D-134]]'s own regression proof, which asserts the harness polls on a clock
 * rather than a fixed loop (`tests/water.test.ts`). These are the same idea, generalised.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const smoke = readFileSync(fileURLToPath(new URL('../tools/smoke.mjs', import.meta.url)), 'utf8');

/** The harness's own comment lines are prose about the rules, not uses of them. */
const codeOnly = smoke.split('\n')
    .filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); })
    .join('\n');

describe('a section must not destroy state that other sections measure against', () => {
    it('nothing resets `failedInteractionTaps` — the counter F1 reads', () => {
        //  THE DEFECT THIS COMES FROM, exactly. `D-063 §9 INPUT SAFETY` opened with
        //  `editSave('state.trace.failedInteractionTaps = 0;')` so it could measure a clean
        //  delta — and it never needed to, because it reads its own baseline three lines
        //  later and compares a delta, which works from any starting value. Fourteen sections
        //  earlier the fail-loud check had captured the counter; F1, fourteen sections later,
        //  compared the two and reported a DECREASE. Input going missing makes that number go
        //  UP, so every red it ever produced was definitionally not the defect it guards.
        //
        //  A DELTA NEEDS A BASELINE, NEVER A RESET. That is the rule, and this is it stated.
        const resets = codeOnly.split('\n')
            .map((l, i) => ({ line: i + 1, text: l.trim() }))
            .filter((l) => /failedInteractionTaps\s*=\s*\d/.test(l.text));
        expect(resets.map((r) => `${r.line}: ${r.text}`)).toEqual([]);
    });

    it('F1 measures its own section, not one fourteen sections upstream', () => {
        //  The baseline and the comparison must be the same binding, and it must be declared
        //  INSIDE the section it measures — otherwise anything in between can move it.
        const start = smoke.indexOf('if (section("F1/F2');
        const end = smoke.indexOf('if (section(', start + 10);
        const section = smoke.slice(start, end === -1 ? undefined : end);
        expect(section).toMatch(/const feelSectionFailedTaps = \(await live\(\)\)\.trace\.failedInteractionTaps/);
        expect(section).toMatch(/swallowedNow === feelSectionFailedTaps/);
        //  ...and the old cross-section binding is gone from the hoisted list, so it cannot
        //  quietly be reached for again.
        const hoisted = smoke.slice(smoke.indexOf('let ground, camMinAboveGround'), smoke.indexOf('if (section('));
        expect(hoisted).not.toContain('failedTapsAfter');
    });

    it('every check that reads a shared counter names what it saw, not only a number', () => {
        //  A bare count cannot tell a swallowed gesture from a mis-resolved one from a fixture
        //  that moved the number underneath the check — the blindness `runtime.tapTrail` was
        //  added for during FIX 5's investigation, and the reason both FIX 5 and F1 stayed
        //  unexplained for so long. Both now print the trail in their detail line.
        const readers = smoke.split('\n').filter((l) => /tapTrail/.test(l));
        expect(readers.length).toBeGreaterThanOrEqual(2);
    });
});

describe('a timing check must measure the window it asserts about, not assume one', () => {
    it('`goAway` records the absence it actually produced', () => {
        //  It rewinds `savedAtMs` and reloads, and `Session.start` diffs `nowMs` against it —
        //  so the REAL time the reload takes lands on the survivor as elapsed time too. That
        //  is the model working; the survivor really was away that long. What is not fine is a
        //  check comparing against the NOMINAL minutes, which quietly asserts that Chrome
        //  boots instantly. Measured boots in this project have run from under a second to
        //  90.8 s on a loaded machine.
        expect(smoke).toMatch(/lastAwayRealMs = minutes \* 60 \* 1000 \+ \(Date\.now\(\) - rewoundAt\)/);
    });

    it('the absence-rate check compares against that measurement', () => {
        //  THE RATE IS THE CLAIM. Compared against the nominal 4 minutes it read 1.67 on a
        //  fast run and 2.07 on a slow one and failed the slow one — while the game had
        //  advanced the clock at exactly the tuned rate for the absence it was handed. The
        //  fail-then-pass is stark: reverting this line makes the same run report FAIL at
        //  "1.93 game hours against 1.93 expected".
        expect(codeOnly).toMatch(/const expectedGh = \(lastAwayRealMs \/ 1000\) \/ TUNE\.realSecondsPerGameHour/);
        expect(codeOnly).toMatch(/Math\.abs\(gh - expectedGh\) < 0\.05/);
        //  ...and the assumption it replaced must not come back.
        expect(codeOnly).not.toMatch(/Math\.abs\(gh - \(4 \* 60\) \/ TUNE\.realSecondsPerGameHour\)/);
    });
});
