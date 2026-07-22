import { defineConfig } from 'vite';

//  Relative base so the same bundle runs from the site root AND from /builds/<cycle-id>/.
export default defineConfig({
    base: './',
    logLevel: 'warning',
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
