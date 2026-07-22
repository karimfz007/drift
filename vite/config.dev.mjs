import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
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
