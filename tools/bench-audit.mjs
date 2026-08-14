/**
 * BENCH AUDIT — does the bench see what a real first-time player sees?
 *
 * Four "device-proven" claims failed in the director's hands on a fresh incognito life. That is
 * not a run of bad luck, it is a question about the instrument, and the instrument has never
 * been audited. This script answers three things with measurements rather than opinion:
 *
 *   (a) FRESH SAVE. Boot a genuinely clean browser context — the incognito case — and diff its
 *       opening GameState against what the harness's own `startFresh()` produces. Any field
 *       that differs is a field every "fresh life" claim has been made about the wrong state.
 *
 *   (b) RENDER WITNESS. Establish what the bench can actually SEE of the 3D scene: whether a
 *       real GPU path is running, whether meshes exist, and — the part that matters — whether
 *       "enabled" means "a player would see it". A mesh can be enabled and still be scaled to
 *       nothing, behind the camera, fully transparent, or hidden inside another object.
 *
 *   (c) is a static scan and lives in `bench-audit-text.mjs`.
 *
 * Usage: node tools/bench-audit.mjs [url]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

//  THE SAME CHROME AND THE SAME FLAGS THE HARNESS USES. An audit of the bench that ran on a
//  different browser, or a different GPU path, would be an audit of something else.
const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
].filter(Boolean);
const findChrome = () => {
    for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
    throw new Error('No Chrome found.');
};

const URL = process.argv[2] ?? 'http://localhost:4173/';
const SAVE_KEY = 'drift.save.v1';
const LOOK_KEY = 'drift.look.v1';
const NAV = { waitUntil: 'networkidle2', timeout: 240_000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForScene(page) {
    for (let i = 0; i < 120; i++) {
        const ready = await page.evaluate(() => Boolean(window.__drift?.sceneReady?.()));
        if (ready) return true;
        await sleep(500);
    }
    return false;
}

/** Everything a first-life claim could rest on. Deliberately broad. */
const SNAPSHOT = () => {
    const s = window.__drift.state();
    return {
        localStorageKeys: Object.keys(localStorage).sort(),
        tools: { ...s.tools },
        torch: { ...s.torch },
        inventory: { ...s.inventory },
        blueprints: s.blueprints.map((b) => b.recipeId).sort(),
        fire: { built: s.fire.built, fuel: s.fire.fuel },
        shelter: { ...s.shelter },
        storage: { ...s.storage },
        radio: { owned: s.radio.owned, charge: s.radio.charge },
        raft: { ...s.raft },
        capacities: { ...s.capacities },
        skills: Object.fromEntries(Object.entries(s.skills).map(([k, v]) => [k, v.level])),
        knowledgeDomains: Object.fromEntries(
            Object.entries(s.knowledge.domains).map(([k, v]) => [k, +v.technique.toFixed(3)])),
        nullPairs: s.knowledge.nullPairs.length,
        experimentCount: s.experimentCount,
        gameHoursElapsed: +s.gameHoursElapsed.toFixed(3),
        nodeCount: s.nodes.length,
        nodesAvailable: s.nodes.filter((n) => n.available).length,
        illness: { ...s.illness },
        injuries: { ...s.injuries },
        loadout: JSON.parse(JSON.stringify(s.loadout ?? null)),
        trace: { ...s.trace },
    };
};

async function incognitoBoot(browser) {
    //  A GENUINELY CLEAN CONTEXT. Not "the save key removed" — a browser profile that has
    //  never seen this origin, which is what incognito actually is and what the director had.
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 915, height: 412, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(URL, NAV);
    await waitForScene(page);
    await sleep(1200);
    const snap = await page.evaluate(SNAPSHOT);
    return { ctx, page, snap };
}

