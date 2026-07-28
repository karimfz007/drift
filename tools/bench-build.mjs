#!/usr/bin/env node
/**
 * The production build, under the bench.
 *
 * C3 MAJOR-2: `tools/bench-lock.mjs` claimed the bench covered "builds too", and a test was
 * even named for it — but nothing made a build take the lock. C3 measured it: with the bench
 * held, an unwrapped build ran straight through. The claim was prose. A second build
 * corrupting a running harness's `dist/` is one of the two failures D-072 exists to prevent,
 * so the claim has to be a mechanism or be withdrawn. This is the mechanism.
 *
 * Re-entrancy makes this safe to nest: a build invoked inside an already-wrapped session
 * inherits the handoff and takes the bench as a no-op rather than deadlocking against it.
 */
import { spawn } from 'node:child_process';
import { acquire, handoffToken } from './bench-lock.mjs';

const waitMs = process.env.BENCH_WAIT_MS === undefined ? 30 * 60 * 1000 : Number(process.env.BENCH_WAIT_MS);
let release;
try {
    release = await acquire('production build', waitMs);
} catch (e) {
    console.error(`REFUSED: ${e.message}`);
    process.exit(1);
}
const child = spawn('npx vite build --config vite/config.prod.mjs', [], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DRIFT_BENCH_LOCK: handoffToken() },
});
child.on('error', (e) => { console.error(`REFUSED: could not run vite: ${e.message}`); release(); process.exit(1); });
child.on('exit', (code) => { release(); process.exit(code ?? 0); });
