/**
 * Scene4D Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Scene4D } from '../../src/scene/Scene4D.js';
import { Node4D } from '../../src/scene/Node4D.js';
import { Vec4 } from '../../src/math/Vec4.js';

describe('Scene4D', () => {
    let scene;

    beforeEach(() => {
        scene = new Scene4D('testScene');
    });

    describe('construction', () => {
        it('creates with unique ID', () => {
            const scene1 = new Scene4D();
            const scene2 = new Scene4D();
            expect(scene1.id).not.toBe(scene2.id);
        });

        it('has root node', () => {
            expect(scene.root).toBeDefined();
            expect(scene.root.name).toBe('__root__');
        });

        it('starts with only root node', () => {
            expect(scene.nodeCount).toBe(1);
        });
    });

    describe('node management', () => {
        it('adds node to scene', () => {
            const node = new Node4D('testNode');
            scene.add(node);

            expect(scene.nodeCount).toBe(2);
            expect(node.parent).toBe(scene.root);
        });

        it('removes node from scene', () => {
            const node = new Node4D('testNode');
            scene.add(node);
            scene.remove(node);

            expect(scene.nodeCount).toBe(1);
            expect(node.parent).toBeNull();
        });

        it('cannot remove root', () => {
            const result = scene.remove(scene.root);
            expect(result).toBe(false);
            expect(scene.nodeCount).toBe(1);
        });

        it('checks if scene contains node', () => {
            const node = new Node4D('testNode');
            scene.add(node);

            expect(scene.contains(node)).toBe(true);
            scene.remove(node);
            expect(scene.contains(node)).toBe(false);
        });
    });

    describe('node lookup', () => {
        it('gets node by ID', () => {
            const node = new Node4D('testNode');
            scene.add(node);

            expect(scene.getNodeById(node.id)).toBe(node);
        });

        it('gets node by name', () => {
            const node = new Node4D('findMe');
            scene.add(node);

            expect(scene.getNodeByName('findMe')).toBe(node);
        });

        it('gets nodes by tag', () => {
            const node1 = new Node4D('node1');
            const node2 = new Node4D('node2');
            node1.tags.push('enemy');
            node2.tags.push('friend');
            scene.add(node1);
            scene.add(node2);

            const enemies = scene.getNodesByTag('enemy');
            expect(enemies).toContain(node1);
            expect(enemies).not.toContain(node2);
        });

        it('gets nodes by layer', () => {
            const node1 = new Node4D('node1');
            const node2 = new Node4D('node2');
            node1.layerMask = 1; // Layer 0
            node2.layerMask = 2; // Layer 1
            scene.add(node1);
            scene.add(node2);

            const layer0 = scene.getNodesByLayer(0);
            const layer1 = scene.getNodesByLayer(1);

            expect(layer0).toContain(node1);
            expect(layer1).toContain(node2);
        });
    });

    describe('traversal', () => {
        it('traverses all nodes', () => {
            scene.add(new Node4D('node1'));
            scene.add(new Node4D('node2'));

            const visited = [];
            scene.traverse(node => { visited.push(node.name); });

            expect(visited).toContain('__root__');
            expect(visited).toContain('node1');
            expect(visited).toContain('node2');
        });

        it('traverses visible only', () => {
            const visible = new Node4D('visible');
            const hidden = new Node4D('hidden');
            hidden.visible = false;
            scene.add(visible);
            scene.add(hidden);

            const visited = [];
            scene.traverseVisible(node => { visited.push(node.name); });

            expect(visited).toContain('visible');
            expect(visited).not.toContain('hidden');
        });

        it('gets visible nodes sorted by W', () => {
            const near = new Node4D('near');
            const far = new Node4D('far');
            near.setPosition(0, 0, 0, -1);
            far.setPosition(0, 0, 0, 1);
            scene.add(near);
            scene.add(far);

            const sorted = scene.getVisibleNodesSortedByW();

            expect(sorted[0].name).toBe('near');
            expect(sorted[1].name).toBe('far');
        });
    });

    describe('update', () => {
        it('calls update callbacks', () => {
            let called = false;
            let dt = 0;
            scene.onUpdate((deltaTime) => {
                called = true;
                dt = deltaTime;
            });

            scene.update(0.016);

            expect(called).toBe(true);
            expect(dt).toBeCloseTo(0.016, 5);
        });

        it('unsubscribes from updates', () => {
            let count = 0;
            const unsub = scene.onUpdate(() => { count++; });

            scene.update(0.016);
            unsub();
            scene.update(0.016);

            expect(count).toBe(1);
        });

        it('processes pending operations after update', () => {
            const node = new Node4D('pending');

            // Simulate adding during update
            scene.onUpdate(() => {
                scene.add(node);
            });

            scene.update(0.016);

            expect(scene.contains(node)).toBe(true);
        });
    });

    describe('queries', () => {
        beforeEach(() => {
            const n1 = new Node4D('n1');
            const n2 = new Node4D('n2');
            const n3 = new Node4D('n3');
            n1.setPosition(0, 0, 0, 0);
            n2.setPosition(1, 0, 0, 0);
            n3.setPosition(10, 0, 0, 0);
            scene.add(n1);
            scene.add(n2);
            scene.add(n3);
        });

        it('finds nodes in sphere', () => {
            const center = new Vec4(0, 0, 0, 0);
            const results = scene.findNodesInSphere(center, 2);

            expect(results.length).toBe(2);
        });

        it('finds nodes in box', () => {
            const min = new Vec4(-1, -1, -1, -1);
            const max = new Vec4(5, 1, 1, 1);
            const results = scene.findNodesInBox(min, max);

            expect(results.length).toBe(2);
        });

        it('finds nearest node', () => {
            const point = new Vec4(0.5, 0, 0, 0);
            const nearest = scene.findNearestNode(point);

            expect(nearest.name).toBe('n1');
        });

        it('respects max distance for nearest', () => {
            const point = new Vec4(100, 100, 100, 100);
            const nearest = scene.findNearestNode(point, 1);

            expect(nearest).toBeNull();
        });
    });

    describe('lifecycle', () => {
        it('clears all nodes', () => {
            scene.add(new Node4D('node1'));
            scene.add(new Node4D('node2'));
            scene.clear();

            expect(scene.nodeCount).toBe(1); // Only root
            expect(scene.root.childCount).toBe(0);
        });

        it('clones scene', () => {
            const node = new Node4D('node');
            node.setPosition(1, 2, 3, 4);
            scene.add(node);
            scene.metadata.key = 'value';

            const cloned = scene.clone();

            expect(cloned.id).not.toBe(scene.id);
            expect(cloned.nodeCount).toBe(2);
            expect(cloned.metadata.key).toBe('value');
        });

        it('disposes scene', () => {
            scene.add(new Node4D('node'));
            scene.dispose();

            expect(scene.nodeCount).toBe(1);
        });
    });

    describe('serialization', () => {
        it('serializes to JSON', () => {
            scene.add(new Node4D('node'));
            scene.backgroundColor = new Vec4(0.1, 0.2, 0.3, 1);

            const json = scene.toJSON();

            expect(json.name).toBe('testScene');
            expect(json.nodes.length).toBe(1);
            expect(json.backgroundColor[0]).toBeCloseTo(0.1, 5);
        });

        it('deserializes from JSON', () => {
            const json = {
                name: 'loaded',
                backgroundColor: [0.1, 0.2, 0.3, 1],
                ambientLight: [0.2, 0.2, 0.2, 1],
                wFogDistance: 10,
                wFogEnabled: false,
                metadata: { key: 'value' },
                nodes: [{
                    name: 'node',
                    position: [1, 2, 3, 4],
                    rotation: [1, 0, 0, 0, 0, 0, 0, 0],
                    scale: [1, 1, 1, 1],
                    visible: true,
                    enabled: true,
                    tags: [],
                    layerMask: 1,
                    children: []
                }]
            };

            const loaded = Scene4D.fromJSON(json);

            expect(loaded.name).toBe('loaded');
            expect(loaded.nodeCount).toBe(2);
            expect(loaded.metadata.key).toBe('value');
        });
    });

    describe('statistics', () => {
        it('returns correct stats', () => {
            const visible = new Node4D('visible');
            const hidden = new Node4D('hidden');
            hidden.visible = false;
            scene.add(visible);
            scene.add(hidden);

            const stats = scene.getStats();

            expect(stats.totalNodes).toBe(3);
            expect(stats.visibleNodes).toBe(2);
            expect(stats.maxDepth).toBe(1);
        });
    });
});
