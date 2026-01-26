import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, existsSync } from 'fs';

// Collect all HTML files for multi-page build
function getHtmlInputs() {
    const inputs = {
        // Main launcher as default index
        main: resolve(__dirname, 'launcher.html'),
        // Core pages
        index: resolve(__dirname, 'index.html'),
        kirigami: resolve(__dirname, 'index-kirigami.html'),
    };

    // Add demo pages if they exist
    const optionalPages = [
        ['demo', 'demo/index.html'],
        ['integrated', 'integrated-demo/index.html'],
        ['sdk', 'sdk/index.html'],
        ['sdkBasic', 'sdk/examples/basic-demo.html'],
        ['sdkExport', 'sdk/examples/export-demo.html'],
        ['sdkMinimal', 'sdk/examples/minimal.html'],
        ['sdkSimple', 'sdk/examples/simple-api.html'],
        ['standalone', 'examples/vib3-demo-standalone.html'],
        ['realDemo', 'examples/vib3-real-demo.html'],
        ['interactive', 'outputs/interactive-demo.html'],
    ];

    for (const [name, path] of optionalPages) {
        const fullPath = resolve(__dirname, path);
        if (existsSync(fullPath)) {
            inputs[name] = fullPath;
        }
    }

    return inputs;
}

export default defineConfig({
    // Base path for GitHub Pages - will be the repo name
    base: '/Vib3-CORE-Documented01-/',

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: getHtmlInputs()
        }
    },

    // Dev server configuration
    server: {
        port: 3000,
        open: '/launcher.html'
    },

    // Resolve aliases for cleaner imports
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@math': resolve(__dirname, 'src/math'),
            '@geometry': resolve(__dirname, 'src/geometry'),
            '@render': resolve(__dirname, 'src/render'),
            '@holograms': resolve(__dirname, 'src/holograms'),
            '@kirigami': resolve(__dirname, 'src/holograms/kirigami')
        }
    },

    // Optimizations
    optimizeDeps: {
        include: []
    }
});
