#!/usr/bin/env node
/**
 * Brain/body purity check — Ops v1.3 §5 law 1, enforced mechanically.
 *
 * The brain must stay portable: a new body re-skins the game and reuses the brain untouched
 * — which Cycle 02 proved by swapping Phaser for Babylon with zero brain diffs. So no file
 * reachable from /src/brain may depend on ANY rendering engine, and the brain may never
 * import the body.
 *
 * This walks the **transitive import graph**, not just the text of the brain's own files.
 * A regex over /src/brain alone is not enough: a brain file importing `src/data/leak.ts`
 * which re-exports a renderer would sail straight through it, and the law would be enforced
 * in name only. (Found by the C3 audit of Cycle 01 — the original check had exactly that
 * hole.) When a violation is found we print the whole import chain, because the offending
 * file is usually not the one that has to change.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const brainDir = join(root, 'src', 'brain');
const bodyDir = join(root, 'src', 'body');

/**
 * Rendering engines the brain may never reach, however indirectly.
 *
 * Generalized at Cycle 02 (D-030): the law was never about Phaser, it was about the
 * brain staying portable. When the body swapped from Phaser to Babylon the forbidden
 * name changed and nothing else did — which is the law working exactly as intended.
 * Phaser stays on the list so the frozen 2D body can never creep back in.
 */
const FORBIDDEN_PACKAGES = [
    /^phaser($|\/)/,
    /^@babylonjs($|\/)/,
    /^babylonjs($|\/)/,
    /^three($|\/)/,
    /^pixi\.js($|\/)/,
    /^@playcanvas($|\/)/,
    /^playcanvas($|\/)/
];

const show = (file) => relative(root, file).split(sep).join('/');

function walkFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walkFiles(full));
        else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(full);
    }
    return out;
}

/** Strip comments so a sentence about Phaser is never mistaken for an import of it. */
function stripComments(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Any `import(...)` or `require(...)` whose argument is not a plain string literal.
 *
 * A computed specifier — `import(parts.join(''))` — is real, working code that no static
 * check can follow, so it is an escape hatch straight through the brain/body law. (Found
 * by the C3 re-audit of Cycle 01, on the *first* version of this fix.) The brain has no
 * legitimate use for one, so their mere presence is the violation.
 */
function unanalysableDynamicImports(source) {
    const code = stripComments(source);
    const literal = /^\s*['"][^'"]*['"]\s*$/;
    const found = [];
    for (const match of code.matchAll(/\b(?:import|require)\s*\(([^)]*)\)/g)) {
        if (!literal.test(match[1])) found.push(match[0].trim());
    }
    return found;
}

/** Every module specifier a file imports, re-exports, or dynamically imports. */
function importsOf(source) {
    const code = stripComments(source);
    const specifiers = new Set();
    const patterns = [
        /\bimport\s+[^'"]*?from\s*['"]([^'"]+)['"]/g,   // import x from 'y'
        /\bimport\s*['"]([^'"]+)['"]/g,                  // import 'y'
        /\bexport\s+[^'"]*?from\s*['"]([^'"]+)['"]/g,    // export { x } from 'y'
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,        // import('y')
        /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g        // require('y')
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
        for (const match of code.matchAll(pattern)) specifiers.add(match[1]);
    }
    //  Only keep specifiers that survive comment stripping.
    return [...specifiers].filter((s) => code.includes(s));
}

/** Resolve a relative specifier the way the bundler would. Returns null if unresolvable. */
function resolveRelative(fromFile, specifier) {
    const base = resolve(dirname(fromFile), specifier);
    const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.js`,
        `${base}.mjs`,
        join(base, 'index.ts'),
        join(base, 'index.js')
    ];
    for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
}

const violations = [];
const visited = new Set();

/** Depth-first walk of everything the brain can reach, carrying the chain for the report. */
function visit(file, chain) {
    if (visited.has(file)) return;
    visited.add(file);

    const source = readFileSync(file, 'utf8');
    const here = [...chain, show(file)];

    for (const call of unanalysableDynamicImports(source)) {
        violations.push({
            why: `uses a dynamic import no static check can follow: \`${call}\``,
            chain: [...here]
        });
    }

    for (const specifier of importsOf(source)) {
        if (FORBIDDEN_PACKAGES.some((pattern) => pattern.test(specifier))) {
            violations.push({
                why: `depends on '${specifier}'`,
                chain: [...here, `→ '${specifier}'`]
            });
            continue;
        }

        //  Bare specifiers other than the forbidden ones are third-party leaves; the
        //  dependency ledger governs those, not this check.
        if (!specifier.startsWith('.')) continue;

        const resolved = resolveRelative(file, specifier);
        if (!resolved) continue;

        if (resolved.startsWith(bodyDir)) {
            violations.push({
                why: 'imports the body (the dependency only ever runs body → brain)',
                chain: [...here, `→ ${show(resolved)}`]
            });
            continue;
        }

        visit(resolved, here);
    }
}

const entryPoints = walkFiles(brainDir);
for (const entry of entryPoints) visit(entry, []);

if (violations.length > 0) {
    console.error('BRAIN PURITY CHECK FAILED (Ops v1.3 §5 law 1)\n');
    for (const violation of violations) {
        console.error(`  ${violation.why}`);
        console.error(`    ${violation.chain.join('\n    ')}\n`);
    }
    console.error(`${violations.length} violation(s). Nothing the brain can reach may touch a rendering engine.`);
    process.exit(1);
}

console.log(
    `Brain purity check passed: ${entryPoints.length} brain files, ` +
    `${visited.size} modules in the closure, zero rendering-engine imports, zero body imports.`
);
