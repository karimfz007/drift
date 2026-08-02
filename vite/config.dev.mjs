import { defineConfig } from 'vite';

//  The dev build must define the stamp too. Without these, `__BUILD_SHA__` is a free
//  variable and the game throws on boot the moment the debug paste is built — a break that
//  would appear only in the dev server and only when someone opened the debug panel, which
//  is the worst possible place for it to hide. Dev is honest about being dev.
const DEV_STAMP = { __BUILD_SHA__: JSON.stringify('dev'), __BUILT_AT__: JSON.stringify('dev') };

export default defineConfig({
    base: './',
    define: DEV_STAMP,
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => (id.includes('node_modules/@babylonjs') ? 'babylon' : undefined)
            }
        }
    },
    server: {
        port: 8080,
        host: true
    }
});
