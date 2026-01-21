/**
 * Renderer and resource manager contracts for unified engine integrations.
 * These contracts provide a minimal API surface so renderers and resource managers
 * can be swapped without rewriting orchestration layers.
 */

export class RendererContract {
    init(context) {
        throw new Error('RendererContract.init() must be implemented.');
    }

    resize(width, height, pixelRatio = 1) {
        throw new Error('RendererContract.resize() must be implemented.');
    }

    render(frameState) {
        throw new Error('RendererContract.render() must be implemented.');
    }

    setActive(active) {
        throw new Error('RendererContract.setActive() must be implemented.');
    }

    dispose() {
        throw new Error('RendererContract.dispose() must be implemented.');
    }
}

export class ResourceManagerContract {
    registerResource(type, id, resource, bytes = 0) {
        throw new Error('ResourceManagerContract.registerResource() must be implemented.');
    }

    releaseResource(type, id) {
        throw new Error('ResourceManagerContract.releaseResource() must be implemented.');
    }

    disposeAll() {
        throw new Error('ResourceManagerContract.disposeAll() must be implemented.');
    }

    getStats() {
        throw new Error('ResourceManagerContract.getStats() must be implemented.');
    }
}
