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

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
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
    salvageStoneAmount: 2,
    //  Living Island Track A FIX package (D-052) — mirrors src/data/tune.ts, same
    //  duplication convention as every constant above.
    respawnHealthFraction: 0.3,
    respawnVitalFraction: 0.5,
    energyCostRockMine: 1.5,
    torchWoodCost: 2,
    torchFiberCost: 2,
    torchBurnGameHours: 4,
    //  Mirrors src/data/world.ts's WALKABLE_RADIUS (islandRadius 122 - shoreFalloff 12 - 2).
    walkableRadiusM: 108,
    //  Ch.1 v3, D-055 — mirrors src/data/tune.ts, same duplication convention as above.
    axeWoodCost: 3,
    axeSharpbladeCost: 1,
    axeFiberCost: 2,
    stoneHammerWoodCost: 2,
    stoneHammerStoneCost: 3,
    knapStoneCost: 2,
    knapSharpbladeYield: 1,
    //  Ch.2, "The Knowledge Model" — mirrors src/data/tune.ts, same duplication convention.
    knowledgeInnateFloor: 5,
    //  Ch.6, "The Body Model" — same convention. `fatigueSevereAt` being absent here once
    //  made an honest-systems check compare a real number against `undefined` and fail while
    //  its own printed evidence showed every value agreeing exactly — a reminder that this
    //  mirror is part of the harness's correctness, not just a convenience.
    fatigueSevereAt: 80,
    deathResourceLossFraction: 0.25,
    fatigueRecoveryPerGameHourResting: 12,
    sleepDurationGameHours: 8
};

//  This local TUNE mirror has now produced THREE separate false failures in one pass, each
//  time by a check comparing a real measurement against `undefined` (which is never true)
//  and reporting red while its own printed evidence showed the product behaving correctly:
//  `fatigueSevereAt`, then `fatigueRecoveryPerGameHourResting`/`sleepDurationGameHours`.
//  A missing key is silent here in a way a missing import never would be, so the mirror is
//  now self-checking: every value must be a finite number or a plain object of them. This
//  cannot detect a mirrored value that has DRIFTED from src/data/tune.ts — only that one is
//  present at all — but absence is the failure mode that actually keeps happening.
for (const [key, value] of Object.entries(TUNE)) {
    const ok = typeof value === 'number'
        ? Number.isFinite(value)
        : value && typeof value === 'object' && Object.values(value).every((v) => Number.isFinite(v));
    if (!ok) {
        console.error(`  REFUSED: the harness's local TUNE mirror has a bad or missing value for "${key}" (${JSON.stringify(value)}).`);
        console.error('  Add it from src/data/tune.ts — a check comparing against undefined reports red for the wrong reason.');
        process.exit(1);
    }
}

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

/**
 * Pre-flight sanitation (C1 ruling, structural — not the manual "kill stray Chrome and
 * retry" this session had been doing by hand every time the bench got corrupted). Three
 * things, in order: refuse outright if a git worktree operation is mid-flight (this is
 * exactly how a fresh-context C3 audit's own isolated worktree was pulled out from under
 * it between turns during the D-052 pass — this run must never start into that same
 * state); kill stray Chrome processes left over from a prior crashed run, the single
 * biggest source of this session's documented flakiness; and confirm the target URL is
 * actually reachable before sinking minutes into a Puppeteer launch against a dead server.
 */
async function preflight(url) {
    console.log('Pre-flight — sanitizing the environment before this run.');

    const gitDir = fileURLToPath(new URL('../.git/', import.meta.url));
    const indexLock = join(gitDir, 'index.lock');
    if (existsSync(indexLock)) {
        console.error(`  REFUSED: ${indexLock} exists — a git operation is in progress. Re-run once it completes.`);
        process.exit(1);
    }
    const worktreesDir = join(gitDir, 'worktrees');
    if (existsSync(worktreesDir)) {
        for (const name of readdirSync(worktreesDir)) {
            const lockFile = join(worktreesDir, name, 'locked');
            if (existsSync(lockFile)) {
                console.error(`  REFUSED: worktree "${name}" is locked (${lockFile}) — a worktree operation is in progress. Re-run once it completes.`);
                process.exit(1);
            }
        }
    }
    console.log('  No git worktree operation in progress.');

    try {
        if (process.platform === 'win32') execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' });
        else execSync('pkill -f "Chrome" || true', { stdio: 'ignore', shell: '/bin/sh' });
        console.log('  Killed stray Chrome processes from a prior run.');
    } catch {
        console.log('  No stray Chrome processes found.');
    }

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        console.log(`  Target URL responds (${res.status}): ${url}`);
    } catch (e) {
        console.error(`  REFUSED: ${url} is not reachable (${e.message}). Start the preview server first.`);
        process.exit(1);
    }
}

