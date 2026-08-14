/**
 * BENCH AUDIT (c) — every check that asserts WORDS without asserting the CHANGE the words claim.
 *
 * A game that says "the blade lost its edge" and changes no material is lying, and a check that
 * only reads the sentence cannot tell the difference. This scans the suite's own source and
 * sorts every check by what its CONDITION actually looks at:
 *
 *   TEXT-ONLY   — the condition reads only strings: /regex/.test(...), .includes('…'),
 *                 === 'some words', textContent comparisons. Presumed VACUOUS until each is
 *                 individually shown to be paired with a state assertion.
 *   STATE       — the condition reads game state, geometry, counts or booleans.
 *   MIXED       — both, which is what a text claim should look like.
 *
 * Static analysis, deliberately: the point is to produce the LIST, not to re-run the suite. A
 * check is identified by the expression between `check(` and the final `)` of its condition
 * argument, which is enough to see what it consults.
 *
 * Usage: node tools/bench-audit-text.mjs
 */
import { readFileSync } from 'node:fs';

const src = readFileSync('tools/smoke.mjs', 'utf8');
const lines = src.split('\n');

/** Pull the (name, condition) pair out of a check call that may span several lines. */
function callAt(startIdx) {
    let depth = 0, started = false, buf = '';
    for (let i = startIdx; i < lines.length && i < startIdx + 40; i++) {
        for (const ch of lines[i]) {
            if (ch === '(') { depth++; started = true; }
            else if (ch === ')') depth--;
            buf += ch;
            if (started && depth === 0) return { text: buf, endLine: i };
        }
        buf += '\n';
    }
    return null;
}

/** Split the top-level arguments of `check( ... )`. */
function args(callText) {
    const inner = callText.slice(callText.indexOf('(') + 1, callText.lastIndexOf(')'));
    const out = [];
    let depth = 0, cur = '', inStr = null;
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i], prev = inner[i - 1];
        if (inStr) {
            cur += ch;
            if (ch === inStr && prev !== '\\') inStr = null;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; cur += ch; continue; }
        if ('([{'.includes(ch)) depth++;
        if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
        cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

//  What "looks at words" means, and what "looks at the world" means.
//
//  MY FIRST CLASSIFIER OVER-REPORTED and I am recording why, because a list handed over as
//  authoritative while partly wrong is the exact sin this audit exists to find. The STATE
//  patterns were wrapped in a single word-boundary alternation, and a word boundary cannot
//  match before `===`, so every numeric and boolean comparison — `hub.tabCount === 3`,
//  `x >= 1` — fell through to TEXT-ONLY. Separate patterns now, each anchored for its shape.
//
//  Deliberately generous on the STATE side: a check gets the benefit of the doubt, so anything
//  still landing in TEXT-ONLY genuinely has nothing but strings in its condition.
const TEXTY = [
    /\.test\(/, /\.includes\(/, /\.match\(/, /toMatch/, /textContent/,
    /\.startsWith\(/, /\.endsWith\(/,
    //  A string comparison is only a TEXT claim when the string is PROSE. Comparing against
    //  an identifier — activeHand === "spear", tapTargetAt === "raft" — is a state assertion
    //  that happens to be spelled with quotes, and the first pass flagged four of exactly
    //  those as vacuous before I read them. Prose is what has a space in it.
    new RegExp("[=!]==\\s*['\"`][^'\"`]*\\s[^'\"`]*['\"`]"),
];
const STATEY = [
    //  Comparisons against numbers, booleans and null — the shape of a state assertion.
    /[=!]==\s*(true|false|null|undefined|-?\d)/, /[<>]=?\s*-?\d/, /-?\d\s*[<>]=?/,
    /\.length/, /Math\./, /Number\./, /Boolean\(/, /typeof /,
    //  The game's own vocabulary.
    /(state|inventory|nodes|tools|blueprints|energy|health|thirst|hunger|warmth|fatigue)/,
    /(player|capacities|skills|knowledge|fire|shelter|storage|radio|raft|illness|injuries)/,
    /(trace|pool|available|owned|built|count|opacity|width|height|visible|enabled)/,
    /meshInfo|screenOf|panelOpen|renderCost|tapTrail|pending/,
];
const anyOf = (pats, s) => pats.some((r) => r.test(s));

const results = { textOnly: [], state: [], mixed: [] };

for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\b(check|measuredIntermittent|knownOpen)\s*\(/);
    if (!m) continue;
    const call = callAt(i);
    if (!call) continue;
    const parts = args(call.text);
    if (parts.length < 2) continue;
    const name = parts[0].replace(/^['"`]|['"`]$/g, '').replace(/\s+/g, ' ').slice(0, 96);
    const cond = parts[1];
    const texty = anyOf(TEXTY, cond);
    const statey = anyOf(STATEY, cond);
    const row = { line: i + 1, name, cond: cond.replace(/\s+/g, ' ').slice(0, 130) };
    if (texty && !statey) results.textOnly.push(row);
    else if (texty && statey) results.mixed.push(row);
    else results.state.push(row);
    i = call.endLine;
}

const total = results.textOnly.length + results.state.length + results.mixed.length;
console.log('BENCH AUDIT (c) — what each check\'s CONDITION actually consults\n');
console.log(`  checks scanned : ${total}`);
console.log(`  STATE-only     : ${results.state.length}`);
console.log(`  MIXED          : ${results.mixed.length}   (text AND state — the right shape for a text claim)`);
console.log(`  TEXT-ONLY      : ${results.textOnly.length}   <-- presumed vacuous until individually proven\n`);

//  WHAT THIS LIST IS, AND WHAT IT IS NOT — stated in the output so the caveat travels with
//  the data rather than living in a report nobody re-reads.
//
//  It is a CANDIDATE SET, not a verdict. This is regex over JavaScript source, and reading
//  four of the flagged checks found conditions that genuinely do assert state:
//  `tools.axe === migrated.tools.axe`, `JSON.stringify(inventory) === …`,
//  `activeHand === 'axe'`, `tapTargetAt === 'raft'`. A comparison against a bare identifier
//  looks textual and is not.
//
//  So the number is an UPPER BOUND on the vacuous set. Treat every row as "review this one",
//  which is precisely the standard asked for: presumed vacuous until individually proven
//  otherwise. Several rows below are also legitimately about wording — Law 145's sensations,
//  Law 95's refusal to name a product, the debug export's own contents — and for those, text
//  IS the subject and asserting on it alone is correct.
console.log('  NOTE: a CANDIDATE SET, not a verdict — regex over JS source, with known false');
console.log('  positives. Every row needs individual review; some are legitimately text claims.\n');
console.log('TEXT-ONLY CHECKS — each asserts words, and nothing about the world:\n');
for (const r of results.textOnly) {
    console.log(`  smoke.mjs:${String(r.line).padEnd(5)} ${r.name}`);
    console.log(`              cond: ${r.cond}`);
}
