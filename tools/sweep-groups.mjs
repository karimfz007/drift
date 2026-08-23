/**
 * THE SWEEP, IN GROUPS — the same checks, reported in pieces you can act on.
 *
 * WHY THIS EXISTS. The device suite takes about three and a half hours, and that number stopped
 * being a footnote once it exceeded the length of a working session: a red at check 500 costs the
 * whole afternoon before you learn about it, and the fix costs another afternoon to re-witness.
 * Four sweeps in one session produced exactly two usable verdicts for that reason.
 *
 * WHAT IT IS NOT. This is NOT a substitute for the full sweep, and it does not pretend to be —
 * every group prints "FILTERED RUN — NOT A CONFIRMING PASS" in the harness's own words, and the
 * summary here repeats it. What it buys is ATTRIBUTION and CHEAP RE-RUNS: a red names its group,
 * and re-witnessing that fix costs fifteen minutes rather than three and a half hours. The full
 * sweep still ships to main.
 *
 * WHY CONTIGUOUS RANGES, IN FILE ORDER. Order is load-bearing. Four sections still read a binding
 * an earlier section assigns, and many more inherit world state that nothing declares — a shelter
 * standing, a recipe known, a quarry half-spent. Any grouping that reordered or interleaved
 * sections would produce a different answer than the full sweep, quietly, which is the exact
 * vacuity this project keeps finding. So groups are contiguous, run in file order, and the four
 * known dependency spans are never split across a boundary.
 *
 * WHY SERIAL. The bench mutex is one exclusive lock over the whole bench, and the rule that came
 * out of four sessions of misdiagnosis is that nobody shares it. Running groups in parallel would
 * share `dist/` and the screenshot directory between live browsers, so this does not do that.
 * The total wall-clock is therefore the same as a full sweep, plus one browser launch per group.
 * The win is attribution, not speed, and claiming otherwise would be the lie this file is for.
 *
 * THE RESIDUAL RISK, NAMED. Each group boots fresh, so state a group inherited from an earlier
 * section in the full run is absent here. A group can therefore pass in isolation and fail in the
 * full sweep. That gap is real, it is not measured by this tool, and it is why the full sweep
 * remains the record.
 *
 *   node tools/sweep-groups.mjs                 all groups, in order
 *   node tools/sweep-groups.mjs 3               just group 3
 *   node tools/sweep-groups.mjs 3-5             groups 3 through 5
 *   node tools/sweep-groups.mjs --plan          print the plan and exit, run nothing
 */