async function harnessBoot(browser) {
    //  Exactly what `startFresh()` in tools/smoke.mjs does, reproduced line for line.
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 915, height: 412, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${URL}__smoke_blank`, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await page.evaluate(({ s, l }) => { localStorage.removeItem(s); localStorage.removeItem(l); },
        { s: SAVE_KEY, l: LOOK_KEY });
    await page.goto(URL, NAV);
    await waitForScene(page);
    await sleep(900);
    const snap = await page.evaluate(SNAPSHOT);
    return { ctx, page, snap };
}

function diff(a, b, path = '') {
    const out = [];
    const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
    for (const k of keys) {
        const av = a?.[k], bv = b?.[k];
        const p = path ? `${path}.${k}` : k;
        if (av && bv && typeof av === 'object' && typeof bv === 'object' && !Array.isArray(av)) {
            out.push(...diff(av, bv, p));
        } else if (JSON.stringify(av) !== JSON.stringify(bv)) {
            out.push(`${p}: incognito=${JSON.stringify(av)} harness=${JSON.stringify(bv)}`);
        }
    }
    return out;
}

const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    //  The harness's DEFAULT path — real GPU, not the software fallback.
    args: ['--no-sandbox', '--enable-gpu', '--use-angle=default', '--ignore-gpu-blocklist'],
});

console.log(`BENCH AUDIT — ${URL}\n`);

// ---------------------------------------------------------------------------
console.log('(a) FRESH SAVE — a clean browser context vs the harness\'s startFresh()');
const inc = await incognitoBoot(browser);
const har = await harnessBoot(browser);
const d = diff(inc.snap, har.snap);
console.log(`  incognito localStorage keys : ${JSON.stringify(inc.snap.localStorageKeys)}`);
console.log(`  harness   localStorage keys : ${JSON.stringify(har.snap.localStorageKeys)}`);
if (d.length === 0) {
    console.log('  RESULT: byte-identical across every field sampled. startFresh() is a real fresh life.');
} else {
    console.log(`  RESULT: ${d.length} FIELD(S) DIFFER —`);
    for (const line of d) console.log(`    ${line}`);
}

// ---------------------------------------------------------------------------
console.log('\n(b) RENDER WITNESS — what can the bench actually SEE of the scene?');
const page = inc.page;
const gpu = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
        haveGl: Boolean(gl),
        renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
        vendor: info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : 'unknown',
    };
});
console.log(`  WebGL: ${gpu.haveGl}, renderer "${gpu.renderer}", vendor "${gpu.vendor}"`);

const sceneFacts = await page.evaluate(() => {
    const info = window.__drift.renderCost?.() ?? null;
    return { renderCost: info, sceneReady: window.__drift.sceneReady?.() ?? null };
});
console.log(`  renderCost: ${JSON.stringify(sceneFacts.renderCost)}`);

//  THE REAL QUESTION. `meshInfo().enabled` is what every render claim in the suite rests on.
//  Enabled is not visible. Prove the gap with the game's own meshes rather than asserting it.
const enabledVsVisible = await page.evaluate(() => {
    const probe = (name) => window.__drift.meshInfo?.(name) ?? null;
    const screen = (name) => window.__drift.screenOfMesh?.(name) ?? null;
    const names = ['player', 'caveBluff', 'spearShaft', 'n_wr3_housing'];
    const out = {};
    for (const n of names) out[n] = { info: probe(n), screen: screen(n) };
    return { vp: { w: innerWidth, h: innerHeight }, out };
});
console.log(`  viewport ${enabledVsVisible.vp.w}x${enabledVsVisible.vp.h}`);
for (const [name, v] of Object.entries(enabledVsVisible.out)) {
    const onScreen = v.screen && v.screen.x > 0 && v.screen.y > 0
        && v.screen.x < enabledVsVisible.vp.w && v.screen.y < enabledVsVisible.vp.h;
    console.log(`  ${name.padEnd(16)} exists=${v.info !== null} enabled=${v.info?.enabled ?? '-'}`
        + ` projects=${v.screen ? 'yes' : 'null'} inViewport=${v.screen ? onScreen : '-'}`);
}

//  DOES THE SCENE ACTUALLY DRAW? And the wrong way to ask, recorded because I asked it.
//
//  My first probe read the canvas with `createImageBitmap` and reported ONE distinct colour and
//  ZERO non-black pixels — i.e. "nothing is rendering", which would have been a catastrophic
//  finding and was wrong. A WebGL canvas is created with `preserveDrawingBuffer: false` by
//  default, so its buffer is empty by the time anything reads it back; the black was my probe,
//  not the game. The harness's own screenshots are 200-300 KB, which a blank frame cannot be.
//
//  `page.screenshot()` goes through the compositor and sees the presented frame — the same path
//  the suite already uses — so that is what this measures.
const shotBuf = await page.screenshot({ encoding: 'binary' });
const analysed = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const off = document.createElement('canvas');
    off.width = img.naturalWidth; off.height = img.naturalHeight;
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, off.width, off.height);
    const seen = new Set();
    let nonBlack = 0, sampled = 0;
    for (let i = 0; i < data.length; i += 4 * 37) {
        sampled++;
        seen.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
        if (data[i] + data[i + 1] + data[i + 2] > 24) nonBlack++;
    }
    return { w: off.width, h: off.height, distinctColours: seen.size, sampled, nonBlack };
}, Buffer.from(shotBuf).toString('base64'));
console.log(`  presented frame: ${JSON.stringify(analysed)}`);
console.log(analysed.distinctColours > 8
    ? '  RESULT: the bench CAN see a rendered scene — the compositor path shows a real frame.'
    : '  RESULT: the presented frame is blank. Every render claim would be unwitnessed.');

//  ...AND THE GAP THAT ACTUALLY MATTERS. Rendering happening is not the same as the SUITE
//  witnessing it. `meshInfo().enabled` is what every render claim rests on, and enabled is a
//  scene-graph flag: it is true for a mesh scaled to nothing, fully transparent, behind another
//  object, or off screen. This measures how far apart those two ideas are on real meshes.
const enabledButUnseen = await page.evaluate(() => {
    const scene = window.__drift;
    const names = ['player', 'caveBluff', 'spearShaft', 'n_wr3_housing', 'shelterRoof'];
    return names.map((n) => {
        const i = scene.meshInfo?.(n) ?? null;
        const sc = scene.screenOfMesh?.(n) ?? null;
        const inVp = sc && sc.x > 0 && sc.y > 0 && sc.x < innerWidth && sc.y < innerHeight;
        return { n, exists: i !== null, enabled: i?.enabled ?? null, projects: Boolean(sc), inViewport: Boolean(inVp) };
    });
});
console.log('  enabled vs actually-on-screen:');
for (const r of enabledButUnseen) {
    const gap = r.enabled === true && !r.inViewport;
    console.log(`    ${r.n.padEnd(15)} enabled=${r.enabled} onScreen=${r.inViewport}${gap ? '   <-- enabled but NOT on screen' : ''}`);
}

await browser.close();
