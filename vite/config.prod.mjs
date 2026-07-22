import { defineConfig } from 'vite';

//  Relative base so the same bundle runs from the site root AND from /builds/<cycle-id>/.
export default defineConfig({
    base: './',
    logLevel: 'warning',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
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
