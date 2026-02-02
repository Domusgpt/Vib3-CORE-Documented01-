import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    // Library build mode: `npm run build:lib` produces UMD + ESM for CDN/npm
    if (mode === 'lib') {
        return {
            resolve: {
                alias: {
                    '@vib3': resolve(__dirname, 'src'),
                },
            },
            build: {
                lib: {
                    entry: resolve(__dirname, 'src/core/VIB3Engine.js'),
                    name: 'VIB3',
                    fileName: (format) => `vib3.${format}.js`,
                    formats: ['es', 'umd'],
                },
                outDir: 'dist/lib',
                sourcemap: true,
            },
            assetsInclude: ['**/*.glsl', '**/*.wgsl', '**/*.wasm'],
        };
    }

    // Default: web build (pages, demo, gallery)
    return {
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
    };
});
