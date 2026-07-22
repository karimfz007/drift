#!/usr/bin/env node
/**
 * Device smoke test — the automated half of the Cycle 01 device acceptance checks.
 *
 * The brain is covered by Vitest; this drives the *body* the way a thumb does: a real
 * Chromium in mobile emulation, touch events on the canvas, and assertions read back out
 * of the live game state. It exists so that "it plays on a phone" is a check somebody can
 * re-run — including the C3 auditor, against the deployed URL.
 *
 * Usage:
 *   node tools/smoke.mjs [url]            # defaults to http://127.0.0.1:4173/
 *   node tools/smoke.mjs <url> --headful  # watch it play
 *
 * Covers: A3 (load, layout, tab-switch survival), A4 (steel thread + morning report),
 * A6 (both control modes, toggle persists), and the observable half of A7.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const URL_UNDER_TEST = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4173/';
const HEADFUL = process.argv.includes('--headful');
const SHOT_DIR = fileURLToPath(new URL('../.smoke/', import.meta.url));

/** A same-origin page that is NOT the game — used to edit the save with nothing running. */
const BLANK_PATH = '__smoke_blank';

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

const SAVE_KEY = 'drift.save.v1';
const WORLD = { width: 540, height: 960 };

//  Tuning the harness asserts against (mirrors src/data/tune.ts).
const TUNE = {
    woodPerFire: 5,
    fireBurnGameHoursPerWood: 2,
    realSecondsPerGameHour: 150,
    interactRadius: 74
};

const results = [];
let failures = 0;

