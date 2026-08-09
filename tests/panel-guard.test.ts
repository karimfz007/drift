/**
 * THE PANEL ARMING GUARD — the fix for FIX 5, locked across the two files it lives in.
 *
 * WHY A SOURCE TEST, which this suite does sparingly. The guard is a CSS rule in `index.html`
 * and four lines in `hud.ts`, and the body has no unit coverage by construction — the purity
 * law keeps Babylon out of the brain, so nothing here can render a panel. The only behavioural
 * witness is the device harness, and FIX 5 is precisely the check that spent many sweeps red
 * without anybody being able to say why. A guard that can silently come apart between two
 * files, with its only alarm two hours into a device run, is the D-134 shape exactly: the
 * numbers that had to agree lived in different files with nothing comparing them.
 *
 * THREE CLAIMS, and each one failed in a real way during this fix:
 *
 *   1.  THE RULE MUST OUTRANK `#ui button`. The first attempt set `pointer-events: none` on
 *       the panel container and changed NOTHING — `#ui button { pointer-events: auto }` is
 *       more specific, so every button inside stayed hit-testable while the probe's own
 *       readout printed `pe=none`. A guard that looks applied and is not is worse than none.
 *   2.  THE RULE MUST COVER `button`, not just the container, for the same reason.
 *   3.  THE WINDOW IS THE FADE-IN. `panelArmDelayMs` is documented as "tied to the transition
 *       rather than tuned against it". That is a claim about two files agreeing, so it is
 *       checked rather than trusted.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TUNE } from '../src/data/tune';

const root = new URL('../', import.meta.url);
const html = readFileSync(fileURLToPath(new URL('index.html', root)), 'utf8');
const hud = readFileSync(fileURLToPath(new URL('src/body/hud.ts', root)), 'utf8');

describe('a panel ignores hit-tested input while it is still fading in', () => {
    it('the arming rule exists and carries the #ui id, so it outranks `#ui button`', () => {
        //  Specificity, stated as the test rather than left to a comment: `#ui button` is
        //  (1 id, 0 classes, 1 type). Anything guarding a button inside a panel must carry
        //  the id too, or it loses and the panel goes on pressing itself.
        expect(html).toMatch(/#ui\s+\.panel\.arming\s+button\s*\{[^}]*pointer-events:\s*none/);
        expect(html).toMatch(/#ui\s+\.panel\.arming\s*,/);

        //  ...and EVERY selector in the guard's own list carries the id. A single bare
        //  `.panel.arming` slipped into that list would lose to `#ui button` and quietly
        //  restore the first attempt's do-nothing behaviour for whatever it covered.
        const guard = html.slice(html.indexOf('#ui .panel.arming'));
        const selectors = guard.slice(0, guard.indexOf('{')).split(',').map((t) => t.trim()).filter(Boolean);
        expect(selectors.length).toBeGreaterThan(1);
        for (const sel of selectors) {
            expect(sel.startsWith('#ui '), `"${sel}" does not carry the #ui id and cannot beat \`#ui button\``).toBe(true);
        }
    });

    it('`#ui button { pointer-events: auto }` is still there — the rule the guard has to beat', () => {
        //  If this ever goes away the guard still works, but the reason for its shape is gone
        //  and the next person will simplify it back into the version that did nothing.
        expect(html).toMatch(/#ui\s+button\s*\{\s*pointer-events:\s*auto/);
    });

    it('`panel()` arms every panel it creates, and disarms it on a timer', () => {
        const fn = hud.slice(hud.indexOf('function panel(overlay: HTMLElement'), hud.indexOf('function fade('));
        expect(fn).toContain('arming');
        expect(fn).toMatch(/classList\.remove\('arming'\)/);
        expect(fn).toContain('TUNE.panelArmDelayMs');
        //  Every panel, with no opt-out: one factory, one guard.
        expect(fn).toMatch(/element\.className = `panel \$\{className\} arming`/);
    });

    it('the window IS the fade-in — the two numbers are compared, not asserted to agree', () => {
        const panelRule = html.slice(html.indexOf('.panel {'), html.indexOf('.panel.visible'));
        const transition = /transition:\s*opacity\s*(\d+)ms/.exec(panelRule);
        expect(transition, 'the .panel opacity transition is no longer declared in ms').toBeTruthy();
        expect(TUNE.panelArmDelayMs).toBe(Number(transition![1]));
    });

    it('the delay is long enough to cover a gesture and short enough not to eat a real press', () => {
        //  A trailing compatibility click follows its touch within a frame or two; a human
        //  second press does not arrive inside a third of a second of the panel appearing.
        expect(TUNE.panelArmDelayMs).toBeGreaterThanOrEqual(150);
        expect(TUNE.panelArmDelayMs).toBeLessThanOrEqual(400);
    });
});

describe('the medical store leads the Vitals tab when there is one to take', () => {
    it('the sickness row is hoisted only while the sickness is pressing', () => {
        const fn = hud.slice(hud.indexOf('function vitalsBody('), hud.indexOf('export function showLoadout'));
        expect(fn).toMatch(/const illnessLeads = Boolean\(extra\) && extra!\.illness\.stage !== 'well'/);
        //  It LEADS, and it appears exactly once either way — hoisting must not duplicate the
        //  row, which is the obvious way to get this wrong and would read as two Sickness
        //  headings on one panel.
        expect(fn).toMatch(/\$\{illnessLeads \? illnessRow : ''\}\$\{rows\}\$\{injuryRows\}\$\{illnessLeads \? '' : illnessRow\}/);
    });
});
