#!/usr/bin/env node
/**
 * THE FEEL-COURT PRESS DIAGNOSTIC — C1's ruling, one decisive instrument.
 *
 * The feel court's perpendicular-travel gate has read 0.38, 0.55 and 0.52 m against its
 * 0.80 m bar across three device runs. Three root causes have been published for that and
 * all three were wrong — the last one (an impassable notch) was disproved by its own
 * restaging, which then leaked and cost three more checks. Every one of those diagnoses was
 * argued from the OUTSIDE: from positions sampled ~5 times a second, through a metric that
 * has itself been wrong twice.
 *
 * That is the actual problem. From a position sample, these are indistinguishable:
 *
 *   H1  the tangent DECAYS toward zero at the contact pole — the brain's straight-wall
 *       assumption is wrong, and a dead-on press sits in an unstable equilibrium it keeps
 *       falling back into. Signature: |residual| and |applied| shrink frame over frame.
 *   H2  the tangent is HEALTHY and the mover still does not advance — the push-out is
 *       anchoring the slide back onto stale geometry. Signature: |applied| stays high,
 *       per-frame movedM stays near zero.
 *   H3  the mover slides exactly as predicted and the RULER is lying. Signature: raw
 *       path-integral displacement (and true per-frame perpendicular) match prediction,
 *       while the harness's 8-sample metric reads low.
 *
 * So this stops arguing and reads the resolver's own testimony. `window.__drift`
 * .armPressTrace() records EVERY movement frame — stick, intent, contact normal, the
 * tangential component the resolver computed, the resolution it applied, and the position
 * either side of the step — and this script drives ONE REAL FEEL-COURT PRESS with the real
 * touch stick (no hook drives anything; standing hazard #4) and prints it.
 *
 * It prints the harness's own metric beside the raw path integral, computed from the same
 * frames, because H3 is a live hypothesis and the ruler is a witness too (Vacuity).
 *
 * Usage:  node tools/press-diagnostic.mjs [url] [--headful]
 */

import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { acquire as acquireBench } from './bench-lock.mjs';
import puppeteer from 'puppeteer-core';

const URL_UNDER_TEST = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:4173/';
const HEADFUL = process.argv.includes('--headful');
const OUT_DIR = fileURLToPath(new URL('../.smoke/', import.meta.url));
const BLANK_PATH = '__smoke_blank';
const SAVE_KEY = 'drift.save.v1';
const LOOK_KEY = 'drift.look.v1';

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
].filter(Boolean);

//  The three constants this diagnostic needs, mirrored from src/data/tune.ts the same way
//  smoke.mjs mirrors its own — and for the same reason (this runs as plain node against a
//  built bundle). Read via a Proxy so a missing key throws instead of poisoning a number.
const TUNE = new Proxy({
    shelterCollisionRadius: 1.3,
    storageCollisionRadius: 0.9,
    playerCollisionRadius: 0.4,
    walkSpeedMps: 3.5,
    slideRetention: 0.72,
    slideDeflectThreshold: 0.35,
    moveAccelMps2: 14,
}, {
    get(t, k) {
        if (typeof k === 'string' && !(k in t)) throw new Error(`TUNE.${k} missing from the diagnostic's mirror`);
        return t[k];
    },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : ' NaN');
const f3 = (n) => (Number.isFinite(n) ? n.toFixed(3) : '  NaN');

function findChrome() {
    for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
    throw new Error('No Chrome/Edge found. Set CHROME_PATH.');
}

async function preflight(url) {
    const gitDir = fileURLToPath(new URL('../.git/', import.meta.url));
    if (existsSync(join(gitDir, 'index.lock'))) { console.error('REFUSED: git operation in progress.'); process.exit(1); }
    const wt = join(gitDir, 'worktrees');
    if (existsSync(wt)) for (const n of readdirSync(wt)) {
        if (existsSync(join(wt, n, 'locked'))) { console.error(`REFUSED: worktree "${n}" locked.`); process.exit(1); }
    }
    try { await acquireBench('press diagnostic', 30 * 60 * 1000); }
    catch (e) { console.error(`REFUSED: ${e.message}`); process.exit(1); }
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        console.log(`Bench acquired. Target responds (${res.status}): ${url}`);
    } catch (e) { console.error(`REFUSED: ${url} unreachable (${e.message}).`); process.exit(1); }
}