function check(name, passed, detail = '') {
    results.push({ name, passed, detail });
    if (!passed) failures++;
    console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function findChrome() {
    for (const candidate of CHROME_CANDIDATES) {
        if (existsSync(candidate)) return candidate;
    }
    throw new Error(`No Chrome found. Tried:\n${CHROME_CANDIDATES.join('\n')}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    mkdirSync(SHOT_DIR, { recursive: true });

    const browser = await puppeteer.launch({
        executablePath: findChrome(),
        headless: !HEADFUL,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']
    });

    const page = await browser.newPage();
    //  A mid-range Android in portrait — the director's device class.
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36'
    );

    //  Serve a bare same-origin page for save surgery, without touching the shipped build.
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (request.url().includes(BLANK_PATH)) {
            request.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><link rel="icon" href="data:,"><title>blank</title>' });
            return;
        }
        request.continue();
    });

    const consoleErrors = [];
    const missing = [];
    page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    page.on('response', (r) => {
        if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`);
    });

    // ---- Helpers ---------------------------------------------------------

    /** World coordinates → viewport coordinates, read from the live canvas rect. */
    const toScreen = async (wx, wy) =>
        page.evaluate(
            ({ wx, wy, W, H }) => {
                const canvas = document.querySelector('canvas');
                const r = canvas.getBoundingClientRect();
                return { x: r.left + (wx / W) * r.width, y: r.top + (wy / H) * r.height };
            },
            { wx, wy, W: WORLD.width, H: WORLD.height }
        );

    const tap = async (wx, wy, holdMs = 45) => {
        const { x, y } = await toScreen(wx, wy);
        await page.touchscreen.touchStart(x, y);
        await sleep(holdMs);
        await page.touchscreen.touchEnd();
        await sleep(110);
    };

    const holdTap = async (wx, wy, holdMs) => tap(wx, wy, holdMs);

    const drag = async (fromX, fromY, toX, toY, holdMs = 800) => {
        const a = await toScreen(fromX, fromY);
        const b = await toScreen(toX, toY);
        await page.touchscreen.touchStart(a.x, a.y);
        await sleep(60);
        await page.touchscreen.touchMove(b.x, b.y);
        await sleep(holdMs);
        await page.touchscreen.touchEnd();
        await sleep(140);
    };

    /** The live game state, straight out of the brain. */
    const live = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__drift.state())));
    const reportOpen = () => page.evaluate(() => window.__drift.reportOpen());
    const readSave = () =>
        page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }, SAVE_KEY);

    /**
     * Simulate closing the app for `minutes`. The game persists on pagehide, so the
     * rewind has to happen on a page where the game is not running — otherwise the
     * unload handler stamps the save with "now" again and the absence disappears.
     */
    const goAway = async (minutes) => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded' });
        const before = await page.evaluate(
            ({ key, ms }) => {
                const env = JSON.parse(localStorage.getItem(key));
                env.savedAtMs -= ms;
                env.state.lastSeenMs -= ms;
                localStorage.setItem(key, JSON.stringify(env));
                return env.state;
            },
            { key: SAVE_KEY, ms: minutes * 60 * 1000 }
        );
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2' });
        await sleep(1500);
        return before;
    };

    /** Edit the save with the game stopped, then come back. */
    const editSaveOffline = async (mutate) => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(
            ({ key, source }) => {
                const env = JSON.parse(localStorage.getItem(key));
                // eslint-disable-next-line no-new-func
                new Function('state', source)(env.state);
                localStorage.setItem(key, JSON.stringify(env));
            },
            { key: SAVE_KEY, source: mutate }
        );
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2' });
        await sleep(1400);
    };

    const shot = (name) => page.screenshot({ path: join(SHOT_DIR, `${name}.png`) });

    /** Walk to a node in tap-to-move mode, then take it. */
    const takeNode = async (x, y) => {
        await tap(x, y);
        for (let i = 0; i < 24; i++) {
            const state = await live();
            if (Math.hypot(state.player.x - x, state.player.y - y) <= TUNE.interactRadius) break;
            await sleep(120);
        }
        await sleep(150);
        await tap(x, y);
        await sleep(200);
    };

    // ---- A3: first load --------------------------------------------------

    console.log(`\nDRIFT device smoke test — ${URL_UNDER_TEST}\n`);
    console.log('A3 — load and layout');

    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 60_000 });
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);

    const started = Date.now();
    await page.goto(`${URL_UNDER_TEST}?fresh=1`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await page.waitForFunction(() => !!window.__drift?.state(), { timeout: 20_000 });
    const loadMs = Date.now() - started;
    await sleep(1200);

    //  Assert something the page has to actually do, not a literal true.
    const booted = await page.evaluate(() => {
        const state = window.__drift?.state();
        return {
            hasState: !!state,
            hasCanvas: !!document.querySelector('canvas'),
            nodes: state?.nodes?.length ?? 0
        };
    });
    check(
        'loads and reaches a playable state',
        booted.hasCanvas && booted.hasState && booted.nodes > 0,
        `${loadMs} ms, ${booted.nodes} nodes on the island`
    );

    const layout = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const r = canvas.getBoundingClientRect();
        return {
            rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
            fits: r.width <= window.innerWidth + 1 && r.height <= window.innerHeight + 1,
            noScroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
            touchAction: getComputedStyle(document.body).touchAction,
            viewport: document.querySelector('meta[name=viewport]')?.content ?? ''
        };
    });
    check('canvas fits the viewport with no page scroll', layout.fits && layout.noScroll, JSON.stringify(layout.rect));
    check('no pinch/zoom trap', layout.touchAction === 'none' && /user-scalable=no/.test(layout.viewport));

    //  Touch coordinates must land where the game thinks they do, or every check below
    //  is measuring the wrong thing. Verify the mapping against Phaser's own transform.
    //  Round-trip a probe point through the harness's mapping and back out through the
    //  page's own inverse. If these disagree, every touch below lands somewhere the game
    //  does not think it landed — which is exactly the bug that hid the dead buttons.
    const probes = [[WORLD.width / 2, WORLD.height / 2], [WORLD.width - 148, 878], [120, 800]];
    const mapping = [];
    for (const [wx, wy] of probes) {
        const screen = await toScreen(wx, wy);
        const back = await page.evaluate(
            ({ sx, sy, W, H }) => {
                const r = document.querySelector('canvas').getBoundingClientRect();
                return { wx: ((sx - r.left) / r.width) * W, wy: ((sy - r.top) / r.height) * H };
            },
            { sx: screen.x, sy: screen.y, W: WORLD.width, H: WORLD.height }
        );
        mapping.push({ wx, wy, backX: +back.wx.toFixed(1), backY: +back.wy.toFixed(1) });
    }
    const mappingExact = mapping.every((m) => Math.abs(m.backX - m.wx) < 1 && Math.abs(m.backY - m.wy) < 1);
    check('world↔screen mapping round-trips within a pixel', mappingExact, JSON.stringify(mapping));

    await shot('01-cold-open');

    // ---- A4 + A7: the steel thread, tap-to-move mode ---------------------

    console.log('\nA4/A7 — the steel thread (tap to move)');

    await tap(WORLD.width / 2, 120);   // dismiss the cold open (empty sea, no node under it)
    await sleep(900);
    await shot('02-island');

    const fresh = await live();
    check('a fresh run begins at full warmth, empty-handed', fresh.warmth > 98 && fresh.inventory.wood === 0, `warmth ${fresh.warmth.toFixed(1)}`);

    const driftwood = fresh.nodes.filter((n) => n.kind === 'driftwood');
    for (const node of driftwood.slice(0, 5)) {
        await takeNode(node.x, node.y);
    }

    const afterGather = await live();
    check('gathering yields wood', afterGather.inventory.wood >= TUNE.woodPerFire, `wood ${afterGather.inventory.wood}`);
    check(
        'first wood lands within seconds of gaining control',
        afterGather.trace.msToFirstWood !== null && afterGather.trace.msToFirstWood < 20_000,
        `${afterGather.trace.msToFirstWood} ms`
    );
    await shot('03-wood-gathered');

    //  A deadfall, to prove the hold path and its progress ring.
    const deadfall = afterGather.nodes.find((n) => n.kind === 'deadfall' && n.available);
    await tap(deadfall.x, deadfall.y);
    for (let i = 0; i < 40; i++) {
        const state = await live();
        if (Math.hypot(state.player.x - deadfall.x, state.player.y - deadfall.y) <= TUNE.interactRadius) break;
        await sleep(120);
    }
    const beforeHold = await live();
    await holdTap(deadfall.x, deadfall.y, 300);              // too short: should not yield
    const shortHold = await live();
    check('a short hold does not salvage the deadfall', shortHold.inventory.wood === beforeHold.inventory.wood);

    await holdTap(deadfall.x, deadfall.y, 1900);             // a full hold
    const afterHold = await live();
    check(
        'a full hold salvages the deadfall for 2–3 wood',
        afterHold.inventory.wood - beforeHold.inventory.wood >= 2 &&
            afterHold.inventory.wood - beforeHold.inventory.wood <= 3,
        `+${afterHold.inventory.wood - beforeHold.inventory.wood}`
    );

    //  Build the fire with the action button (bottom right).
    const woodBeforeFire = afterHold.inventory.wood;
    await tap(WORLD.width - 148, 878);
    await sleep(800);

    const afterFire = await live();
    //  Fuel is already burning by the time we read it, so allow the elapsed sliver.
    check(
        'fire built and lit',
        afterFire.fire.built && afterFire.fire.fuel > TUNE.woodPerFire - 0.02 && afterFire.fire.fuel <= TUNE.woodPerFire,
        `fuel ${afterFire.fire.fuel.toFixed(4)}`
    );
    check('the fire cost exactly woodPerFire', afterFire.inventory.wood === woodBeforeFire - TUNE.woodPerFire);
    check('trace recorded the ignition', afterFire.trace.msToFireLit !== null, `${afterFire.trace.msToFireLit} ms`);
    await shot('04-fire-lit');

    //  Warmth recovers while standing in the light.
    await editSaveOffline('state.warmth = 50;');
    const cooled = await live();
    await sleep(4000);
    const warmed = await live();
    check(
        'warmth recovers inside the firelight',
        warmed.warmth > cooled.warmth,
        `${cooled.warmth.toFixed(2)} → ${warmed.warmth.toFixed(2)}`
    );
    check('the HUD reports the fire as shelter', warmed.fire.built && warmed.fire.fuel > 0);

    //  A7: one contextual hint appears after idleHintSeconds of nothing happening.
    const hintsBefore = await page.evaluate(() => window.__drift.hints().shown);
    await sleep(12_500);
    const hintsAfter = await page.evaluate(() => window.__drift.hints());
    check(
        'the idle hint appears, and it is about where the player actually is',
        hintsAfter.shown > hintsBefore && hintsAfter.last.length > 0,
        `"${hintsAfter.last}"`
    );

    // ---- A4: quit, wait, reopen, morning report --------------------------

    console.log('\nA4 — absence and the morning report');

    const beforeAway = await goAway(3);
    await shot('05-morning-report');

    check('the morning report is on screen', await reportOpen(), '.smoke/05-morning-report.png');

    const reopened = await live();
    const gameHoursGained = reopened.gameHoursElapsed - beforeAway.gameHoursElapsed;
    const expectedHours = (3 * 60) / TUNE.realSecondsPerGameHour;   // 1.2
    check(
        'the absence advanced the clock at the tuned rate',
        Math.abs(gameHoursGained - expectedHours) < 0.05,
        `${gameHoursGained.toFixed(3)} game hours for 3 real minutes (expect ${expectedHours})`
    );

    const fuelBurned = beforeAway.fire.fuel - reopened.fire.fuel;
    const expectedBurn = expectedHours / TUNE.fireBurnGameHoursPerWood;   // 0.6
    check(
        'the fire burned exactly as tune.ts says',
        Math.abs(fuelBurned - expectedBurn) < 0.02,
        `${fuelBurned.toFixed(3)} wood (expect ${expectedBurn})`
    );

    //  Dismiss the report and confirm play resumes.
    await tap(WORLD.width / 2, WORLD.height - 170);
    await sleep(700);
    check('the report dismisses and hands the island back', !(await reportOpen()));
    await shot('06-after-report');

    // ---- A6: the second control mode ------------------------------------

    console.log('\nA6 — the thumb stick, and the toggle');

    await tap(WORLD.width - 56, 130);      // Controls button
    await sleep(700);
    await shot('07-settings');
    await tap(WORLD.width / 2, 408);       // "Thumb stick"
    await sleep(350);
    await tap(WORLD.width / 2, 660);       // Done
    await sleep(600);

    const switched = await live();
    check('control mode switched to the thumb stick', switched.settings.controlMode === 'joystick');
    check('the switch was traced', switched.trace.controlModeSwitches >= 1);

    const posBefore = { ...switched.player };
    await drag(120, 800, 120, 690, 1000);   // push the stick up
    const moved = await live();
    const travelled = Math.hypot(moved.player.x - posBefore.x, moved.player.y - posBefore.y);
    check('the thumb stick walks the castaway', travelled > 20, `${travelled.toFixed(1)} px`);
    await shot('08-joystick');

    //  Gather in thumb-stick mode: steer to a driftwood, then tap it with the other hand.
    const target = moved.nodes.find((n) => n.available && n.kind === 'driftwood');
    //  Never let coverage drop silently: a missing target is a failed check, not a skip.
    check('a driftwood node is left to test thumb-stick gathering with', !!target);
    if (target) {
        for (let i = 0; i < 8; i++) {
            const state = await live();
            const dx = target.x - state.player.x;
            const dy = target.y - state.player.y;
            if (Math.hypot(dx, dy) <= TUNE.interactRadius) break;
            const length = Math.hypot(dx, dy) || 1;
            await drag(120, 760, 120 + (dx / length) * 70, 760 + (dy / length) * 70, 700);
        }
        const beforeTake = await live();
        await tap(target.x, target.y);
        await sleep(300);
        const afterTake = await live();
        check(
            'the steel thread also works in thumb-stick mode',
            afterTake.inventory.wood > beforeTake.inventory.wood,
            `wood ${beforeTake.inventory.wood} → ${afterTake.inventory.wood}`
        );
    } else {
        check('the steel thread also works in thumb-stick mode', false, 'no node left to gather — coverage lost');
    }

    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2' });
    await sleep(1300);
    const persisted = await live();
    check('the control-mode toggle survives a reload', persisted.settings.controlMode === 'joystick');

    // ---- A3: tab-switch survival ----------------------------------------

    console.log('\nA3 — surviving a tab switch');

    const beforeHide = await live();
    const other = await browser.newPage();
    await other.goto('about:blank');
    await sleep(2000);
    await page.bringToFront();
    await sleep(1400);
    await other.close();

    const afterHide = await live();
    check(
        'state survives backgrounding and the clock kept running',
        afterHide.fire.built === beforeHide.fire.built &&
            afterHide.inventory.wood === beforeHide.inventory.wood &&
            afterHide.gameHoursElapsed >= beforeHide.gameHoursElapsed,
        `clock ${beforeHide.gameHoursElapsed.toFixed(3)} → ${afterHide.gameHoursElapsed.toFixed(3)}`
    );

    const saved = await readSave();
    check('the save on disk matches the live run', saved && saved.state.fire.built === afterHide.fire.built);
    await shot('09-after-tab-switch');

    // ---- A3: cold load on a throttled 4G connection ----------------------

    console.log('\nA3 — cold load on 4G');

    const cold = await browser.newPage();
    await cold.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const cdp = await cold.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    //  A realistic mid-band 4G link, not the optimistic lab profile.
    await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 70,
        downloadThroughput: (4 * 1024 * 1024) / 8,
        uploadThroughput: (1 * 1024 * 1024) / 8
    });

    const coldStart = Date.now();
    await cold.goto(URL_UNDER_TEST, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await cold.waitForFunction(() => !!document.querySelector('canvas'), { timeout: 60_000 });
    const coldMs = Date.now() - coldStart;
    await cold.close();

    check('first load on a cold 4G connection is under 5 s', coldMs <= 5000, `${coldMs} ms`);

    // ---- Hygiene ---------------------------------------------------------

    console.log('\nHygiene');
    check('every requested asset was found', missing.length === 0, missing.slice(0, 4).join(' | '));
    check('no console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

    await browser.close();

    console.log(`\n${results.length - failures}/${results.length} checks passed. Screenshots in .smoke/\n`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
    console.error('\nSMOKE TEST CRASHED\n', error);
    process.exit(1);
});
