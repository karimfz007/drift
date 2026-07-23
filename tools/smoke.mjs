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
    frameTimeP95BudgetMs: 33
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
            let node = el.parentElement;
            while (node && node !== document.body) {
                if (getComputedStyle(node).overflowY === 'auto' || getComputedStyle(node).overflowY === 'scroll') { node.scrollTop = node.scrollHeight; break; }
                node = node.parentElement;
            }
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

    //  Craft the axe through the card, now reached by its own secondary button.
    await editSave('state.inventory.wood = 3; state.inventory.stone = 2; state.inventory.fiber = 2;');
    check('the Craft button opens the card', await clickDom('.secondary-action'));
    await sleep(400);
    await shot('c04-05-craftcard');
    check('the craft card shows the gates with source hints', await page.$('.craft .gates') !== null);
    const craftTap = await realTapDom('.craft .craft-btn');
    check('the axe can be made via a real, reachable tap (craft card does not overflow the viewport)', craftTap.ok, craftTap.reason ?? '');
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
    check('waking ashore restores you at spawn with your kit', revived.player.x === 0 && revived.health === 100 && revived.inventory.wood === 4);

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
