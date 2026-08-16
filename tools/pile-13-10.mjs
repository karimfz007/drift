/**
 * ONE PILE, EXACTLY AS ASKED: wood 13 + stone 10, fresh incognito save, nothing ever made.
 *
 * Drives the real DOM on production. Quotes the staging message verbatim, then follows the
 * survivor's own click through to whatever the attempt actually produces, so the two questions
 * — "was the disclosure there" and "is getting a crate correct" — are answered from the same
 * uninterrupted run rather than from two different ones.
 *
 * Usage: node tools/pile-13-10.mjs [url]
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
//  A FRESH INCOGNITO CONTEXT — its own storage partition, so nothing this machine has ever
//  played can leak into the save under test.
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

console.log(`PILE 13 WOOD + 10 STONE — ${URL}\n`);
await boot();
console.log(`served build : ${await page.evaluate(() => document.querySelector('meta[name="drift-build"]')?.getAttribute('content') ?? '?')}`);

//  THE ONLY EDIT: the two counts. Everything else is whatever a first-time save already is,
//  so "never made" is the save's own default rather than something reset on top of play.
await page.goto(`${URL}__smoke_blank.html`, { waitUntil: 'domcontentloaded', timeout: 240_000 });
await page.evaluate((key) => {
    const env = JSON.parse(localStorage.getItem(key));
    env.state.player = { x: 0, y: 96 };
    env.state.energy = 100; env.state.health = 100; env.state.hunger = 90; env.state.thirst = 90;
    env.state.inventory = { ...env.state.inventory, wood: 13, stone: 10, sharpblade: 0, fiber: 0 };
    const n = Date.now();
    env.savedAtMs = n; env.state.lastSeenMs = n;
    localStorage.setItem(key, JSON.stringify(env));
}, SAVE_KEY);
await boot();

const virginity = await page.evaluate(() => {
    const s = window.__drift.state();
    return {
        wood: s.inventory.wood, stone: s.inventory.stone,
        blueprints: s.blueprints.map((b) => b.recipeId),
        storageBuilt: s.storage.built,
        stoneHammer: s.tools.stonehammer ?? s.tools.hammer ?? false,
        experimentCount: s.experimentCount,
        nullPairs: s.knowledge.nullPairs.length,
    };
});
console.log(`fresh save   : wood ${virginity.wood}, stone ${virginity.stone}`);
console.log(`  plans held : [${virginity.blueprints.join(', ') || 'none'}]`);
console.log(`  crate built: ${virginity.storageBuilt}   stone hammer owned: ${virginity.stoneHammer}`);
console.log(`  attempts   : experimentCount ${virginity.experimentCount}, journalled dead ends ${virginity.nullPairs}\n`);

// ---- stage the pile through the real UI ------------------------------------------------
await page.evaluate(() => document.querySelector('.carried-button')?.click());
await sleep(700);
await page.evaluate(() => {
    for (const m of ['wood', 'stone']) document.querySelector(`.combine-chip[data-mat="${m}"]`)?.click();
});
await sleep(400);
await page.evaluate(() => {
    const b = document.querySelector('.try-combine-btn');
    if (b instanceof HTMLButtonElement && !b.disabled) b.click();
});
await sleep(1200);

const asked = await page.evaluate(() => {
    const el = document.querySelector('.panel.verb-circle');
    return {
        message: window.__drift.hints().last ?? '',
        options: el ? Array.from(el.querySelectorAll('.verb-seg')).map((s) => ({
            id: s.dataset.verb ?? '',
            label: (s.querySelector('.verb-label')?.textContent ?? '').trim(),
        })) : [],
    };
});
console.log('--- WHAT THE STAGING SURFACE SAID ---');
console.log(`  MESSAGE : "${asked.message}"`);
console.log(`  OPTIONS : ${asked.options.map((o) => `${o.label}[${o.id}]`).join('  |  ') || '(none)'}`);
console.log(`  disclosure clause present: ${/more than one thing here/i.test(asked.message) ? 'YES' : 'NO'}\n`);

// ---- and then the survivor's own click, through to the outcome --------------------------
await page.evaluate(() => {
    const seg = document.querySelector('.panel.verb-circle .verb-seg');
    if (seg instanceof HTMLElement) seg.click();
});
const floated = [];
    for (let i = 0; i < 24; i++) {
        const t = await page.evaluate(() => Array.from(document.querySelectorAll('.float-text')).map((e) => e.textContent.trim()));
        for (const x of t) if (!floated.includes(x)) floated.push(x);
        await sleep(120);
    }

const after = await page.evaluate(() => {
    const s = window.__drift.state();
    return {
        message: window.__drift.hints().last ?? '',
        wood: s.inventory.wood, stone: s.inventory.stone,
        blueprints: s.blueprints.map((b) => b.recipeId),
        storageBuilt: s.storage.built,
        experimentCount: s.experimentCount,
    };
});
console.log('--- WHAT THE CLICK ACTUALLY PRODUCED ---');
console.log(`  FLOAT   : ${floated.map((f) => JSON.stringify(f)).join(' | ') || '(none seen)'}`);
console.log(`  MESSAGE : "${after.message}"`);
console.log(`  plans held now: [${after.blueprints.join(', ') || 'none'}]`);
console.log(`  materials: wood ${virginity.wood} -> ${after.wood}, stone ${virginity.stone} -> ${after.stone}`);
console.log(`  crate built: ${after.storageBuilt}   attempts: ${virginity.experimentCount} -> ${after.experimentCount}`);

// ---- and the second attempt on the SAME pile, which is the whole point of the clause -----
await page.evaluate(() => document.querySelector('.panel.verb-circle')?.remove());
await sleep(400);
await page.evaluate(() => document.querySelector('.carried-button')?.click());
await sleep(700);
await page.evaluate(() => {
    for (const m of ['wood', 'stone']) document.querySelector(`.combine-chip[data-mat="${m}"]`)?.click();
});
await sleep(400);
await page.evaluate(() => {
    const b = document.querySelector('.try-combine-btn');
    if (b instanceof HTMLButtonElement && !b.disabled) b.click();
});
await sleep(1200);
const second = await page.evaluate(() => {
    const el = document.querySelector('.panel.verb-circle');
    return {
        message: window.__drift.hints().last ?? '',
        options: el ? Array.from(el.querySelectorAll('.verb-seg')).map((s) => ({
            id: s.dataset.verb ?? '',
            label: (s.querySelector('.verb-label')?.textContent ?? '').trim(),
        })) : [],
    };
});
console.log('\n--- THE SAME PILE, TRIED AGAIN ---');
console.log(`  MESSAGE : "${second.message}"`);
console.log(`  OPTIONS : ${second.options.map((o) => `${o.label}[${o.id}]`).join('  |  ') || '(none)'}`);

await page.evaluate(() => {
    const segs = Array.from(document.querySelectorAll('.panel.verb-circle .verb-seg'));
    const other = segs.find((s) => s.dataset.verb === 'try-something-else') ?? segs[segs.length - 1];
    if (other instanceof HTMLElement) other.click();
});
await sleep(1600);
const secondOut = await page.evaluate(() => {
    const s = window.__drift.state();
    return { message: window.__drift.hints().last ?? '', blueprints: s.blueprints.map((b) => b.recipeId) };
});
console.log(`  OUTCOME : "${secondOut.message}"`);
console.log(`  plans held now: [${secondOut.blueprints.join(', ') || 'none'}]`);

await browser.close();
