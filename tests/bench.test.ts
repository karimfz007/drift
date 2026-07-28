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

    it('REGRESSION — the wrapper can spawn npm, so "the bench covers builds too" is a mechanism (C3 A3)', () => {
        //  `npm` is a .cmd shim on Windows; a bare spawn of it fails EINVAL. `--version` is
        //  chosen because it is real npm and costs nothing.
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

    it('releases the lock on the way out, including when the command fails', () => {
        //  A lock leaked by a crashed run would wedge the bench until someone deleted the
        //  file by hand. Holder-liveness makes a leak recoverable, but not leaking is better.
        const dir = mkdtempSync(join(tmpdir(), 'drift-bench-'));
        const lockFile = join(dir, 'bench.lock');
        const env: Record<string, string> = {
            ...(process.env as Record<string, string>),
            DRIFT_BENCH_LOCK_FILE: lockFile,
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
