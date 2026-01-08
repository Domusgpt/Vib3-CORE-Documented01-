import crypto from 'node:crypto';

/**
 * Utility to produce deterministic hashes for manifest payloads and assets.
 * Accepts strings, Buffers, or objects (stringified with stable JSON ordering).
 */
function stableStringify(value) {
    if (value === undefined) {
        return 'null';
    }

    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
}

export function computeAssetHash(payload) {
    if (payload === undefined || payload === null) {
        return crypto.createHash('sha256').update('null').digest('hex');
    }

    if (Buffer.isBuffer(payload)) {
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    if (typeof payload === 'string') {
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    const stable = stableStringify(payload);
    return crypto.createHash('sha256').update(stable).digest('hex');
}

function normalizePalette(palette = []) {
    return palette.map((entry) => ({
        name: entry.name || 'unnamed',
        swatches: entry.swatches || [],
    }));
}

function normalizeTypography(tokens = {}) {
    return {
        families: tokens.families || ['Inter', 'Space Grotesk'],
        scales: tokens.scales || {
            display: '72px/1.05',
            heading: '32px/1.2',
            body: '16px/1.6',
            caption: '13px/1.4',
        },
    };
}

function normalizeBreakpoints(breakpoints = {}) {
    return {
        xs: breakpoints.xs || '360px',
        sm: breakpoints.sm || '640px',
        md: breakpoints.md || '960px',
        lg: breakpoints.lg || '1280px',
        xl: breakpoints.xl || '1600px',
    };
}

/**
 * Build a manifest with enriched metadata for downstream telemetry.
 */
export function buildTelemetryManifest({
    baseManifest = {},
    license = 'SEE LICENSE IN DOCS/LICENSE_ATTESTATION_PROFILE_CATALOG.md',
    themeTags = [],
    colorPalettes = [],
    typography = {},
    breakpoints = {},
    previews = [],
    assets = [],
}) {
    const normalizedPalettes = normalizePalette(colorPalettes);
    const normalizedTypography = normalizeTypography(typography);
    const normalizedBreakpoints = normalizeBreakpoints(breakpoints);

    const manifest = {
        ...baseManifest,
        license,
        themeTags: Array.from(new Set(themeTags)),
        colorPalettes: normalizedPalettes,
        typography: normalizedTypography,
        responsiveBreakpoints: normalizedBreakpoints,
        previews: previews.map((preview) => ({
            ...preview,
            hash: preview.hash || computeAssetHash(preview.src || preview.dataUrl || preview.id),
        })),
        assets: assets.map((asset) => ({
            ...asset,
            hash: asset.hash || computeAssetHash(asset.contents || asset.url || asset.path),
        })),
    };

    return {
        manifest,
        hash: computeAssetHash(manifest),
    };
}

/**
 * Format export output for CLI usage with deterministic hashes for diffing.
 */
export function formatExportSummary(manifestResult) {
    const lines = [
        `manifest hash: ${manifestResult.hash}`,
        `assets: ${manifestResult.manifest.assets.length}`,
        `previews: ${manifestResult.manifest.previews.length}`,
    ];

    manifestResult.manifest.assets.forEach((asset) => {
        lines.push(` • ${asset.name || asset.path || 'asset'} => ${asset.hash}`);
    });

    manifestResult.manifest.previews.forEach((preview) => {
        lines.push(` • preview:${preview.id || preview.name} => ${preview.hash}`);
    });

    return lines.join('\n');
}

/**
 * High-level helper used by export pipelines.
 */
export function exportTelemetryManifest(config) {
    const manifestResult = buildTelemetryManifest(config);
    return {
        ...manifestResult,
        summary: formatExportSummary(manifestResult),
    };
}
