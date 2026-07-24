#!/usr/bin/env node
/**
 * Device smoke test — the automated half of the cycle's device acceptance checks.
 *
 * The brain is covered by Vitest; this drives the *body* the way a thumb does: a real
 * Chromium in mobile emulation, real touch events, and assertions read back out of the
 * live game state. It exists so "it plays on a phone" is a check anyone can re-run —
 * including the C3 auditor, against the deployed URL.
 *
 * Cycle 04 is the FEEL cycle, and the harness changed shape with the game (D-042): the
 * verbs left the HUD button stack and moved onto the world, so this now *taps the thing to
 * use the thing* and polls the result, instead of press-and-holding a button. Every one of
 * the five director defects in D-040 gets a named regression here — most of all the fire:
 *
 *   REGRESSION (D-040 #3/#4): fresh run, broad daylight, NO axe, five wood in hand →
 *   "Build fire" is the primary action, enabled, and it builds. In Cycle 03 a Craft-axe
 *   button out-prioritised Build-fire whenever any craft material was held (and wood is
 *   one), so the fire silently vanished until after the axe — which only ever happened at
 *   night. That is now impossible to reintroduce without turning this check red.
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
    interactRadiusM: 2.5,
    drinkPerSip: 25,
    treeWoodYield: 8,
    reedFiberYield: 2,
    coldLoadBudgetSeconds: 8,
    fpsFloorMedian: 30,
    frameTimeP95BudgetMs: 33,
    quarryYieldPerTap: 4,
    quarryStoneCapacity: 220,
    salvageStoneAmount: 2
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
    //  Landscape mobile: the game's own presentation (D-041). A phone held sideways.
    await page.setViewport({ width: 915, height: 412, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
    const actionText = () => page.evaluate(() => { const b = document.querySelector('.action'); return b ? { text: b.textContent, shown: b.style.display !== 'none', ready: b.classList.contains('ready') } : null; });

    const tapAt = async (x, y, hold = 55) => { await page.touchscreen.touchStart(x, y); await sleep(hold); await page.touchscreen.touchEnd(); await sleep(140); };
    const tapWorld = async (wx, wz, hold = 55) => { const p = await screenOf(wx, wz); if (!p) return false; await tapAt(p.x, p.y, hold); return true; };
    const clickDom = async (sel) => { const h = await page.$(sel); if (!h) return false; await h.click(); await sleep(340); return true; };

    //  A REAL, coordinate-based, viewport-and-occlusion-respecting tap on a DOM element — as
    //  opposed to clickDom() above, which dispatches straight at the element via Puppeteer's
    //  ElementHandle.click() regardless of whether it is actually on-screen or covered by
    //  something else. That gap let a real bug slip past 57/57 automated checks: on the
    //  landscape viewport (D-041, ~412px tall), the morning report's dismiss button could sit
    //  entirely below the visible viewport with no scroll affordance, unreachable by any real
    //  finger — invisible to clickDom() because it never checks geometry (FIX 1, 2026-07-23
    //  PERFECT pass). This helper scrolls the nearest overflow container to reveal the target,
    //  confirms via elementFromPoint that the element itself is the topmost hit within the
    //  viewport, and only then dispatches a genuine touch at that point.
    const realTapDom = async (sel) => {
        const info = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (!el) return { found: false };
            //  Scroll the TARGET into view, not the container to its bottom — a container
            //  can hold several items (the Build panel's axe/shelter/storage cards), and the
            //  target may sit anywhere in it, not just at the end (REGRESSION: scrollHeight
            //  landed on the LAST item, leaving an earlier one like the axe button offscreen).
            el.scrollIntoView({ block: 'center' });
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const inViewport = cy >= 0 && cy <= window.innerHeight && cx >= 0 && cx <= window.innerWidth;
            const topEl = inViewport ? document.elementFromPoint(cx, cy) : null;
            return { found: true, x: cx, y: cy, inViewport, isTopmost: topEl === el || el.contains(topEl) };
        }, sel);
        if (!info.found) return { ok: false, reason: 'not-found' };
        if (!info.inViewport) return { ok: false, reason: 'off-screen-after-scroll' };
        if (!info.isTopmost) return { ok: false, reason: 'occluded' };
        await tapAt(info.x, info.y, 55);
        await sleep(300);
        return { ok: true };
    };
    const canvasRect = () => page.evaluate(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });

    //  Dispatch a real PointerEvent with its own pointerId, as a second finger would — used
    //  to reproduce concurrent-touch bugs puppeteer's single-pointer touchscreen API cannot
    //  simulate (a resting/steering left thumb alongside a tapping right thumb, PERFECT-pass
    //  FIX 1). This exercises the actual Controls -> onTap path, not a debug bypass.
    const firePointer = (type, x, y, pointerId) => page.evaluate(({ type, x, y, pointerId }) => {
        const el = document.getElementById('game-canvas');
        el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: false }));
    }, { type, x, y, pointerId });

    //  Drive the left-thumb stick toward a world point for a while.
    const walkToward = async (tx, tz, seconds) => {
        const rect = await canvasRect();
        const ox = rect.left + rect.width * 0.2;
        const oy = rect.top + rect.height * 0.72;
        const st = await live();
        const view = await camera();
        const dx = tx - st.player.x, dz = tz - st.player.y;
        const len = Math.hypot(dx, dz) || 1;
        const nx = dx / len, nz = dz / len;
        const stickX = Math.cos(view.yaw) * nx - Math.sin(view.yaw) * nz;
        const stickY = -Math.sin(view.yaw) * nx - Math.cos(view.yaw) * nz;
        await page.touchscreen.touchStart(ox, oy);
        await sleep(60);
        await page.touchscreen.touchMove(ox + stickX * 70, oy + stickY * 70);
        await sleep(seconds * 1000);
        await page.touchscreen.touchEnd();
        await sleep(160);
    };
    const approach = async (x, z, budget = 20) => {
        const deadline = Date.now() + budget * 1000;
        let st = await live();
        let d = Math.hypot(st.player.x - x, st.player.y - z);
        while (d > TUNE.interactRadiusM * 0.7 && Date.now() < deadline) {
            await walkToward(x, z, Math.min(1.2, Math.max(0.25, (d - 1) / 3.5)));
            st = await live();
            d = Math.hypot(st.player.x - x, st.player.y - z);
        }
        return d;
    };
    //  The NEAREST available node of a kind — what a player reaches for, and what keeps the
    //  harness deterministic now that reaching a thing means walking there (D-042).
    const nodeOf = async (kind) => {
        const st = await live();
        const here = st.player;
        return st.nodes
            .filter((n) => n.available && n.kind === kind)
            .sort((a, b) => Math.hypot(a.x - here.x, a.y - here.y) - Math.hypot(b.x - here.x, b.y - here.y))[0];
    };
    const nodeById = async (id) => { const st = await live(); return st.nodes.find((n) => n.id === id); };

    //  Turn the look-camera to face a world point, so a tap on it lands. Needed because the
    //  camera yaw is independent of walking: after strolling past a short node it can sit
    //  behind you, and you cannot tap what is off-screen. A player does this without thinking;
    //  the harness has to do it deliberately. Drag-right increases yaw (controls.takeLook).
    const faceNode = async (x, z) => {
        for (let i = 0; i < 7; i++) {
            const st = await live();
            const view = await camera();
            const desired = Math.atan2(x - st.player.x, z - st.player.y);
            let delta = desired - view.yaw;
            while (delta > Math.PI) delta -= 2 * Math.PI;
            while (delta < -Math.PI) delta += 2 * Math.PI;
            if (Math.abs(delta) < 0.12) return;
            const rect = await canvasRect();
            const ox = rect.left + rect.width * 0.72, oy = rect.top + rect.height * 0.4;
            const px = Math.max(-260, Math.min(260, delta / 0.0042)); // px to reach the target yaw
            await page.touchscreen.touchStart(ox, oy);
            for (let s = 1; s <= 4; s++) { await page.touchscreen.touchMove(ox + (px * s) / 4, oy); await sleep(20); }
            await page.touchscreen.touchEnd();
            await sleep(200);
        }
    };

    const editSave = async (mutateSrc) => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await page.evaluate(({ key, src }) => {
            const env = JSON.parse(localStorage.getItem(key));
            // eslint-disable-next-line no-new-func
            new Function('state', src)(env.state);
            //  Stamp both clocks to "now" before writing back. Without this, the real wall-clock
            //  time this reload itself takes (page.goto + networkidle2 + Chrome overhead — which
            //  on a loaded machine can run to real seconds) gets folded into the boot-time
            //  reconcile as if it were genuine elapsed absence (Session.start() diffs `nowMs` against
            //  `savedAtMs`). That phantom gap compounds decay-per-real-hour effects (structure
            //  durability, vitals) editSave never intended to simulate — a REGRESSION found when a
            //  chain of editSave() calls after a deliberate sleep() pushed storage decay across the
            //  repair threshold and silently hijacked a deposit tap into a repair. editSave mutates
            //  state; it must not also mutate elapsed time.
            const now = Date.now();
            env.savedAtMs = now;
            env.state.lastSeenMs = now;
            localStorage.setItem(key, JSON.stringify(env));
        }, { key: SAVE_KEY, src: mutateSrc });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
        await waitForScene();
        await sleep(1000);
    };
    const goAway = async (minutes) => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        const before = await page.evaluate(({ key, ms }) => {
            const env = JSON.parse(localStorage.getItem(key));
            env.savedAtMs -= ms; env.state.lastSeenMs -= ms;
            localStorage.setItem(key, JSON.stringify(env));
            return env.state;
        }, { key: SAVE_KEY, ms: minutes * 60 * 1000 });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
        await waitForScene();
        await sleep(1200);
        return before;
    };
    const startFresh = async () => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await page.evaluate(({ s, l }) => { localStorage.removeItem(s); localStorage.removeItem(l); }, { s: SAVE_KEY, l: LOOK_KEY });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
        await waitForScene();
        await sleep(900);
    };
    const shot = (n) => page.screenshot({ path: join(SHOT_DIR, `${n}.png`) });

    /**
     * Tap-to-use: walk near, tap once, and poll until the node is consumed. Works the same
     * for tap-nodes (instant) and hold-nodes (the castaway auto-works it on arrival) — the
     * harness no longer knows or cares which, exactly as the player doesn't (D-042).
     */
    const harvest = async (kind, budget = 30) => {
        const node = await nodeOf(kind);
        if (!node) return { ok: false, reason: 'none' };
        const deadline = Date.now() + budget * 1000;
        while (Date.now() < deadline) {
            const cur = await nodeById(node.id);
            if (!cur || !cur.available) return { ok: true, node };
            //  Walk near (straight-line auto-walk can snag on a trunk, so the stick closes
            //  the gap), turn to face it, tap to act, then give a hold-node time to auto-work.
            await approach(node.x, node.y, 10);
            await faceNode(node.x, node.y);
            await tapWorld(node.x, node.y, 55);
            for (let i = 0; i < 8; i++) {
                const c = await nodeById(node.id);
                if (!c || !c.available) return { ok: true, node };
                await sleep(400);
            }
        }
        return { ok: false, reason: 'not-consumed', node };
    };

    // ---- A3/A2: load, layout, landscape ----
    console.log(`\nDRIFT device smoke test (C04 — feel) — ${URL_UNDER_TEST}\n`);
    console.log('A3/A2 — load, layout, landscape presentation');
    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
    await waitForScene();
    const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const i = gl?.getExtension('WEBGL_debug_renderer_info'); return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    const software = /swiftshader|software|llvmpipe/i.test(renderer);
    console.log(`  (renderer: ${renderer})`);
    await startFresh();

    const booted = await page.evaluate(() => { const s = window.__drift.state(); return { canvas: !!document.getElementById('game-canvas'), nodes: s.nodes.length, thirst: s.thirst, hunger: s.hunger, health: s.health }; });
    check('loads a playable 3D scene with the three vitals full', booted.canvas && booted.nodes > 0 && booted.thirst > 98 && booted.hunger > 98 && booted.health === 100, `${booted.nodes} nodes`);

    const layout = await page.evaluate(() => { const c = document.getElementById('game-canvas'); const r = c.getBoundingClientRect(); return { fits: r.width <= window.innerWidth + 1 && r.height <= window.innerHeight + 1, landscape: window.innerWidth >= window.innerHeight, touch: getComputedStyle(document.body).touchAction, vp: document.querySelector('meta[name=viewport]')?.content ?? '' }; });
    check('canvas fills the viewport, no pinch/zoom trap', layout.fits && layout.touch === 'none' && /user-scalable=no/.test(layout.vp));
    check('presented in landscape, edge to edge (safe-area aware)', layout.landscape && /viewport-fit=cover/.test(layout.vp));

    //  A2 — the app manifest and the rotate prompt: the phone-disappears kit (D-041).
    const pwa = await page.evaluate(async () => {
        const link = document.querySelector('link[rel=manifest]');
        const rotate = !!document.getElementById('rotate-prompt');
        let manifest = null;
        try { manifest = await (await fetch(link.href)).json(); } catch { /* ignore */ }
        return { linked: !!link, rotate, orientation: manifest?.orientation, display: manifest?.display };
    });
    check('a landscape web-app manifest is linked', pwa.linked && pwa.orientation === 'landscape', `orientation ${pwa.orientation}, display ${pwa.display}`);
    check('a rotate-to-landscape prompt exists for portrait', pwa.rotate);

    await shot('c04-01-coldopen');
    check('the cold open shows on a fresh run', await panelOpen());
    const coldOpenTap = await realTapDom('.cold-open button');
    await sleep(200); // past the panel's 320ms fade-out before reading panelOpen
    check('the cold open dismisses via a real, reachable tap', coldOpenTap.ok && !(await panelOpen()));
    await sleep(800);
    await shot('c04-02-island');

    // ---- A6: grounding + colliders ----
    console.log('\nA6 — ground truth (grounding + colliders + camera never clips)');
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
    await approach(tree.x, tree.y, 22);
    await walkToward(tree.x, tree.y, 2.0);
    const afterPush = await live();
    const gap = Math.hypot(afterPush.player.x - tree.x, afterPush.player.y - tree.y);
    check('a tree collider stops the player (cannot walk through it)', gap > 0.6, `${gap.toFixed(2)} m from the trunk`);

    //  Camera never dives under the ground while orbiting (A6, D-040 #1 territory).
    let camMinAboveGround = Infinity;
    for (let i = 0; i < 6; i++) {
        const rect = await canvasRect();
        const cx = rect.left + rect.width * 0.72;
        const cy = rect.top + rect.height * 0.4;
        await page.touchscreen.touchStart(cx, cy);
        await page.touchscreen.touchMove(cx + 120, cy + 30);
        await page.touchscreen.touchMove(cx + 220, cy + 60);
        await page.touchscreen.touchEnd();
        await sleep(120);
        const g = await page.evaluate(() => { const c = window.__driftScene.activeCamera.position; return c.y - window.__drift.groundAt(c.x, c.z); });
        camMinAboveGround = Math.min(camMinAboveGround, g);
    }
    check('the camera stays above the ground through a full orbit (never clips)', camMinAboveGround > 0.2, `min ${camMinAboveGround.toFixed(2)} m above ground`);
    await shot('c04-03-treeline');

    // ================================================================
    // C04 REGRESSIONS — one per director defect in D-040
    // ================================================================
    console.log('\nD-040 — the five director defects, root-caused and locked');

    //  #3/#4 THE FIRE: fresh run, broad DAYLIGHT, no axe, exactly the wood for a fire and
    //  nothing else. In C03 this hid Build-fire behind Craft-axe. It must not, ever again.
    await editSave('state.tools.axe = false; state.inventory = { wood: 5, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0 }; state.fire = { built: false, fuel: 0, x: 0, y: 0 }; state.gameHoursElapsed = 18; state.player = { x: 0, y: 80 };');
    const clockNow = await page.evaluate(() => document.querySelector('.clock')?.textContent ?? '');
    const isDaytime = /^(0[6-9]|1[0-7]):/.test(clockNow);
    check('REGRESSION #3/#4 setup — it is broad daylight, no axe, 5 wood', isDaytime, `clock ${clockNow}`);
    const fireAction = await actionText();
    check('REGRESSION #3/#4 — "Build fire" IS the primary action (not hidden by Craft)', !!fireAction && /build fire/i.test(fireAction.text) && fireAction.shown && fireAction.ready, fireAction ? `"${fireAction.text}" ready=${fireAction.ready}` : 'no action');
    await shot('c04-04-buildfire-daylight');
    await clickDom('.action');
    await sleep(500);
    const fireState = await live();
    check('REGRESSION #3/#4 — building the fire works in daylight, pre-axe', fireState.fire.built === true && fireState.inventory.wood === 0, `built ${fireState.fire.built}, wood ${fireState.inventory.wood}`);

    //  #3 THE "FROM FAR AWAY" HALF: nothing acts remotely. An intention set from out of range
    //  must NOT act — the castaway walks into interactRadiusM first, then acts (D-042; C3 note
    //  N2). This gate (`actOnArrival` runs only when `pendingInReach()`) is shared by every
    //  verb including the fire, so locking it here locks the exact rule that defused the fire.
    //  We inject the intention via `__drift.intend` rather than a tap: reliably tapping a
    //  distant 3-D object from a headless projected ground-point is not feasible, but injecting
    //  the intention IS exactly what a tap does — the game still gates the *action* on reach.
    await editSave('state.player = { x: -40, y: 66 };'); // ~14 m south of coconut palm cp1 (-40,52)
    const availOf = (id) => page.evaluate((i) => window.__drift.state().nodes.find((n) => n.id === i)?.available, id);
    const distTo = async (x, z) => { const s = await live(); return Math.hypot(s.player.x - x, s.player.y - z); };
    const palmNode = await page.evaluate(() => window.__drift.state().nodes.find((n) => n.id === 'cp1'));
    check('REGRESSION #3 setup — a coconut palm sits ~14 m out of reach', !!palmNode && palmNode.available, palmNode ? `cp1 at ${palmNode.x},${palmNode.y}` : 'missing');
    const dStart = await distTo(palmNode.x, palmNode.y);
    await page.evaluate(() => window.__drift.intend('cp1')); // the tap intention, set from afar
    const intended = await page.evaluate(() => window.__drift.pending());
    check('REGRESSION #3 — the intention registers', intended && intended.id === 'cp1');
    await sleep(450); // a beat: 14 m is not yet crossed — it must NOT have acted yet
    check('REGRESSION #3 — out of range it does NOT act remotely (palm still standing)', (await availOf('cp1')) === true, `${dStart.toFixed(1)} m away`);
    await sleep(900); // now the castaway has had time to accelerate and close ground
    const dMid = await distTo(palmNode.x, palmNode.y);
    check('REGRESSION #3 — the intention makes the castaway walk there (auto-walk closes the gap)', dMid < dStart - 2, `${dStart.toFixed(1)} → ${dMid.toFixed(1)} m`);
    for (let i = 0; i < 22; i++) { if ((await availOf('cp1')) === false) break; await sleep(400); }
    check('REGRESSION #3 — on arrival it DOES act (walk-then-use, never remote)', (await availOf('cp1')) === false);

    //  #2 FIBRE SOURCING: reeds are an obvious, tappable fibre source (D-043).
    await startFresh();
    await realTapDom('.cold-open button');
    await sleep(500);
    const fiberBefore = (await live()).inventory.fiber;
    const reed = await harvest('reed');
    check('REGRESSION #2 — reeds are a plain-tap fibre source', reed.ok, reed.reason ?? '');
    const afterReed = await live();
    check('REGRESSION #2 — a reed clump yields reedFiberYield fibre', afterReed.inventory.fiber - fiberBefore === TUNE.reedFiberYield, `+${afterReed.inventory.fiber - fiberBefore}`);

    //  #1 CAMERA/LOOK WHILE MOVING: drag-look responds, and moving + looking at once holds
    //  the p95 frame budget (no jank — the felt half of "smooth").
    const yawBefore = (await camera()).yaw;
    const rect0 = await canvasRect();
    const dragX = rect0.left + rect0.width * 0.75, dragY = rect0.top + rect0.height * 0.4;
    await page.touchscreen.touchStart(dragX, dragY);
    await page.touchscreen.touchMove(dragX + 160, dragY);
    await page.touchscreen.touchMove(dragX + 300, dragY);
    await page.touchscreen.touchEnd();
    await sleep(400);
    const yawAfter = (await camera()).yaw;
    check('REGRESSION #1 — the look drag turns the camera', Math.abs(yawAfter - yawBefore) > 0.05, `Δyaw ${(yawAfter - yawBefore).toFixed(3)} rad`);

    //  Move and look simultaneously for a couple of seconds, then read the jank metric.
    {
        const rect = await canvasRect();
        const sx = rect.left + rect.width * 0.2, sy = rect.top + rect.height * 0.72;
        const lx = rect.left + rect.width * 0.78, ly = rect.top + rect.height * 0.4;
        await page.touchscreen.touchStart(sx, sy);              // left thumb: walk
        await page.touchscreen.touchMove(sx, sy - 60);
        for (let i = 0; i < 8; i++) {                           // right thumb: sweep look
            await page.touchscreen.touchStart(lx, ly);
            await page.touchscreen.touchMove(lx + 80, ly + (i % 2 ? 20 : -20));
            await page.touchscreen.touchEnd();
            await sleep(180);
        }
        await page.touchscreen.touchEnd();
        await sleep(200);
    }
    const jank = await fps();
    if (software && !SOFTWARE) {
        check('REGRESSION #1 — p95 frame time measured on a real GPU', false, `renderer is ${renderer} — pass --software to accept a meaningless number`);
    } else if (software) {
        check('REGRESSION #1 — p95 frame time measured (SOFTWARE, not a verdict)', jank.samples > 40, `p95 ${jank.p95FrameMs} ms under SwiftShader`);
    } else {
        check(`REGRESSION #1 — p95 frame time ≤ budget (${TUNE.frameTimeP95BudgetMs} ms) while moving + looking`, jank.p95FrameMs <= TUNE.frameTimeP95BudgetMs, `p95 ${jank.p95FrameMs} ms, median ${jank.median} fps`);
    }

    //  #5 THE AXE DOES SOMETHING: with the axe, tapping a standing tree fells it (below).

    // ================================================================
    // PERFECT PASS (2026-07-23) — FIX 1 and FIX 2, root-caused and locked
    // ================================================================
    console.log('\nPERFECT pass — FIX 1 (stick-held tap) and FIX 2 (pond fill starved by drink)');

    //  FIX 1 root cause: `stepMovement` cleared ANY pending interaction every frame the
    //  movement stick had nonzero magnitude — so the natural two-thumb gesture (walk toward
    //  a tree with the left thumb, tap it with the right) set `pending` in `onTap`, then the
    //  very next frame's stepMovement (stick still held/resting) nulled it before the
    //  interaction ever ran. `__drift.intend()` bypasses onTap/Controls entirely and would
    //  NOT have caught this — it lives in the real tap path, so this regression dispatches
    //  genuine concurrent PointerEvents (a held stick pointer + a separate tapping pointer),
    //  exactly as two real fingers would, through the actual Controls -> onTap code path.
    await editSave('state.tools.axe = true; state.player = { x: -10, y: 45.7 };'); // ~1.7 m from tree tr1 (-10,44)
    {
        const rect = await canvasRect();
        const stickX = rect.left + rect.width * 0.2, stickY = rect.top + rect.height * 0.75;
        const sp = await screenOf(-10, 44);
        //  Left thumb: press and rest/nudge the stick (as it naturally does while walking).
        await firePointer('pointerdown', stickX, stickY, 101);
        await firePointer('pointermove', stickX + 15, stickY, 101);
        await sleep(80);
        //  Right thumb: a quick, separate-pointerId tap on the tree, stick still held.
        await firePointer('pointerdown', sp.x, sp.y, 102);
        await sleep(50);
        await firePointer('pointerup', sp.x, sp.y, 102);
        await sleep(200);
        let felled = false;
        for (let i = 0; i < 12; i++) { const av = await page.evaluate(() => window.__drift.state().nodes.find((n) => n.id === 'tr1')?.available); if (av === false) { felled = true; break; } await sleep(400); }
        check('FIX 1 — a tap on a standing tree fells it EVEN WHILE the movement stick is still held', felled);
        await firePointer('pointerup', stickX + 15, stickY, 101); // release the stick
        await sleep(150);
    }

    //  FIX 2 root cause: the pond's `actOnArrival` checked `canDrinkAtPond` FIRST, which is
    //  true whenever thirst < max — nearly always — so an empty/partial flask was starved
    //  exactly like C03's Craft-axe starved Build-fire: the higher-priority branch's gate was
    //  satisfied so often the other verb was practically unreachable ("no way to fill it").
    await editSave('state.tools.flask = true; state.tools.flaskSips = 0; state.thirst = 70;'); // thirsty but not desperate; flask empty
    {
        const POND = { x: -22, y: 8 };
        await approach(POND.x, POND.y, 40);
        const before = await live();
        await faceNode(POND.x, POND.y);
        await tapWorld(POND.x, POND.y, 55);
        await sleep(500);
        const after = await live();
        check('FIX 2 — tapping the pond fills a non-full flask (not just self-drink)', after.tools.flaskSips > before.tools.flaskSips, `sips ${before.tools.flaskSips} → ${after.tools.flaskSips}, thirst ${before.thirst}→${after.thirst.toFixed(1)}`);
    }

    // ================================================================
    // CYCLE 05 PERFECT PASS — tap-to-fell, 3rd report, root-caused fresh
    // ================================================================
    console.log('\nPERFECT pass (C05) — FIX 3: tap-to-fell, root-caused fresh (3rd report)');

    //  Neither prior diagnosis (stick-clears-pending; cache staleness) was wrong, but neither
    //  was the WHOLE story either. Root cause, found by reproducing with NO stick ever
    //  touched at all: `Controls.onMove` updated `pressMoved` (the tap-vs-drag distance that
    //  decides `wasTap` in onUp) for ANY pointermove reaching the canvas, regardless of which
    //  pointerId it belonged to. A single, ordinary tap on a fresh page reliably produces a
    //  spurious pointermove carrying an UNRELATED pointerId — most reliably reproduced around
    //  the very first `requestFullscreen()` call a session makes (D-041's first-gesture
    //  handler, orientation.ts) — which `onMove` treated as if the tracked pointer had
    //  travelled hundreds of pixels, flipping `wasTap` false and silently discarding the tap
    //  before `onTap` ever ran. The cold-open dismiss elsewhere in this suite is a REAL touch
    //  and consumes that one-time first-gesture trigger, which is exactly why 62/62 prior
    //  checks never caught this: by the time they tap a tree, the trigger is already spent.
    //  This regression dismisses the cold open with a plain DOM click (which does NOT consume
    //  it — confirmed empirically) so the very next tap genuinely is the session's first real
    //  touchscreen gesture, reproducing the failure precisely.
    await startFresh();
    await editSave('state.tools.axe = true; state.player = { x: -10, y: 45.8 };'); // ~1.8 m from tree tr1 (-10,44)
    await clickDom('.cold-open button'); // a DOM click, not a real touch — does not consume the first-gesture trigger
    await sleep(400);
    await faceNode(-10, 44);
    await tapWorld(-10, 44, 55);
    await sleep(250);
    const fix3Pending = await page.evaluate(() => window.__drift.pending());
    check('FIX 3 — the session\'s very first real tap registers a pending interaction', !!fix3Pending, JSON.stringify(fix3Pending));
    let fix3Felled = false;
    for (let i = 0; i < 20; i++) { const av = await page.evaluate(() => window.__drift.state().nodes.find((n) => n.id === 'tr1')?.available); if (av === false) { fix3Felled = true; break; } await sleep(400); }
    check('FIX 3 — the tree fells on the session\'s first real tap (no stick ever touched)', fix3Felled);

    // ---- A4/A7: the pressure loop, through the new direct-world verbs ----
    console.log('\nA4/A7 — the pressure loop (tap the thing to use the thing)');

    await startFresh();
    await realTapDom('.cold-open button');
    await sleep(400);

    const dead = await harvest('deadfall');
    check('deadfall gives wood by tap-and-walk', dead.ok, dead.reason ?? '');
    const rock = await harvest('rock');
    const palm = await harvest('coconutpalm');
    const inv = (await live()).inventory;
    check('a rock outcrop gives stone', inv.stone >= 1, `stone ${inv.stone}`);
    check('a coconut palm gives coconut and husk fibre', inv.coconut >= 1 && inv.fiber >= 1, `coconut ${inv.coconut}, fibre ${inv.fiber}`);
    void rock; void palm;

    //  D-051 gathering-matrix completeness: driftwood, shellfish, and berrybush had brain
    //  coverage but had never once been gathered through a real tap in this device harness —
    //  a gap the matrix itself surfaced, closed here rather than just noted. Teleport near
    //  each cluster first — same lesson as the fell setups elsewhere in this file: this tests
    //  the gather mechanism, not the harness's incidental walk budget across whatever distance
    //  the coconut-palm check above happened to leave the player at.
    await editSave('state.player = { x: 0, y: 90 };');
    const drift = await harvest('driftwood');
    check('driftwood gives wood by a plain tap', drift.ok, drift.reason ?? '');
    await editSave('state.player = { x: 0, y: 101 };');
    const shell = await harvest('shellfish');
    check('a shellfish clump gives a shellfish by a plain tap', shell.ok, shell.reason ?? '');
    await editSave('state.player = { x: 0, y: 35 };');
    const berry = await harvest('berrybush');
    check('a berry bush gives berries by a plain tap', berry.ok, berry.reason ?? '');

    //  Craft the axe through the Build panel (C05: axe/shelter/storage, own button each).
    await editSave('state.inventory.wood = 3; state.inventory.stone = 2; state.inventory.fiber = 2;');
    check('the Build button opens the panel', await clickDom('.secondary-action'));
    await sleep(400);
    await shot('c04-05-craftcard');
    check('the Build panel shows the axe item with gated source hints', await page.$('.build-item .gates') !== null);
    const craftTap = await realTapDom('.axe-btn');
    check('the axe can be made via a real, reachable tap (Build panel does not overflow the viewport)', craftTap.ok, craftTap.reason ?? '');
    await sleep(600);
    const afterCraft = await live();
    check('the axe is crafted and the parts spent', afterCraft.tools.axe === true && afterCraft.inventory.wood === 0, `axe ${afterCraft.tools.axe}`);
    check('the craft was traced', afterCraft.trace.msToFirstCraft !== null);

    //  #5 — fell a standing tree with the axe (the verb the axe unlocks, made discoverable).
    const woodBeforeFell = (await live()).inventory.wood;
    const felled = await harvest('tree', 34);
    check('REGRESSION #5 — a standing tree can be felled with the axe (the axe DOES something)', felled.ok, felled.reason ?? '');
    const afterFell = await live();
    check('the felled tree yields timber (treeWoodYield)', afterFell.inventory.wood - woodBeforeFell === TUNE.treeWoodYield, `+${afterFell.inventory.wood - woodBeforeFell}`);
    check('felling trains woodcutting', afterFell.skills.woodcutting.xp > 0 || afterFell.skills.woodcutting.level > 1);
    await shot('c04-06-felled');

    //  Open the sealed crash box — first loot, axe-gated.
    const box = await harvest('crashbox', 40);
    check('the sealed crash box opens with the axe', box.ok, box.reason ?? '');
    const afterBox = await live();
    check('the box yields the flask and fibre', afterBox.tools.flask === true && afterBox.inventory.fiber > afterCraft.inventory.fiber, `flask ${afterBox.tools.flask}`);

    //  Drink at the pond by TAPPING the water (no button). Top the flask first if one was
    //  picked up earlier in this run (the crash box) — since FIX 2 (2026-07-23) makes filling
    //  win over drinking whenever the flask isn't full, a full flask isolates this check to
    //  plain self-drinking; the fill-wins-when-empty behavior has its own regression above.
    await editSave('state.thirst = 40; if (state.tools.flask) state.tools.flaskSips = 999;');
    const POND = { x: -22, y: 8 };
    const thirstBeforeDrink = (await live()).thirst;
    let atPondDist = await approach(POND.x, POND.y, 40);
    if (atPondDist > 11) atPondDist = await approach(POND.x, POND.y, 20);
    check('the pond bank is reachable on foot', atPondDist <= 11, `${atPondDist.toFixed(1)} m from the water`);
    await faceNode(POND.x, POND.y);
    await tapWorld(POND.x, POND.y, 55);
    await sleep(1400); // a few auto-sips while standing in the water
    const afterDrink = await live();
    check('tapping the pond drinks and restores thirst', afterDrink.thirst > thirstBeforeDrink + 1, `${thirstBeforeDrink.toFixed(1)} → ${afterDrink.thirst.toFixed(1)}`);
    check('the first drink was traced', afterDrink.trace.msToFirstDrink !== null);
    await shot('c04-07-pond');

    //  Eat by TAPPING a food chip in the pack (eating is not a world object).
    await editSave('state.player = { x: 0, y: 104 }; state.thirst = 100; state.hunger = 40; state.inventory.berries = 2;');
    const hungerBeforeEat = (await live()).hunger;
    check('a tappable food chip is shown when carrying food', await page.$('.chip.food[data-food="berries"]') !== null);
    await clickDom('.chip.food[data-food="berries"]');
    await sleep(300);
    const afterEat = await live();
    check('tapping the food chip eats and restores hunger', afterEat.hunger > hungerBeforeEat, `${hungerBeforeEat} → ${afterEat.hunger}`);

    //  The carried flask is drinkable inland (B1 audit fix): a full flask is a tappable chip,
    //  and the fill the game promises has an inland payoff. No dead feature, no lying hint.
    await editSave('state.player = { x: 0, y: 104 }; state.thirst = 45; state.tools.flask = true; state.tools.flaskSips = 2;');
    const beforeFlask = await live();
    check('a full flask is a tappable chip', await page.$('.chip.tool.drink[data-drink="flask"]') !== null);
    await clickDom('.chip.tool.drink[data-drink="flask"]');
    await sleep(300);
    const afterFlask = await live();
    check('tapping the flask drinks inland and spends a sip', afterFlask.thirst > beforeFlask.thirst + 1 && afterFlask.tools.flaskSips === beforeFlask.tools.flaskSips - 1, `thirst ${beforeFlask.thirst}→${afterFlask.thirst.toFixed(1)}, sips ${beforeFlask.tools.flaskSips}→${afterFlask.tools.flaskSips}`);

    //  The idle hint fires and is contextual.
    const hintsBefore = await page.evaluate(() => window.__drift.hints().shown);
    await sleep(12_500);
    const hintsAfter = await page.evaluate(() => window.__drift.hints());
    check('the idle hint appears and is contextual', hintsAfter.shown > hintsBefore && hintsAfter.last.length > 0, `"${hintsAfter.last}"`);

    // ================================================================
    // CYCLE 05 "Foundations" — shelter, storage, upkeep, energy, sleep
    // ================================================================
    console.log('\nA1–A4 (C05) — construction: shelter, storage, upkeep, sleep');

    //  Build the shelter through the (now three-item) Build panel.
    await editSave('state.inventory = { wood: 20, stone: 20, fiber: 20, berries: 0, coconut: 0, shellfish: 0 };');
    await realTapDom('.secondary-action');
    await sleep(400);
    check('the Build panel shows all three items', (await page.evaluate(() => document.querySelectorAll('.build-item').length)) === 3);
    const shelterBuildTap = await realTapDom('.shelter-btn');
    check('the shelter builds via a real, reachable tap', shelterBuildTap.ok, shelterBuildTap.reason ?? '');
    await sleep(400);
    const afterShelter = await live();
    //  Durability decays continuously (even the ~400ms since building has shaved a hair off
    //  it), so this checks "built, effectively full" rather than an exact 100.
    check('the shelter is built, full durability', afterShelter.shelter.built && afterShelter.shelter.durability > 99.9, `durability ${afterShelter.shelter.durability}`);

    //  Build storage next — must NOT land on the shelter (the same-offset collision fix).
    await realTapDom('.secondary-action');
    await sleep(400);
    const storageBuildTap = await realTapDom('.storage-btn');
    check('storage builds via a real, reachable tap', storageBuildTap.ok, storageBuildTap.reason ?? '');
    await sleep(400);
    const afterStorage = await live();
    const shelterStorageGap = Math.hypot(afterStorage.shelter.x - afterStorage.storage.x, afterStorage.shelter.y - afterStorage.storage.y);
    check('REGRESSION — storage does not overlap the shelter (degenerate same-offset placement)', shelterStorageGap > 1, `${shelterStorageGap.toFixed(2)} m apart`);

    //  Sleep at the shelter: reuses the reconcile spine, advances the clock, refills energy.
    //  This also doubles as the repair-threshold REGRESSION: by now the shelter has
    //  naturally decayed a hair below 100 (real time has passed since it was built), and
    //  the player is about to carry wood via editSave below — if canRepairStructure still
    //  treated ANY durability<max as "needs repair" (the bug found in manual testing),
    //  repair would hijack this tap and the clock/energy checks below would fail exactly
    //  as they did before the structureRepairThresholdFraction fix.
    await editSave(`state.energy = 10;`);
    await approach(afterShelter.shelter.x, afterShelter.shelter.y, 20);
    await faceNode(afterShelter.shelter.x, afterShelter.shelter.y);
    const beforeSleep = await live();
    await tapWorld(afterShelter.shelter.x, afterShelter.shelter.y, 55);
    await sleep(600);
    const sleepReportTap = await realTapDom('.report button');
    check('sleeping at the shelter opens the (reused) morning-report overlay', sleepReportTap.ok, sleepReportTap.reason ?? '');
    await sleep(300);
    const afterSleep = await live();
    check('sleep advances the clock by sleepDurationGameHours', Math.abs((afterSleep.gameHoursElapsed - beforeSleep.gameHoursElapsed) - 8) < 0.5, `Δ ${(afterSleep.gameHoursElapsed - beforeSleep.gameHoursElapsed).toFixed(2)} game hours`);
    //  Energy decays continuously (energyDrainPerGameHour), so by the time this reads state
    //  some real time has passed since sleep() topped it to exactly 100 — same "effectively
    //  full" pattern as the shelter-durability check above, not an exact-100 assertion.
    check('sleep refills energy on waking', afterSleep.energy > 99, `energy ${afterSleep.energy}`);

    //  Upkeep: repair only wins the disjoint choice once durability has meaningfully lapsed
    //  (REGRESSION — cosmetic decay must not starve sleep/storage-use every tap).
    await editSave('state.shelter.durability = 40; state.inventory.wood = 10;');
    await approach(afterShelter.shelter.x, afterShelter.shelter.y, 20);
    await faceNode(afterShelter.shelter.x, afterShelter.shelter.y);
    await tapWorld(afterShelter.shelter.x, afterShelter.shelter.y, 55);
    await sleep(400);
    const afterRepair = await live();
    check('a meaningfully damaged shelter repairs (not sleeps) when wood is held', afterRepair.shelter.durability > 40 && afterRepair.inventory.wood === 9, `durability ${afterRepair.shelter.durability.toFixed(1)}, wood ${afterRepair.inventory.wood}`);

    //  Storage: the disjoint deposit-vs-withdraw rule, exercised for real.
    await editSave(`state.inventory = { wood: 6, stone: 3, fiber: 2, berries: 0, coconut: 0, shellfish: 0 };`);
    await approach(afterStorage.storage.x, afterStorage.storage.y, 20);
    await faceNode(afterStorage.storage.x, afterStorage.storage.y);
    await tapWorld(afterStorage.storage.x, afterStorage.storage.y, 55);
    await sleep(400);
    const afterDeposit = await live();
    check('tapping storage while carrying raw materials deposits them', afterDeposit.inventory.wood === 0 && afterDeposit.storage.stored.wood === 6, `inv.wood ${afterDeposit.inventory.wood}, stored.wood ${afterDeposit.storage.stored.wood}`);
    await tapWorld(afterStorage.storage.x, afterStorage.storage.y, 55);
    await sleep(400);
    const afterWithdraw = await live();
    check('tapping storage empty-handed withdraws a batch', afterWithdraw.inventory.wood > 0 && afterWithdraw.storage.stored.wood < afterDeposit.storage.stored.wood, `inv.wood ${afterWithdraw.inventory.wood}, stored.wood ${afterWithdraw.storage.stored.wood}`);

    // ================================================================
    // C1 DIAGNOSTIC RULING — D-045 lineage: sequential interactions after a fell
    // ================================================================
    console.log('\nD-045 lineage — sequential interactions (a felled node must not block the NEXT tap)');

    //  REPRODUCE FIRST (the ruling's own order): the director's live re-test found tap-to-fell
    //  breaking in a NEW shape — fell one tree, then tap a second, unrelated object, and get
    //  zero reaction (no highlight, no sound, no reason). Single-action coverage (one fell,
    //  alone) had passed 75/75; it never exercised a SECOND interaction right after a fell.
    //  Root cause, confirmed via window.__driftScene.pick(): `NodeViews.sync()` disabled a
    //  spent node's mesh for RENDERING (`setEnabled(false)`) but never touched `isPickable` —
    //  a separate Babylon flag picking does not infer from enabled state. The felled tree's
    //  invisible geometry stayed a live pick target, silently intercepting a ray meant for
    //  whatever stood near or behind it (here: the storage crate). Fixed generally in
    //  NodeViews.sync() for every node kind's full mesh hierarchy (trunk AND canopy, palm AND
    //  fronds/husk, the reed's blade AND its four extras) — not special-cased to trees.
    //  By this point in the run the player has wandered up near the shelter (~60 m from the
    //  remaining standing trees, chasing the sleep/repair tests above) — teleporting next to
    //  a specific tree first keeps this section a test of the SEQUENCE, not of whether
    //  harvest()'s walk budget can cross the whole island in time (a test-harness concern,
    //  not a game one).
    const nearStorageTree = (await live()).nodes
        .filter((n) => n.kind === 'tree' && n.available)
        .sort((a, b) => Math.hypot(a.x - afterStorage.storage.x, a.y - afterStorage.storage.y) - Math.hypot(b.x - afterStorage.storage.x, b.y - afterStorage.storage.y))[0];
    check('setup — a standing tree remains for the sequential-interaction section', !!nearStorageTree, nearStorageTree ? `${nearStorageTree.id} at ${nearStorageTree.x},${nearStorageTree.y}` : 'none left');
    await editSave(`state.player = { x: ${nearStorageTree.x - 1.5}, y: ${nearStorageTree.y} }; state.tools.axe = true;`);
    const fellThenTapStorage = await harvest('tree', 34);
    check('fell a tree, then the very next tap reaches the storage crate (not swallowed by the felled tree\'s ghost mesh)', fellThenTapStorage.ok, fellThenTapStorage.reason ?? '');
    await editSave('state.inventory.wood = 4;');
    await approach(afterStorage.storage.x, afterStorage.storage.y, 25);
    await faceNode(afterStorage.storage.x, afterStorage.storage.y);
    const storedBefore = (await live()).storage.stored.wood;
    await tapWorld(afterStorage.storage.x, afterStorage.storage.y, 55);
    await sleep(400);
    const afterFellThenStorage = await live();
    check('REGRESSION — the tap right after a fell deposits into storage, not silence', afterFellThenStorage.inventory.wood === 0 && afterFellThenStorage.storage.stored.wood === storedBefore + 4, `inv.wood ${afterFellThenStorage.inventory.wood}, stored.wood ${storedBefore}→${afterFellThenStorage.storage.stored.wood}`);

    //  Interleave, per the ruling: fell -> gather (a tap-kind node, not hold) -> fell again.
    //  Reed clumps (rd1-rd3) cluster right by the pond, inland of the trees — teleport there
    //  first for the same reason as above: testing the sequence, not the walk budget.
    const nextTree1 = (await live()).nodes.filter((n) => n.kind === 'tree' && n.available)[0];
    check('setup — a second standing tree remains for the interleave', !!nextTree1, nextTree1 ? nextTree1.id : 'none left');
    await editSave(`state.player = { x: ${nextTree1.x - 1.5}, y: ${nextTree1.y} }; state.tools.axe = true;`);
    const interleaveFell1 = await harvest('tree', 34);
    const nearestReed = (await live()).nodes.filter((n) => n.kind === 'reed' && n.available)[0];
    await editSave(`state.player = { x: ${nearestReed.x - 1.5}, y: ${nearestReed.y} };`);
    const interleaveGather = await harvest('reed', 20);
    const nextTree2 = (await live()).nodes.filter((n) => n.kind === 'tree' && n.available)[0];
    check('setup — a third standing tree remains for the interleave', !!nextTree2, nextTree2 ? nextTree2.id : 'none left');
    await editSave(`state.player = { x: ${nextTree2.x - 1.5}, y: ${nextTree2.y} };`);
    const interleaveFell2 = await harvest('tree', 34);
    check('REGRESSION — fell -> gather -> fell all complete with no dead tap in between', interleaveFell1.ok && interleaveGather.ok && interleaveFell2.ok, `fell1 ${interleaveFell1.ok}, gather ${interleaveGather.ok}, fell2 ${interleaveFell2.ok}`);

    //  Fail-loud law (D-046(d) ruling): silence is never a legal outcome. A tap that hits
    //  something real but produces no verb now explains itself and leaves a trace breadcrumb
    //  (`trace.failedInteractionTaps`) instead of vanishing; a genuinely empty-ground tap
    //  still explains nothing (it is a look-around, not a failure) — confirmed by the idle
    //  hint check above already showing 0 spurious hints across this whole run's plain taps.
    //  Emptied out the crate above, so tapping it carrying nothing hits the existing
    //  "nothing to store, nothing to take" explain path — a clean, reliable, reproducible
    //  fail-loud case that costs no scarce world resource.
    //  Teleport next to the crate rather than trusting approach() to cross whatever distance
    //  the interleave test above left behind within a fixed budget — the same test-harness
    //  lesson as the fell setups above: this section tests fail-loud, not the walk budget.
    await editSave(`state.inventory = { wood: 0, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0 }; state.storage.stored = { wood: 0, stone: 0, fiber: 0 }; state.player = { x: ${afterStorage.storage.x - 1.5}, y: ${afterStorage.storage.y} };`);
    await approach(afterStorage.storage.x, afterStorage.storage.y, 20);
    await faceNode(afterStorage.storage.x, afterStorage.storage.y);
    const failedTapsBefore = (await live()).trace.failedInteractionTaps;
    await tapWorld(afterStorage.storage.x, afterStorage.storage.y, 55);
    await sleep(300);
    const failedTapsAfter = (await live()).trace.failedInteractionTaps;
    check('fail-loud — a tap that reaches something real but has nothing to do explains why and traces it, never silently', failedTapsAfter > failedTapsBefore, `${failedTapsBefore} → ${failedTapsAfter}`);

    // ================================================================
    // D-050 — the 5th live report: an emptied world, not a defect, plus the debug-export tool
    // ================================================================
    console.log('\nD-050 — resource exhaustion looks like silence; the debug-export tool');

    //  C1 diagnostic ruling: the director's 5th consecutive live "tap-to-fell does nothing"
    //  report — true silence, not even the in-range affordance circle, across every tree
    //  tried. REPRODUCED: nodes are single-use and never respawn (world.ts); the 5 real
    //  standing trees are visually near-identical to the 110 purely decorative treeline
    //  trees (`island.ts`'s thin-instanced forest, `isPickable: false` by design, for the
    //  60-fps-not-a-slideshow reason its own comment gives). Once a long real session has
    //  felled all 5, every later "tree" the director sees and taps IS a decorative one —
    //  correctly, silently inert, not a regression. This coordinate is a real decorative
    //  tree's position (`TREES`'s deterministic golden-angle scatter, index 62 as authored),
    //  confirmed once by direct diagnostic before this test was written.
    await editSave(`
        for (const n of state.nodes) if (n.kind === 'tree') { n.available = false; n.depletedAtGameHours = state.gameHoursElapsed; }
        state.player = { x: 21, y: 35 };
        state.tools.axe = true;
    `);
    const decorativeTapFailedBefore = (await live()).trace.failedInteractionTaps;
    await approach(24, 35, 15);
    await faceNode(24, 35);
    const decorativePendingBefore = await page.evaluate(() => window.__drift.pending());
    await tapWorld(24, 35, 55);
    await sleep(400);
    const decorativePendingAfter = await page.evaluate(() => window.__drift.pending());
    const decorativeTapFailedAfter = (await live()).trace.failedInteractionTaps;
    check('REGRESSION — an emptied world (all 5 trees felled) makes a decorative treeline tree correctly, silently inert — not a defect', decorativePendingBefore === null && decorativePendingAfter === null && decorativeTapFailedAfter === decorativeTapFailedBefore, `pending ${JSON.stringify(decorativePendingBefore)}→${JSON.stringify(decorativePendingAfter)}, failedTaps ${decorativeTapFailedBefore}→${decorativeTapFailedAfter}`);

    //  The mandatory harness-fidelity item: a report the automated suite can't reproduce
    //  (this one needed a session's worth of real, cumulative play to set up) must still be
    //  diagnosable from the director's own phone. `debugInfo()` — the exact text "Copy debug
    //  info" copies to the clipboard — must show the resource-exhaustion story plainly.
    const debugInfo = await page.evaluate(() => window.__drift.debugInfo());
    check('the debug-export text reports 0/5 standing trees remaining, explaining the silence at a glance', /tree: 0\/5/.test(debugInfo), debugInfo.split('\n').find((l) => l.includes('tree:')) ?? 'no tree line found');
    check('the debug-export text includes the tap log', /last \d+ taps/.test(debugInfo) && debugInfo.includes('->'), '');
    check('the debug-export text includes the trace', debugInfo.includes('trace:') && debugInfo.includes('failedInteractionTaps'), '');

    //  The settings panel's real button, reachable by a real tap — not just the text existing.
    check('the Look button opens settings', await clickDom('.settings-button'));
    await sleep(400);
    const copyDebugTap = await realTapDom('.copy-debug');
    check('the "Copy debug info" button is reachable by a real tap', copyDebugTap.ok, copyDebugTap.reason ?? '');
    await sleep(200);
    const copiedVisible = await page.evaluate(() => { const el = document.querySelector('.debug-copied'); return el ? !el.hasAttribute('hidden') : false; });
    check('tapping it confirms the copy (clipboard write succeeded or a fallback message shows)', copiedVisible);
    await clickDom('.panel .done');
    await sleep(300);

    // ================================================================
    // D-051 — the gathering-layer audit: renewability, the quarry, salvage, fast movement
    // ================================================================
    console.log('\nD-051 — renewability law, the quarry, beach salvage, fast movement (testing)');

    //  The quarry: repeat-minable via real taps — it must NOT go silent/unavailable after
    //  one tap the way every other node kind does. Several real taps in a row, each one
    //  landing and growing the stone count, is the regression that actually matters here
    //  (a single successful tap wouldn't catch a "goes unavailable after the first hit").
    await editSave('state.tools.axe = false; state.inventory.stone = 0;');
    const quarry = (await live()).nodes.find((n) => n.kind === 'quarry');
    check('setup — the quarry exists, one large outcrop', !!quarry, quarry ? `${quarry.id} at ${quarry.x},${quarry.y}, pool ${quarry.pool}` : 'missing');
    await approach(quarry.x, quarry.y, 20);
    await faceNode(quarry.x, quarry.y);
    let quarryOk = true, quarryStillAvailable = true;
    for (let i = 0; i < 3; i++) {
        const before = await live();
        await tapWorld(quarry.x, quarry.y, 55);
        //  The quarry is a HOLD interaction (same swing-and-wait feel as a rock outcrop) —
        //  give the hold (TUNE.deadfallHoldSeconds worth of real time) a chance to complete
        //  before reading the result, the same poll pattern harvest() already uses.
        let landed = false;
        for (let poll = 0; poll < 8; poll++) {
            await sleep(400);
            const cur = await live();
            if (cur.inventory.stone > before.inventory.stone) { landed = true; break; }
        }
        if (!landed) quarryOk = false;
        const after = await live();
        if (!after.nodes.find((n) => n.id === quarry.id)?.available) quarryStillAvailable = false;
    }
    check('REGRESSION — the quarry is repeat-minable: three real taps in a row all land, none of them silent', quarryOk, `stone now ${(await live()).inventory.stone}`);
    check('REGRESSION — the quarry stays available across multiple taps (does not single-shot deplete like other nodes)', quarryStillAvailable);

    //  Depletes as a whole once its pool is spent, and — the renewability law's actual
    //  point — comes back once enough time has passed, checked by tapping it for real.
    await editSave(`
        const q = state.nodes.find((n) => n.kind === 'quarry');
        q.pool = ${TUNE.quarryYieldPerTap};
    `);
    await tapWorld(quarry.x, quarry.y, 55);
    for (let poll = 0; poll < 8; poll++) {
        await sleep(400);
        const cur = await live();
        if (!cur.nodes.find((n) => n.id === quarry.id)?.available) break;
    }
    const quarryEmptied = await live();
    check('REGRESSION — the quarry depletes once its pool is fully spent', quarryEmptied.nodes.find((n) => n.id === quarry.id)?.available === false);
    await editSave(`
        const q = state.nodes.find((n) => n.kind === 'quarry');
        q.depletedAtGameHours = state.gameHoursElapsed - 999999; // long enough ago to have regrown
    `);
    await sleep(500); // the live frame loop ticks reconcile every frame; give it a beat
    const quarryRegrown = await live();
    check('REGRESSION — the quarry regrows to full capacity, not partially (D-051)', quarryRegrown.nodes.find((n) => n.id === quarry.id)?.available === true && quarryRegrown.nodes.find((n) => n.id === quarry.id)?.pool === TUNE.quarryStoneCapacity);

    //  A felled tree, given enough elapsed time, regrows and is fellable again by a real
    //  tap — not just "the brain says available", the actual body picking/highlight path.
    //  The D-050 section above deliberately exhausts all 5 real trees (and none of them
    //  are due to regrow yet at this point in a short harness run) — revive one directly
    //  so this check's setup is deterministic regardless of what earlier sections left.
    await editSave(`
        const t = state.nodes.find((n) => n.kind === 'tree');
        t.available = true;
        t.depletedAtGameHours = null;
    `);
    const treeNode = await nodeOf('tree');
    check('setup — a standing tree remains for the regrowth check', !!treeNode, treeNode ? treeNode.id : 'none left');
    await editSave(`state.tools.axe = true; state.player = { x: ${treeNode.x - 1.5}, y: ${treeNode.y} };`);
    const felledOnce = await harvest('tree', 34);
    check('setup — the tree fells once, to test its regrowth', felledOnce.ok, felledOnce.reason ?? '');
    await editSave(`
        const t = state.nodes.find((n) => n.id === '${treeNode.id}');
        t.depletedAtGameHours = state.gameHoursElapsed - 999999;
        state.player = { x: ${treeNode.x - 1.5}, y: ${treeNode.y} };
    `);
    await sleep(500);
    const regrownTree = await harvest('tree', 34);
    check('REGRESSION — a regrown tree is fellable again by a real tap (the renewability law end to end)', regrownTree.ok, regrownTree.reason ?? '');

    //  Beach salvage: force one to exist (real spawn timing is minutes, too slow for a
    //  harness run), then a real tap grants whatever it rolled and it never comes back.
    //  Clear any already-spawned real salvage nodes first — nodeOf('salvage') picks the
    //  NEAREST available one of its kind, and this run's online spawn schedule may well have
    //  put a real one down somewhere closer to the test spot than sv_smoke by now.
    await editSave(`
        state.nodes = state.nodes.filter((n) => n.kind !== 'salvage');
        state.nodes.push({ id: 'sv_smoke', kind: 'salvage', x: 40, y: 100, available: true, depletedAtGameHours: null, salvageLoot: 'stone' });
        state.player = { x: 34, y: 100 };
        state.inventory.stone = 0;
    `);
    const salvageResult = await harvest('salvage', 20);
    check('REGRESSION — a real tap on a beach salvage find grants its rolled loot', salvageResult.ok, salvageResult.reason ?? '');
    const afterSalvage = await live();
    check('the salvage find granted stone as rolled', afterSalvage.inventory.stone === TUNE.salvageStoneAmount, `stone ${afterSalvage.inventory.stone}`);
    check('a claimed salvage find never comes back (exempt from regrowth)', afterSalvage.nodes.find((n) => n.id === 'sv_smoke')?.available === false);

    //  "Fast movement (testing)": a real Settings toggle that measurably speeds up walking.
    await editSave('state.player = { x: 0, y: 104 };');
    const beforeToggle = await live();
    await walkToward(beforeToggle.player.x, beforeToggle.player.y - 40, 2.5);
    const normalDistance = Math.hypot((await live()).player.x - beforeToggle.player.x, (await live()).player.y - beforeToggle.player.y);

    await editSave('state.player = { x: 0, y: 104 };');
    await clickDom('.settings-button');
    await sleep(400);
    const toggleTap = await realTapDom('.test-speed');
    check('the "Fast movement (testing)" toggle is a real, reachable control', toggleTap.ok, toggleTap.reason ?? '');
    await clickDom('.panel .done');
    await sleep(300);
    const beforeFast = await live();
    await walkToward(beforeFast.player.x, beforeFast.player.y - 40, 2.5);
    const fastDistance = Math.hypot((await live()).player.x - beforeFast.player.x, (await live()).player.y - beforeFast.player.y);
    check('REGRESSION — "Fast movement (testing)" measurably speeds up walking, base walkSpeedMps untouched', fastDistance > normalDistance * 1.5, `normal ${normalDistance.toFixed(1)}m, fast ${fastDistance.toFixed(1)}m`);
    //  Leave it off for every check that follows — a test aid should not silently outlive
    //  the test that turned it on.
    await clickDom('.settings-button');
    await sleep(400);
    await realTapDom('.test-speed');
    await clickDom('.panel .done');
    await sleep(300);

    // ---- A4: death and respawn ----
    console.log('\nA4 — death and respawn (active play can kill)');
    await editSave('state.thirst = 0; state.hunger = 0; state.warmth = 0; state.health = 0.5; state.player = { x: 20, y: -20 }; state.inventory.wood = 4;');
    await sleep(3200); // the render loop ticks health from a sliver to zero — give it room
    const deathShowing = await panelOpen();
    await shot('c04-08-death');
    check('a death overlay appears when health runs out in play', deathShowing);
    const dying = await live();
    check('the death was counted and a cause recorded', dying.trace.deaths >= 1 && dying.lastDeathCause !== null, `cause: ${dying.lastDeathCause}`);
    if (deathShowing) await realTapDom('.death button');
    await sleep(500);
    const revived = await live();
    check('REGRESSION — once a shelter is built, respawn wakes you there, not the beach', Math.abs(revived.player.x - afterShelter.shelter.x) < 0.5 && Math.abs(revived.player.y - afterShelter.shelter.y) < 0.5 && revived.health === 100 && revived.inventory.wood === 4, `player ${revived.player.x.toFixed(1)},${revived.player.y.toFixed(1)} vs shelter ${afterShelter.shelter.x.toFixed(1)},${afterShelter.shelter.y.toFixed(1)}`);

    // ---- A4: absence and the morning report ----
    console.log('\nA4 — absence and the vitals report');
    await editSave('state.thirst = 60; state.hunger = 55;');
    const beforeAway = await goAway(4);
    await shot('c04-09-report');
    check('the morning report is on screen', await panelOpen());
    const reopened = await live();
    const gh = reopened.gameHoursElapsed - beforeAway.gameHoursElapsed;
    check('the absence advanced the clock at the tuned rate', Math.abs(gh - (4 * 60) / TUNE.realSecondsPerGameHour) < 0.2, `${gh.toFixed(2)} game hours`);
    check('vitals drifted during the absence but nobody died', reopened.thirst < 60 && reopened.health > 0 && reopened.trace.deaths === revived.trace.deaths, `thirst ${reopened.thirst.toFixed(1)}, health ${reopened.health}`);
    const shortReportTap = await realTapDom('.report button');
    check('the short report\'s dismiss button is reachable by a real tap', shortReportTap.ok, shortReportTap.reason ?? '');
    await sleep(200);

    //  FIX 1 (2026-07-23 PERFECT pass): a LONGER, entirely realistic absence (hours, not
    //  minutes — a player who genuinely put the phone down for a while) produces a longer
    //  report (fire status + both vitals having moved + the day/night line), which is what
    //  actually overflowed a short landscape viewport (~412px tall) with no scroll
    //  affordance and no way to reach "Back to the island" (the director's report). The
    //  short 4-minute absence above is too brief to reliably reproduce it — this is a
    //  dedicated, deterministic worst-case: fire pinned lit, both vitals pinned to move,
    //  the clock pinned so the day/night line fires too, guaranteeing every optional line.
    await editSave('state.gameHoursElapsed = 0; state.fire = { built: true, fuel: 5, x: state.player.x, y: state.player.y }; state.thirst = 70; state.hunger = 65;');
    await goAway(240); // 4 real HOURS
    await shot('c04-10-longreport');
    check('a long, realistic absence produces a report at all', await panelOpen());
    const scrollState = await page.evaluate(() => { const el = document.querySelector('.panel.report'); return el ? { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, lines: el.querySelectorAll('.lines p').length } : null; });
    check('REGRESSION FIX 1 setup — the long report genuinely overflows a short landscape viewport', scrollState && scrollState.scrollHeight > scrollState.clientHeight, JSON.stringify(scrollState));
    const dismissTap = await realTapDom('.report button');
    await sleep(200); // past the panel's 320ms fade-out before reading panelOpen
    check('REGRESSION FIX 1 — the overflowing report\'s dismiss button is reachable by a real tap (not off-screen or occluded)', dismissTap.ok, dismissTap.reason ?? '');
    check('REGRESSION FIX 1 — the real tap actually dismisses the report', !(await panelOpen()));

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
        check(`median frame rate ≥ floor (${TUNE.fpsFloorMedian})`, frame.median >= TUNE.fpsFloorMedian, `median ${frame.median} fps, 1% low ${frame.onePercentLow} fps, p95 ${frame.p95FrameMs} ms`);
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
    await cold.setViewport({ width: 915, height: 412, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const cdp = await cold.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (1 * 1024 * 1024) / 8 });
    const t0 = Date.now();
    await cold.goto(URL_UNDER_TEST, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await cold.waitForFunction(() => window.__drift?.sceneReady?.() === true, { timeout: 90_000 });
    const coldMs = Date.now() - t0;
    await cold.close();
    check(`cold 4G load within ${TUNE.coldLoadBudgetSeconds} s`, coldMs <= TUNE.coldLoadBudgetSeconds * 1000, `${coldMs} ms`);

    // ---- Hygiene ----
    console.log('\nHygiene');
    check('every requested asset was found', missing.length === 0, missing.slice(0, 4).join(' | '));
    check('no console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

    await browser.close();
    console.log(`\n${results.length - failures}/${results.length} checks passed. Screenshots in .smoke/\n`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nSMOKE TEST CRASHED\n', e); process.exit(1); });
