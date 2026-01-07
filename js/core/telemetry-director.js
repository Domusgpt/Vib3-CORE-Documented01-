import { exportTelemetryManifest, computeAssetHash } from '../../tools/telemetry/manifestPipeline.js';

/**
 * Lightweight director that prepares export manifests and preview sprites
 * for telemetry and automation pipelines. Designed to run in both browser
 * and headless contexts.
 */
export class TelemetryDirector {
    constructor(renderer) {
        this.renderer = renderer;
    }

    async exportPack(pack, options = {}) {
        const previews = await this.generatePreviewSprites(pack, options.previewCount || 4);
        const manifestResult = exportTelemetryManifest({
            baseManifest: {
                id: pack.id,
                name: pack.name,
                version: pack.version || '1.0.0',
                createdAt: pack.createdAt || new Date().toISOString(),
            },
            license: options.license,
            themeTags: options.themeTags || pack.tags || [],
            colorPalettes: options.colorPalettes || pack.colorPalettes || [],
            typography: options.typography || pack.typography,
            breakpoints: options.breakpoints || pack.breakpoints,
            previews,
            assets: options.assets || [],
        });

        return {
            manifest: manifestResult.manifest,
            hash: manifestResult.hash,
            summary: manifestResult.summary,
            previews,
        };
    }

    async generatePreviewSprites(pack, take = 4) {
        const scenes = pack.scenes || pack.states || [];
        const selected = scenes.slice(0, take);

        // Use renderer when available, otherwise generate metadata-only entries.
        const previews = await Promise.all(selected.map(async (scene, index) => {
            const frame = this.renderer?.captureFrame
                ? await this.renderer.captureFrame(scene)
                : this.buildPlaceholderFrame(scene);

            return {
                id: scene.id || `scene-${index}`,
                name: scene.name || `Scene ${index + 1}`,
                width: frame.width,
                height: frame.height,
                dataUrl: frame.dataUrl,
                spriteSheet: frame.spriteSheet,
                hash: computeAssetHash(frame.dataUrl || frame.spriteSheet || JSON.stringify(frame)),
            };
        }));

        return previews;
    }

    buildPlaceholderFrame(scene) {
        const encodedScene = JSON.stringify({
            id: scene.id,
            name: scene.name,
            timestamp: Date.now(),
        });

        return {
            width: 320,
            height: 180,
            dataUrl: `data:text/json;base64,${this.encodeBase64(encodedScene)}`,
            spriteSheet: null,
        };
    }

    encodeBase64(value) {
        if (typeof btoa === 'function') {
            return btoa(unescape(encodeURIComponent(value)));
        }

        if (typeof Buffer !== 'undefined') {
            return Buffer.from(value).toString('base64');
        }

        return value;
    }
}
