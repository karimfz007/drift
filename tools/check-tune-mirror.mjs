#!/usr/bin/env node
/**
 * THE HARNESS'S TUNE MIRROR MUST BE COMPLETE — and must agree with the real one.
 *
 * `tools/smoke.mjs` keeps its own copy of the tune constants, because it runs as plain node
 * against a built bundle and cannot import the TypeScript source. That copy has drifted twice:
 * once silently (`shelterRadius` simply absent, so `TUNE.shelterRadius` read `undefined`, a
 * reposition wrote NaN, and the check then blamed the game for a defect it did not have), and
 * once loudly (three collision radii missing, which the new Proxy would have thrown on
 * mid-run — costing a twenty-minute device run to learn something a second of static analysis
 * can prove).
 *
 * The Proxy turns a silent wrong answer into a loud one. This turns the loud one into one
 * caught before the run starts, and additionally checks that every mirrored VALUE still
 * matches `src/data/tune.ts`. A mirror that is complete but wrong is the worse failure.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const smoke = readFileSync(fileURLToPath(new URL('tools/smoke.mjs', root)), 'utf8');
const tuneSrc = readFileSync(fileURLToPath(new URL('src/data/tune.ts', root)), 'utf8');

const mirrorStart = smoke.indexOf('const TUNE = new Proxy({');
if (mirrorStart < 0) { console.error('TUNE mirror not found in tools/smoke.mjs'); process.exit(1); }
const mirrorEnd = smoke.indexOf('}, {', mirrorStart);
const mirrorBody = smoke.slice(mirrorStart, mirrorEnd);

const mirror = new Map();
for (const m of mirrorBody.matchAll(/^\s{4}([a-zA-Z][a-zA-Z0-9]*):\s*([-\d.]+)\s*,?\s*$/gm)) {
    mirror.set(m[1], Number(m[2]));
}

//  Every LIVE reference, ignoring comment lines — a `TUNE.x` inside prose is not a read.
const used = new Set();
for (const line of smoke.split('\n')) {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    for (const m of line.matchAll(/TUNE\.([a-zA-Z][a-zA-Z0-9]*)/g)) used.add(m[1]);
}

const missing = [...used].filter((k) => !mirror.has(k));
if (missing.length) {
    console.error(`TUNE mirror check FAILED: ${missing.length} live TUNE reference(s) absent from the mirror`);
    console.error(`  ${missing.join(', ')}`);
    console.error('  The Proxy in smoke.mjs would THROW on these mid-run. Add them to the mirror.');
    process.exit(1);
}

//  ...and every mirrored value must still match the real tune.
const drifted = [];
for (const [key, value] of mirror) {
    const m = new RegExp(`^\s*${key}:\s*([-\d.]+)\s*,`, 'm').exec(tuneSrc);
    if (!m) continue;                       // legitimately harness-only (e.g. world constants)
    if (Number(m[1]) !== value) drifted.push(`${key}: harness ${value} vs tune.ts ${m[1]}`);
}
if (drifted.length) {
    console.error(`TUNE mirror check FAILED: ${drifted.length} value(s) drifted from src/data/tune.ts`);
    for (const d of drifted) console.error(`  ${d}`);
    process.exit(1);
}

console.log(`TUNE mirror check passed: ${used.size} live references, all mirrored; ${mirror.size} mirrored values, none drifted from src/data/tune.ts.`);
