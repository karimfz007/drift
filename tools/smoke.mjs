#!/usr/bin/env node
/**
 * Device smoke test — the automated half of the cycle's device acceptance checks.
 *
 * The brain is covered by Vitest; this drives the *body* the way a thumb does: a real
 * Chromium in mobile emulation, real touch events on the canvas, and assertions read back
 * out of the live game state. It exists so that "it plays on a phone" is a check somebody
 * can re-run — including the C3 auditor, against the deployed URL.
 *
 * Cycle 02 (the 3D pivot) changed what it drives, not what it proves: the harness now
 * waits on a rendered frame, steers with the virtual stick in world space, aims taps by
 * projecting a world point to the screen, and measures the frame rate that A3 now names.
 *
 * Usage:
 *   node tools/smoke.mjs [url]              # defaults to http://127.0.0.1:4173/
 *   node tools/smoke.mjs <url> --headful    # watch it play
 *   node tools/smoke.mjs <url> --software   # force software rendering (FPS becomes meaningless)
 *
 * Covers: A2 (nothing to assert here — CI owns it), A3 (load, layout, FPS, tab-switch),
 * A4 (the 3D steel thread + morning report), A6 (controls and the persisted setting),
 * and the observable half of A7.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const URL_UNDER_TEST = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4173/';
const HEADFUL = process.argv.includes('--headful');
const SOFTWARE = process.argv.includes('--software');
const SHOT_DIR = fileURLToPath(new URL('../.smoke/', import.meta.url));

/** A same-origin page that is NOT the game — used to edit the save with nothing running. */
const BLANK_PATH = '__smoke_blank';

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

const SAVE_KEY = 'drift.save.v1';
const LOOK_KEY = 'drift.look.v1';