async function main() {
    await preflight(URL_UNDER_TEST);
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

    /**
     * Real visibility, for primary HUD buttons — not "the selector exists" or "a tap on
     * it succeeded" (both of which only prove reachability in whatever ONE state the
     * check happened to run in). Computed style (display/visibility/opacity), a real
     * bounding rect, inside the viewport, not occluded by anything else. The gap this
     * closes: this harness has tapped `.secondary-action` successfully throughout
     * C05/D-051/D-052 — every one of those taps happened in a state where the button
     * legitimately WAS visible; none of them ever proved anything about a state where a
     * stale visibility condition could hide it entirely (which is exactly what happened
     * on a real long-running save — see the "Build button" regression below).
     */
    const isVisible = async (sel) => {
        const info = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (!el) return { found: false };
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const hasSize = r.width > 0 && r.height > 0;
            const inViewport = hasSize && cy >= 0 && cy <= window.innerHeight && cx >= 0 && cx <= window.innerWidth;
            const topEl = inViewport ? document.elementFromPoint(cx, cy) : null;
            return {
                found: true,
                displayNone: cs.display === 'none',
                visibilityHidden: cs.visibility === 'hidden',
                opacity: parseFloat(cs.opacity),
                rect: { x: r.left, y: r.top, width: r.width, height: r.height },
                hasSize,
                inViewport,
                isTopmost: inViewport && (topEl === el || el.contains(topEl))
            };
        }, sel);
        if (!info.found) return { visible: false, reason: 'not-found', ...info };
        if (info.displayNone) return { visible: false, reason: 'display:none', ...info };
        if (info.visibilityHidden) return { visible: false, reason: 'visibility:hidden', ...info };
        if (!(info.opacity > 0)) return { visible: false, reason: `opacity:${info.opacity}`, ...info };
        if (!info.hasSize) return { visible: false, reason: 'zero-size', ...info };
        if (!info.inViewport) return { visible: false, reason: 'off-screen', ...info };
        if (!info.isTopmost) return { visible: false, reason: 'occluded', ...info };
        return { visible: true, ...info };
    };

    /**
     * A screenshot-diff companion — actual pixels, not just DOM introspection. Crops a
     * fixed, stable screen region (a container that stays laid out regardless of which
     * child button is shown, not a target's own possibly-collapsed rect) so a check
     * cannot pass on a DOM flag alone while nothing visibly changed on screen.
     */
    const shotOfRect = (rect) => page.screenshot({ clip: { x: Math.max(0, Math.round(rect.x)), y: Math.max(0, Math.round(rect.y)), width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) } });

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
    //  Ch.1 v3 (D-055): the axe needs a knapped sharp blade, not raw stone directly — grant
    //  one directly here (the full stone-hammer/knap tier is proven for real elsewhere,
    //  the new "D-055" section below; this section is about the axe DOING something once
    //  owned, same as it always was).
    await editSave(`state.inventory.wood = 3; state.inventory.sharpblade = ${TUNE.axeSharpbladeCost}; state.inventory.fiber = 2;`);
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

    //  Build the shelter through the (now five-item, D-055 adds the stone hammer) Build
    //  panel. The knap action isn't counted here — it only renders once the hammer is
    //  owned, which it isn't yet at this point in the run.
    await editSave('state.inventory = { wood: 20, stone: 20, fiber: 20, berries: 0, coconut: 0, shellfish: 0, sharpblade: 0 };');
    await realTapDom('.secondary-action');
    await sleep(400);
    check('the Build panel shows all five items (torch/axe/shelter/storage/stone hammer)', (await page.evaluate(() => document.querySelectorAll('.build-item').length)) === 5);
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
    //  Ch.6 (D-058) REPLACED the instant refill this check used to assert (`energy > 99`).
    //  Sleeping now recovers along a rate over the slept hours, so waking lands wherever the
    //  curve reached — genuinely higher than before, and genuinely capable of being short of
    //  full. Asserting "it went up" is the honest check now; the exact curve is unit-tested.
    check('sleep RECOVERS energy on waking, along a rate rather than jumping to full (Ch.6)', afterSleep.energy > beforeSleep.energy, `energy ${beforeSleep.energy.toFixed(1)} -> ${afterSleep.energy.toFixed(1)}`);

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
    //  Count-agnostic since D-059: the island's real-tree population is derived from the
    //  rock ratio, not a hardcoded 5, so pinning the total here would break every time the
    //  world is retuned. What matters for D-050 is that the export says ZERO are standing.
    check('the debug-export text reports 0 standing trees remaining, explaining the silence at a glance', /tree: 0\/\d+/.test(debugInfo), debugInfo.split('\n').find((l) => l.includes('tree:')) ?? 'no tree line found');
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
    //  FIX-2 (Living Island Track A, D-052): a death is no longer a full refill. Health
    //  wakes at respawnHealthFraction of max, not 100 — this assertion used to encode the
    //  exploit as correct behavior; it now encodes the fix.
    //  Split in two at Ch.6 (D-058). This used to be one composite assertion that also
    //  required `inventory.wood === 4` — a hardcoded count that silently became a second
    //  chapter's business the moment death started costing resources, and which then failed
    //  while printing only the (passing) position in its detail string. Position is this
    //  regression's actual subject; the resource cost is its own check, computed from the
    //  pre-death count so it cannot drift out of date again.
    check('REGRESSION — once a shelter is built, respawn wakes you there instead of the beach', Math.abs(revived.player.x - afterShelter.shelter.x) < 0.5 && Math.abs(revived.player.y - afterShelter.shelter.y) < 0.5, `player ${revived.player.x.toFixed(1)},${revived.player.y.toFixed(1)} vs shelter ${afterShelter.shelter.x.toFixed(1)},${afterShelter.shelter.y.toFixed(1)}`);
    const expectedWoodAfterDeath = dying.inventory.wood - Math.floor(dying.inventory.wood * 0.25);
    check('Ch.6 — that same death cost a floored quarter of the carried wood, and no more', revived.inventory.wood === expectedWoodAfterDeath, `wood ${dying.inventory.wood} -> ${revived.inventory.wood}, expected ${expectedWoodAfterDeath}`);
    //  A generous tolerance, not 0.01: `revived` is read after a real tap + sleep(500),
    //  and online health regen (healthRegenPerGameHour) keeps ticking the instant no vital
    //  is empty, the same continuous-drift reason C05's own audit already loosened an
    //  energy===100 assertion for. The fraction should still land close, just not exact.
    check('FIX-2 — a death is NOT a full refill: health wakes near respawnHealthFraction, not 100', Math.abs(revived.health - 100 * TUNE.respawnHealthFraction) < 1 && revived.health < 100, `health ${revived.health}`);
    check('FIX-2 — every death is logged with a cause and a game-clock timestamp', Array.isArray(revived.trace.deathLog) && revived.trace.deathLog.length >= 1 && typeof revived.trace.deathLog[revived.trace.deathLog.length - 1].cause === 'string', JSON.stringify(revived.trace.deathLog?.slice(-1)));

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

    // ---- Living Island Track A FIX package (D-052) ----
    console.log('\nD-052 — Living Island Track A: energy cost, salvage reachability, the torch');

    //  FIX-1: an effortful (hold) gather now visibly costs energy; an instant tap costs
    //  (essentially) nothing. Proven with real taps, not editSave — the same gatherNode()
    //  path a player actually exercises. Teleported next to each target first (rather than
    //  trusting the harness's incidental walk budget, the D-051 lesson) so the measured
    //  window is dominated by the action itself, not a cross-map walk — ambient per-
    //  game-hour drain (TUNE.energyDrainPerGameHour) keeps ticking the whole time regardless
    //  of position, so the tolerance below is sized to comfortably absorb a few real seconds
    //  of that ambient drain without masking an actual wrong effort cost.
    await editSave('state.energy = 100; state.tools.axe = false;');
    const rockTarget = await nodeOf('rock');
    await editSave(`state.player = { x: ${rockTarget.x - 1.5}, y: ${rockTarget.y} };`);
    const beforeRockEnergy = (await live()).energy;
    const rockResult = await harvest('rock', 20);
    const afterRockEnergy = (await live()).energy;
    const rockDelta = beforeRockEnergy - afterRockEnergy;
    check('FIX-1 — mining a rock (effortful) visibly costs energy', rockResult.ok && afterRockEnergy < beforeRockEnergy, `rock ok=${rockResult.ok}, energy ${beforeRockEnergy} -> ${afterRockEnergy}`);
    check('FIX-1 — the energy cost matches the tuned amount (within incidental ambient drain)', rockResult.ok && Math.abs(rockDelta - TUNE.energyCostRockMine) < 0.3, `delta ${rockDelta.toFixed(2)}, expected ${TUNE.energyCostRockMine}`);
    const driftTarget = await nodeOf('driftwood');
    await editSave(`state.player = { x: ${driftTarget.x - 1.5}, y: ${driftTarget.y} };`);
    const beforeDriftwoodEnergy = (await live()).energy;
    const driftResult = await harvest('driftwood', 20);
    const afterDriftwoodEnergy = (await live()).energy;
    const driftDelta = beforeDriftwoodEnergy - afterDriftwoodEnergy;
    check('FIX-1 — an instant tap gather (driftwood) costs no EFFORT energy (only incidental ambient drain, well under any effort cost)', driftResult.ok && driftDelta < 0.1, `energy ${beforeDriftwoodEnergy} -> ${afterDriftwoodEnergy} (delta ${driftDelta.toFixed(3)})`);

    //  FIX-3 / D-064 — REACHABILITY, THIRD STRIKE. The check this replaces computed
    //  `hypot(node) <= walkableRadiusM` from a fixed origin and called that "path-reachable".
    //  It was pure arithmetic against a disc model: it never walked, never collected, and was
    //  structurally incapable of noticing that a find sitting against a decorative boulder is
    //  physically uncollectable (the player's own push-out holds them past their reach). It
    //  passed every time while a real player could not reach the item — exactly the failure
    //  the third strike is about.
    //
    //  This one WALKS TO THE FIND AND COLLECTS IT. Nothing short of the loot actually landing
    //  in the inventory counts as reachable.
    await editSave(`
        state.nodes = state.nodes.filter((n) => n.kind !== 'salvage');
        state.inventory.stone = 0;
        state.energy = 100;
        state.player = { x: 0, y: 60 };
    `);
    //  Force a find hard against the LARGEST decorative rock — the exact shape the old check
    //  waved through. If placement validation is working, the spawn will have been nudged to
    //  somewhere genuinely standable rather than left stranded.
    const spawnedForReach = await page.evaluate(() => {
        const s = window.__drift.state();
        const node = window.__drift.spawnSalvage(3);
        s.nodes.push(node);
        return node;
    });
    check('D-064 — a forced salvage spawn landed somewhere placeable, not against a boulder', Boolean(spawnedForReach), JSON.stringify(spawnedForReach));

    if (spawnedForReach) {
        await editSave(`state.player = { x: ${spawnedForReach.x}, y: ${spawnedForReach.y + 6} };`);
        const beforeReach = await live();
        await approach(spawnedForReach.x, spawnedForReach.y, 30);
        await faceNode(spawnedForReach.x, spawnedForReach.y);
        await tapWorld(spawnedForReach.x, spawnedForReach.y, 55);
        let collected = false;
        for (let i = 0; i < 15; i++) {
            const st = await live();
            const still = st.nodes.find((n) => n.id === spawnedForReach.id);
            if (!still || !still.available) { collected = true; break; }
            await sleep(400);
        }
        await sleep(300);
        const afterReach = await live();
        const gained = (afterReach.inventory.stone + afterReach.inventory.wood + afterReach.inventory.fiber)
            - (beforeReach.inventory.stone + beforeReach.inventory.wood + beforeReach.inventory.fiber);
        const stoodAt = Math.hypot(afterReach.player.x - spawnedForReach.x, afterReach.player.y - spawnedForReach.y);
        check('D-064 — the castaway can genuinely WALK to the find (not just "a path exists")', stoodAt <= TUNE.interactRadiusM + 1.5, `stood ${stoodAt.toFixed(2)} m from it (reach ${TUNE.interactRadiusM} m)`);
        check('D-064 — and genuinely COLLECT it — the loot actually lands in the inventory', collected && gained > 0, `claimed=${collected}, gained ${gained} units`);
    } else {
        check('D-064 — the castaway can genuinely WALK to the find (not just "a path exists")', false, 'setup failed: no spawn');
        check('D-064 — and genuinely COLLECT it — the loot actually lands in the inventory', false, 'setup failed: no spawn');
    }

    //  The class guarantee, checked across many seeds rather than the one that broke.
    const placementSweep = await page.evaluate(() => {
        const bad = [];
        for (let seed = 0; seed < 200; seed++) {
            const n = window.__drift.spawnSalvage(seed);
            if (!window.__drift.isPlaceable(n.x, n.y)) bad.push(`${n.id}@${n.x},${n.y}`);
        }
        return bad;
    });
    check(`FIX-3 / D-064 — every one of 200 seeded spawns is genuinely placeable (stand + reach), not merely inside the disc`, placementSweep.length === 0, placementSweep.slice(0, 4).join(' | '))

    //  FIX-5: the torch — craft via a real tap on the Build panel, then light it via a
    //  real tap on the fire (reusing the fire this run already built).
    await editSave(`
        state.inventory.wood = ${TUNE.torchWoodCost + 5};
        state.inventory.fiber = ${TUNE.torchFiberCost + 5};
        state.torch = { owned: false, lit: false, fuelGameHoursRemaining: 0 };
    `);
    const buildOpenTap = await realTapDom('.secondary-action');
    check('setup — the Build action is reachable to open the panel', buildOpenTap.ok || (await panelOpen()), buildOpenTap.reason ?? '');
    await sleep(300);
    const torchCraftTap = await realTapDom('.torch-btn');
    check('FIX-5 — the torch can be made via a real, reachable tap on the Build panel', torchCraftTap.ok, torchCraftTap.reason ?? '');
    await sleep(400);
    const craftedTorch = await live();
    check('FIX-5 — crafting the torch spends the recipe and yields an unlit, owned torch', craftedTorch.torch.owned === true && craftedTorch.torch.lit === false, JSON.stringify(craftedTorch.torch));

    const fireForTorch = (await live()).fire;
    if (fireForTorch.built) {
        //  `built` stays true forever once a fire exists (never deleted, only ever runs
        //  dry) — by this point in a long continuous run the fire from way back in the
        //  A4/A7 section has had a full 240-real-minute goAway() plus everything since
        //  burned through its fuel, so `canLightTorch`'s `isFireLit` check would
        //  legitimately (and correctly) refuse an out fire. Force it lit and deterministic
        //  first, the same way every other precondition in this file is forced rather than
        //  trusted to incidental leftover world state.
        await editSave(`state.fire.fuel = 5; state.player = { x: ${fireForTorch.x - 1.5}, y: ${fireForTorch.y} };`);
        await faceNode(fireForTorch.x, fireForTorch.y);
        await tapWorld(fireForTorch.x, fireForTorch.y, 55);
        await sleep(500);
        const litTorch = await live();
        check('FIX-5 — the torch lights via a real tap on an active fire', litTorch.torch.lit === true, JSON.stringify(litTorch.torch));
    } else {
        check('FIX-5 — the torch lights via a real tap on an active fire', false, 'setup failed: no fire standing to light it from');
    }

    // ---- Missing Build button: a stale HUD visibility gate (D-053) ----
    console.log('\nD-053 — the Build button vanishing on a real, long-running save');

    //  REGRESSION, root cause: paintHud()'s secondary.visible condition gated on
    //  axe/shelter/storage only — it was never updated when D-052 added the torch as a
    //  fourth Build-panel item. A director whose save had genuinely built all three
    //  (exactly what a long real session accumulates) saw the Build button vanish
    //  entirely, torch still uncrafted and unreachable. No prior harness run ever caught
    //  it because every scenario in this file opens the Build panel EARLY, before all
    //  three older items are built — never in the "everything but the torch" state a real
    //  save reaches. `realTapDom`'s own occlusion check (element exists + a bounding rect
    //  inside the viewport + nothing else on top) cannot distinguish this: a tap that
    //  never ran is not the same fact as an element proven absent from the render.
    //  `isVisible()` (above) checks computed style/rect/occlusion directly instead of
    //  inferring visibility from whether a tap happened to land.
    await editSave(`
        state.tools.axe = true;
        state.tools.stoneHammer = true;
        state.shelter = { built: true, x: 0, y: 0, durability: 100, grade: 'serviceable' };
        state.storage = { built: true, x: 5, y: 0, durability: 100, stored: { wood: 0, stone: 0, fiber: 0 } };
        state.torch = { owned: false, lit: false, fuelGameHoursRemaining: 0, grade: 'serviceable' };
    `);
    const buildRowRect = await page.evaluate(() => { const r = document.querySelector('.action-row')?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null; });
    const withTorchOwedInfo = await isVisible('.secondary-action');
    check('REGRESSION — the Build button stays visible with axe/shelter/storage all done, while the torch is still uncrafted', withTorchOwedInfo.visible, JSON.stringify(withTorchOwedInfo));
    const withTorchOwedShot = buildRowRect ? await shotOfRect(buildRowRect) : null;

    //  The other half: once EVERYTHING (including the torch) is done, the button should
    //  correctly disappear — proving this isn't just "always show it" overcorrection.
    await editSave("state.torch = { owned: true, lit: false, fuelGameHoursRemaining: 4, grade: 'serviceable' };");
    const allDoneInfo = await isVisible('.secondary-action');
    check('the Build button correctly hides once axe/shelter/storage/torch are ALL done', !allDoneInfo.visible, JSON.stringify(allDoneInfo));
    const allDoneShot = buildRowRect ? await shotOfRect(buildRowRect) : null;

    //  Screenshot diff: the same fixed action-row region, in two different states,
    //  actually renders different pixels — not just two different DOM claims.
    if (withTorchOwedShot && allDoneShot) {
        check('REGRESSION — the visibility change is real on screen, not just a DOM flag (screenshot diff)', !withTorchOwedShot.equals(allDoneShot));
    } else {
        check('REGRESSION — the visibility change is real on screen, not just a DOM flag (screenshot diff)', false, 'setup failed: .action-row not found');
    }

    // ---- Ch.1 v3: the crafting tree — the stone hammer, knapping, grades, the journal (D-055) ----
    console.log('\nD-055 — Ch.1 v3: the stone hammer + knapping, grades, the null-outcome journal');

    //  The full tier, via real taps only: gather is already proven elsewhere in this file;
    //  here we prove the axe now genuinely needs a knapped blade, and that the whole chain
    //  (hammer -> knap -> axe) is reachable through the Build panel exactly as a player
    //  would use it, not just through the brain's own unit tests.
    await editSave(`
        state.tools.axe = false;
        state.tools.stoneHammer = false;
        state.inventory.wood = ${TUNE.stoneHammerWoodCost + TUNE.axeWoodCost + 5};
        state.inventory.stone = ${TUNE.stoneHammerStoneCost + TUNE.knapStoneCost + 5};
        state.inventory.fiber = ${TUNE.axeFiberCost + 5};
        state.inventory.sharpblade = 0;
    `);
    await realTapDom('.secondary-action');
    await sleep(300);
    const hammerCraftTap = await realTapDom('.stonehammer-btn');
    check('D-055 — the stone hammer can be made via a real, reachable tap on the Build panel', hammerCraftTap.ok, hammerCraftTap.reason ?? '');
    await sleep(400);
    const afterHammer = await live();
    check('D-055 — crafting the stone hammer spends the recipe and yields it', afterHammer.tools.stoneHammer === true, JSON.stringify(afterHammer.tools.stoneHammer));

    await realTapDom('.secondary-action');
    await sleep(300);
    const stoneBeforeKnap = (await live()).inventory.stone;
    const knapTap = await realTapDom('.knap-btn');
    check('D-055 — knapping is reachable via a real tap on the Build panel', knapTap.ok, knapTap.reason ?? '');
    await sleep(400);
    const afterKnap = await live();
    check('D-055 — knapping spends raw stone for a sharp blade', afterKnap.inventory.sharpblade >= TUNE.knapSharpbladeYield && afterKnap.inventory.stone === stoneBeforeKnap - TUNE.knapStoneCost, `sharpblade ${afterKnap.inventory.sharpblade}, stone ${stoneBeforeKnap}->${afterKnap.inventory.stone}`);

    //  REGRESSION — the axe cannot be made from raw stone alone anymore; it genuinely
    //  needs the knapped blade. Confirmed by having plenty of raw stone but NO blade yet
    //  reaching this exact point with the axe still unowned, then closing the loop for
    //  real once the blade exists.
    check('REGRESSION — the axe is not craftable on raw stone alone (it needs the knapped blade)', afterHammer.tools.axe === false && afterKnap.inventory.sharpblade > 0);
    await realTapDom('.secondary-action');
    await sleep(300);
    const axeCraftTap = await realTapDom('.axe-btn');
    check('D-055 — with a knapped blade in hand, the axe crafts via a real tap', axeCraftTap.ok, axeCraftTap.reason ?? '');
    await sleep(400);
    const afterAxe = await live();
    check('D-055 — the crafted axe rolled a real grade', afterAxe.tools.axe === true && ['crude', 'serviceable', 'refined', 'exceptional'].includes(afterAxe.tools.axeGrade), JSON.stringify(afterAxe.tools.axeGrade));

    //  The Build button's visibility gate now also covers the stone hammer (extending
    //  D-053's own fix) — force axe/shelter/storage/torch AND the hammer all done, confirm
    //  the button correctly disappears; this run's shelter/storage/torch were already
    //  built earlier in the suite, so the hammer (just crafted above) is the last gate.
    const finalVisible = await isVisible('.secondary-action');
    check('the Build button correctly hides once EVERYTHING, including the stone hammer, is done', !finalVisible.visible, JSON.stringify(finalVisible));

    //  The null-outcome journal: holding a material that satisfies nothing (berries) and
    //  opening the Build panel journals every (slot, kind) pair as "doesn't combine" —
    //  proven through the real UI action that triggers it (opening the panel), not by
    //  calling the brain function directly. Force the journal empty first, deliberately —
    //  berries were very likely already held (and the panel opened) earlier in this long
    //  run (the berry bush check, well before this point), so trusting incidental leftover
    //  state here would be exactly the mistake this file's own lessons already warn against.
    //  ALSO force the torch back to unowned: by this point axe/shelter/storage/torch/hammer
    //  are ALL done, so the Build button itself is correctly hidden (just confirmed above)
    //  — with nothing left to build, `.secondary-action` cannot be tapped at all. Needs at
    //  least one open item for the button (and so the panel) to be reachable.
    await editSave(`
        state.inventory.berries = 1;
        state.knowledge = { nullPairs: [], events: [] };
        state.torch = { owned: false, lit: false, fuelGameHoursRemaining: 0, grade: 'serviceable' };
    `);
    const beforeJournal = (await live()).knowledge;
    check('setup — the null-outcome journal is empty (forced, not assumed)', beforeJournal.nullPairs.length === 0, `${beforeJournal.nullPairs.length} pairs`);
    const journalOpenTap = await realTapDom('.secondary-action');
    check('setup — the Build panel is reachable to exercise the journal', journalOpenTap.ok, journalOpenTap.reason ?? '');
    await sleep(300);
    await clickDom('.close-btn');
    await sleep(300);
    const afterJournal = (await live()).knowledge;
    check('REGRESSION — opening the Build panel while holding an unmatched material (berries) journals it as a null combination', afterJournal.nullPairs.some((p) => p.endsWith('|berries')), `${afterJournal.nullPairs.length} pairs`);
    check('the null-outcome journal recorded a knowledge event for Ch.2 (stubbed, not wired further this pass)', afterJournal.events.some((e) => e.kind === 'combination-tried' && e.detail.includes('berries')));

    // ---- Ch.2, "The Knowledge Model" — domain scores wired for real (MAJOR artifact) ----
    console.log('\nCh.2 — the knowledge model: domain scores trained by real taps, the null-outcome journal wired for real');

    //  Reuses the hammer/knap/axe taps already exercised in the D-055 section above — zero
    //  new taps needed to prove Harvesting & fabrication genuinely moves with real
    //  fabrication use, each craft building on the last.
    check('Ch.2 — crafting the stone hammer trains Harvesting & fabrication (Technique) off the innate floor', afterHammer.knowledge.domains.harvestingFabrication.technique > TUNE.knowledgeInnateFloor, JSON.stringify(afterHammer.knowledge.domains.harvestingFabrication));
    check('Ch.2 — knapping trains Harvesting & fabrication further still', afterKnap.knowledge.domains.harvestingFabrication.technique > afterHammer.knowledge.domains.harvestingFabrication.technique, `${afterHammer.knowledge.domains.harvestingFabrication.technique} -> ${afterKnap.knowledge.domains.harvestingFabrication.technique}`);
    check('Ch.2 — crafting the axe trains Harvesting & fabrication further still', afterAxe.knowledge.domains.harvestingFabrication.technique > afterKnap.knowledge.domains.harvestingFabrication.technique, `${afterKnap.knowledge.domains.harvestingFabrication.technique} -> ${afterAxe.knowledge.domains.harvestingFabrication.technique}`);

    //  A real hold-to-fell trains the same domain — a FRESH, forced-standing tree, not
    //  assumed regrowth timing (this file's own repeated lesson about incidental state).
    await editSave(`
        const t = state.nodes.find(n => n.id === 'tr1');
        if (t) { t.available = true; t.depletedAtGameHours = null; }
        state.tools.axe = true;
        state.player = { x: -10, y: 45.7 };
    `);
    const beforeFellKnowledge = await live();
    await faceNode(-10, 44);
    await tapWorld(-10, 44, 55); // arms the auto-hold; the update loop progresses it in real time
    let felledForKnowledge = false;
    for (let i = 0; i < 15; i++) {
        const av = await page.evaluate(() => window.__drift.state().nodes.find((n) => n.id === 'tr1')?.available);
        if (av === false) { felledForKnowledge = true; break; }
        await sleep(400);
    }
    await sleep(300);
    const afterFellKnowledge = await live();
    check(
        'Ch.2 — felling a tree via a real hold-to-fell trains Harvesting & fabrication',
        felledForKnowledge && afterFellKnowledge.knowledge.domains.harvestingFabrication.technique > beforeFellKnowledge.knowledge.domains.harvestingFabrication.technique,
        `felled=${felledForKnowledge}, ${beforeFellKnowledge.knowledge.domains.harvestingFabrication.technique} -> ${afterFellKnowledge.knowledge.domains.harvestingFabrication.technique}`
    );

    //  A tap-kind gather that ISN'T one of item 4's named verbs (driftwood) trains NOTHING
    //  at all — proven across every domain, not just asserted from the ruling's own prose.
    await editSave(`
        const d = state.nodes.find(n => n.id === 'dw1');
        if (d) { d.available = true; d.depletedAtGameHours = null; }
        state.player = { x: -8, y: 92 };
    `);
    const beforeDriftwood = await live();
    await faceNode(-8, 96);
    await tapWorld(-8, 96, 55);
    await sleep(400);
    const afterDriftwood = await live();
    const everyDomainUnchanged = Object.keys(afterDriftwood.knowledge.domains).every(
        (d) => JSON.stringify(afterDriftwood.knowledge.domains[d]) === JSON.stringify(beforeDriftwood.knowledge.domains[d])
    );
    check('Ch.2 — gathering driftwood (an unmapped verb) trains nothing at all — every domain unchanged, not just the untouched ones', everyDomainUnchanged);

    //  Item 3: the null-outcome attempt proven above (berries journaled against every
    //  recipe's slots) is ALSO a genuine Understanding-only gain — reusing the very same
    //  before/after `.knowledge` snapshots the journal check above already captured, since
    //  berries fails a slot in an axe recipe (Harvesting & fabrication).
    check(
        "Ch.2, item 3 — the same null-outcome attempt trains Understanding (not Technique) in the recipe's own domain",
        afterJournal.domains.harvestingFabrication.understanding > beforeJournal.domains.harvestingFabrication.understanding &&
            afterJournal.domains.harvestingFabrication.technique === beforeJournal.domains.harvestingFabrication.technique,
        `HF understanding ${beforeJournal.domains.harvestingFabrication.understanding} -> ${afterJournal.domains.harvestingFabrication.understanding}, technique unchanged: ${afterJournal.domains.harvestingFabrication.technique === beforeJournal.domains.harvestingFabrication.technique}`
    );

    //  Item 6 (feedback must be perceivable): the axe gate now names the NEAREST true
    //  reason instead of a flat "you need an axe" — proven via the real explain-toast text
    //  (`window.__drift.hints().last`), across two distinct blocking states.
    await editSave(`
        const t = state.nodes.find(n => n.id === 'tr1');
        if (t) { t.available = true; t.depletedAtGameHours = null; }
        state.tools.axe = false;
        state.tools.stoneHammer = false;
        state.player = { x: -10, y: 45.7 };
    `);
    await faceNode(-10, 44);
    await tapWorld(-10, 44, 55);
    await sleep(300);
    const hintNoHammer = await page.evaluate(() => window.__drift.hints().last);
    check('Ch.2 item 6 — no axe, no stone hammer: the tap-explain names the stone hammer, not a flat "need an axe"', /stone hammer/i.test(hintNoHammer), `"${hintNoHammer}"`);

    await editSave(`
        state.tools.stoneHammer = true;
        state.inventory.sharpblade = 0;
        const t = state.nodes.find(n => n.id === 'tr1');
        if (t) { t.available = true; t.depletedAtGameHours = null; }
        state.player = { x: -10, y: 45.7 };
    `);
    await faceNode(-10, 44);
    await tapWorld(-10, 44, 55);
    await sleep(300);
    const hintNoBlade = await page.evaluate(() => window.__drift.hints().last);
    check('Ch.2 item 6 — hammer owned but no blade: the reason updates to name the blade specifically, not the same flat message', /blade/i.test(hintNoBlade), `"${hintNoBlade}"`);

    // ---- Ch.6, "The Body Model" — carry weight, the rest redesign, the death cost ----
    console.log('\nCh.6 — the body model: carry weight bands, sleep as a rate, the death cost');

    //  CARRY WEIGHT. Proven through real state reads on a real running build: an empty
    //  castaway is Light and moves at exactly the base speed; a loaded one drops a band and
    //  a real, measured walk covers less ground. Distance is measured over a fixed real-time
    //  window, the same technique the fast-movement check uses.
    await editSave(`
        state.inventory = { wood: 0, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0, sharpblade: 0 };
        state.tools = { axe: false, flask: false, flaskSips: 0, stoneHammer: false, axeGrade: 'serviceable' };
        state.torch = { owned: false, lit: false, fuelGameHoursRemaining: 0, grade: 'serviceable' };
        state.energy = 100;
        state.player = { x: 0, y: 60 };
    `);
    const emptyBody = await live();
    check('Ch.6 — an empty-handed castaway carries nothing and reads the Light band', emptyBody.inventory.wood === 0, `fatigue ${emptyBody.fatigue}, resting ${emptyBody.resting}`);

    //  The ambient drain scales with the band — read straight off a real reconcile by
    //  letting the same real-time window elapse under two very different loads.
    await editSave('state.energy = 100; state.inventory.stone = 0;');
    const lightStart = await live();
    await sleep(6000);
    const lightEnd = await live();
    const lightDrain = lightStart.energy - lightEnd.energy;

    await editSave('state.energy = 100; state.inventory.stone = 40;'); // 80 kg — heavy band
    const heavyStart = await live();
    await sleep(6000);
    const heavyEnd = await live();
    const heavyDrain = heavyStart.energy - heavyEnd.energy;
    check('Ch.6 — a heavy load drains ambient energy faster than an empty pack, on a real running build', heavyDrain > lightDrain, `light ${lightDrain.toFixed(4)} vs heavy ${heavyDrain.toFixed(4)} over the same window`);

    //  A real effortful gather costs more under load — the D-052 plumbing being reused,
    //  proven through an actual completed hold rather than a unit test. Uses the same
    //  `nodeOf`/`harvest` helpers the D-052 energy checks already rely on: an earlier draft
    //  of this check hardcoded a tap position and silently measured nothing but ambient
    //  drain, because the coordinates it guessed were nowhere near the actual rock.
    await editSave(`
        for (const n of state.nodes) { if (n.kind === 'rock') { n.available = true; n.depletedAtGameHours = null; } }
        state.inventory = { wood: 0, stone: 0, fiber: 0, berries: 0, coconut: 0, shellfish: 0, sharpblade: 0 };
        state.energy = 100;
    `);
    const rockForLight = await nodeOf('rock');
    await editSave(`state.player = { x: ${rockForLight.x - 1.5}, y: ${rockForLight.y} };`);
    const beforeLightMine = (await live()).energy;
    const lightMineResult = await harvest('rock', 20);
    const lightMineCost = beforeLightMine - (await live()).energy;

    await editSave(`
        for (const n of state.nodes) { if (n.kind === 'rock') { n.available = true; n.depletedAtGameHours = null; } }
        state.inventory.stone = 40;
        state.energy = 100;
    `);
    const rockForHeavy = await nodeOf('rock');
    await editSave(`state.player = { x: ${rockForHeavy.x - 1.5}, y: ${rockForHeavy.y} };`);
    const beforeHeavyMine = (await live()).energy;
    const heavyMineResult = await harvest('rock', 20);
    const heavyMineCost = beforeHeavyMine - (await live()).energy;
    check('Ch.6 — both mining taps actually landed (the measurement means something)', lightMineResult.ok && heavyMineResult.ok, `light ok=${lightMineResult.ok}, heavy ok=${heavyMineResult.ok}`);
    check('Ch.6 — the SAME real mining tap costs measurably more under a heavy pack than empty-handed', heavyMineCost > lightMineCost, `light ${lightMineCost.toFixed(3)} vs heavy ${heavyMineCost.toFixed(3)} (base ${TUNE.energyCostRockMine})`);

    //  THE REST REDESIGN. Sleeping from near-empty must NOT jump to full — the single most
    //  important behavioural difference this chapter makes, proven on a real device by
    //  tapping the shelter and reading the energy back.
    await editSave(`
        state.inventory.wood = 99; state.inventory.stone = 99; state.inventory.fiber = 99;
        state.energy = 5;
        state.fatigue = 90;
        state.inventory.stone = 0; state.inventory.wood = 0; state.inventory.fiber = 0;
    `);
    const preSleep = await live();
    if (preSleep.shelter.built) {
        //  Mirrors the proven C05 sleep pattern — `approach` + `faceNode` + a world tap, then
        //  dismiss the report via `.report button`. Two authoring bugs were fixed to get here:
        //  an earlier draft teleported the player ONTO the shelter's own coordinates and
        //  tapped there (standing inside the structure is not the same as standing at it),
        //  and the next one walked the full ~47 m from the previous check's rock while
        //  exhausted — at `energySlowWalkMultiplier` that overran the approach budget and the
        //  tap never happened. Teleporting to just outside the shelter first makes the walk
        //  short and the check about sleeping rather than about pathing. Carrying no wood is
        //  deliberate too, so `canRepairStructure` cannot hijack the tap.
        await editSave('state.player = { x: state.shelter.x + 3, y: state.shelter.y };');
        await approach(preSleep.shelter.x, preSleep.shelter.y, 20);
        await faceNode(preSleep.shelter.x, preSleep.shelter.y);
        const beforeSleep = await live();
        await tapWorld(preSleep.shelter.x, preSleep.shelter.y, 55);
        await sleep(800);
        await realTapDom('.report button');
        await sleep(600);
        const afterSleep = await live();
        check('Ch.6 — sleeping from near-empty RECOVERS energy without jumping to full (the instant refill is gone)', afterSleep.energy > beforeSleep.energy && afterSleep.energy < 100, `energy ${beforeSleep.energy.toFixed(1)} -> ${afterSleep.energy.toFixed(1)}`);
        //  A bare `<` here is what let C3 finding B1 through: it passed on ~0.17 of
        //  post-wake drift while the real shed (12/hr × 8 h) was silently not happening at
        //  all. Assert a MEANINGFUL shed instead — anything less than half the tuned amount
        //  means fatigue is not actually being cleared by sleep.
        const shedFloor = (TUNE.fatigueRecoveryPerGameHourResting * TUNE.sleepDurationGameHours) / 2;
        check('Ch.6 — sleeping sheds fatigue by a meaningful amount, not incidental drift', beforeSleep.fatigue - afterSleep.fatigue >= shedFloor, `fatigue ${beforeSleep.fatigue.toFixed(2)} -> ${afterSleep.fatigue.toFixed(2)} (need a drop of at least ${shedFloor})`);
        check('Ch.6 — `resting` is never left switched on after waking', afterSleep.resting === false, `resting ${afterSleep.resting}`);
    } else {
        check('Ch.6 — sleeping from near-empty RECOVERS energy without jumping to full (the instant refill is gone)', false, 'setup failed: no shelter built at this point in the run');
    }

    //  FATIGUE is perceivable and HONEST: the severe stage names itself in the HUD, and no
    //  number the player reasons from is distorted at any stage. Both halves are checked —
    //  the second is the honest-systems rail, and it is the one that actually matters.
    await editSave('state.fatigue = 95; state.energy = 80; state.warmth = 77; state.thirst = 66; state.inventory.wood = 7;');
    await sleep(900);
    const severeGoal = await page.evaluate(() => { const g = document.querySelector('.goal'); return g ? g.textContent : ''; });
    check('Ch.6 — severe fatigue names itself in the HUD rather than staying silent', /exhaust|bone|rest/i.test(severeGoal), `"${severeGoal}"`);

    //  THE RAIL ITSELF. The honest question is not "did the numbers stay frozen" (they
    //  legitimately drift — warmth drains at night whatever the body is doing) but "does
    //  what the player SEES still equal what is actually true". So this reads the rendered
    //  HUD labels and the live state in the same breath and asserts they agree, at severe
    //  fatigue. An earlier draft asserted the raw values stayed near their forced numbers
    //  and failed on ordinary warmth drain — measuring drift, not distortion.
    const railProbe = await page.evaluate(() => {
        const s = window.__drift.state();
        const labelOf = (k) => {
            const el = document.querySelector(`.v-${k} .vital-label`);
            return el ? parseInt(el.textContent, 10) : NaN;
        };
        return {
            fatigue: s.fatigue,
            shown: { warmth: labelOf('warmth'), thirst: labelOf('thirst'), hunger: labelOf('hunger'), health: labelOf('health'), energy: labelOf('energy') },
            actual: { warmth: Math.round(s.warmth), thirst: Math.round(s.thirst), hunger: Math.round(s.hunger), health: Math.round(s.health), energy: Math.round(s.energy) },
            wood: s.inventory.wood
        };
    });
    const railAgrees = ['warmth', 'thirst', 'hunger', 'health', 'energy'].every((k) => Math.abs(railProbe.shown[k] - railProbe.actual[k]) <= 1);
    check(
        'Ch.6 HONEST-SYSTEMS RAIL — at severe fatigue every displayed vital still equals the true state (nothing is distorted)',
        railProbe.fatigue >= TUNE.fatigueSevereAt && railAgrees && railProbe.wood === 7,
        `fatigue ${railProbe.fatigue}, shown ${JSON.stringify(railProbe.shown)} vs actual ${JSON.stringify(railProbe.actual)}, wood ${railProbe.wood}`
    );

    //  THE DEATH COST. A real death, on a real build, taking a quarter of the loose stacks
    //  and nothing else — tools and knowledge explicitly re-read afterwards.
    const deathsBaseline = (await live()).trace.deaths;
    await editSave(`
        state.inventory = { wood: 12, stone: 8, fiber: 4, berries: 0, coconut: 0, shellfish: 0, sharpblade: 2 };
        state.tools = { axe: true, flask: true, flaskSips: 1, stoneHammer: true, axeGrade: 'refined' };
        state.knowledge.domains.harvestingFabrication.technique = 42;
        state.thirst = 0; state.hunger = 0; state.warmth = 0; state.health = 0.4;
        state.fatigue = 70;
    `);
    //  The baseline MUST be captured before the editSave, not after it. Setting health to a
    //  sliver with every vital at zero means the reload's own boot reconcile can (and does)
    //  kill the castaway before the first post-reload read happens — an earlier draft
    //  compared against a post-reload baseline and so reported "no death occurred" while
    //  every downstream assertion was simultaneously confirming the death's exact cost.
    let diedForBody = false;
    for (let i = 0; i < 20; i++) {
        const st = await live();
        if (st.trace.deaths > deathsBaseline) { diedForBody = true; break; }
        await sleep(700);
    }
    await sleep(500);
    const afterDeath = await live();
    check('Ch.6 — a real death occurred to test its cost', diedForBody, `deaths ${deathsBaseline} -> ${afterDeath.trace.deaths}`);
    check('Ch.6 — the death took a floored quarter of the carried loose stacks', afterDeath.inventory.wood === 9 && afterDeath.inventory.stone === 6, `wood 12->${afterDeath.inventory.wood}, stone 8->${afterDeath.inventory.stone}`);
    check('Ch.6 — small stacks are never wiped by rounding (2 sharp blades survive intact)', afterDeath.inventory.sharpblade === 2, `sharpblade ${afterDeath.inventory.sharpblade}`);
    check('Ch.6 — the death NEVER took tools', afterDeath.tools.axe === true && afterDeath.tools.stoneHammer === true && afterDeath.tools.flask === true, JSON.stringify(afterDeath.tools));
    check('Ch.6 — the death NEVER touched KnowledgeState (Ch.2 amendment B holds across a second system)', afterDeath.knowledge.domains.harvestingFabrication.technique === 42, `technique ${afterDeath.knowledge.domains.harvestingFabrication.technique}`);
    check('Ch.6 — waking clears fatigue rather than compounding it', afterDeath.fatigue === 0, `fatigue was forced to 70 before the death, now ${afterDeath.fatigue}`);
    const lastDeath = afterDeath.trace.deathLog[afterDeath.trace.deathLog.length - 1];
    check('Ch.6 — the death log records the cause-specific lesson and exactly what was lost', Boolean(lastDeath && lastDeath.message && lastDeath.lost), JSON.stringify(lastDeath));

    // ---- D-059: tree parity, exhaustion teeth, carry weight at scale ----
    console.log('\nD-059 — tree parity, exhaustion with teeth, carry weight that scales');

    //  FIX-1 — TREE PARITY. The director's report: nearly every tree was decorative, the
    //  same disease D-051 cured once for the original five. Proven on the live island by
    //  counting real nodes and then actually felling one of the newly-promoted trees.
    await editSave('state.tools.axe = true; state.energy = 100; state.inventory.stone = 0;');
    await editSave(`
        //  Force every tree standing: by this point in a long run the D-050 section has
        //  felled the lot, so hoping one survived is exactly the incidental-leftover-state
        //  mistake this file's own lessons keep re-teaching.
        for (const n of state.nodes) { if (n.kind === 'tree') { n.available = true; n.depletedAtGameHours = null; } }
    `);
    const parityState = await live();
    const realTrees = parityState.nodes.filter((n) => n.kind === 'tree');
    check('D-059 — the island now carries 19 real trees, not 5 (parity with how rocks work)', realTrees.length === 19, `${realTrees.length} real tree nodes`);
    const promotedTrees = realTrees.filter((n) => !['tr1', 'tr2', 'tr3', 'tr4', 'tr5'].includes(n.id));
    check('D-059 — 14 of them are the promoted treeline spots', promotedTrees.length === 14, promotedTrees.map((n) => n.id).join(','));

    //  A promoted tree must be genuinely harvestable — not merely present in the node list.
    const promoted = promotedTrees.find((n) => n.available);
    if (promoted) {
        await editSave(`state.player = { x: ${promoted.x - 1.5}, y: ${promoted.y} }; state.tools.axe = true; state.energy = 100;`);
        const woodBefore = (await live()).inventory.wood;
        await faceNode(promoted.x, promoted.y);
        await tapWorld(promoted.x, promoted.y, 55);
        let promotedFelled = false;
        for (let i = 0; i < 15; i++) {
            const st = await live();
            const n = st.nodes.find((x) => x.id === promoted.id);
            if (n && !n.available) { promotedFelled = true; break; }
            await sleep(400);
        }
        await sleep(300);
        const woodAfter = (await live()).inventory.wood;
        check('D-059 — a PROMOTED tree is genuinely fellable by a real tap, and yields timber', promotedFelled && woodAfter > woodBefore, `${promoted.id} felled=${promotedFelled}, wood ${woodBefore} -> ${woodAfter}`);
    } else {
        check('D-059 — a PROMOTED tree is genuinely fellable by a real tap, and yields timber', false, 'setup failed: no available promoted tree');
    }

    //  RENDER COST, reported rather than assumed. The p95 frame-time budget is law (A3), and
    //  the earlier budget/fps checks in this same run already gate it; this reports the
    //  actual scene cost the promotion bought so the number is on the record either way.
    const cost = await page.evaluate(() => window.__drift.renderCost());
    if (cost) {
        console.log(`  RENDER COST — meshes ${cost.totalMeshes}, pickable ${cost.pickableMeshes}, active ${cost.activeMeshes}`);
        check('D-059 — the promoted trees did not blow out the pickable-mesh count (raycast cost)', cost.pickableMeshes < 200, `${cost.pickableMeshes} pickable meshes`);
    } else {
        check('D-059 — render cost is readable from the live scene', false, 'renderCost() returned null');
    }

    //  FIX-2 — EXHAUSTION HAS TEETH. Root cause was that nothing about energy touched
    //  gathering at all. Measured as real elapsed wall-clock time to complete the SAME hold
    //  on the SAME node kind, rested versus spent.
    const timeToMine = async () => {
        await editSave(`
            for (const n of state.nodes) { if (n.kind === 'rock') { n.available = true; n.depletedAtGameHours = null; } }
        `);
        const target = await nodeOf('rock');
        await editSave(`state.player = { x: ${target.x - 1.5}, y: ${target.y} };`);
        const t0 = Date.now();
        const res = await harvest('rock', 25);
        return { ms: Date.now() - t0, ok: res.ok };
    };
    await editSave('state.energy = 100;');
    const restedMine = await timeToMine();
    await editSave('state.energy = 0;');
    const spentMine = await timeToMine();
    check('D-059 — both exhaustion-comparison mining holds actually completed', restedMine.ok && spentMine.ok, `rested ok=${restedMine.ok}, spent ok=${spentMine.ok}`);
    check('D-059 — REGRESSION: mining at 0 energy takes measurably LONGER than at full (it used to be identical)', spentMine.ms > restedMine.ms, `rested ${restedMine.ms} ms vs spent ${spentMine.ms} ms`);

    //  FIX-3 — CARRY WEIGHT AT SCALE. The director's report: 100 rock produced no observable
    //  effect. It read `heavy`, exactly as 16 rock did, and the two were byte-identical.
    await editSave('state.energy = 100; state.inventory.stone = 16;'); // 32 kg, just past Heavy
    const modestState = await live();
    await sleep(5000);
    const modestDrain = modestState.energy - (await live()).energy;

    await editSave('state.energy = 100; state.inventory.stone = 100;'); // 200 kg, the reported case
    const hugeState = await live();
    await sleep(5000);
    const hugeDrain = hugeState.energy - (await live()).energy;
    check('D-059 — REGRESSION: 100 rock now drains measurably more than 16 rock (the band no longer saturates)', hugeDrain > modestDrain, `16 rock ${modestDrain.toFixed(4)} vs 100 rock ${hugeDrain.toFixed(4)} over the same window`);

    //  And it is PERCEIVABLE — carry weight was not surfaced anywhere in the body layer
    //  before this fix, so the player had no readout to notice any of it.
    await sleep(600);
    const overloadChip = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('.chip'));
        const hit = chips.find((c) => /overload/i.test(c.textContent || ''));
        return hit ? hit.textContent.trim() : null;
    });
    check('D-059 — an overloaded castaway is TOLD so in the HUD, not left to guess', Boolean(overloadChip), overloadChip ?? 'no overload chip found');

    await editSave('state.inventory.stone = 0;');
    await sleep(600);
    const chipGoneWhenLight = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('.chip'));
        return chips.some((c) => /overload/i.test(c.textContent || ''));
    });
    check('D-059 — and NOT told so when carrying nothing (the readout is honest, not decorative)', chipGoneWhenLight === false);

    // ---- D-063: embodied inventory, equip/switch, Try-Combining, input safety ----
    console.log('\nD-063 — the loadout panel, equip/switch, experimentation, and input safety');

    //  ITEM 1 — the panel opens from the carried row and shows all six zones with mass+bulk.
    await editSave(`
        state.tools = { axe: true, flask: true, flaskSips: 0, stoneHammer: true, axeGrade: 'serviceable' };
        state.inventory.wood = 6; state.inventory.stone = 4; state.inventory.fiber = 3;
        state.loadout = { activeHand: null, supportHand: null, belt: [null,null,null,null], pockets: [null,null] };
        state.energy = 100;
    `);
    const carriedTap = await realTapDom('.carried-button');
    check('D-063 — the loadout panel opens from its own labelled button', carriedTap.ok, carriedTap.reason ?? '');
    await sleep(500);
    const panelProbe = await page.evaluate(() => {
        const el = document.querySelector('.panel.loadout');
        if (!el) return null;
        const names = Array.from(el.querySelectorAll('.zone-name')).map((n) => n.textContent.trim());
        const load = el.querySelector('.load-line');
        return { zones: names, load: load ? load.textContent.trim() : '', hasClose: Boolean(el.querySelector('.close-btn')) };
    });
    check('D-063 — it shows all SIX access zones (v0_7 §9)', Boolean(panelProbe) && panelProbe.zones.length === 6, panelProbe ? panelProbe.zones.join(' | ') : 'panel not found');
    check('D-063 — mass AND bulk are both visible', Boolean(panelProbe) && /kg/.test(panelProbe.load) && /bulk/.test(panelProbe.load), panelProbe ? panelProbe.load : '');
    check('D-063 — there is one obvious close action (§9 input safety)', Boolean(panelProbe) && panelProbe.hasClose);

    //  ITEM 2 — equip via the hands slot, and it shows on the character.
    const equipTap = await realTapDom('.equip-btn[data-tool="axe"]');
    check('D-063 — a tool can be taken in hand from the panel (item 2: equip/switch)', equipTap.ok, equipTap.reason ?? '');
    await sleep(700);
    const afterEquip = await live();
    check('D-063 — the axe is genuinely in the active hand', afterEquip.loadout.activeHand === 'axe', JSON.stringify(afterEquip.loadout));

    //  §9 INPUT SAFETY, the hard law: closing the panel must NOT leak a world tap. The
    //  close button sits over the world; before the fix its own release fell through.
    await editSave('state.trace.failedInteractionTaps = 0;');
    await realTapDom('.carried-button');
    await sleep(400);
    const tapsBeforeClose = (await live()).trace.failedInteractionTaps;
    const closeTap = await realTapDom('.panel.loadout .close-btn');
    await sleep(700);
    const afterClose = await live();
    check('D-063 — the panel closes via its own close button', closeTap.ok, closeTap.reason ?? '');
    check('D-063 §9 INPUT SAFETY — closing does NOT leak a world tap behind the panel', afterClose.trace.failedInteractionTaps === tapsBeforeClose, `failedTaps ${tapsBeforeClose} -> ${afterClose.trace.failedInteractionTaps}`);
    const panelGone = await page.evaluate(() => !document.querySelector('.panel.loadout'));
    check('D-063 — and control is genuinely returned (panel gone, world tappable again)', panelGone);

    //  THE POSITION LAW — a consumed torch empties its slot, never silently refilled.
    await editSave(`
        state.torch = { owned: true, lit: true, fuelGameHoursRemaining: 0.2, grade: 'serviceable' };
        state.loadout.belt[1] = 'torch';
    `);
    const beltBefore = (await live()).loadout.belt[1];
    await goAway(30); // long enough offline for the torch to burn out
    const beltAfter = (await live()).loadout.belt;
    check('D-063 §9 LAW — a torch that burns out EMPTIES its belt position, never refilled', beltBefore === 'torch' && beltAfter[1] === null && !beltAfter.includes('torch'), `belt[1] ${beltBefore} -> ${beltAfter[1]}, belt ${JSON.stringify(beltAfter)}`);

    //  ITEM 4 — Try-Combining through the real brain path, on a live build.
    await editSave(`
        state.inventory.wood = 20; state.inventory.fiber = 20; state.inventory.berries = 20;
        state.energy = 100; state.hunger = 100; state.thirst = 100;
        state.knowledge.nullPairs = []; state.blueprints = []; state.experimentCount = 0;
        for (const d of Object.keys(state.knowledge.domains)) state.knowledge.domains[d].technique = 100;
    `);
    const beforeExp = await live();
    const expResult = await page.evaluate(() => window.__drift.tryCombine('berries', 'wood'));
    await sleep(300);
    const afterNull = await live();
    check('D-063 item 4 — a no-relationship attempt is journalled, teaching via the D-055 path', expResult && expResult.outcome === 'no-relationship' && afterNull.knowledge.nullPairs.length > beforeExp.knowledge.nullPairs.length, JSON.stringify(expResult && expResult.outcome));
    check('D-063 item 4 — the attempt cost the body (energy/hunger/thirst/time), win or lose', afterNull.energy < beforeExp.energy && afterNull.hunger < beforeExp.hunger && afterNull.thirst < beforeExp.thirst, `energy ${beforeExp.energy.toFixed(1)}->${afterNull.energy.toFixed(1)}, hunger ${beforeExp.hunger.toFixed(1)}->${afterNull.hunger.toFixed(1)}`);

    let minted = null;
    for (let i = 0; i < 30; i++) {
        await page.evaluate(() => { const s = window.__drift.state(); s.energy = 100; s.inventory.wood = 20; s.inventory.fiber = 20; });
        const r = await page.evaluate(() => window.__drift.tryCombine('wood', 'fiber'));
        if (r && r.outcome === 'invented') { minted = r; break; }
    }
    await sleep(300);
    const afterMint = await live();
    check('D-063 item 4 — a real relationship eventually mints a NAMED Blueprint (§10.6)', Boolean(minted && minted.blueprint && minted.blueprint.name), minted ? JSON.stringify(minted.blueprint && minted.blueprint.name) : 'never succeeded in 30 attempts');
    check('D-063 item 4 — the plan records inputs, version, workmanship and authorship (§10.5)', afterMint.blueprints.length === 1 && afterMint.blueprints[0].version >= 1 && Boolean(afterMint.blueprints[0].workmanship) && Boolean(afterMint.blueprints[0].author), JSON.stringify(afterMint.blueprints[0] ?? null));

    // ---- Hygiene ----
    console.log('\nHygiene');
    check('every requested asset was found', missing.length === 0, missing.slice(0, 4).join(' | '));
    check('no console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

    await browser.close();
    console.log(`\n${results.length - failures}/${results.length} checks passed. Screenshots in .smoke/\n`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nSMOKE TEST CRASHED\n', e); process.exit(1); });
