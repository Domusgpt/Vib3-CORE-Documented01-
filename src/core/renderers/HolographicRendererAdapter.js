import { RendererContract } from '../RendererContracts.js';
import { HolographicSystem } from '../../holograms/HolographicSystem.js';

export class HolographicRendererAdapter extends RendererContract {
    constructor(system = new HolographicSystem({ autoStart: false })) {
        super();
        this.system = system;
    }

    init() {
        return true;
    }

    resize() {
        // Visualizers handle their own resizing.
    }

    render() {
        this.system.renderFrame();
    }

    setActive(active) {
        this.system.setActive(active);
    }

    dispose() {
        this.system.setActive(false);
    }
}
