/**
 * THE CRAFTING PATH, DRIVEN AS THE DIRECTOR DRIVES IT.
 *
 * Every check that has ever "proven" the never-auto-commit rule called `__drift.tryCombine` —
 * the BRAIN, through a debug hook. None of them opened the pack, picked two chips and pressed
 * the button. So a body-layer defect between the button and the brain would be invisible to all
 * of them, which is exactly the shape of "device-proven, broken in his hands" this project has
 * now hit three times on this one feature.
 *
 * This drives the real DOM on a genuinely clean browser context — the incognito case — and
 * reports, for each of the director's two reported piles:
 *   - what the circle actually offered (or whether it appeared at all),
 *   - what the state did between pressing the button and answering,
 *   - whether anything was built or minted WITHOUT an answer.
 *
 * Usage: node tools/craft-ui-probe.mjs [url]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:4173/';
const SAVE_KEY = 'drift.save.v1';
const CHROME = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean).find((p) => existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--enable-gpu', '--use-angle=default', '--ignore-gpu-blocklist'],
});
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: 915, height: 412, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

const boot = async () => {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 240_000 });
    for (let i = 0; i < 120; i++) {
        if (await page.evaluate(() => Boolean(window.__drift?.sceneReady?.()))) break;
        await sleep(500);
    }
    await sleep(1200);
    //  Dismiss the cold open the way a player does.
    await page.evaluate(() => {
        const b = document.querySelector('.cold-open button, .cold-open .action');
        if (b instanceof HTMLElement) b.click();
    });
    await sleep(600);
};

const stock = async (mutation) => {
    await page.goto(`${URL}__smoke_blank.html`, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await page.evaluate(({ key, src }) => {
        const env = JSON.parse(localStorage.getItem(key));
        // eslint-disable-next-line no-new-func
        new Function('state', src)(env.state);
        const n = Date.now();
        env.savedAtMs = n; env.state.lastSeenMs = n;
        localStorage.setItem(key, JSON.stringify(env));
    }, { key: SAVE_KEY, src: mutation });
    await boot();
};

const snapshot = () => page.evaluate(() => {
    const s = window.__drift.state();
    return {
        inv: { ...s.inventory },
        plans: s.blueprints.map((b) => b.recipeId),
        storageBuilt: s.storage.built,
        shelterBuilt: s.shelter.built,
        spear: s.tools.spear,
        energy: +s.energy.toFixed(2),
    };
});

/** Open the pack, pick two chips, press the button — and STOP. Report what appeared. */
async function stageThroughUI(a, b) {
    const opened = await page.evaluate(() => {
        const el = document.querySelector('.carried-button');
        if (!(el instanceof HTMLElement)) return false;
        el.click(); return true;
    });
    await sleep(600);
    const chips = await page.evaluate(({ a, b }) => {
        const all = Array.from(document.querySelectorAll('.combine-chip'))
            .map((c) => c.getAttribute('data-mat'));
        const ca = document.querySelector(`.combine-chip[data-mat="${a}"]`);
        const cb = document.querySelector(`.combine-chip[data-mat="${b}"]`);
        if (ca instanceof HTMLElement) ca.click();
        if (cb instanceof HTMLElement) cb.click();
        return { available: all, pickedA: Boolean(ca), pickedB: Boolean(cb) };
    }, { a, b });
    await sleep(400);
    const before = await snapshot();
    const pressed = await page.evaluate(() => {
        const btn = document.querySelector('.try-combine-btn');
        if (!(btn instanceof HTMLButtonElement)) return { present: false };
        const disabled = btn.disabled;
        if (!disabled) btn.click();
        return { present: true, disabled };
    });
    await sleep(1100);
    const afterPress = await snapshot();
    const circle = await page.evaluate(() => {
        const el = document.querySelector('.panel.verb-circle');
        if (!el) return { up: false, options: [] };
        return {
            up: true,
            options: Array.from(el.querySelectorAll('.verb-seg')).map((s) => ({
                id: s.getAttribute('data-verb'),
                label: (s.querySelector('.verb-label')?.textContent ?? '').trim(),
            })),
        };
    });
    const hint = await page.evaluate(() => window.__drift.hints().last);
    return { opened, chips, pressed, before, afterPress, circle, hint };
}

const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

console.log(`CRAFT UI PROBE — ${URL}\n`);
await boot();
console.log(`served build: ${await page.evaluate(() => document.querySelector('meta[name="drift-build"]')?.getAttribute('content') ?? '?')}\n`);

for (const [label, mutation, a, b] of [
    ["THE DIRECTOR'S CASE 1 — 14 wood + 13 stone, fresh",
     'state.blueprints = []; state.storage.built = false; state.shelter.built = false; state.tools.spear = false;'
     + ' state.energy = 100; state.hunger = 100; state.thirst = 100;'
     + ' state.inventory = { ...state.inventory, wood: 14, stone: 13, fiber: 0, sharpblade: 0 };',
     'wood', 'stone'],
    ["THE DIRECTOR'S CASE 2 — wood + sharp stone, fresh",
     'state.blueprints = []; state.tools.spear = false;'
     + ' state.energy = 100; state.hunger = 100; state.thirst = 100;'
     + ' state.inventory = { ...state.inventory, wood: 14, sharpblade: 6, stone: 0, fiber: 0 };',
     'wood', 'sharpblade'],
]) {
    await stock(mutation);
    const r = await stageThroughUI(a, b);
    console.log(`--- ${label} ---`);
    console.log(`  pack opened ${r.opened}, chips on offer [${r.chips.available.join(', ')}]`);
    console.log(`  picked ${a}=${r.chips.pickedA} ${b}=${r.chips.pickedB}; button ${JSON.stringify(r.pressed)}`);
    console.log(`  BEFORE press: plans [${r.before.plans.join(',')}] storage=${r.before.storageBuilt} spear=${r.before.spear}`);
    console.log(`  AFTER  press: plans [${r.afterPress.plans.join(',')}] storage=${r.afterPress.storageBuilt} spear=${r.afterPress.spear}`);
    console.log(`  circle up: ${r.circle.up}  options: ${r.circle.options.map((o) => `${o.label}[${o.id}]`).join(' | ') || '(none)'}`);
    console.log(`  hint: "${(r.hint ?? '').slice(0, 80)}"`);
    const committedUnasked = changed(r.before, r.afterPress) && !r.circle.up;
    console.log(`  >> COMMITTED WITHOUT ASKING: ${committedUnasked}`);
    console.log('');

    //  ...and a SECOND trial on the same pile, to reproduce the "only one option" report.
    if (r.circle.up && r.circle.options.length > 0) {
        await page.evaluate(() => {
            const seg = document.querySelector('.panel.verb-circle .verb-seg');
            if (seg instanceof HTMLElement) seg.click();
        });
        await sleep(1200);
        const afterAnswer = await snapshot();
        console.log(`  answered the circle -> plans [${afterAnswer.plans.join(',')}] spear=${afterAnswer.spear} storage=${afterAnswer.storageBuilt}`);
        const second = await stageThroughUI(a, b);
        console.log(`  SECOND trial circle up: ${second.circle.up}`
            + `  options: ${second.circle.options.map((o) => `${o.label}[${o.id}]`).join(' | ') || '(none)'}`);
        console.log('');
    }
}

await browser.close();
