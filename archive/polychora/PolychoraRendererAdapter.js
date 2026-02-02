import { RendererContract } from '../RendererContracts.js';
import { PolychoraSystem } from '../PolychoraSystem.js';

export class PolychoraRendererAdapter extends RendererContract {
    constructor(system = new PolychoraSystem()) {
        super();
        this.system = system;
    }

    init() {
        const initialized = this.system.initialize();
        if (!initialized) {
            throw new Error('Polychora renderer failed to initialize.');
        }
    }

    resize() {
        this.system.resizeAllCanvases();
    }

    render() {
        this.system.renderFrame();
    }

    setActive(active) {
        if (active) {
            this.system.start();
        } else {
            this.system.stop();
        }
    }

    dispose() {
        this.system.stop();
    }
}
