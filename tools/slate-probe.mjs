/**
 * THE SLATE, ON THE DEPLOYED BUILD. Quotes what a real player sees for a real pile.
 *
 * `pile-13-10.mjs` drives the surface [[D-163]] retired (`.try-combine-btn`), so it can no
 * longer speak for this feature. This one drives the shipped one.
 *
 * Usage: node tools/slate-probe.mjs [url]
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const URL = process.argv[2] ?? 'https://karimfz007.github.io/drift/';
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
    await page.evaluate(() => {
        const b = document.querySelector('.cold-open button, .cold-open .action');
        if (b instanceof HTMLElement) b.click();
    });
    await sleep(600);
};

const stock = async (src) => {
    await page.goto(`${URL}__smoke_blank.html`, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await page.evaluate(({ key, src }) => {
        const env = JSON.parse(localStorage.getItem(key));
        // eslint-disable-next-line no-new-func
        new Function('state', src)(env.state);
        const n = Date.now();
        env.savedAtMs = n; env.state.lastSeenMs = n;
        localStorage.setItem(key, JSON.stringify(env));
    }, { key: SAVE_KEY, src });
    await boot();
};

const read = async (...mats) => {
    await page.evaluate(() => document.querySelector('.carried-button')?.click());
    await sleep(700);
    for (const m of mats) {
        await page.evaluate((mm) => document.querySelector(`.combine-chip[data-mat="${mm}"]`)?.click(), m);
        await sleep(280);
    }
    return page.evaluate(() => {
        const el = document.querySelector('.combine-slate');
        const slot = (s) => ({
            text: (s.textContent ?? '').trim(),
            attrs: Array.from(s.attributes).map((a) => `${a.name}=${a.value}`).join(' '),
        });
        return {
            known: el ? Array.from(el.querySelectorAll('.slate-slot.known')).map(slot) : [],
            unknown: el ? Array.from(el.querySelectorAll('.slate-slot.unknown')).map(slot) : [],
            combine: document.querySelector('.combine-btn')?.disabled ?? null,
            discover: document.querySelector('.discover-btn')?.disabled ?? null,
        };
    });
};

const WELL = 'state.player = { x: 0, y: 96 }; state.energy = 100; state.health = 100;'
    + ' state.warmth = 70; state.hunger = 90; state.thirst = 90;'
    + ' state.storage = { ...state.storage, built: false };';

console.log(`SLATE PROBE — ${URL}\n`);
await boot();
console.log(`served build : ${await page.evaluate(() => document.querySelector('meta[name="drift-build"]')?.getAttribute('content') ?? '?')}\n`);

const CASES = [
    {
        title: 'THE DIRECTOR\'S PILE — 13 wood + 10 stone, nothing ever made',
        setup: `${WELL} state.blueprints = [];`
            + ' state.inventory = { ...state.inventory, wood: 13, stone: 10, fiber: 0, sharpblade: 0 };',
        mats: ['wood', 'stone'],
    },
    {
        title: 'ONE KNOWN — holds the crate, the hammer still unworked-out',
        setup: `${WELL} state.blueprints = [{ recipeId: 'storage', name: 'Storage crate', version: 1,`
            + " discoveredAtGameHours: 0, workmanship: 'serviceable' }];"
            + ' state.inventory = { ...state.inventory, wood: 13, stone: 10, fiber: 0, sharpblade: 0 };',
        mats: ['wood', 'stone'],
    },
];

for (const c of CASES) {
    await stock(c.setup);
    const r = await read(...c.mats);
    console.log(`--- ${c.title} ---`);
    console.log(`  NAMED (${r.known.length})     : ${r.known.map((k) => k.text).join('  |  ') || '(none)'}`);
    console.log(`  ANONYMOUS (${r.unknown.length}) : ${r.unknown.map((u) => JSON.stringify(u.text)).join('  |  ') || '(none)'}`);
    console.log(`  slot attributes  : ${r.unknown.map((u) => `[${u.attrs}]`).join(' ') || '(none)'}`);
    console.log(`  Combine ${r.combine ? 'disabled' : 'ENABLED'} · Discover ${r.discover ? 'disabled' : 'ENABLED'}`);
    const leak = r.unknown.some((u) => /storage|crate|hammer/i.test(`${u.text} ${u.attrs}`));
    console.log(`  >> LAW 95: ${leak ? 'LEAKED' : 'no identity in any anonymous slot'}\n`);
}

await browser.close();
