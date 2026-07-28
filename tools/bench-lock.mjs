/**
 * THE BENCH MUTEX (D-072, completed).
 *
 * One exclusive lock over the whole bench — harness runs, builds, and C3 audits alike.
 * Not one lock per activity: the failure this closes was a second *build* corrupting a
 * running harness's `dist/`, and before that a second harness killing the first's browser.
 *
 * SCOPE, STATED HONESTLY (C3 MAJOR-2). The harness takes this lock itself, so it is covered
 * whether or not anyone wraps it. A BUILD is only covered when it goes through the bench —
 * which `npm run build` now does, via `tools/bench-build.mjs`. C3 measured the gap that made
 * this sentence prose rather than mechanism: with the bench held, an unwrapped `npm run
 * typecheck` ran to completion. Typecheck and unit tests are deliberately NOT covered — they
 * touch neither `dist/` nor a browser, which are the only two things the bench protects.
 * Sharing the bench in any combination has cost this project four sessions of misdiagnosis,
 * so the rule is simply that nobody shares it. Contenders queue or refuse; never proceed.
 *
 * Usage as a library:   import { acquire, release } from './bench-lock.mjs'
 * Usage as a wrapper:   node tools/bench-lock.mjs run "<label>" -- <command...>
 *   ...which takes the lock, runs the command, and releases on every exit path.
 *
 * On Windows the wrapped command goes through a shell (npm and npx are .cmd shims there),
 * so a multi-line inline script — `-- node -e "<many lines>"` — will not survive the trip.
 * Put such a script in a file and wrap `node <file>` instead.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

//  The lock file is overridable ONLY so the mutex's own tests can run against a private
//  lock instead of the live one — without that, testing the bench would mean fighting any
//  real run for it, and the alternative (skip when busy) is a vacuous test (D-066). Nothing
//  in the app or the harness sets this; if you find it set anywhere else, that is a bug.
//  Gated on VITEST (C3 NOTE): the override is opt-in, never set accidentally, and the
//  alternative — skip-the-test-when-busy — would be vacuous under D-066. Gating it means
//  it is not merely unused in production but unreachable there.
const LOCK = (process.env.VITEST && process.env.DRIFT_BENCH_LOCK_FILE)
    || join(fileURLToPath(new URL('../.smoke/', import.meta.url)), 'bench.lock');

/** Is the process that holds the lock still alive? A dead holder's lock is stale, not binding. */
function holderAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0) return false;
    try { process.kill(pid, 0); return true; } catch { return false; }
}

/**
 * C3 MAJOR-1. This used to `catch { return null }`, which told the caller "the bench is
 * FREE" when the truth was "I cannot tell." `acquire` then deleted the file and took the
 * bench. Measured by C3: a live holder plus a truncated lock file let a stranger walk in.
 * The file was written non-atomically, so a torn write or a hard kill mid-write produced
 * exactly that state.
 *
 * Two changes. Unparseable now reads as HELD by an unknown holder — the safe direction,
 * since over-refusing costs a wait and under-refusing costs the corrupted bench D-072
 * exists to prevent. And `acquire` writes via tmp+rename, so the torn state stops being
 * reachable in the first place.
 */
export function readHolder() {
    if (!existsSync(LOCK)) return null;
    let raw;
    try {
        raw = JSON.parse(readFileSync(LOCK, 'utf8'));
    } catch {
        return { pid: -1, label: 'UNREADABLE lock file — treated as held, not free', since: 'unknown', unreadable: true };
    }
    return holderAlive(raw.pid) ? raw : null;
}

/**
 * RE-ENTRANCY ACROSS THE PROCESS TREE.
 *
 * The wrapper takes the lock and then runs a command. If that command also takes the
 * lock — and the device harness does, by design, because it must refuse to run on a
 * shared bench even when nobody wrapped it — the child waits on a lock its own parent
 * holds and will not release until the child exits. Deadlock, not refusal: a silent
 * 30-minute hang with three lines of output.
 *
 * This is not hypothetical. I hit it running the FIX-5 A/B: `bench-lock run "..." --
 * node tools/smoke.mjs` sat at "No git worktree operation in progress." until I killed
 * it. C3's finding A3 had already reported the wrapper couldn't wrap the harness; the
 * cause is here.
 *
 * The wrapper hands its lock down through the environment. A descendant that finds
 * DRIFT_BENCH_LOCK matching the live lock file's pid is already inside the bench and
 * takes it as a no-op — so nesting is safe, and an UNWRAPPED harness still refuses a
 * genuinely contended bench exactly as before.
 */
const HANDOFF = 'DRIFT_BENCH_LOCK';
let heldNonce = null;

