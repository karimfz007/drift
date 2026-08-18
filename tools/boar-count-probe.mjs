/**
 * DOES AN AMBIENT BOAR WARNING COUNT ITSELF AS A FAILED TAP?
 *
 * WHY A DEDICATED PROBE. The defect surfaced as `SLICE 2C — switching tabs never leaks a world
 * tap` going red at `failedTaps 19 -> 20`, and that check is a poor witness for it: it fails only
 * when a boar happens to escalate inside a ~600 ms window, which is why it passed three full
 * sweeps while the product misbehaved identically in all of them. Re-running that check proves
 * almost nothing — a green could simply mean no boar escalated this time.
 *
 * So the transition is FORCED and both halves are asserted:
 *
 *   1. the warning still SPEAKS — removing the count must not remove the sentence, and the
 *      wind-up is the whole of the fair-challenge promise;
 *   2. `trace.failedInteractionTaps` does NOT move — no tap happened, so nothing may be counted.
 *
 * Asserting only (2) would pass if the warning stopped happening altogether, which is the vacuity
 * this project keeps finding. Asserting only (1) is the pre-existing behaviour.
 *
 * `announceBoarStages` dedupes on (boar id, stage), so a boar already sitting in `warning` will
 * never re-announce. The probe plants a boar with a FRESH id already in `warning`, right next to
 * the survivor, and lets one frame carry it.
 *
 *   node tools/boar-count-probe.mjs [url]
 *
 * Exit 0 = the warning spoke and counted nothing. Exit 1 = it counted, or it went silent.
 */
import puppeteer from 'puppeteer-core';
import { acquire as acquireBench } from './bench-lock.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_UNDER_TEST = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4173/';

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        '/usr/bin/google-chrome',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ].filter(Boolean);
    for (const c of candidates) if (existsSync(c)) return c;
    throw new Error('no Chrome found — set CHROME_PATH');
}

//  Same guard preflight uses: a stale preview on this port answers every request with a build
//  that is not the one under test, and the mismatch looks exactly like a passing probe.
const distIndex = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const entryOf = (html) => html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? null;
const served = await (await fetch(`${URL_UNDER_TEST}?probe=${Date.now()}`, { cache: 'no-store' })).text();
if (existsSync(distIndex)) {
    const want = entryOf(readFileSync(distIndex, 'utf8'));
    const got = entryOf(served);
    if (want && got && want !== got) {
        console.error(`REFUSED: ${URL_UNDER_TEST} serves ${got}, dist/ expects ${want}.`);
        process.exit(1);
    }
}

//  Queue behind whatever holds the bench rather than refusing: this probe is usually run
//  right after a group chain, and failing because the chain has not quite exited is noise.
const releaseBench = await acquireBench('boar-count-probe', 45 * 60 * 1000);
const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--enable-gpu', '--use-angle=default', '--ignore-gpu-blocklist'],
});

let failed = false;
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForFunction(() => Boolean(window.__drift?.state), { timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 2500));

    const before = await page.evaluate(() => {
        const s = window.__drift.state();
        return {
            failedTaps: s.trace.failedInteractionTaps,
            hint: window.__drift.hints().last ?? '',
            boars: s.boars.length,
        };
    });

    //  PLANT THE TRANSITION. A fresh id has no entry in `boarStageSpoken`, so the next frame
    //  announces it. Placed a few metres away so it is inside sight range without being on top
    //  of the survivor, and given a stage-entry time the ladder will accept.
    await page.evaluate(() => {
        const s = window.__drift.state();
        s.boars.push({
            id: `probe-boar-${Math.floor(performance.now())}`,
            x: s.player.x + 4, y: s.player.y + 2,
            homeX: s.player.x + 4, homeY: s.player.y + 2,
            facing: 0,
            stage: 'warning',
            stageSinceGameHours: s.gameHoursElapsed ?? 0,
            chargeBearing: null,
            hunger: 0.5,
            alive: true,
        });
    });
    //  Several frames: the announcer runs from the render loop, not on a timer we control.
    await new Promise((r) => setTimeout(r, 1800));

    const after = await page.evaluate(() => {
        const s = window.__drift.state();
        return {
            failedTaps: s.trace.failedInteractionTaps,
            hint: window.__drift.hints().last ?? '',
        };
    });

    const spoke = /snorts and paws/i.test(after.hint) && after.hint !== before.hint;
    const counted = after.failedTaps !== before.failedTaps;

    console.log('BOAR WARNING — ambient, no tap anywhere in it');
    console.log(`  boars before        : ${before.boars}`);
    console.log(`  hint  before → after: "${before.hint.slice(0, 40)}" → "${after.hint.slice(0, 44)}"`);
    console.log(`  failedInteractionTaps: ${before.failedTaps} → ${after.failedTaps}`);
    console.log('');

    if (!spoke) {
        console.log('  FAIL  the warning did NOT speak — a silent boar is a worse defect than a miscounted one.');
        failed = true;
    } else {
        console.log('  pass  the warning SPOKE (the wind-up survives the fix)');
    }
    if (counted) {
        console.log(`  FAIL  it counted itself as a failed interaction tap (+${after.failedTaps - before.failedTaps}) — no tap happened.`);
        failed = true;
    } else {
        console.log('  pass  it counted NOTHING — the number still means its own name');
    }
} finally {
    await browser.close();
    releaseBench();
}
process.exitCode = failed ? 1 : 0;
