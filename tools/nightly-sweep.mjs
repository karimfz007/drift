/**
 * THE NIGHTLY FULL SWEEP — the permanent record, run unattended.
 *
 * A grouped run (`tools/sweep-groups.mjs`) attributes failures cheaply, but each group boots
 * fresh, so world state a section would have inherited in a full run is absent — a shelter
 * standing, a recipe known, a quarry part-spent. Only the unbroken sweep exercises the suite in
 * the order and the accumulated state it was written for. That is why this exists, and why it is
 * scheduled rather than remembered.
 *
 * WHY NODE AND NOT A .cmd. The first version of this was a batch file, and it died on its own
 * comments: em-dashes in `REM` lines reached cmd.exe as mojibake under the OEM codepage and were
 * parsed as commands ("'HE' is not recognized"), and `%DATE:~-4%` for the log stamp is
 * locale-dependent besides. A wrapper whose failure mode is its own prose is not a wrapper. The
 * .cmd is now three ASCII lines that call this.
 *
 *   node tools/nightly-sweep.mjs        rails, then the full sweep
 *   node tools/nightly-sweep.mjs --dry  everything except the sweep, to prove the wrapper works
 */
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../.smoke/', import.meta.url));
const DRY = process.argv.includes('--dry');
const PORT = 4173;

mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const logPath = `${OUT_DIR}nightly-${stamp}.txt`;
const log = createWriteStream(logPath, { flags: 'a' });
const say = (s) => { log.write(s + '\n'); console.log(s); };

const isWin = process.platform === 'win32';

//  NO ARGS ARRAY THROUGH A SHELL. Node 24 deprecates `spawn(cmd, args, {shell: true})` because
//  the args are concatenated rather than escaped. This worktree carries no node_modules of its
//  own — npm resolves tsc and vite from a parent — so the two things that genuinely need npm go
//  through it as a single command string, and the four checks that are just .mjs files in this
//  directory are run directly by this process's own node.
const npmRun = (script) => spawnSync(`npm run ${script}`, { cwd: ROOT, encoding: 'utf8', shell: true, maxBuffer: 256 * 1024 * 1024 });

/** Is anything listening on the preview port? */
function portBusy(port) {
    return new Promise((resolve) => {
        const sock = createConnection({ host: '127.0.0.1', port });
        const done = (v) => { sock.destroy(); resolve(v); };
        sock.setTimeout(1500);
        sock.on('connect', () => done(true));
        sock.on('timeout', () => done(false));
        sock.on('error', () => done(false));
    });
}

function record(r, label) {
    const text = (r.stdout ?? '') + (r.stderr ?? '');
    log.write(`\n----- ${label} (exit ${r.status})\n${text}`);
    say(`  ${r.status === 0 ? 'ok  ' : 'FAIL'}  ${label}${r.status === 0 ? '' : ` (exit ${r.status})`}`);
    return r.status;
}
const runNode = (script, label) => record(
    spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }), label);

say(`===== nightly sweep ${new Date().toISOString()}${DRY ? '  [DRY]' : ''}`);
say(`      log: ${logPath}`);

//  The interactive preview server does not survive a logout, so start one if the port is quiet.
let server = null;
if (await portBusy(PORT)) {
    say(`      a server is already listening on ${PORT}`);
} else {
    say(`      nothing on ${PORT} — starting a preview server`);
    server = spawn('npm run preview', { cwd: ROOT, shell: true, detached: false, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', (d) => log.write(String(d)));
    server.stderr.on('data', (d) => log.write(String(d)));
    for (let i = 0; i < 30 && !(await portBusy(PORT)); i++) await new Promise((r) => setTimeout(r, 1000));
    if (!(await portBusy(PORT))) { say('      REFUSED: the preview server never came up'); server?.kill(); process.exit(1); }
    say('      preview server up');
}

say('===== static rails');
let railFailures = 0;
if (record(npmRun('typecheck'), 'typecheck') !== 0) railFailures++;
for (const [label, script] of [
    ['purity', 'tools/check-purity.mjs'],
    ['tune-mirror', 'tools/check-tune-mirror.mjs'],
    ['docs-integrity', 'tools/check-docs-integrity.mjs'],
    ['selectors', 'tools/check-selectors.mjs'],
]) if (runNode(script, label) !== 0) railFailures++;

let sweepExit = 0;
if (DRY) {
    say('===== DRY RUN: the sweep itself was skipped');
} else {
    say('===== full sweep (this takes about three and a half hours)');
    sweepExit = runNode('tools/smoke.mjs', 'full sweep');
}

if (server) { say('      stopping the preview server this run started'); server.kill(); }
say(`===== done, rails ${railFailures} failure(s), sweep exit ${sweepExit}`);
log.end();
process.exitCode = railFailures > 0 || sweepExit !== 0 ? 1 : 0;
