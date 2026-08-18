/**
 * THE SELECTOR GATE — a retirement that leaves dead references behind fails BY NAME.
 *
 * WHY THIS EXISTS, and it is not a tidiness tool. Three consecutive retirements — [[D-163]]'s
 * `try-combine-btn`, [[D-164]]'s site card, [[D-165]]'s ten craft rows — each left the device
 * harness driving controls the product had stopped drawing. Twelve checks sat red on main while
 * the product was correct in every one of them, and nobody saw it because the active-hours rule
 * runs only the sections being touched: a retirement's blast radius is invisible until something
 * runs the rest. A suite with standing reds is a suite nobody reads, which is exactly where a
 * real failure hides.
 *
 * WHAT IT CHECKS. Every DOM selector the harness drives must be one the product can actually
 * produce. Two failure modes, and the second is the one that bit us:
 *
 *   DANGLING — the selector appears nowhere in the body layer at all. `try-combine-btn` after
 *     the slate replaced it.
 *   BOUND BUT UNDRAWN — the selector is still wired (`bind('.torch-btn', …)`) while nothing
 *     renders it. This reads as a live surface to anyone auditing the file, and a stale check
 *     attaches itself to it happily. Caught by requiring the selector to appear in MARKUP —
 *     inside a template string that emits it — not merely somewhere in the file.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not run the game, so it cannot know whether a
 * rendered control is REACHABLE — that is the device harness's job and always was. This is the
 * cheap static half that makes the expensive dynamic half trustworthy.
 */
import { readFileSync } from 'node:fs';

const BODY = ['src/body/hud.ts', 'src/body/game.ts', 'src/body/runtime.ts', 'index.html'];
const HARNESS = ['tools/smoke.mjs'];

/**
 * Selectors that are legitimately absent from the body because something else owns them.
 * Each one needs a REASON, not just an entry — an allowlist without reasons becomes the place
 * dead references go to hide, which is the defect this file exists to prevent.
 */
const ALLOWED = new Map([
    ['cold-open', 'the boot overlay, emitted by index.html before the body loads'],
    ['rotate-note', 'the portrait prompt, also pre-body'],
]);

/** Class-ish selectors the harness drives: buttons, chips, rows, slots, named lines. */
const SELECTOR = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:-btn|-chip|-item|-row|-slot|-seg|-line|-name|-open|-note))\b/g;

const bodySource = BODY.map((f) => readFileSync(f, 'utf8')).join('\n');

/**
 * Does the body actually EMIT this class, rather than merely mention it?
 *
 * Emission means it appears inside a class attribute somewhere — `class="… foo-btn …"` — or is
 * assigned to `className`. A `bind('.foo-btn', …)` or a `querySelector('.foo-btn')` is a
 * mention, and a mention is exactly what a retirement leaves behind.
 */
/** A whole-token boundary: neither a word character nor a hyphen may sit either side. */
const EDGE_BEFORE = '(?<![\\w-])';
const EDGE_AFTER = '(?![\\w-])';
const token = (sel) => new RegExp(EDGE_BEFORE + sel + EDGE_AFTER);

/**
 * Does the body MENTION this class as a whole token?
 *
 * The boundary matters more than it looks. A plain `includes` reports `shelter-btn` as present
 * because `mend-shelter-btn` contains it, and `storage-btn` because `use-storage-btn` does —
 * so two of the retired craft buttons hid inside surviving ones and the gate passed them on its
 * first run. Hyphen-joined class names collide constantly; the lookarounds refuse a partial.
 */
function isMentioned(sel) {
    return token(sel).test(bodySource);
}

function isDrawn(sel) {
    const T = EDGE_BEFORE + sel + EDGE_AFTER;
    const inClassAttr = new RegExp(`class=["'\`][^"'\`]*${T}`);
    const inClassName = new RegExp(`className\\s*=\\s*["'\`][^"'\`]*${T}`);
    const inClassList = new RegExp(`classList\\.add\\(\\s*["'\`]${sel}["'\`]`);
    //  `panel(overlay, 'build')` and friends compose a class from a bare string argument.
    const asPanelName = new RegExp(`panel\\([^,]+,\\s*[\`'"][^\`'"]*${T}`);
    return inClassAttr.test(bodySource) || inClassName.test(bodySource)
        || inClassList.test(bodySource) || asPanelName.test(bodySource);
}

const seen = new Map(); // selector -> [{file, line}]
for (const file of HARNESS) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        //  Skip comment-only lines: prose naming a retired control is a RECORD, not a drive.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const hit of line.matchAll(SELECTOR)) {
            const sel = hit[1];
            if (!seen.has(sel)) seen.set(sel, []);
            seen.get(sel).push({ file, line: i + 1 });
        }
    });
}

const dangling = [];
const mentionedOnly = [];
for (const [sel, uses] of seen) {
    if (ALLOWED.has(sel)) continue;
    const present = isMentioned(sel);
    if (!present) { dangling.push({ sel, uses }); continue; }
    if (!isDrawn(sel)) mentionedOnly.push({ sel, uses });
}

const fail = dangling.length + mentionedOnly.length;
if (fail === 0) {
    console.log(`Selector gate passed: ${seen.size} selectors driven by the harness, every one`
        + ` genuinely emitted by the body (${ALLOWED.size} allowed exception(s), each with a reason).`);
    process.exit(0);
}

console.log(`Selector gate FAILED: ${fail} selector(s) the harness drives that the product does`
    + ' not draw. A retirement left references behind — rewrite the checks onto the surface that'
    + ' replaced it, or retire them with the reason recorded.\n');

const report = (title, list) => {
    if (list.length === 0) return;
    console.log(`  ${title}`);
    for (const { sel, uses } of list) {
        console.log(`    .${sel}`);
        for (const u of uses.slice(0, 6)) console.log(`        ${u.file}:${u.line}`);
        if (uses.length > 6) console.log(`        …and ${uses.length - 6} more`);
    }
    console.log('');
};
report('DANGLING — nothing in the body mentions these at all:', dangling);
report('MENTIONED BUT NEVER DRAWN — wired, but no markup emits them:', mentionedOnly);
process.exit(1);
