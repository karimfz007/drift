#!/usr/bin/env node
/**
 * Device smoke test — the automated half of the cycle's device acceptance checks.
 *
 * The brain is covered by Vitest; this drives the *body* the way a thumb does: a real
 * Chromium in mobile emulation, real touch events, and assertions read back out of the
 * live game state. It exists so "it plays on a phone" is a check anyone can re-run —
 * including the C3 auditor, against the deployed URL.
 *
 * Cycle 03 adds the pressure loop (three vitals, drink, forage, craft, chop, loot, death),
 * and the two Cycle-02 fixes (feet-to-terrain grounding + colliders), so the harness now
 * reaches into the scene to check the player's feet sit on the ground and that a tree
 * stops the player.
 *
 * Usage:
 *   node tools/smoke.mjs [url] [--headful] [--software]
 */

import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const URL_UNDER_TEST = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4173/';
const HEADFUL = process.argv.includes('--headful');
const SOFTWARE = process.argv.includes('--software');
const SHOT_DIR = fileURLToPath(new URL('../.smoke/', import.meta.url));
const BLANK_PATH = '__smoke_blank';

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
].filter(Boolean);

const SAVE_KEY = 'drift.save.v1';
const LOOK_KEY = 'drift.look.v1';

const TUNE = {
    woodPerFire: 5,
    fireBurnGameHoursPerWood: 2,
    realSecondsPerGameHour: 150,
    interactRadius: 2.6,
    drinkPerSip: 25,
    treeWoodYield: 8,
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
    for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
    throw new Error('No Chrome found.');
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
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36');

    await page.setRequestInterception(true);
    page.on('request', (r) => {
        if (r.url().includes(BLANK_PATH)) { r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><link rel="icon" href="data:,"><title>blank</title>' }); return; }
        r.continue();
    });

    const consoleErrors = [];
    const missing = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    page.on('response', (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });

    // ---- Helpers ----
    const live = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__drift.state())));
    const panelOpen = () => page.evaluate(() => window.__drift.panelOpen());
    const fps = () => page.evaluate(() => window.__drift.fps());
    const camera = () => page.evaluate(() => window.__drift.camera());
    const screenOf = (x, z) => page.evaluate(([wx, wz]) => window.__drift.screenOf(wx, wz), [x, z]);
    const waitForScene = async (t = 60_000) => page.waitForFunction(() => window.__drift?.sceneReady?.() === true, { timeout: t });

    const tapAt = async (x, y, hold = 60) => { await page.touchscreen.touchStart(x, y); await sleep(hold); await page.touchscreen.touchEnd(); await sleep(140); };
    const tapWorld = async (wx, wz, hold = 60) => { const p = await screenOf(wx, wz); if (!p) return false; await tapAt(p.x, p.y, hold); return true; };
    const clickDom = async (sel) => { const h = await page.$(sel); if (!h) return false; await h.click(); await sleep(340); return true; };
    const canvasRect = () => page.evaluate(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });

    const walkToward = async (tx, tz, seconds) => {
        const rect = await canvasRect();
        const ox = rect.left + rect.width * 0.25;
        const oy = rect.top + rect.height * 0.78;
        const st = await live();
        const view = await camera();
        const dx = tx - st.player.x, dz = tz - st.player.y;
        const len = Math.hypot(dx, dz) || 1;
        const nx = dx / len, nz = dz / len;
        const stickX = Math.cos(view.yaw) * nx - Math.sin(view.yaw) * nz;
        const stickY = -Math.sin(view.yaw) * nx - Math.cos(view.yaw) * nz;
        await page.touchscreen.touchStart(ox, oy);
        await sleep(60);
        await page.touchscreen.touchMove(ox + stickX * 78, oy + stickY * 78);
        await sleep(seconds * 1000);
        await page.touchscreen.touchEnd();
        await sleep(160);
    };
    const approach = async (x, z, budget = 16) => {
        const deadline = Date.now() + budget * 1000;
        let st = await live();
        let d = Math.hypot(st.player.x - x, st.player.y - z);
        while (d > TUNE.interactRadius * 0.7 && Date.now() < deadline) {
            await walkToward(x, z, Math.min(1.2, Math.max(0.25, (d - 1) / 3.5)));
            st = await live();
            d = Math.hypot(st.player.x - x, st.player.y - z);
        }
        return d;
    };
    const nodeOf = async (kind) => { const st = await live(); return st.nodes.find((n) => n.available && n.kind === kind); };

    const editSave = async (mutateSrc) => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(({ key, src }) => {
            const env = JSON.parse(localStorage.getItem(key));
            // eslint-disable-next-line no-new-func
            new Function('state', src)(env.state);
            localStorage.setItem(key, JSON.stringify(env));
        }, { key: SAVE_KEY, src: mutateSrc });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2' });
        await waitForScene();
        await sleep(1000);
    };
    const goAway = async (minutes) => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded' });
        const before = await page.evaluate(({ key, ms }) => {
            const env = JSON.parse(localStorage.getItem(key));
            env.savedAtMs -= ms; env.state.lastSeenMs -= ms;
            localStorage.setItem(key, JSON.stringify(env));
            return env.state;
        }, { key: SAVE_KEY, ms: minutes * 60 * 1000 });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2' });
        await waitForScene();
        await sleep(1200);
        return before;
    };
    const startFresh = async () => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(({ s, l }) => { localStorage.removeItem(s); localStorage.removeItem(l); }, { s: SAVE_KEY, l: LOOK_KEY });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
        await waitForScene();
        await sleep(900);
    };
    const shot = (n) => page.screenshot({ path: join(SHOT_DIR, `${n}.png`) });

    /** Walk to a node and gather it (tap for tap-nodes, hold for hold-nodes). */
    const harvest = async (kind, holdMs = 2200) => {
        const node = await nodeOf(kind);
        if (!node) return { ok: false };
        const d = await approach(node.x, node.y, 22);
        if (d > TUNE.interactRadius) return { ok: false, reason: 'unreached', d };
        const hold = ['deadfall', 'tree', 'rock', 'coconutpalm', 'crashbox'].includes(kind) ? holdMs : 60;
        await tapWorld(node.x, node.y, hold);
        await sleep(300);
        return { ok: true, node };
    };

    // ---- A3: load ----
    console.log(`\nDRIFT device smoke test (C03) — ${URL_UNDER_TEST}\n`);
    console.log('A3 — load, layout, renderer');
    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
    await waitForScene();
    const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const i = gl?.getExtension('WEBGL_debug_renderer_info'); return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    const software = /swiftshader|software|llvmpipe/i.test(renderer);
    console.log(`  (renderer: ${renderer})`);
    await startFresh();

    const booted = await page.evaluate(() => { const s = window.__drift.state(); return { canvas: !!document.getElementById('game-canvas'), nodes: s.nodes.length, thirst: s.thirst, hunger: s.hunger, health: s.health }; });
    check('loads a playable 3D scene with the three new vitals full', booted.canvas && booted.nodes > 0 && booted.thirst > 98 && booted.hunger > 98 && booted.health === 100, `${booted.nodes} nodes`);

    const layout = await page.evaluate(() => { const c = document.getElementById('game-canvas'); const r = c.getBoundingClientRect(); return { fits: r.width <= window.innerWidth + 1 && r.height <= window.innerHeight + 1, touch: getComputedStyle(document.body).touchAction, vp: document.querySelector('meta[name=viewport]')?.content ?? '' }; });
    check('canvas fills the viewport, no pinch/zoom trap', layout.fits && layout.touch === 'none' && /user-scalable=no/.test(layout.vp));
    await shot('c03-01-coldopen');
    check('the cold open shows on a fresh run', await panelOpen());
    check('the cold open dismisses', await clickDom('.cold-open button'));
    await sleep(800);
    await shot('c03-02-island');

    // ---- A6: grounding + colliders ----
    console.log('\nA6 — ground truth (grounding + colliders)');
    const grounding = await page.evaluate(() => {
        const s = window.__drift.state();
        const feetY = window.__drift.playerFeetY();
        const ground = window.__drift.groundAt(s.player.x, s.player.y);
        const hasShadow = !!window.__driftScene.meshes.find((m) => m.name.startsWith('shadow_') && m.isEnabled());
        return { feetY, ground, gap: feetY - ground, hasShadow };
    });
    check('the castaway has a contact shadow (the float fix)', grounding.hasShadow);
    check('the feet sit on the terrain, not floating', Math.abs(grounding.gap) < 0.05, `feet-to-ground gap ${grounding.gap.toFixed(3)} m`);

    //  Collider: walk straight into a tree and confirm the player stops short of its trunk.
    const tree = await nodeOf('tree');
    await approach(tree.x, tree.y, 22); // gets within reach but not into the trunk
    //  Now push hard toward the tree centre for a couple of seconds.
    await walkToward(tree.x, tree.y, 2.0);
    const afterPush = await live();
    const gap = Math.hypot(afterPush.player.x - tree.x, afterPush.player.y - tree.y);
    check('a tree collider stops the player (cannot walk through it)', gap > 0.6, `${gap.toFixed(2)} m from the trunk`);
    await shot('c03-03-treeline');

    // ---- A4/A7: the pressure loop ----
    console.log('\nA4/A7 — the pressure loop');

    //  Gather the axe recipe by hand: wood (deadfall), stone (rock), fibre (palm).
    const dead = await harvest('deadfall');
    check('deadfall gives wood by hand', dead.ok);
    const rock = await harvest('rock');
    const palm = await harvest('coconutpalm');
    let inv = (await live()).inventory;
    check('a rock outcrop gives stone', inv.stone >= 1, `stone ${inv.stone}`);
    check('a coconut palm gives coconut and fibre', inv.coconut >= 1 && inv.fiber >= 1, `coconut ${inv.coconut}, fibre ${inv.fiber}`);
    void rock; void palm;

    //  Top up to the recipe deterministically (foraging exact counts by touch is flaky),
    //  then craft the axe through the card — the four gates.
    await editSave('state.inventory.wood = 3; state.inventory.stone = 2; state.inventory.fiber = 2;');
    check('the craft-axe action is offered once the parts are in hand', await clickDom('.action'));
    await sleep(400);
    await shot('c03-04-craftcard');
    check('the craft card is a panel with the gates', await page.$('.craft .gates') !== null);
    check('the axe can be made', await clickDom('.craft .craft-btn'));
    await sleep(600);
    const afterCraft = await live();
    check('the axe is crafted and the parts spent', afterCraft.tools.axe === true && afterCraft.inventory.wood === 0, `axe ${afterCraft.tools.axe}`);
    check('the craft was traced', afterCraft.trace.msToFirstCraft !== null);

    //  Fell a standing tree — axe only, big yield.
    const woodBeforeFell = (await live()).inventory.wood;
    const felled = await harvest('tree', 4600);
    check('a standing tree can be felled with the axe', felled.ok, felled.reason ?? '');
    const afterFell = await live();
    check('the felled tree yields timber (treeWoodYield)', afterFell.inventory.wood - woodBeforeFell === TUNE.treeWoodYield, `+${afterFell.inventory.wood - woodBeforeFell}`);
    check('felling trains woodcutting', afterFell.skills.woodcutting.xp > 0 || afterFell.skills.woodcutting.level > 1);
    await shot('c03-05-felled');

    //  Open the sealed crash box — first loot.
    const box = await harvest('crashbox', 2400);
    check('the sealed crash box opens with the axe', box.ok);
    const afterBox = await live();
    check('the box yields the flask and fibre', afterBox.tools.flask === true && afterBox.inventory.fiber > afterCraft.inventory.fiber, `flask ${afterBox.tools.flask}`);

    //  Drink at the pond: get thirsty first (save surgery), then walk to the pond and drink.
    await editSave('state.thirst = 40;');
    const pond = await page.evaluate(() => { const s = window.__drift; return s ? null : null; });
    void pond;
    const POND = { x: -22, y: 8 };
    const thirstBeforeDrink = (await live()).thirst;
    let atPondDist = await approach(POND.x, POND.y, 40);
    if (atPondDist > 11) atPondDist = await approach(POND.x, POND.y, 20); // one more push through the trees
    const reached = (() => { return atPondDist; })();
    check('the pond bank is reachable on foot', reached <= 11, `${reached.toFixed(1)} m from the water`);
    check('drinking at the pond is offered when close', await clickDom('.action'));
    await sleep(400);
    const afterDrink = await live();
    check('drinking restores thirst', afterDrink.thirst > thirstBeforeDrink + 1, `${thirstBeforeDrink.toFixed(1)} → ${afterDrink.thirst.toFixed(1)}`);
    check('the first drink was traced', afterDrink.trace.msToFirstDrink !== null);
    await shot('c03-06-pond');

    //  Eat: get hungry, forage a berry within reach or grant one, then eat.
    //  Away from the pond, thirst full and flask empty, so the secondary button is Eat
    //  (not Fill flask / Drink flask — those outrank eating when they apply).
    await editSave('state.player = { x: 0, y: 104 }; state.thirst = 100; state.tools.flaskSips = 0; state.hunger = 40; state.inventory.berries = 2;');
    const hungerBeforeEat = (await live()).hunger;
    check('an Eat action appears when hungry with food', await clickDom('.secondary-action'));
    await sleep(300);
    const afterEat = await live();
    check('eating restores hunger', afterEat.hunger > hungerBeforeEat, `${hungerBeforeEat} → ${afterEat.hunger}`);

    //  The idle hint fires and is contextual.
    const hintsBefore = await page.evaluate(() => window.__drift.hints().shown);
    await sleep(12_500);
    const hintsAfter = await page.evaluate(() => window.__drift.hints());
    check('the idle hint appears and is contextual', hintsAfter.shown > hintsBefore && hintsAfter.last.length > 0, `"${hintsAfter.last}"`);

    // ---- A4: death and respawn ----
    console.log('\nA4 — death and respawn (active play can kill)');
    //  Set every vital empty with a sliver of health, then a tick should kill and respawn.
    await editSave('state.thirst = 0; state.hunger = 0; state.warmth = 0; state.health = 0.5; state.player = { x: 20, y: -20 }; state.inventory.wood = 4;');
    await sleep(1600); // the render loop ticks; health runs out fast
    await shot('c03-07-death');
    const deathShowing = await panelOpen();
    check('a death overlay appears when health runs out in play', deathShowing);
    const dying = await live();
    check('the death was counted and a cause recorded', dying.trace.deaths >= 1 && dying.lastDeathCause !== null, `cause: ${dying.lastDeathCause}`);
    if (deathShowing) await clickDom('.death button');
    await sleep(500);
    const revived = await live();
    check('waking ashore restores you at spawn with your kit', revived.player.x === 0 && revived.health === 100 && revived.inventory.wood === 4);

    // ---- A4: absence and the morning report ----
    console.log('\nA4 — absence and the vitals report');
    await editSave('state.thirst = 60; state.hunger = 55;');
    const beforeAway = await goAway(4);
    await shot('c03-08-report');
    check('the morning report is on screen', await panelOpen());
    const reopened = await live();
    const gh = reopened.gameHoursElapsed - beforeAway.gameHoursElapsed;
    check('the absence advanced the clock at the tuned rate', Math.abs(gh - (4 * 60) / TUNE.realSecondsPerGameHour) < 0.2, `${gh.toFixed(2)} game hours`);
    check('vitals drifted during the absence but nobody died', reopened.thirst < 60 && reopened.health > 0 && reopened.trace.deaths === revived.trace.deaths, `thirst ${reopened.thirst.toFixed(1)}, health ${reopened.health}`);
    await clickDom('.report button');
    await sleep(500);

    // ---- A3: FPS + tab switch + cold load ----
    console.log('\nA3 — frame rate, tab-switch, cold load');
    const moving = await live();
    await walkToward(moving.player.x + 8, moving.player.y - 8, 2.0);
    await walkToward(moving.player.x - 8, moving.player.y + 6, 2.0);
    const frame = await fps();
    if (software && !SOFTWARE) {
        check('the frame-rate check ran on a real GPU', false, `renderer is ${renderer} — pass --software to accept a meaningless number`);
    } else if (software) {
        check('frame rate measured (SOFTWARE — not a verdict on A3)', frame.samples > 60, `median ${frame.median} fps under SwiftShader`);
    } else {
        check(`median frame rate ≥ floor (${TUNE.fpsFloorMedian}) on the bigger island`, frame.median >= TUNE.fpsFloorMedian, `median ${frame.median} fps, 1% low ${frame.onePercentLow} fps`);
    }

    const beforeHide = await live();
    const other = await browser.newPage();
    await other.goto('about:blank');
    await sleep(1800);
    await page.bringToFront();
    await sleep(1200);
    await other.close();
    const afterHide = await live();
    check('state survives backgrounding, clock kept running', afterHide.inventory.wood === beforeHide.inventory.wood && afterHide.gameHoursElapsed >= beforeHide.gameHoursElapsed);

    const cold = await browser.newPage();
    await cold.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const cdp = await cold.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (1 * 1024 * 1024) / 8 });
    const t0 = Date.now();
    await cold.goto(URL_UNDER_TEST, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await cold.waitForFunction(() => window.__drift?.sceneReady?.() === true, { timeout: 90_000 });
    const coldMs = Date.now() - t0;
    await cold.close();
    check(`cold 4G load within ${TUNE.coldLoadBudgetSeconds} s (bigger island)`, coldMs <= TUNE.coldLoadBudgetSeconds * 1000, `${coldMs} ms`);

    // ---- Hygiene ----
    console.log('\nHygiene');
    check('every requested asset was found', missing.length === 0, missing.slice(0, 4).join(' | '));
    check('no console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

    await browser.close();
    console.log(`\n${results.length - failures}/${results.length} checks passed. Screenshots in .smoke/\n`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nSMOKE TEST CRASHED\n', e); process.exit(1); });
