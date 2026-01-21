import { RendererContract } from '../RendererContracts.js';

export class RendererLifecycleManager {
    constructor({ resourceManager } = {}) {
        this.renderers = new Map();
        this.activeKey = null;
        this.resourceManager = resourceManager ?? null;
    }

    registerRenderer(key, renderer) {
        if (!(renderer instanceof RendererContract)) {
            throw new Error(`Renderer "${key}" must extend RendererContract.`);
        }

        this.renderers.set(key, {
            renderer,
            initialized: false,
        });
    }

    async activate(key, context = {}) {
        if (!this.renderers.has(key)) {
            throw new Error(`Renderer "${key}" is not registered.`);
        }

        if (this.activeKey && this.activeKey !== key) {
            const current = this.renderers.get(this.activeKey);
            current?.renderer?.setActive?.(false);
        }

        const entry = this.renderers.get(key);
        if (!entry.initialized) {
            await entry.renderer.init(context);
            entry.initialized = true;
        }

        if (context.resize) {
            const { width, height, pixelRatio } = context.resize;
            entry.renderer.resize(width, height, pixelRatio);
        }

        entry.renderer.setActive?.(true);
        this.activeKey = key;
    }

    resize(width, height, pixelRatio = 1) {
        const entry = this.activeKey ? this.renderers.get(this.activeKey) : null;
        entry?.renderer?.resize(width, height, pixelRatio);
    }

    render(frameState = {}) {
        const entry = this.activeKey ? this.renderers.get(this.activeKey) : null;
        entry?.renderer?.render(frameState);
    }

    dispose() {
        this.renderers.forEach((entry) => {
            entry.renderer.dispose();
        });
        this.renderers.clear();
        this.activeKey = null;
    }
}