function heldByAncestor() {
    //  C3 NOTE: keying on pid alone let a descendant that outlives its wrapper keep a
    //  handoff forever, and Windows recycles pids — a later unrelated holder drawing that
    //  pid would have admitted the stale descendant. The handoff now carries a nonce that
    //  must match the live lock file's, so it is valid only for the exact hold that issued it.
    const inherited = String(process.env[HANDOFF] ?? '');
    if (!inherited.includes(':')) return false;
    const [pidPart, noncePart] = inherited.split(':');
    const holder = readHolder();
    return Boolean(holder) && !holder.unreadable
        && holder.pid === Number(pidPart) && holder.nonce === noncePart;
}

/** The handoff a child inherits: this pid plus the nonce of the hold that issued it. */
export function handoffToken() {
    return `${process.pid}:${heldNonce ?? ''}`;
}

/**
 * Take the bench. Returns a release function.
 * `waitMs > 0` queues for that long before giving up; 0 refuses immediately.
 */
export async function acquire(label, waitMs = 0) {
    if (heldByAncestor()) return () => {}; // already ours, one level up
    mkdirSync(dirname(LOCK), { recursive: true });
    const deadline = Date.now() + waitMs;
    for (;;) {
        const holder = readHolder();
        if (!holder) break;
        if (Date.now() >= deadline) {
            throw new Error(
                `bench busy: ${holder.label} (pid ${holder.pid}, since ${holder.since}). ` +
                'Concurrent bench use is forbidden (D-072) — wait for it or stop it.'
            );
        }
        await new Promise((r) => setTimeout(r, 2000));
    }
    if (existsSync(LOCK)) { try { unlinkSync(LOCK); } catch { /* stale; raced */ } }
    //  A nonce unique to THIS hold — see `heldByAncestor`. Not security, just identity:
    //  it distinguishes this hold from a later one that happens to draw the same pid.
    const nonce = `${process.pid.toString(36)}${Math.floor(performance.now() * 1000).toString(36)}`;
    heldNonce = nonce;
    //  tmp+rename: rename is atomic, so a reader never sees a half-written lock (C3 MAJOR-1).
    const tmp = `${LOCK}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify({ pid: process.pid, label, since: new Date().toISOString(), nonce }));
    renameSync(tmp, LOCK);
    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        try {
            const raw = JSON.parse(readFileSync(LOCK, 'utf8'));
            if (raw.pid === process.pid) unlinkSync(LOCK); // never release someone else's lock
        } catch { /* already gone */ }
    };
    process.on('exit', release);
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { release(); process.exit(1); });
    return release;
}

// ---- CLI wrapper --------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('bench-lock.mjs')) {
    const [, , mode, label, ...rest] = process.argv;
    if (mode === 'run') {
        const sep = rest.indexOf('--');
        const cmd = sep >= 0 ? rest.slice(sep + 1) : rest;
        if (!cmd.length) { console.error('usage: bench-lock.mjs run "<label>" -- <command...>'); process.exit(2); }
        //  Queue by default (a contender should wait its turn, not fail a run); override
        //  with BENCH_WAIT_MS=0 to refuse immediately, which is what a test wants.
        const waitMs = process.env.BENCH_WAIT_MS === undefined ? 30 * 60 * 1000 : Number(process.env.BENCH_WAIT_MS);
        let release;
        try {
            release = await acquire(label ?? 'unlabelled', waitMs);
        } catch (e) {
            console.error(`REFUSED: ${e.message}`);
            process.exit(1);
        }
        console.log(`Bench acquired by "${label}" (pid ${process.pid}).`);
        //  `shell: true` on Windows, because `npm`/`npx` are .cmd shims there and a bare
        //  spawn of them fails with ENOENT — which is why C3 found the wrapper could not
        //  wrap a build. Args carrying spaces are quoted, since the shell re-splits them.
        const useShell = process.platform === 'win32';
        const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
        const spawnArgs = useShell
            ? [cmd.map(quote).join(' '), []] // one string: an args array with shell:true is deprecated
            : [cmd[0], cmd.slice(1)];
        const child = spawn(spawnArgs[0], spawnArgs[1], {
            stdio: 'inherit',
            shell: useShell,
            env: { ...process.env, [HANDOFF]: handoffToken() }, // nesting is safe
        });
        child.on('error', (e) => { console.error(`REFUSED: could not run ${cmd[0]}: ${e.message}`); release(); process.exit(1); });
        child.on('exit', (code) => { release(); process.exit(code ?? 0); });
    } else if (mode === 'status') {
        const holder = readHolder();
        console.log(holder ? `bench held by ${holder.label} (pid ${holder.pid}, since ${holder.since})` : 'bench free');
    } else {
        console.error('usage: bench-lock.mjs run "<label>" -- <command...>   |   bench-lock.mjs status');
        process.exit(2);
    }
}
