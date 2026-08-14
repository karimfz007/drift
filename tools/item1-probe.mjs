/**
 * ITEM 1 PROBE — the panel's predicate, measured on a genuinely fresh life.
 *
 * The director reported three things on a fresh incognito save: a fire button offered on raw
 * material possession, a torch at game start, and a backpack present while `tools.backpack` is
 * false with no code path to true. The unified hypothesis is that the Build panel lists a
 * recipe when its INGREDIENTS suffice, regardless of whether the pattern is KNOWN.
 *
 * This measures all three from a clean browser context — the incognito case item 0 proved is a
 * real fresh life — at three moments: on arrival, holding one wood and one fibre, and holding
 * a fire's worth of wood. It reports what the PANEL and the HUD actually show, not what the
 * brain believes, so the answer is about the surface the player touches.
 *
 * Usage: node tools/item1-probe.mjs [url]
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
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 240_000 });
for (let i = 0; i < 120; i++) {
    if (await page.evaluate(() => Boolean(window.__drift?.sceneReady?.()))) break;
    await sleep(500);
}
await sleep(1200);

/** Give the survivor exactly these materials, on the same save, and reload into it. */
async function stock(mutation) {
    //  THE BLANK PAGE FIRST, and this is not ceremony. With the game still running, a reload
    //  fires its own persist on the way out and clobbers whatever was just written — my first
    //  cut skipped this and measured wood=0 three times in a row while claiming to have stocked
    //  1, 9 and 0. The harness's `editSave` navigates away for exactly this reason.
    await page.goto(`${URL}__smoke_blank.html`, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await page.evaluate(({ key, src }) => {
        const env = JSON.parse(localStorage.getItem(key));
        // eslint-disable-next-line no-new-func
        new Function('state', src)(env.state);
        env.savedAtMs = Date.now();
        env.state.lastSavedAtMs = Date.now();
        localStorage.setItem(key, JSON.stringify(env));
    }, { key: SAVE_KEY, src: mutation });
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 240_000 });
    for (let i = 0; i < 120; i++) {
        if (await page.evaluate(() => Boolean(window.__drift?.sceneReady?.()))) break;
        await sleep(500);
    }
    await sleep(900);
}

/** What the PLAYER can see: the HUD's action button, and the Build panel's rows. */
async function surfaces() {
    //  Dismiss the cold open if it is up, so the panel can be opened at all.
    await page.evaluate(() => {
        const b = document.querySelector('.cold-open button, .cold-open .action, .cold-open');
        if (b instanceof HTMLElement) b.click();
    });
    await sleep(500);
    const hud = await page.evaluate(() => {
        const a = document.querySelector('.action');
        const st = a ? getComputedStyle(a) : null;
        return {
            actionLabel: a ? (a.textContent || '').trim() : '(no button)',
            actionShown: Boolean(a && st && st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05),
            carriedButton: Boolean(document.querySelector('.carried-button')),
            //  VISIBLE, not merely present. Item 0's standard applied to the DOM: both icons
            //  ship in the markup, so "the element exists" says nothing about what a player
            //  sees — exactly the `enabled` trap, one layer up.
            packIconVisible: (() => {
                const e = document.querySelector('.carried-button .pack-icon');
                return Boolean(e && getComputedStyle(e).display !== 'none');
            })(),
            armsIconVisible: (() => {
                const e = document.querySelector('.carried-button .arms-icon');
                return Boolean(e && getComputedStyle(e).display !== 'none');
            })(),
        };
    });
    //  Open Build the way a player does — Law 126 retired the global Build button, so the
    //  route is the carry button then "make something", exactly as the harness's own
    //  `openBuild` helper does it.
    const opened = await page.evaluate(async () => {
        const pack = document.querySelector('.carried-button');
        if (!(pack instanceof HTMLElement)) return { pack: false, make: false };
        pack.click();
        await new Promise((r) => setTimeout(r, 450));
        const make = document.querySelector('.make-btn');
        if (!(make instanceof HTMLElement)) return { pack: true, make: false };
        make.click();
        return { pack: true, make: true };
    });
    await sleep(800);
    const panel = await page.evaluate(() => {
        const el = document.querySelector('.panel.build');
        if (!el) return { open: false, rows: [], hints: [] };
        const rows = Array.from(el.querySelectorAll('.build-item, .build-row')).map((r) => ({
            title: (r.querySelector('h3, .item-title')?.textContent ?? r.textContent ?? '').trim().split('\n')[0].slice(0, 40),
            hasButton: Boolean(r.querySelector('button')),
        }));
        const hints = Array.from(el.querySelectorAll('.panel-hint, .hint')).map((h) => (h.textContent ?? '').trim().slice(0, 80));
        return { open: true, rows, hints };
    });
    const brain = await page.evaluate(() => {
        const s = window.__drift.state();
        return {
            wood: s.inventory.wood, fiber: s.inventory.fiber,
            toolsBackpack: s.tools.backpack, torchOwned: s.torch.owned,
            blueprints: s.blueprints.map((b) => b.recipeId),
            isNight: null,
        };
    });
    await page.evaluate(() => {
        const c = document.querySelector('.panel.build .close-btn');
        if (c instanceof HTMLElement) c.click();
    });
    await sleep(400);
    return { hud, panel, brain, opened };
}

console.log(`ITEM 1 PROBE — ${URL}\n`);

for (const [label, mutation] of [
    ['ARRIVAL (nothing picked up)', 'state.inventory.wood = 0; state.inventory.fiber = 0;'],
    ['ONE WOOD + ONE FIBRE', 'state.inventory.wood = 1; state.inventory.fiber = 1;'],
    ['A FIRE\'S WORTH OF WOOD', 'state.inventory.wood = 9; state.inventory.fiber = 2;'],
]) {
    await stock(mutation);
    const s = await surfaces();
    console.log(`--- ${label} ---`);
    console.log(`  brain     : wood=${s.brain.wood} fiber=${s.brain.fiber} tools.backpack=${s.brain.toolsBackpack}`
        + ` torch.owned=${s.brain.torchOwned} blueprints=[${s.brain.blueprints.join(',')}]`);
    console.log(`  HUD action: "${s.hud.actionLabel}" shown=${s.hud.actionShown}`);
    console.log(`  carry btn : present=${s.hud.carriedButton} packVisible=${s.hud.packIconVisible} armsVisible=${s.hud.armsIconVisible}`);
    console.log(`  Build open: ${s.panel.open} (pack=${s.opened.pack} make=${s.opened.make})`);
    if (s.panel.open) {
        console.log(`  rows      : ${s.panel.rows.length ? s.panel.rows.map((r) => r.title).join(' | ') : '(none)'}`);
        console.log(`  hints     : ${s.panel.hints.length ? s.panel.hints.join(' | ') : '(none)'}`);
    }
    console.log('');
}

await browser.close();
