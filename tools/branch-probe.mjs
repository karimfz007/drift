/**
 * THE THREE-WAY BRANCH, CASE BY CASE, ON THE DEPLOYED BUILD.
 *
 * The last two rounds proved "does it ask". They never proved "does it ask CORRECTLY" — which
 * message, for which pile, and whether every valid outcome is listed. This drives the real DOM
 * on a clean context and quotes, per case: the pile staged, the exact message shown, and every
 * option offered.
 *
 * Usage: node tools/branch-probe.mjs [url]
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

/** Stage two chips through the real UI and read the message and options verbatim. */
async function stage(a, b) {
    await page.evaluate(() => {
        const el = document.querySelector('.carried-button');
        if (el instanceof HTMLElement) el.click();
    });
    await sleep(600);
    await page.evaluate(({ a, b }) => {
        for (const m of [a, b]) {
            const c = document.querySelector(`.combine-chip[data-mat="${m}"]`);
            if (c instanceof HTMLElement) c.click();
        }
    }, { a, b });
    await sleep(400);
    await page.evaluate(() => {
        const btn = document.querySelector('.try-combine-btn');
        if (btn instanceof HTMLButtonElement && !btn.disabled) btn.click();
    });
    await sleep(1100);
    return page.evaluate(() => {
        const el = document.querySelector('.panel.verb-circle');
        return {
            message: window.__drift.hints().last,
            options: el
                ? Array.from(el.querySelectorAll('.verb-seg')).map((s) => ({
                    id: s.dataset.verb ?? '',
                    label: (s.querySelector('.verb-label')?.textContent ?? '').trim(),
                }))
                : [],
            circleUp: Boolean(el),
            plans: window.__drift.state().blueprints.map((b) => b.recipeId),
        };
    });
}

const NAMED = /trying to make/i;
const LIST = /which are you making/i;
const GENERIC = /put them together|worked these out/i;

const holding = (...ids) => ids.map((id) =>
    `{ recipeId: '${id}', name: '${id}', version: 1, discoveredAtGameHours: 0, workmanship: 'serviceable' }`).join(', ');

const BASE = 'state.energy = 100; state.hunger = 100; state.thirst = 100; state.tools = { ...state.tools, spear: false };'
    + ' state.storage = { ...state.storage, built: false }; state.shelter = { ...state.shelter, built: false };';

const CASES = [
    {
        n: 1, title: 'ONE known outcome — the survivor HOLDS the spear plan',
        pile: '14 wood + 6 sharp stone', a: 'wood', b: 'sharpblade',
        setup: `${BASE} state.blueprints = [${holding('spear')}];`
            + ' state.inventory = { ...state.inventory, wood: 14, sharpblade: 6, stone: 0, fiber: 0 };',
        want: 'NAMED', expect: NAMED,
    },
    {
        n: 2, title: 'TWO known outcomes — the survivor HOLDS storage AND stonehammer',
        pile: '14 wood + 13 stone', a: 'wood', b: 'stone',
        setup: `${BASE} state.blueprints = [${holding('storage', 'stonehammer')}];`
            + ' state.inventory = { ...state.inventory, wood: 14, stone: 13, sharpblade: 0, fiber: 0 };',
        want: 'LIST', expect: LIST,
    },
    {
        n: '2b', title: 'TWO valid outcomes, NEITHER known — what the director actually staged',
        pile: '14 wood + 13 stone', a: 'wood', b: 'stone',
        setup: `${BASE} state.blueprints = [];`
            + ' state.inventory = { ...state.inventory, wood: 14, stone: 13, sharpblade: 0, fiber: 0 };',
        want: 'GENERIC (and see how many options)', expect: GENERIC,
    },
    {
        n: 3, title: 'ZERO known outcomes — a genuine first-time experiment',
        pile: '14 wood + 6 sharp stone, nothing known', a: 'wood', b: 'sharpblade',
        setup: `${BASE} state.blueprints = [];`
            + ' state.inventory = { ...state.inventory, wood: 14, sharpblade: 6, stone: 0, fiber: 0 };',
        want: 'GENERIC', expect: GENERIC,
    },
];

console.log(`BRANCH PROBE — ${URL}\n`);
await boot();
console.log(`served build: ${await page.evaluate(() => document.querySelector('meta[name="drift-build"]')?.getAttribute('content') ?? '?')}\n`);

for (const c of CASES) {
    await stock(c.setup);
    const r = await stage(c.a, c.b);
    const which = NAMED.test(r.message ?? '') ? 'NAMED'
        : LIST.test(r.message ?? '') ? 'LIST'
            : GENERIC.test(r.message ?? '') ? 'GENERIC' : 'OTHER';
    console.log(`--- CASE ${c.n}: ${c.title} ---`);
    console.log(`  pile staged : ${c.pile}`);
    console.log(`  plans held  : [${r.plans.join(', ') || 'none'}]`);
    console.log(`  MESSAGE     : "${r.message ?? '(none)'}"`);
    console.log(`  OPTIONS (${r.options.length}) : ${r.options.map((o) => `${o.label}[${o.id}]`).join('  |  ') || '(none)'}`);
    console.log(`  branch taken: ${which}     wanted: ${c.want}`);
    console.log(`  >> ${c.expect.test(r.message ?? '') ? 'CORRECT' : 'WRONG BRANCH'}`);
    console.log('');
}

await browser.close();
