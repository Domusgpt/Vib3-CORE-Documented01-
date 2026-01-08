export const WASM_BUILD_TARGET = {
    target: 'wasm32-unknown-unknown',
    toolchain: 'rust',
    entryPoints: ['src/math/rotations.js', 'src/math/projections.js'],
    outputDir: 'dist/wasm',
    notes: [
        'Use wasm-pack or cargo + wasm-bindgen for builds.',
        'Expose math primitives as the shared core for Web + Flutter bindings.',
    ],
};
