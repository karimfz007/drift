#!/usr/bin/env node
/**
 * Brain/body purity check — Ops v1.2 §5 law 1, enforced mechanically.
 *
 * The brain must stay portable: a future native/Godot port re-skins the body and reuses
 * the brain untouched. Any Phaser reference under /src/brain fails the build, as does
 * any import reaching back into /src/body (the dependency only ever runs body → brain).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const brainDir = join(root, 'src', 'brain');

const FORBIDDEN = [
    { pattern: /\bfrom\s+['"]phaser['"]/, why: "imports 'phaser'" },
    { pattern: /\bfrom\s+['"]phaser\//, why: "imports a phaser submodule" },
    { pattern: /\brequire\(\s*['"]phaser['"]\s*\)/, why: "requires 'phaser'" },
    { pattern: /\bimport\(\s*['"]phaser['"]\s*\)/, why: "dynamically imports 'phaser'" },
    { pattern: /\bPhaser\s*\./, why: 'references the Phaser global' },
    { pattern: /\bfrom\s+['"](\.\.\/)+body\//, why: 'imports from the body' }
];

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(full);
    }
    return out;
}

const violations = [];

for (const file of walk(brainDir)) {
    const source = readFileSync(file, 'utf8');
    let inBlockComment = false;
    source.split('\n').forEach((line, index) => {
        // Comments describing the law are not violations of it.
        const trimmed = line.trim();
        const opensBlock = /\/\*/.test(trimmed);
        const closesBlock = /\*\//.test(trimmed);
        const isComment =
            inBlockComment ||
            trimmed.startsWith('//') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('/*');
        if (opensBlock && !closesBlock) inBlockComment = true;
        if (closesBlock) inBlockComment = false;
        if (isComment) return;

        const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
        for (const { pattern, why } of FORBIDDEN) {
            if (pattern.test(code)) {
                violations.push(
                    `${relative(root, file).split(sep).join('/')}:${index + 1} — ${why}\n    ${line.trim()}`
                );
            }
        }
    });
}

if (violations.length > 0) {
    console.error('BRAIN PURITY CHECK FAILED (Ops v1.2 §5 law 1)\n');
    for (const v of violations) console.error(`  ${v}`);
    console.error(`\n${violations.length} violation(s). The brain must contain zero Phaser.`);
    process.exit(1);
}

console.log('Brain purity check passed: zero Phaser under /src/brain.');
