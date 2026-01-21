import { RendererContract } from '../RendererContracts.js';
import { QuantumEngine } from '../../quantum/QuantumEngine.js';

export class QuantumRendererAdapter extends RendererContract {
    constructor(system = new QuantumEngine({ autoStart: false })) {
        super();
        this.system = system;
    }

    init() {
        return true;
    }

    resize() {
        // Canvas sizing is handled by visualizers.
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
