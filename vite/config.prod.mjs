import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/**
 * THE BUILD STAMP (C1 item 0b). The bundle carries the git SHA it was built from.
 *
 * The problem it solves is not hypothetical. Four defects were reported against a build
 * nobody could identify, and there was no way — from the phone, from the page, or from the
 * debug paste — to answer "which edition is this?". Every diagnosis after that point is
 * guesswork about which code was running, and three of the four findings are expected to be
 * ghosts of a build that has since been replaced. Without a stamp there is no way to tell a
 * ghost from a live defect except by fixing things that may already be fixed.
 *
 * DERIVED AT BUILD TIME, NEVER TYPED (the invented-constant rule, applied to identity). Read
 * from git here and injected as a define, so it cannot drift from the commit it describes.
 * CI provides `GITHUB_SHA`; a local build reads `git rev-parse`. If BOTH fail the stamp reads
 * `unknown` rather than throwing — a build that refused to run because it could not name
 * itself would be a worse failure than an unnamed one, and `unknown` is itself diagnostic.
 */
function buildSha() {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
    try {
        return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

/**
 * THE STAMP GOES IN THE SERVED HTML, not only into the bundle — and that placement is the
 * whole of what makes deploy-witnessing cheap.
 *
 * A define alone would put the SHA inside minified JavaScript, where reading it means
 * executing the bundle in a browser. In the `<head>` it can be read by a plain fetch of the
 * page, so "what is actually being served right now" becomes one HTTP request that any
 * session, script or CI step can make without a device. `local is not live` (D-082) was
 * expensive precisely because checking took effort; this makes it trivial.
 */
function stampPlugin(sha, builtAt) {
    return {
        name: 'drift-build-stamp',
        transformIndexHtml() {
            return [
                { tag: 'meta', attrs: { name: 'drift-build', content: sha }, injectTo: 'head' },
                { tag: 'meta', attrs: { name: 'drift-built-at', content: builtAt }, injectTo: 'head' },
            ];
        },
    };
}

const SHA = buildSha();
const BUILT_AT = new Date().toISOString();

//  Relative base so the same bundle runs from the site root AND from /builds/<cycle-id>/.
export default defineConfig({
    base: './',
    logLevel: 'warning',
    plugins: [stampPlugin(SHA, BUILT_AT)],
    define: {
        __BUILD_SHA__: JSON.stringify(SHA),
        //  Stamped from the BUILD machine's clock. Reading a timestamp at runtime would
        //  answer a different question — when the player opened the page — while looking
        //  identical in the paste, which is the kind of plausible-but-wrong number that
        //  makes a diagnostic worse than nothing.
        __BUILT_AT__: JSON.stringify(BUILT_AT),
    },
    build: {
        rollupOptions: {
            output: {
                //  Babylon in its own chunk: it is the heavy, rarely-changing half, so it
                //  stays cached across deploys while the game code churns.
                manualChunks: (id) => (id.includes('node_modules/@babylonjs') ? 'babylon' : undefined)
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: { passes: 2 },
            mangle: true,
            format: { comments: false }
        }
    }
});