//  Tuning the harness asserts against (mirrors src/data/tune.ts).
const TUNE = {
    woodPerFire: 5,
    fireBurnGameHoursPerWood: 2,
    realSecondsPerGameHour: 150,
    interactRadius: 2.6,
    deadfallHoldSeconds: 1.5,
    coldLoadBudgetSeconds: 8,
    fpsFloorMedian: 30
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
        args: SOFTWARE
            ? ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
            : ['--no-sandbox', '--enable-gpu', '--use-angle=default', '--ignore-gpu-blocklist']
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
            request.respond({
                status: 200,
                contentType: 'text/html',
                body: '<!doctype html><link rel="icon" href="data:,"><title>blank</title>'
            });
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

    const live = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__drift.state())));
    const panelOpen = () => page.evaluate(() => window.__drift.panelOpen());
    const fps = () => page.evaluate(() => window.__drift.fps());
    const camera = () => page.evaluate(() => window.__drift.camera());
    const screenOf = (x, z) =>
        page.evaluate(([wx, wz]) => window.__drift.screenOf(wx, wz), [x, z]);

    const waitForScene = async (timeoutMs = 60_000) => {
        await page.waitForFunction(() => window.__drift?.sceneReady?.() === true, { timeout: timeoutMs });
    };

    const tapAt = async (x, y, holdMs = 60) => {
        await page.touchscreen.touchStart(x, y);
        await sleep(holdMs);
        await page.touchscreen.touchEnd();
        await sleep(140);
    };

    const tapWorld = async (worldX, worldZ, holdMs = 60) => {
        const point = await screenOf(worldX, worldZ);
        if (!point) return false;
        await tapAt(point.x, point.y, holdMs);
        return true;
    };

    /** Click a DOM control (HUD buttons and panels are DOM, not canvas). */
    const clickDom = async (selector) => {
        const handle = await page.$(selector);
        if (!handle) return false;
        await handle.click();
        await sleep(320);
        return true;
    };

    const canvasRect = () =>
        page.evaluate(() => {
            const r = document.getElementById('game-canvas').getBoundingClientRect();
            return { left: r.left, top: r.top, width: r.width, height: r.height };
        });

    /**
     * Steer toward a world point with the virtual stick.
     *
     * Movement is camera-relative, so the harness solves the same little rotation the game
     * does — otherwise "walk to that log" would mean something different every time the
     * camera moved, and the test would be measuring luck.
     */
    const walkToward = async (targetX, targetZ, seconds) => {
        const rect = await canvasRect();
        const originX = rect.left + rect.width * 0.25;
        const originY = rect.top + rect.height * 0.78;

        const state = await live();
        const view = await camera();
        const dx = targetX - state.player.x;
        const dz = targetZ - state.player.y;
        const length = Math.hypot(dx, dz) || 1;
        const nx = dx / length;
        const nz = dz / length;

        //  Inverse of: world = forward*(-stickY) + right*(stickX)
        const stickX = Math.cos(view.yaw) * nx - Math.sin(view.yaw) * nz;
        const stickY = -Math.sin(view.yaw) * nx - Math.cos(view.yaw) * nz;

        const travel = 78; // full stick deflection, in screen pixels
        await page.touchscreen.touchStart(originX, originY);
        await sleep(60);
        await page.touchscreen.touchMove(originX + stickX * travel, originY + stickY * travel);
        await sleep(seconds * 1000);
        await page.touchscreen.touchEnd();
        await sleep(180);
    };

    /** Walk until within reach of a node, re-aiming as we go. Returns the final distance. */
    const approach = async (node, budgetSeconds = 14) => {
        const deadline = Date.now() + budgetSeconds * 1000;
        let state = await live();
        let distance = Math.hypot(state.player.x - node.x, state.player.y - node.y);

        while (distance > TUNE.interactRadius * 0.7 && Date.now() < deadline) {
            const seconds = Math.min(1.2, Math.max(0.25, (distance - 1) / 3.5));
            await walkToward(node.x, node.y, seconds);
            state = await live();
            distance = Math.hypot(state.player.x - node.x, state.player.y - node.y);
        }
        return distance;
    };

    /**
     * Simulate closing the app for `minutes`. The game persists on pagehide, so the rewind
     * has to happen on a page where the game is not running — otherwise the unload handler
     * stamps the save with "now" again and the absence disappears.
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
        await waitForScene();
        await sleep(1200);
        return before;
    };

    /** Wipe the save with the game stopped, so a genuinely fresh run boots. */
    const startFreshRun = async () => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(
            ({ save, look }) => {
                localStorage.removeItem(save);
                localStorage.removeItem(look);
            },
            { save: SAVE_KEY, look: LOOK_KEY }
        );
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
        await waitForScene();
        await sleep(900);
    };

    const shot = (name) => page.screenshot({ path: join(SHOT_DIR, `${name}.png`) });

    // ---- A3: load, layout, renderer --------------------------------------

    console.log(`\nDRIFT device smoke test (3D) — ${URL_UNDER_TEST}\n`);
    console.log('A3 — load, layout, renderer');

    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
    await waitForScene();

    const renderer = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        const info = gl?.getExtension('WEBGL_debug_renderer_info');
        return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    const software = /swiftshader|software|llvmpipe/i.test(renderer);
    console.log(`  (renderer: ${renderer})`);

    await startFreshRun();

    const booted = await page.evaluate(() => {
        const state = window.__drift.state();
        return {
            canvas: !!document.getElementById('game-canvas'),
            nodes: state?.nodes?.length ?? 0,
            warmth: state?.warmth ?? 0
        };
    });
    check(
        'loads and reaches a playable 3D scene',
        booted.canvas && booted.nodes > 0 && booted.warmth > 98,
        `${booted.nodes} nodes on the island`
    );

    const layout = await page.evaluate(() => {
        const canvas = document.getElementById('game-canvas');
        const r = canvas.getBoundingClientRect();
        return {
            fits: r.width <= window.innerWidth + 1 && r.height <= window.innerHeight + 1,
            noScroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
            touchAction: getComputedStyle(document.body).touchAction,
            viewport: document.querySelector('meta[name=viewport]')?.content ?? ''
        };
    });
    check('canvas fills the viewport with no page scroll', layout.fits && layout.noScroll);
    check('no pinch/zoom trap', layout.touchAction === 'none' && /user-scalable=no/.test(layout.viewport));

    //  World→screen has to be right or every tap below is aimed at nothing.
    const projection = await page.evaluate(() => {
        const state = window.__drift.state();
        const p = window.__drift.screenOf(state.player.x, state.player.y);
        const r = document.getElementById('game-canvas').getBoundingClientRect();
        return { p, onScreen: !!p && p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom };
    });
    check(
        'the player projects onto the screen (world→screen aiming works)',
        projection.onScreen,
        JSON.stringify(projection.p)
    );

    await shot('c02-01-cold-open');
    check('the cold open is showing on a fresh run', await panelOpen());

    // ---- A4 + A7: the 3D steel thread ------------------------------------

    console.log('\nA4/A7 — the steel thread, in three dimensions');

    check('the cold open dismisses', await clickDom('.cold-open button'));
    await sleep(900);
    await shot('c02-02-island');

    const start = await live();
    check('control begins with an empty pack', start.inventory.wood === 0);

    //  Gather driftwood: walk to each log, then tap it.
    const driftwood = start.nodes.filter((n) => n.kind === 'driftwood');
    let gathered = 0;
    for (const node of driftwood.slice(0, 4)) {
        const distance = await approach(node);
        if (distance > TUNE.interactRadius) continue;
        await tapWorld(node.x, node.y);
        const after = await live();
        if (after.inventory.wood > gathered) gathered = after.inventory.wood;
    }

    const afterDriftwood = await live();
    check(
        'walking to driftwood and tapping it yields wood',
        afterDriftwood.inventory.wood >= 3,
        `wood ${afterDriftwood.inventory.wood}`
    );
    //  "Within seconds" is the acceptance language; 8 s is a generous but honest reading of
    //  it, not the 45 s that let the check pass without testing the claim (C3 audit, C02).
    check(
        'first wood lands within seconds of gaining control',
        afterDriftwood.trace.msToFirstWood !== null && afterDriftwood.trace.msToFirstWood < 8_000,
        `${afterDriftwood.trace.msToFirstWood} ms`
    );
    check('the walk was traced', afterDriftwood.trace.msToFirstMove !== null);
    await shot('c02-03-gathered');

    //  A deadfall at the treeline: the hold path and its world-space progress ring.
    const deadfall = afterDriftwood.nodes.find((n) => n.kind === 'deadfall' && n.available);
    const deadfallDistance = await approach(deadfall, 22);
    check('the treeline is reachable on foot', deadfallDistance <= TUNE.interactRadius, `${deadfallDistance.toFixed(2)} m`);

    const beforeHold = await live();
    await tapWorld(deadfall.x, deadfall.y, 300); // too short
    const shortHold = await live();
    check('a short hold does not salvage the deadfall', shortHold.inventory.wood === beforeHold.inventory.wood);

    await tapWorld(deadfall.x, deadfall.y, TUNE.deadfallHoldSeconds * 1000 + 600);
    const afterHold = await live();
    check(
        'a full hold salvages the deadfall for 2–3 wood',
        afterHold.inventory.wood - beforeHold.inventory.wood >= 2 &&
            afterHold.inventory.wood - beforeHold.inventory.wood <= 3,
        `+${afterHold.inventory.wood - beforeHold.inventory.wood}`
    );
    await shot('c02-04-deadfall');

    //  Build the fire.
    const woodBeforeFire = (await live()).inventory.wood;
    check('enough wood for a fire was gathered', woodBeforeFire >= TUNE.woodPerFire, `wood ${woodBeforeFire}`);
    check('the build-fire button is offered', await clickDom('.action'));
    await sleep(900);

    const afterFire = await live();
    check(
        'the fire is built and lit, standing in the world',
        afterFire.fire.built && afterFire.fire.fuel > TUNE.woodPerFire - 0.05,
        `fuel ${afterFire.fire.fuel.toFixed(3)}`
    );
    check('the fire cost exactly woodPerFire', afterFire.inventory.wood === woodBeforeFire - TUNE.woodPerFire);
    check('the ignition was traced', afterFire.trace.msToFireLit !== null);
    await shot('c02-05-fire');

    //  Warmth recovers in the firelight.
    const cooledFrom = 50;
    await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
        ({ key, warmth }) => {
            const env = JSON.parse(localStorage.getItem(key));
            env.state.warmth = warmth;
            localStorage.setItem(key, JSON.stringify(env));
        },
        { key: SAVE_KEY, warmth: cooledFrom }
    );
    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2' });
    await waitForScene();
    await sleep(4200);

    const warmed = await live();
    check(
        'warmth recovers while standing in the firelight',
        warmed.warmth > cooledFrom,
        `${cooledFrom} → ${warmed.warmth.toFixed(2)}`
    );

    //  A7: the idle hint.
    const hintsBefore = await page.evaluate(() => window.__drift.hints().shown);
    await sleep(12_500);
    const hintsAfter = await page.evaluate(() => window.__drift.hints());
    check(
        'the idle hint appears, and it is about where the player actually is',
        hintsAfter.shown > hintsBefore && hintsAfter.last.length > 0,
        `"${hintsAfter.last}"`
    );

    // ---- A4: absence and the morning report ------------------------------

    console.log('\nA4 — absence and the morning report');

    const beforeAway = await goAway(3);
    await shot('c02-06-morning-report');
    check('the morning report is on screen', await panelOpen());

    const reopened = await live();
    const gameHoursGained = reopened.gameHoursElapsed - beforeAway.gameHoursElapsed;
    const expectedHours = (3 * 60) / TUNE.realSecondsPerGameHour;
    check(
        'the absence advanced the clock at the tuned rate',
        Math.abs(gameHoursGained - expectedHours) < 0.15,
        `${gameHoursGained.toFixed(3)} game hours for ~3 real minutes (expect ~${expectedHours})`
    );

    //  Derive the expectation from the time the game actually saw, not the nominal three
    //  minutes: otherwise this measures the harness's punctuality, not the game's maths.
    const fuelBurned = beforeAway.fire.fuel - reopened.fire.fuel;
    const expectedBurn = gameHoursGained / TUNE.fireBurnGameHoursPerWood;
    check(
        'the fire burned exactly as tune.ts says, for the time that actually passed',
        Math.abs(fuelBurned - expectedBurn) < 1e-6,
        `${fuelBurned.toFixed(6)} wood for ${gameHoursGained.toFixed(4)} game hours`
    );

    check('the report dismisses and hands the island back', await clickDom('.report button'));
    await sleep(600);
    check('play resumes after the report', !(await panelOpen()));
    await shot('c02-07-after-report');

    // ---- A6: controls and the persisted setting --------------------------

    console.log('\nA6 — controls, and the setting that persists');

    const beforeWalk = await live();
    await walkToward(beforeWalk.player.x, beforeWalk.player.y - 10, 1.4);
    const afterWalk = await live();
    const travelled = Math.hypot(
        afterWalk.player.x - beforeWalk.player.x,
        afterWalk.player.y - beforeWalk.player.y
    );
    check('the virtual stick walks the castaway', travelled > 2, `${travelled.toFixed(2)} m`);

    const yawBefore = (await camera()).yaw;
    const rect = await canvasRect();
    await page.touchscreen.touchStart(rect.left + rect.width * 0.75, rect.top + rect.height * 0.3);
    await sleep(60);
    await page.touchscreen.touchMove(rect.left + rect.width * 0.35, rect.top + rect.height * 0.3);
    await sleep(200);
    await page.touchscreen.touchEnd();
    await sleep(300);
    const yawAfter = (await camera()).yaw;
    check('dragging orbits the camera', Math.abs(yawAfter - yawBefore) > 0.05, `yaw ${yawBefore.toFixed(2)} → ${yawAfter.toFixed(2)}`);
    await shot('c02-08-look');

    check('the look settings open', await clickDom('.settings-button'));
    await sleep(500);
    check('a sensitivity can be chosen', await clickDom('.choices button[data-value="1.6"]'));
    check('the settings close', await clickDom('.settings .done'));
    await sleep(600);

    const storedSensitivity = await page.evaluate((key) => localStorage.getItem(key), LOOK_KEY);
    check('the chosen sensitivity is stored', storedSensitivity === '1.6', `stored ${storedSensitivity}`);

    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2' });
    await waitForScene();
    await sleep(900);
    const reloadedSensitivity = await page.evaluate((key) => localStorage.getItem(key), LOOK_KEY);
    check('look sensitivity survives a reload', reloadedSensitivity === '1.6');

    // ---- A3: frame rate and tab-switch survival --------------------------

    console.log('\nA3 — frame rate and tab-switch survival');

    //  Move for a few seconds so the sample window describes play, not a still camera.
    const moving = await live();
    await walkToward(moving.player.x + 6, moving.player.y - 6, 2.2);
    await walkToward(moving.player.x - 6, moving.player.y + 4, 2.2);
    const frame = await fps();

    //  A software renderer must be an explicit choice, never a silent one: on a GPU-less
    //  CI runner plain `npm run smoke` would otherwise read an 8 fps SwiftShader number as
    //  a real A3 verdict. If we are on software without --software having asked for it, that
    //  is a failed run, not a passed check (C3 audit, Cycle 02).
    if (software && !SOFTWARE) {
        check(
            'the frame-rate check ran on a real GPU',
            false,
            `renderer is ${renderer} — pass --software to accept a meaningless FPS number, or run where a GPU exists`
        );
    } else if (software) {
        check(
            'frame rate measured (SOFTWARE renderer — not a verdict on A3)',
            frame.samples > 60,
            `median ${frame.median} fps under SwiftShader; re-run on a GPU for a real number`
        );
    } else {
        check(
            `median frame rate is at or above the floor (${TUNE.fpsFloorMedian})`,
            frame.median >= TUNE.fpsFloorMedian,
            `median ${frame.median} fps, 1% low ${frame.onePercentLow} fps, on ${renderer}`
        );
    }

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
    await shot('c02-09-after-tab-switch');

    // ---- A3: cold load on a throttled 4G connection ----------------------

    console.log('\nA3 — cold load on 4G');

    const cold = await browser.newPage();
    await cold.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const cdp = await cold.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 70,
        downloadThroughput: (4 * 1024 * 1024) / 8,
        uploadThroughput: (1 * 1024 * 1024) / 8
    });

    const coldStart = Date.now();
    await cold.goto(URL_UNDER_TEST, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await cold.waitForFunction(() => window.__drift?.sceneReady?.() === true, { timeout: 90_000 });
    const coldMs = Date.now() - coldStart;
    await cold.close();

    check(
        `first playable frame on cold 4G is within ${TUNE.coldLoadBudgetSeconds} s`,
        coldMs <= TUNE.coldLoadBudgetSeconds * 1000,
        `${coldMs} ms`
    );

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
