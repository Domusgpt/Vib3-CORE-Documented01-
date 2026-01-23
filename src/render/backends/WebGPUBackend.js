/**
 * WebGPUBackend - experimental WebGPU rendering backend
 *
 * Minimal, working WebGPU backend focused on:
 * - Device/context initialization
 * - Canvas configuration + resize handling
 * - Clear pass rendering
 */

import { RenderResourceRegistry } from '../RenderResourceRegistry.js';

export class WebGPUBackend {
    /**
     * @param {object} params
     * @param {HTMLCanvasElement} params.canvas
     * @param {GPUDevice} params.device
     * @param {GPUCanvasContext} params.context
     * @param {GPUTextureFormat} params.format
     * @param {object} [options]
     */
    constructor({ canvas, device, context, format }, options = {}) {
        this.canvas = canvas;
        this.device = device;
        this.context = context;
        this.format = format;

        this.debug = options.debug || false;
        this.depthEnabled = options.depth !== false;
        this._resources = options.resourceRegistry || new RenderResourceRegistry();

        this._depthTexture = null;
        this._stats = {
            frames: 0,
            commandEncoders: 0
        };

        this.resize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);
    }

    /**
     * Resize the canvas and recreate depth resources if enabled.
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        const clampedWidth = Math.max(1, Math.floor(width));
        const clampedHeight = Math.max(1, Math.floor(height));

        this.canvas.width = clampedWidth;
        this.canvas.height = clampedHeight;

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'premultiplied'
        });

        if (this.depthEnabled) {
            this._destroyDepthTexture();
            this._depthTexture = this.device.createTexture({
                size: { width: clampedWidth, height: clampedHeight, depthOrArrayLayers: 1 },
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            this._resources.register('texture', this._depthTexture);
        }
    }

    /**
     * Render a single frame (clear-only pass by default).
     * @param {object} [options]
     * @param {number[]} [options.clearColor] - RGBA in 0-1
     */
    renderFrame(options = {}) {
        const clearColor = options.clearColor || [0, 0, 0, 1];
        const encoder = this.device.createCommandEncoder();
        this._stats.commandEncoders += 1;

        const colorView = this.context.getCurrentTexture().createView();
        const depthAttachment = this.depthEnabled && this._depthTexture
            ? {
                view: this._depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
            : undefined;

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: colorView,
                clearValue: { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: clearColor[3] },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: depthAttachment
        });
        pass.end();

        this.device.queue.submit([encoder.finish()]);
        this._stats.frames += 1;
    }

    /**
     * Return backend statistics.
     */
    getStats() {
        return {
            ...this._stats,
            resources: this._resources.getStats()
        };
    }

    /**
     * Dispose of GPU resources.
     */
    dispose() {
        this._destroyDepthTexture();
        this._resources.disposeAll();
    }

    _destroyDepthTexture() {
        if (this._depthTexture) {
            this._resources.release('texture', this._depthTexture);
            this._depthTexture.destroy();
            this._depthTexture = null;
        }
    }
}

/**
 * Create a WebGPU backend (async).
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @returns {Promise<WebGPUBackend|null>}
 */
export async function createWebGPUBackend(canvas, options = {}) {
    if (!canvas || typeof navigator === 'undefined' || !navigator.gpu) {
        return null;
    }

    const context = canvas.getContext('webgpu');
    if (!context) {
        return null;
    }

    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: options.powerPreference || 'high-performance'
    });
    if (!adapter) {
        return null;
    }

    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();

    return new WebGPUBackend({ canvas, device, context, format }, options);
}

export default WebGPUBackend;
