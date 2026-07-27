/**
 * THE BENCH MUTEX (D-072, completed).
 *
 * One exclusive lock over the whole bench — harness runs, builds, and C3 audits alike.
 * Not one lock per activity: the failure this closes was a second *build* corrupting a
 * running harness's `dist/`, and before that a second harness killing the first's browser.
 * Sharing the bench in any combination has cost this project four sessions of misdiagnosis,
 * so the rule is simply that nobody shares it. Contenders queue or refuse; never proceed.
 *
 * Usage as a library:   import { acquire, release } from './bench-lock.mjs'
 * Usage as a wrapper:   node tools/bench-lock.mjs run "<label>" -- <command...>
 *   ...which takes the lock, runs the command, and releases on every exit path.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const LOCK = join(fileURLToPath(new URL('../.smoke/', import.meta.url)), 'bench.lock');

/** Is the process that holds the lock still alive? A dead holder's lock is stale, not binding. */
function holderAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0) return false;
    try { process.kill(pid, 0); return true; } catch { return false; }
}

export function readHolder() {
    if (!existsSync(LOCK)) return null;
    try {
        const raw = JSON.parse(readFileSync(LOCK, 'utf8'));
        return holderAlive(raw.pid) ? raw : null;
    } catch { return null; }
}

/**
 * Take the bench. Returns a release function.
 * `waitMs > 0` queues for that long before giving up; 0 refuses immediately.
 */
export async function acquire(label, waitMs = 0) {
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
    writeFileSync(LOCK, JSON.stringify({ pid: process.pid, label, since: new Date().toISOString() }));
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
        const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
        child.on('exit', (code) => { release(); process.exit(code ?? 0); });
    } else if (mode === 'status') {
        const holder = readHolder();
        console.log(holder ? `bench held by ${holder.label} (pid ${holder.pid}, since ${holder.since})` : 'bench free');
    } else {
        console.error('usage: bench-lock.mjs run "<label>" -- <command...>   |   bench-lock.mjs status');
        process.exit(2);
    }
}
