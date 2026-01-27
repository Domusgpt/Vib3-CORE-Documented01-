export class RenderCommandBuffer {
    constructor() {
        this.commands = [];
    }

    add(command, payload = {}) {
        this.commands.push({ command, payload, timestamp: Date.now() });
    }

    batch(commands = []) {
        commands.forEach((entry) => this.add(entry.command, entry.payload));
    }

    flush() {
        const batch = [...this.commands];
        this.commands.length = 0;
        return batch;
    }

    get size() {
        return this.commands.length;
    }
}
