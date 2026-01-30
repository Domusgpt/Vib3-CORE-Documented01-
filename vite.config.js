import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    publicDir: 'public',

    resolve: {
        alias: {
            '@vib3': resolve(__dirname, 'src'),
        },
    },

    server: {
        port: 5173,
        open: '/docs/index.html',
        // Serve shader files as static assets
        fs: {
            allow: ['.'],
        },
    },

    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                gallery: resolve(__dirname, 'docs/index.html'),
                testHub: resolve(__dirname, 'docs/test-hub.html'),
            },
        },
    },

    // Treat shader files as raw assets so they can be fetched at runtime
    assetsInclude: ['**/*.glsl', '**/*.wgsl', '**/*.wasm'],
});
