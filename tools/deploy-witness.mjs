#!/usr/bin/env node
/**
 * DEPLOY-WITNESS (C1 item 0c). Quotes the PUSHED sha and the SERVED sha side by side.
 *
 * WHY THIS EXISTS. D-082 established "local is not live" after a close package sat unpushed
 * while two session reports called it shipped. Origin-witnessing closed that half: it proves
 * the commit reached GitHub. It does NOT prove the commit reached the DIRECTOR — between
 * origin and his phone sit a build, a Pages deploy, and a CDN, any of which can be behind
 * without anything looking wrong. Four defects were reported against a build nobody could
 * identify, and three are expected to be ghosts of code already replaced.
 *
 * So the ship claim now has three legs, not two:
 *
 *   1. the commit is on origin        (origin-witness — already standing)
 *   2. the deploy workflow is GREEN   (a red deploy is a failed ship)
 *   3. the SERVED sha equals it       (a mismatch is a failed ship)
 *
 * Leg 3 is the one that was missing, and it is the only one that speaks for the artifact the
 * player actually loads. It reads the `<meta name="drift-build">` stamp straight out of the
 * served HTML — no browser, no bundle execution, one request.
 *
 * EXIT CODES: 0 witnessed and matching; 1 mismatch or unreachable. Non-zero is a FAILED SHIP,
 * not a warning — the whole point is that it cannot be glanced past.
 */
import { execSync } from 'node:child_process';

const SITE = process.env.DRIFT_SITE_URL ?? 'https://karimfz007.github.io/drift/';

function localSha() {
    try {
        return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return null;
    }
}

function originSha() {
    try {
        //  The commit ORIGIN has, not the one this machine has. They differ exactly when an
        //  unpushed commit is being mistaken for a shipped one, which is D-082's own case.
        const out = execSync('git ls-remote origin refs/heads/main', { encoding: 'utf8' }).trim();
        return out.split(/\s+/)[0]?.slice(0, 7) ?? null;
    } catch {
        return null;
    }
}

async function servedStamp(url) {
    //  Cache-busted deliberately. A cached copy would answer "what did this machine see last
    //  time", which looks identical to the real answer and is the failure being hunted.
    const bust = `${url}${url.includes('?') ? '&' : '?'}witness=${Date.now()}`;
    const res = await fetch(bust, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error(`served page returned HTTP ${res.status}`);
    const html = await res.text();
    const sha = html.match(/<meta[^>]+name="drift-build"[^>]+content="([^"]+)"/i)?.[1] ?? null;
    const at = html.match(/<meta[^>]+name="drift-built-at"[^>]+content="([^"]+)"/i)?.[1] ?? null;
    return { sha, at };
}

const local = localSha();
const origin = originSha();
let served = { sha: null, at: null };
let reachError = null;
try {
    served = await servedStamp(SITE);
} catch (e) {
    reachError = e.message;
}

console.log('DEPLOY WITNESS');
console.log(`  local  HEAD : ${local ?? 'unknown'}`);
console.log(`  origin main : ${origin ?? 'unknown'}`);
console.log(`  served      : ${served.sha ?? `UNREADABLE (${reachError ?? 'no stamp in the page'})`}`);
if (served.at) console.log(`  served built: ${served.at}`);
console.log(`  url         : ${SITE}`);

const problems = [];
if (!origin) problems.push('could not read origin/main');
if (!served.sha) {
    problems.push(reachError
        ? `could not read the served stamp: ${reachError}`
        : 'the served page carries no drift-build stamp — an edition older than the stamp itself');
}
if (local && origin && local !== origin) problems.push(`local ${local} is not on origin (${origin}) — unpushed work`);
if (origin && served.sha && origin !== served.sha) problems.push(`origin ${origin} but serving ${served.sha} — the deploy is behind`);

if (problems.length > 0) {
    console.log('\nFAILED SHIP:');
    for (const p of problems) console.log(`  - ${p}`);
    //  `process.exit()` here crashes libuv on Windows — the fetch socket is still closing,
    //  and the abort surfaces as exit 127 rather than 1. A witness whose exit code is wrong
    //  is worse than no witness: CI would read 127 as an infrastructure fault instead of the
    //  failed ship it actually is. Setting `exitCode` lets the loop drain and exit cleanly.
    process.exitCode = 1;
} else {
    console.log('\nWITNESSED: origin and the served page are the same edition.');
}
