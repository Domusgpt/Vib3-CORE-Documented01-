export default {
    test: {
        exclude: [
            'node_modules/**',
            'tests/**/*.spec.js',
            'tests/**/*.spec.ts',
            'tests/e2e/generate-exports.js',
            'tests/e2e/render-visualizations.js',
            'tests/e2e/visual-test-runner.js',
        ],
        environment: 'happy-dom',
    },
};