async function main() {
    await preflight(URL_UNDER_TEST);
    mkdirSync(OUT_DIR, { recursive: true });

    const browser = await puppeteer.launch({
        executablePath: findChrome(),
        headless: !HEADFUL,
        args: ['--no-sandbox', '--enable-gpu', '--use-angle=default', '--ignore-gpu-blocklist'],
    });
    const teardown = () => { try { browser.process()?.kill('SIGKILL'); } catch { /* gone */ } };
    process.on('exit', teardown);
    for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { teardown(); process.exit(1); });

    const page = await browser.newPage();
    await page.setViewport({ width: 915, height: 412, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36');
    await page.setRequestInterception(true);
    page.on('request', (r) => {
        if (r.url().includes(BLANK_PATH)) { r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><title>blank</title>' }); return; }
        r.continue();
    });
    page.on('pageerror', (e) => console.error('PAGE ERROR:', String(e)));

    const live = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__drift.state())));
    const camera = () => page.evaluate(() => window.__drift.camera());
    const waitForScene = (t = 60_000) => page.waitForFunction(() => window.__drift?.sceneReady?.() === true, { timeout: t });
    const canvasRect = () => page.evaluate(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });

    const editSave = async (src) => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await page.evaluate(({ key, s }) => {
            const env = JSON.parse(localStorage.getItem(key));
            new Function('state', s)(env.state);
            const now = Date.now();
            env.savedAtMs = now; env.state.lastSeenMs = now;
            localStorage.setItem(key, JSON.stringify(env));
        }, { key: SAVE_KEY, s: src });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
        await waitForScene();
        await sleep(1000);
    };
    const startFresh = async () => {
        await page.goto(`${URL_UNDER_TEST}${BLANK_PATH}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await page.evaluate(({ s, l }) => { localStorage.removeItem(s); localStorage.removeItem(l); }, { s: SAVE_KEY, l: LOOK_KEY });
        await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle2', timeout: 90_000 });
        await waitForScene();
        await sleep(900);
    };

    //  IDENTICAL to smoke.mjs's own `faceNode` — the diagnostic must reproduce the feel
    //  court's staging exactly, or it is measuring a different press.
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
            const px = Math.max(-260, Math.min(260, delta / 0.0042));
            await page.touchscreen.touchStart(ox, oy);
            for (let s = 1; s <= 4; s++) { await page.touchscreen.touchMove(ox + (px * s) / 4, oy); await sleep(20); }
            await page.touchscreen.touchEnd();
            await sleep(200);
        }
    };

    //  IDENTICAL to smoke.mjs's own `walkToward`, including the release at the end. The
    //  60 ms at the stick's ORIGIN and the 160 ms with no touch at all are not incidental —
    //  they are the burst structure a live hypothesis blames, so they are reproduced exactly.
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

    //  The CONTROL press: one unbroken hold, aimed once, for the same total stick-down time.
    //  The only variable changed against the press above is the burst structure itself.
    const holdToward = async (tx, tz, seconds) => {
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

    // ------------------------------------------------------------------ staging

    console.log('\n=== FEEL-COURT PRESS DIAGNOSTIC =========================================\n');
    await startFresh();

    //  Build the shelter and the storage box into the save directly. The feel court itself
    //  reaches this state through the run's construction section; what it presses against is
    //  a built shelter at some position, and the press is staged by teleport either way.
    await editSave(`
        state.shelter = { ...state.shelter, built: true, x: 0, y: 98, durability: 100 };
        state.storage = { ...state.storage, built: true, x: 2.2, y: 98 };
        state.player = { x: 0, y: 104 };
    `);

    const shelterAt = (await live()).shelter;
    console.log(`Shelter at (${f2(shelterAt.x)}, ${f2(shelterAt.y)}), built=${shelterAt.built}`);

    //  THE FEEL COURT'S OWN STAGING, reproduced move for move.
    const storageHome = (await live()).storage;
    await editSave(`state.storage = { ...state.storage, x: ${shelterAt.x + 45}, y: ${shelterAt.y - 45} };`);
    await sleep(300);

    const pressStartX = shelterAt.x;
    const pressStartZ = shelterAt.y + 3.2;

    //  ISOLATION, WITNESSED — every obstacle the resolver can actually see near the press,
    //  not a gap computed from the harness's hand-copied radii for the storage box alone.
    const field = await page.evaluate(([x, z]) => window.__drift.obstaclesNear(x, z, 6), [shelterAt.x, shelterAt.y]);
    console.log(`\nOBSTACLE FIELD within 6 m of the shelter centre — ${field.length} obstacle(s):`);
    for (const o of field) {
        const centreGap = Math.hypot(o.x - shelterAt.x, o.z - shelterAt.y);
        console.log(`  (${f2(o.x)}, ${f2(o.z)})  r=${f2(o.radius)}   centre-gap ${f2(centreGap)} m`);
    }
    const standoff = TUNE.shelterCollisionRadius + TUNE.playerCollisionRadius;
    console.log(`Contact stand-off = shelterR ${TUNE.shelterCollisionRadius} + playerR ${TUNE.playerCollisionRadius} = ${f2(standoff)} m`);

    // ------------------------------------------------------------------ THE PRESS

    await editSave(`state.player = { x: ${pressStartX}, y: ${pressStartZ} };`);
    await sleep(300);
    await faceNode(shelterAt.x, shelterAt.y);

    const pressFrom = (await live()).player;
    const axisX = shelterAt.x - pressFrom.x;
    const axisZ = shelterAt.y - pressFrom.y;
    const axisLen = Math.hypot(axisX, axisZ) || 1;
    const ux = axisX / axisLen, uz = axisZ / axisLen;

    console.log(`\nPress starts at (${f2(pressFrom.x)}, ${f2(pressFrom.y)}); axis u = (${f3(ux)}, ${f3(uz)}); ` +
        `${f2(axisLen)} m to centre, ${f2(axisLen - standoff)} m of free approach before contact.`);

    await page.evaluate(() => window.__drift.armPressTrace(3000));

    //  EXACTLY the feel court's press: 8 bursts of 0.30 s, re-aimed at the centre each time.
    const samples = [];
    let prev = pressFrom;
    for (let i = 0; i < 8; i++) {
        await walkToward(shelterAt.x, shelterAt.y, 0.30);
        const st = await live();
        samples.push({ x: st.player.x, z: st.player.y, step: Math.hypot(st.player.x - prev.x, st.player.y - prev.y) });
        prev = st.player;
    }

    const frames = await page.evaluate(() => window.__drift.dumpPressTrace());
    console.log(`\nTrace: ${frames.length} movement frames recorded.\n`);

    report('THE FEEL-COURT PRESS (8 bursts × 0.30 s, stick released between — the shipped harness press)',
        frames, samples, pressFrom, ux, uz, shelterAt, standoff);

    // ------------------------------------------------------------------ THE CONTROL

    //  One variable changed: the stick is never released. If the burst structure is the
    //  mechanism, this separates; if it is not, this reproduces and the burst hypothesis
    //  dies here rather than becoming a fourth published guess.
    await editSave(`state.player = { x: ${pressStartX}, y: ${pressStartZ} };`);
    await sleep(300);
    await faceNode(shelterAt.x, shelterAt.y);
    const holdFrom = (await live()).player;
    await page.evaluate(() => window.__drift.armPressTrace(3000));
    await holdToward(shelterAt.x, shelterAt.y, 2.4);
    const holdFrames = await page.evaluate(() => window.__drift.dumpPressTrace());
    const holdAxisX = shelterAt.x - holdFrom.x, holdAxisZ = shelterAt.y - holdFrom.y;
    const holdLen = Math.hypot(holdAxisX, holdAxisZ) || 1;

    console.log(`\nControl trace: ${holdFrames.length} movement frames recorded.\n`);
    report('CONTROL — ONE UNBROKEN 2.4 s HOLD, aimed once (stick never released)',
        holdFrames, [], holdFrom, holdAxisX / holdLen, holdAxisZ / holdLen, shelterAt, standoff);

    // ------------------------------------------------------------------ teardown
    await editSave(`state.storage = { ...state.storage, x: ${storageHome.x}, y: ${storageHome.y} };`);

    writeFileSync(join(OUT_DIR, 'press-trace.json'),
        JSON.stringify({ press: frames, control: holdFrames, samples, pressFrom, shelterAt, field }, null, 1));
    console.log(`\nRaw frames written to ${join(OUT_DIR, 'press-trace.json')}`);

    await browser.close();
}

/**
 * Print one press: the per-frame trace, then every metric that could disagree, side by side.
 *
 * The metrics are the whole point. `facingSpreadSampled` is the shipped gate, recomputed
 * from these exact frames; `facingSpreadTrue` is the same quantity over EVERY frame instead
 * of 8. If those two differ materially the ruler is the defect (H3) and no amount of
 * collision work will move the gate.
 */
function report(title, frames, samples, from, ux, uz, shelterAt, standoff) {
    console.log('-'.repeat(100));
    console.log(title);
    console.log('-'.repeat(100));

    if (frames.length === 0) { console.log('  NO FRAMES — the trace recorded nothing. That is itself the finding.'); return; }

    //  Per-frame rows, thinned so the shape is readable without losing the contact phase.
    console.log('   t(ms)  stick   |want|  |vel|  cont defl ovl   |resid|  |applied|  into    moved   perp   distC');
    let pathIntegral = 0;
    let perpTrue = 0;
    let contactFrames = 0, deflectFrames = 0, idleFrames = 0;
    const perpSeries = [];
    for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        pathIntegral += f.movedM;
        const dX = f.toX - from.x, dZ = f.toZ - from.y;
        const perp = Math.abs(dX * uz - dZ * ux);
        perpTrue = Math.max(perpTrue, perp);
        perpSeries.push(perp);
        if (f.contacted) contactFrames++;
        if (f.deflected) deflectFrames++;
        if (f.stickMag === 0) idleFrames++;
        const distC = Math.hypot(f.toX - shelterAt.x, f.toZ - shelterAt.y);
        //  Every contact frame, plus a sample of the rest — a decaying tangent has to be
        //  visible frame by frame, not summarised.
        const interesting = f.contacted || i < 6 || i % 7 === 0;
        if (interesting) {
            console.log(
                `  ${String(Math.round(f.t)).padStart(6)}  ${f2(f.stickMag)}   ${f2(Math.hypot(f.wantX, f.wantZ))}   ${f2(Math.hypot(f.velX, f.velZ))}` +
                `   ${f.contacted ? 'Y' : '.'}    ${f.deflected ? 'Y' : '.'}   ${f.overlaps}` +
                `     ${f2(Math.hypot(f.residualX, f.residualZ))}     ${f2(Math.hypot(f.outVelX, f.outVelZ))}   ${f2(f.into)}` +
                `   ${f3(f.movedM)}  ${f2(perp)}  ${f2(distC)}`
            );
        }
    }

    //  The shipped gate, recomputed from these frames at the sample points it actually used.
    let perpSampled = 0;
    for (const s of samples) {
        const dX = s.x - from.x, dZ = s.z - from.y;
        perpSampled = Math.max(perpSampled, Math.abs(dX * uz - dZ * ux));
    }

    const last = frames[frames.length - 1];
    const netX = last.toX - from.x, netZ = last.toZ - from.y;
    const contactOnly = frames.filter((f) => f.contacted);
    const movedInContact = contactOnly.reduce((a, f) => a + f.movedM, 0);

    //  What a healthy slide would have produced over the same contact time: the tangential
    //  arc a mover retaining `slideRetention` of walk speed covers, and the perpendicular
    //  offset that arc reaches around a circle of the contact stand-off radius.
    const contactSeconds = contactOnly.reduce((a, f) => a + f.dt, 0);
    const predictedArc = TUNE.walkSpeedMps * TUNE.slideRetention * contactSeconds;
    const predictedPerp = standoff * Math.abs(Math.sin(Math.min(Math.PI / 2, predictedArc / standoff)));

    //  Direction reversals along the surface — the oscillation signature. Measured on the
    //  APPLIED resolution vector, across contact frames only.
    let reversals = 0;
    for (let i = 1; i < contactOnly.length; i++) {
        const a = contactOnly[i - 1], b = contactOnly[i];
        if (a.outVelX * b.outVelX + a.outVelZ * b.outVelZ < 0) reversals++;
    }

    console.log('\n  MEASUREMENTS ------------------------------------------------------------------');
    console.log(`  frames                       ${frames.length}  (contact ${contactFrames}, deflect ${deflectFrames}, stick-released ${idleFrames})`);
    console.log(`  max obstacles overlapped     ${Math.max(0, ...frames.map((f) => f.overlaps))}   <- 2+ means a notch, whatever staging claimed`);
    console.log(`  RAW PATH INTEGRAL            ${f2(pathIntegral)} m   (of which ${f2(movedInContact)} m while in contact)`);
    console.log(`  net displacement             ${f2(Math.hypot(netX, netZ))} m`);
    console.log(`  perpendicular, TRUE (every frame)    ${f2(perpTrue)} m`);
    console.log(`  perpendicular, SAMPLED (the gate)    ${samples.length ? f2(perpSampled) : 'n/a'} m   [bar 0.80]`);
    console.log(`  predicted perpendicular for a healthy slide over ${f2(contactSeconds)} s of contact: ${f2(predictedPerp)} m (arc ${f2(predictedArc)} m)`);
    console.log(`  applied-direction reversals while in contact  ${reversals} / ${Math.max(0, contactOnly.length - 1)}`);
    console.log('  ---------------------------------------------------------------------------------\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
