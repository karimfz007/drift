/**
 * THE BENCH MUTEX — the tool that had no test.
 *
 * D-072 made one exclusive lock govern the whole bench because sharing it, in any
 * combination, had cost four sessions of misdiagnosis: a second harness killing the
 * first's browser, then a second build corrupting a running harness's `dist/`. The
 * mutex closed those. It then shipped with zero coverage of its own, and promptly
 * grew two defects that cost part of a fifth session:
 *
 *   - `run` DEADLOCKED against anything that also takes the lock. The device harness
 *     takes it by design (it must refuse a shared bench even unwrapped), so
 *     `bench-lock run "..." -- node tools/smoke.mjs` — the exact documented usage —
 *     hung for thirty minutes producing three lines of output. Not a refusal: a hang.
 *   - `run` could not spawn `npm` on Windows, where it is a `.cmd` shim. C3 reported
 *     this as A3: the claim that the mutex "covers builds too" was prose, not a
 *     mechanism, because the wrapper could not actually wrap a build.
 *
 * Every test here runs against a private lock file, so the suite never contends with a
 * live harness run. Each asserts a property that was, at some point, false in shipped code.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WRAPPER = 'tools/bench-lock.mjs';

/** Run the wrapper with a private lock file and a clean handoff, and capture everything. */
function runWrapper(args: string[], extraEnv: Record<string, string> = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'drift-bench-'));
    const lockFile = join(dir, 'bench.lock');
    const env: Record<string, string> = {
        ...(process.env as Record<string, string>),
        DRIFT_BENCH_LOCK_FILE: lockFile,
        VITEST: '1',            // the override is gated on it (C3 NOTE)
        ...extraEnv,
    };
    delete env.DRIFT_BENCH_LOCK; // never inherit a real handoff into a test
    try {
        const r = spawnSync(process.execPath, [WRAPPER, ...args], { env, encoding: 'utf8', timeout: 60_000 });
        return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', lockFile };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe('the bench mutex', () => {
    it('runs a wrapped command and reports its exit code', () => {
        const r = runWrapper(['run', 'plain command', '--', 'node', '-e', 'console.log("RAN")']);
        expect(r.stdout).toContain('RAN');
        expect(r.status).toBe(0);
    });

    it('propagates a wrapped command FAILURE instead of swallowing it', () => {
        //  A wrapper that always exits 0 would make every bench-run vacuously green.
        const r = runWrapper(['run', 'failing command', '--', 'node', '-e', 'process.exit(3)']);
        expect(r.status).toBe(3);
    });

    it('REGRESSION — a wrapped command that ALSO takes the bench does not deadlock', () => {
        //  This is the thirty-minute hang. Pre-fix, the inner acquire() waited on a lock its
        //  own parent held and could not get it until the parent exited — which the parent
        //  would not do until the child finished. The child here waits at most 4s, so a
        //  regression shows up as the inner acquire timing out, not as a hung suite.
        const inner = 'import("./tools/bench-lock.mjs").then(async (m) => { const r = await m.acquire("inner", 4000); console.log("INNER-OK"); r(); })';
        const r = runWrapper(['run', 'outer', '--', 'node', '-e', inner]);
        expect(r.stdout).toContain('INNER-OK');
        expect(r.status).toBe(0);
    });

    it('REGRESSION — the wrapper can SPAWN npm at all (half of C3 A3; the other half is bench-build.mjs)', () => {
        //  `npm` is a .cmd shim on Windows; a bare spawn of it fails ENOENT. `--version` is
        //  chosen because it is real npm and costs nothing.
        //
        //  C3 MAJOR-2 renamed this. It used to be titled "...so 'the bench covers builds too'
        //  is a mechanism", which is more than it proves: being ABLE to wrap a build is not the
        //  same as builds BEING wrapped, and C3 measured the gap — with the bench held, an
        //  unwrapped build ran straight through. A test name that certifies an unproven claim
        //  is the unmarked middle D-076 forbids, wearing a test's clothes. The other half is
        //  closed by `tools/bench-build.mjs`, which `npm run build` now goes through.
        const r = runWrapper(['run', 'npm under the bench', '--', 'npm', '--version']);
        expect(r.stderr).not.toContain('could not run');
        expect(r.stdout).toMatch(/\d+\.\d+\.\d+/);
        expect(r.status).toBe(0);
    });

    it('still REFUSES an unrelated contender — re-entrancy must not weaken the mutex', () => {
        //  The nesting fix keys on an env handoff. If it had keyed on anything ambient —
        //  a shared lock directory, the cwd, the user — it would let two genuinely
        //  independent runs share the bench, which is the exact failure D-072 exists to stop.
        const dir = mkdtempSync(join(tmpdir(), 'drift-bench-'));
        const lockFile = join(dir, 'bench.lock');
        const env: Record<string, string> = {
            ...(process.env as Record<string, string>),
            DRIFT_BENCH_LOCK_FILE: lockFile,
            VITEST: '1',
            BENCH_WAIT_MS: '0',
        };
        delete env.DRIFT_BENCH_LOCK;
        //  The contender strips the handoff, so it is a stranger to the holder, not a child.
        //  Written to a FILE, not passed with `-e`: on Windows the wrapper routes through a
        //  shell, and a multi-line inline script does not survive that. Passing it inline is
        //  what made this test fail post-fix on its first run — the test's fault, not the
        //  mutex's, but the same trap is real for anyone wrapping `node -e`.
        const contendFile = join(dir, 'contend.mjs');
        writeFileSync(contendFile, [
            'import { spawnSync } from "node:child_process";',
            'const env = { ...process.env }; delete env.DRIFT_BENCH_LOCK; env.BENCH_WAIT_MS = "0";',
            `const r = spawnSync(process.execPath, [${JSON.stringify(WRAPPER)}, "run", "contender", "--", "node", "-e", "console.log('LEAKED')"], { env, encoding: "utf8" });`,
            'console.log("CONTENDER_EXIT=" + r.status); console.log(r.stdout ?? ""); console.error(r.stderr ?? "");',
        ].join('\n'));
        try {
            const r = spawnSync(process.execPath, [WRAPPER, 'run', 'holder', '--', 'node', contendFile], {
                env, encoding: 'utf8', timeout: 60_000,
            });
            expect(r.stdout ?? '').toContain('CONTENDER_EXIT=1');
            expect(r.stdout ?? '').not.toContain('LEAKED'); // it must never have run
            expect(r.stderr ?? '').toContain('bench busy');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('REGRESSION — an UNREADABLE lock file reads as HELD, never as free (C3 MAJOR-1)', () => {
        //  `readHolder` used to `catch { return null }`, which reports "free" when the truth is
        //  "I cannot tell". `acquire` then deleted the file and took the bench. C3 measured it:
        //  a live holder plus a truncated lock let a stranger walk straight in. The file was
        //  written non-atomically, so a torn write or a hard kill mid-write reached that state.
        //  Over-refusing costs a wait; under-refusing costs the corrupted bench D-072 exists
        //  to prevent, so "I cannot tell" must mean HELD.
        const dir = mkdtempSync(join(tmpdir(), 'drift-bench-'));
        const lockFile = join(dir, 'bench.lock');
        writeFileSync(lockFile, '{"pid": 1234, "label": "HOL');   // truncated mid-write
        const env: Record<string, string> = {
            ...(process.env as Record<string, string>),
            DRIFT_BENCH_LOCK_FILE: lockFile,
            VITEST: '1',
            BENCH_WAIT_MS: '0',
        };
        delete env.DRIFT_BENCH_LOCK;
        try {
            const r = spawnSync(process.execPath, [WRAPPER, 'run', 'stranger', '--', 'node', '-e', 'console.log("WALKED-IN")'], {
                env, encoding: 'utf8', timeout: 60_000,
            });
            expect(r.stdout ?? '').not.toContain('WALKED-IN');
            expect(r.stderr ?? '').toContain('bench busy');
            expect(r.status).toBe(1);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('REGRESSION — a handoff from a DIFFERENT hold is refused, so pid reuse cannot admit a stale child', () => {
        //  C3 NOTE: keying the handoff on pid alone meant a descendant outliving its wrapper
        //  kept a valid token forever, and Windows recycles pids — a later unrelated holder
        //  drawing that pid would have admitted it. The token carries a nonce now. Here the
        //  pid matches the live holder exactly and only the nonce is wrong.
        const dir = mkdtempSync(join(tmpdir(), 'drift-bench-'));
        const lockFile = join(dir, 'bench.lock');
        writeFileSync(lockFile, JSON.stringify({
            pid: process.pid,           // a genuinely live pid — this test runner
            label: 'someone else', since: new Date(0).toISOString(), nonce: 'THE-REAL-NONCE',
        }));
        const env: Record<string, string> = {
            ...(process.env as Record<string, string>),
            DRIFT_BENCH_LOCK_FILE: lockFile,
            VITEST: '1',
            BENCH_WAIT_MS: '0',
            DRIFT_BENCH_LOCK: `${process.pid}:STALE-NONCE-FROM-AN-OLDER-HOLD`,
        };
        const r = spawnSync(process.execPath, [WRAPPER, 'run', 'stale child', '--', 'node', '-e', 'console.log("WALKED-IN")'], {
            env, encoding: 'utf8', timeout: 60_000,
        });
        rmSync(dir, { recursive: true, force: true });
        expect(r.stdout ?? '').not.toContain('WALKED-IN');
        expect(r.stderr ?? '').toContain('bench busy');
    });

    it('releases the lock on the way out, including when the command fails', () => {
        //  A lock leaked by a crashed run would wedge the bench until someone deleted the
        //  file by hand. Holder-liveness makes a leak recoverable, but not leaking is better.
        const dir = mkdtempSync(join(tmpdir(), 'drift-bench-'));
        const lockFile = join(dir, 'bench.lock');
        const env: Record<string, string> = {
            ...(process.env as Record<string, string>),
            DRIFT_BENCH_LOCK_FILE: lockFile,
            VITEST: '1',
        };
        delete env.DRIFT_BENCH_LOCK;
        try {
            spawnSync(process.execPath, [WRAPPER, 'run', 'doomed', '--', 'node', '-e', 'process.exit(9)'], {
                env, encoding: 'utf8', timeout: 60_000,
            });
            expect(existsSync(lockFile)).toBe(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