import { spawn } from 'node:child_process';
import { readFileSync, createWriteStream, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const SMOKE = fileURLToPath(new URL('./smoke.mjs', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../.smoke/', import.meta.url));

/**
 * Group boundaries as section INDICES, inclusive. Derived from measured section cost (reboots
 * dominate: each `editSave` is a full page reload) against a ~20 minute target, with the four
 * cross-section dependency spans — [9..14] and [22..28] — kept whole.
 *
 * G3 is 33 minutes and cannot be split: `A4 — death and respawn` reads `afterShelter` from
 * `A1–A4`, and `A4 — absence` reads `revived` from it in turn, so 9 through 14 is one atom.
 *
 * G12 — WAVE 1's two sections plus the ground-hold/Build-panel/knap ruling, the workspace
 * ladder, the pond boundary, the three-items batch and the siting-lock fix, [58, 65] — its
 * own group rather than folded onto the tail of G11: between them they run roughly a dozen
 * `editSave` reloads plus two `goAway` returns (one of which stages a near-maximum shore for
 * the PERF sample), which would have pushed G11 well past its own ~20 minute target. The
 * ruling sections (60-61) joined this group rather than starting a G13 of their own: they
 * are the smaller of the four (no `goAway`, a handful of `editSave` reloads between them)
 * and G12 already carries the same "recent, related, still settling" batch. Sized on the
 * same measured-cost basis as every other boundary here, not on "it was convenient to
 * append". Section 61 (D-175, item 5's walking-energy ruling) is two checks and two
 * `editSave` reloads — folded into the same "recent, related" reasoning as section 60
 * rather than earning a G13 of its own for that alone.
 *
 * Section 62 (SESSION 1, the workspace ladder) joins them for the third time on the same
 * basis, and it is the point at which G12 should be watched: it carries four `editSave`
 * reloads and a real `goAway`, which is the single most expensive thing a section can do.
 * G12 is now the group most likely to outgrow the ~20 minute target, and the honest fix
 * when it does is a G13 boundary rather than a quieter target.
 */
const GROUPS = [
    [0, 7], [8, 8], [9, 14], [15, 19], [20, 21], [22, 29],
    [30, 34], [35, 38], [39, 44], [45, 49], [50, 57], [58, 65],
];

const names = [...readFileSync(SMOKE, 'utf8').matchAll(/^ {4}if \(section\((["'])(.*?)\1\)\) \{\s*$/gm)]
    .map((m) => m[2]);
if (names.length === 0) throw new Error('no sections found in smoke.mjs');

//  A BOUND MUST NAME EXACTLY ONE SECTION. `--from`/`--to` match by substring, so a name that is
//  contained in another name would silently select the wrong end of a range. Checked rather than
//  assumed, because a mis-selected bound reads as a pass over the wrong sections.
const ambiguous = [];
for (const [lo, hi] of GROUPS) {
    for (const i of [lo, hi]) {
        const hits = names.filter((n) => n.toLowerCase().includes(names[i].toLowerCase()));
        if (hits.length !== 1) ambiguous.push(`[${i}] ${names[i]} matches ${hits.length} sections`);
    }
}
if (ambiguous.length > 0) {
    console.error('AMBIGUOUS GROUP BOUND(S):\n  ' + ambiguous.join('\n  '));
    process.exit(2);
}
if (GROUPS[0][0] !== 0 || GROUPS[GROUPS.length - 1][1] !== names.length - 1) {
    console.error(`GROUPS do not cover all ${names.length} sections — first is ${GROUPS[0][0]}, last is ${GROUPS[GROUPS.length - 1][1]}.`);
    process.exit(2);
}
for (let g = 1; g < GROUPS.length; g++) {
    if (GROUPS[g][0] !== GROUPS[g - 1][1] + 1) {
        console.error(`GAP OR OVERLAP between group ${g} and ${g + 1}: ${GROUPS[g - 1][1]} -> ${GROUPS[g][0]}`);
        process.exit(2);
    }
}

const arg = process.argv[2] ?? '';
if (arg === '--plan') {
    console.log(`${GROUPS.length} groups over ${names.length} sections:\n`);
    GROUPS.forEach(([lo, hi], i) => {
        console.log(`  G${i + 1}  sections ${lo}-${hi}`);
        console.log(`      --from="${names[lo]}"`);
        console.log(`      --to="${names[hi]}"`);
    });
    process.exit(0);
}

let want = GROUPS.map((_, i) => i);
if (arg) {
    const m = arg.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) { console.error(`Not a group or range: ${arg}`); process.exit(2); }
    const lo = Number(m[1]) - 1, hi = Number(m[2] ?? m[1]) - 1;
    if (lo < 0 || hi >= GROUPS.length || hi < lo) { console.error(`Out of range: 1-${GROUPS.length}`); process.exit(2); }
    want = [];
    for (let i = lo; i <= hi; i++) want.push(i);
}

mkdirSync(OUT_DIR, { recursive: true });
const startedAll = Date.now();
const results = [];

for (const gi of want) {
    const [lo, hi] = GROUPS[gi];
    const label = `G${gi + 1}`;
    const logPath = join(OUT_DIR, `group-${String(gi + 1).padStart(2, '0')}.txt`);
    console.log(`\n${'='.repeat(72)}\n${label}  sections ${lo}-${hi}  (${hi - lo + 1})\n     ${names[lo]}\n  -> ${names[hi]}\n${'='.repeat(72)}`);

    const started = Date.now();
    //  STREAMED, NOT CAPTURED. `spawnSync` hands you the whole log only once the child exits, so
    //  a 33-minute group was 33 minutes of no output at all — the same blindness that made the
    //  full sweep unusable, reproduced at group scale. The log file is written as it arrives so
    //  progress can be read while it runs.
    const { status, text } = await new Promise((resolve) => {
        const sink = createWriteStream(logPath, { flags: 'w' });
        let buf = '';
        const child = spawn(process.execPath, [SMOKE, `--from=${names[lo]}`, `--to=${names[hi]}`], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const take = (d) => { const s = String(d); buf += s; sink.write(s); };
        child.stdout.on('data', take);
        child.stderr.on('data', take);
        child.on('close', (code) => { sink.end(); resolve({ status: code, text: buf }); });
        child.on('error', (err) => { sink.end(); resolve({ status: -1, text: buf + '\n' + String(err) }); });
    });
    const run = { status };
    const secs = Math.round((Date.now() - started) / 1000);

    const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    const fails = clean.split('\n').filter((l) => /^\s{2}FAIL\s/.test(l));
    const tally = clean.match(/^(\d+)\/(\d+) checks passed, across (\d+) of (\d+) sections\./m);
    const ranSections = tally ? Number(tally[3]) : null;
    const ok = run.status === 0 && fails.length === 0;

    results.push({ label, lo, hi, secs, ok, code: run.status, fails, ranSections, logPath, tally: tally?.[0] ?? null });
    console.log(`\n${label}: ${ok ? 'GREEN' : 'RED'}  exit=${run.status}  ${Math.floor(secs / 60)}m${secs % 60}s  ${tally?.[0] ?? '(no tally line — the run did not reach its summary)'}`);
    if (ranSections !== null && ranSections !== hi - lo + 1) {
        console.log(`  WARNING: ran ${ranSections} sections, expected ${hi - lo + 1} — the range did not select what the plan says.`);
    }
    for (const f of fails) console.log('   ' + f.trim().slice(0, 150));
    console.log(`  log: ${logPath}`);
}

const mins = Math.round((Date.now() - startedAll) / 60000);
const red = results.filter((r) => !r.ok);
console.log(`\n${'='.repeat(72)}\nGROUPED SWEEP — NOT A CONFIRMING PASS (the full sweep is the record)\n${'='.repeat(72)}`);
for (const r of results) {
    console.log(`  ${r.ok ? 'GREEN' : 'RED  '}  ${r.label.padEnd(4)} sections ${String(r.lo).padStart(2)}-${String(r.hi).padEnd(2)}  ${String(Math.floor(r.secs / 60)).padStart(3)}m  ${r.fails.length} failure(s)`);
}
console.log(`\n${results.length - red.length}/${results.length} groups green in ${mins} min.`);
if (red.length > 0) {
    console.log(`\nRED: ${red.map((r) => `${r.label} (re-run: node tools/sweep-groups.mjs ${r.label.slice(1)})`).join(', ')}`);
    process.exit(1);
}
