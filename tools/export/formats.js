export const EXPORT_FORMATS = [
    {
        id: 'svg-sprite',
        name: 'SVG Sprite Sheet',
        extension: '.svg',
        description: 'Vector sprite sheet for web and design tooling.',
    },
    {
        id: 'lottie-json',
        name: 'Lottie JSON',
        extension: '.json',
        description: 'Motion-ready JSON payload for Lottie renderers.',
    },
    {
        id: 'css-variables',
        name: 'CSS Variables',
        extension: '.css',
        description: 'CSS custom properties for theming pipelines.',
    },
];

export function getExportFormat(id) {
    return EXPORT_FORMATS.find((format) => format.id === id) || null;
}
