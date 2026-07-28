#!/usr/bin/env node
/**
 * Docs-integrity check — Ops v1.5 §4/§5 law 8, D-046(d).
 *
 * The decisions log is the one place a `D-NNN` reference is *defined* (a bold
 * `**D-NNN · <date> — ...**` header line). Every other living doc only ever *cites* one.
 * A citation with no matching definition is exactly what shipped silently in Cycle 05 —
 * `drift_state.md` pointed at "D-045" before the entry existed — and this check exists so
 * that gap fails CI instead of waiting to be noticed by hand.
 *
 * Scope is the living docs at `/docs/*.md` (the canon defined in Ops §2), not `/docs/archive/`
 * or `/docs/reference/`: archived doc snapshots are frozen history that may legitimately
 * predate a later renumbering (see D-036/D-037's own renumbering notes), and reference
 * material is external, not canon.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS_DIR = join(ROOT, 'docs');
const DECISIONS_LOG = 'drift_decisions_log.md';

const DEFINITION_RE = /^\*\*D-(\d+)\s*·/;
const REFERENCE_RE = /D-(\d+)\b/g;

/**
 * THE EFFECTIVITY LAW'S MISSING WITNESS (build law 12, D-076; C3 finding A6).
 *
 * D-076 names its own witness as "the docs-integrity check plus C3's audit reading",
 * and adds — in its own text — that this is stated explicitly "so it does not become
 * the first law to violate itself." It then became the first law to violate itself:
 * this file contained no effectivity logic whatsoever. Half its named mechanism did
 * not exist, which is precisely the unmarked middle the law forbids. C3 found it.
 *
 * So: every decision ratified AFTER the law must declare its own class on a line of
 * its own. The token is explicit and unambiguous because the word OPERATIVE is now
 * overloaded — D-076 uses it for a LAW's class, while D-077 uses it for a Ch.10
 * SECTION's class (paired with PROVISIONAL, which is not a law class at all). A
 * checker keying on the bare word would read a section classification as a self-
 * declaration and pass entries that never declared anything.
 *
 * FIRST_GOVERNED is 77 because the law "applies from ratification, no retroactive
 * audit required" — D-076's own words. Entries before it are out of scope by law,
 * not by convenience.
 */
const CLASS_LINE_RE = /^\*\*Class:\s*(OPERATIVE|DESIGN-BINDING)\*\*/m;
const FIRST_GOVERNED = 77;

function livingDocFiles() {
    return readdirSync(DOCS_DIR, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.md'))
        .map((e) => e.name)
        .sort();
}

function definedIds(decisionsLogText) {
    const ids = new Set();
    for (const line of decisionsLogText.split('\n')) {
        const m = DEFINITION_RE.exec(line);
        if (m) ids.add(m[1]);
    }
    return ids;
}

function findReferences(text) {
    const refs = [];
    const lines = text.split('\n');
    lines.forEach((line, i) => {
        // A definition line cites its own ID; skip it so it isn't checked against itself.
        if (DEFINITION_RE.test(line)) return;
        let m;
        REFERENCE_RE.lastIndex = 0;
        while ((m = REFERENCE_RE.exec(line))) {
            refs.push({ id: m[1], line: i + 1, text: line.trim() });
        }
    });
    return refs;
}

function main() {
    const files = livingDocFiles();
    if (!files.includes(DECISIONS_LOG)) {
        console.error(`Docs-integrity check FAILED: ${DECISIONS_LOG} not found under /docs.`);
        process.exit(1);
    }

    const decisionsLogText = readFileSync(join(DOCS_DIR, DECISIONS_LOG), 'utf8');
    const defined = definedIds(decisionsLogText);
    if (defined.size === 0) {
        console.error('Docs-integrity check FAILED: no D-NNN definitions found in the decisions log — regex likely broken.');
        process.exit(1);
    }

    const dangling = [];
    for (const file of files) {
        const text = readFileSync(join(DOCS_DIR, file), 'utf8');
        for (const ref of findReferences(text)) {
            if (!defined.has(ref.id)) {
                dangling.push({ file, ...ref });
            }
        }
    }

    //  Effectivity classes (D-076). Split the log into entries at their definition lines,
    //  then require a self-declaration from every entry the law governs.
    const undeclared = [];
    const lines = decisionsLogText.split('\n');
    const starts = [];
    lines.forEach((line, i) => { if (DEFINITION_RE.test(line)) starts.push(i); });
    starts.forEach((start, idx) => {
        const id = Number(DEFINITION_RE.exec(lines[start])[1]);
        if (id < FIRST_GOVERNED) return;
        const end = idx + 1 < starts.length ? starts[idx + 1] : lines.length;
        const body = lines.slice(start, end).join('\n');
        if (!CLASS_LINE_RE.test(body)) {
            undeclared.push({ id, line: start + 1, title: lines[start].slice(0, 90) });
        }
    });

    if (undeclared.length > 0) {
        console.error(`Docs-integrity check FAILED: ${undeclared.length} decision(s) ratified under build law 12 (D-076) with no effectivity class:\n`);
        for (const u of undeclared) {
            console.error(`  ${DECISIONS_LOG}:${u.line} — D-${u.id} declares no class`);
            console.error(`    ${u.title}...`);
            console.error('    Add a line: **Class: OPERATIVE** (mechanism named, shipped or same-batch)');
            console.error('             or: **Class: DESIGN-BINDING** (trigger named, explicitly not-yet-live)\n');
        }
        process.exit(1);
    }

    if (dangling.length > 0) {
        console.error(`Docs-integrity check FAILED: ${dangling.length} dangling D-reference(s) with no matching decisions-log entry:\n`);
        for (const d of dangling) {
            console.error(`  ${d.file}:${d.line} — cites D-${d.id}, not defined\n    "${d.text}"`);
        }
        process.exit(1);
    }

    const governed = [...defined].filter((d) => Number(d) >= FIRST_GOVERNED).length;
    console.log(`Docs-integrity check passed: ${defined.size} decisions defined, every D-reference across ${files.length} living docs resolves, and all ${governed} decision(s) under build law 12 declare an effectivity class.`);
}

main();
