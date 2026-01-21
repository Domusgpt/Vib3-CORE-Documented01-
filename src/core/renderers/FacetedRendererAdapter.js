import { RendererContract } from '../RendererContracts.js';
import { FacetedSystem } from '../../faceted/FacetedSystem.js';

export class FacetedRendererAdapter extends RendererContract {
    constructor(system = new FacetedSystem()) {
        super();
        this.system = system;
    }

    init(context = {}) {
        const initialized = this.system.initialize(context.canvas ?? null);
        if (!initialized) {
            throw new Error('Faceted renderer failed to initialize.');
        }
    }

    resize() {
        this.system.setupCanvasSize();
    }

    render() {
        this.system.renderFrame();
    }

    setActive(active) {
        this.system.setActive(active);
    }

    dispose() {
        this.system.stop();
    }
}
