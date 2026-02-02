export class SceneNode {
    constructor({ id, name, data = {} } = {}) {
        this.id = id || `node-${Date.now()}`;
        this.name = name || this.id;
        this.data = data;
        this.children = [];
        this.parent = null;
    }

    addChild(node) {
        node.parent = this;
        this.children.push(node);
    }

    removeChild(nodeId) {
        const index = this.children.findIndex((child) => child.id === nodeId);
        if (index >= 0) {
            const [child] = this.children.splice(index, 1);
            child.parent = null;
        }
    }

    traverse(visitor) {
        visitor(this);
        this.children.forEach((child) => child.traverse(visitor));
    }
}

export class SceneGraph {
    constructor() {
        this.root = new SceneNode({ id: 'root', name: 'Root' });
    }

    addNode(node, parentId = 'root') {
        const parent = this.findNode(parentId);
        if (!parent) {
            throw new Error(`Parent node '${parentId}' not found.`);
        }
        parent.addChild(node);
        return node;
    }

    findNode(nodeId) {
        let found = null;
        this.root.traverse((node) => {
            if (node.id === nodeId) {
                found = node;
            }
        });
        return found;
    }

    traverse(visitor) {
        this.root.traverse(visitor);
    }
}
