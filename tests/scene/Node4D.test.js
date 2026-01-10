/**
 * Node4D Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Node4D } from '../../src/scene/Node4D.js';
import { Vec4 } from '../../src/math/Vec4.js';
import { Rotor4D } from '../../src/math/Rotor4D.js';

describe('Node4D', () => {
    let node;

    beforeEach(() => {
        node = new Node4D('testNode');
    });

    describe('construction', () => {
        it('creates with unique ID', () => {
            const node1 = new Node4D();
            const node2 = new Node4D();
            expect(node1.id).not.toBe(node2.id);
        });

        it('uses provided name', () => {
            expect(node.name).toBe('testNode');
        });

        it('defaults to ID as name if not provided', () => {
            const unnamed = new Node4D();
            expect(unnamed.name).toBe(unnamed.id);
        });

        it('initializes with identity transform', () => {
            expect(node.position.equals(Vec4.zero())).toBe(true);
            expect(node.scale.equals(new Vec4(1, 1, 1, 1))).toBe(true);
        });

        it('starts visible and enabled', () => {
            expect(node.visible).toBe(true);
            expect(node.enabled).toBe(true);
        });
    });

    describe('hierarchy', () => {
        it('starts with no parent', () => {
            expect(node.parent).toBeNull();
        });

        it('starts with no children', () => {
            expect(node.childCount).toBe(0);
            expect(node.children).toEqual([]);
        });

        it('adds child correctly', () => {
            const child = new Node4D('child');
            node.addChild(child);

            expect(child.parent).toBe(node);
            expect(node.childCount).toBe(1);
            expect(node.children).toContain(child);
        });

        it('removes child correctly', () => {
            const child = new Node4D('child');
            node.addChild(child);
            node.removeChild(child);

            expect(child.parent).toBeNull();
            expect(node.childCount).toBe(0);
        });

        it('prevents adding self as child', () => {
            expect(() => node.addChild(node)).toThrow();
        });

        it('prevents circular hierarchy', () => {
            const child = new Node4D('child');
            node.addChild(child);
            expect(() => child.addChild(node)).toThrow();
        });

        it('removes all children', () => {
            node.addChild(new Node4D('child1'));
            node.addChild(new Node4D('child2'));
            node.removeAllChildren();

            expect(node.childCount).toBe(0);
        });

        it('finds child by name', () => {
            const child = new Node4D('findMe');
            node.addChild(child);

            expect(node.getChildByName('findMe')).toBe(child);
            expect(node.getChildByName('notThere')).toBeUndefined();
        });

        it('finds descendant recursively', () => {
            const child = new Node4D('child');
            const grandchild = new Node4D('grandchild');
            node.addChild(child);
            child.addChild(grandchild);

            expect(node.findByName('grandchild')).toBe(grandchild);
        });

        it('gets root node', () => {
            const child = new Node4D('child');
            const grandchild = new Node4D('grandchild');
            node.addChild(child);
            child.addChild(grandchild);

            expect(grandchild.getRoot()).toBe(node);
        });

        it('calculates depth correctly', () => {
            const child = new Node4D('child');
            const grandchild = new Node4D('grandchild');
            node.addChild(child);
            child.addChild(grandchild);

            expect(node.getDepth()).toBe(0);
            expect(child.getDepth()).toBe(1);
            expect(grandchild.getDepth()).toBe(2);
        });

        it('checks descendant relationship', () => {
            const child = new Node4D('child');
            const grandchild = new Node4D('grandchild');
            node.addChild(child);
            child.addChild(grandchild);

            expect(grandchild.isDescendantOf(node)).toBe(true);
            expect(grandchild.isDescendantOf(child)).toBe(true);
            expect(child.isDescendantOf(grandchild)).toBe(false);
        });
    });

    describe('transform', () => {
        it('sets position', () => {
            node.setPosition(1, 2, 3, 4);
            expect(node.position.x).toBe(1);
            expect(node.position.y).toBe(2);
            expect(node.position.z).toBe(3);
            expect(node.position.w).toBe(4);
        });

        it('sets uniform scale', () => {
            node.setUniformScale(2);
            expect(node.scale.x).toBe(2);
            expect(node.scale.y).toBe(2);
            expect(node.scale.z).toBe(2);
            expect(node.scale.w).toBe(2);
        });

        it('translates correctly', () => {
            node.setPosition(1, 0, 0, 0);
            node.translate(new Vec4(1, 2, 3, 4));

            expect(node.position.x).toBe(2);
            expect(node.position.y).toBe(2);
            expect(node.position.z).toBe(3);
            expect(node.position.w).toBe(4);
        });

        it('rotates on plane', () => {
            node.rotateOnPlane('XY', Math.PI / 2);
            // Rotation should be applied
            expect(node.rotation.isIdentity()).toBe(false);
        });

        it('computes local matrix', () => {
            node.setPosition(1, 2, 3, 0);
            const matrix = node.localMatrix;

            // Translation should be in last column
            expect(matrix.get(0, 3)).toBeCloseTo(1, 5);
            expect(matrix.get(1, 3)).toBeCloseTo(2, 5);
            expect(matrix.get(2, 3)).toBeCloseTo(3, 5);
        });

        it('computes world matrix with parent', () => {
            const child = new Node4D('child');
            node.addChild(child);

            node.setPosition(10, 0, 0, 0);
            child.setPosition(5, 0, 0, 0);

            const worldPos = child.worldPosition;
            expect(worldPos.x).toBeCloseTo(15, 5);
        });

        it('transforms local to world', () => {
            node.setPosition(10, 20, 30, 0);
            const worldPoint = node.localToWorld(new Vec4(1, 1, 1, 0));

            expect(worldPoint.x).toBeCloseTo(11, 5);
            expect(worldPoint.y).toBeCloseTo(21, 5);
            expect(worldPoint.z).toBeCloseTo(31, 5);
        });
    });

    describe('tags', () => {
        it('starts with no tags', () => {
            expect(node.tags).toEqual([]);
        });

        it('can add tags', () => {
            node.tags.push('enemy', 'visible');
            expect(node.tags).toContain('enemy');
            expect(node.tags).toContain('visible');
        });

        it('finds nodes by tag', () => {
            const child1 = new Node4D('child1');
            const child2 = new Node4D('child2');
            child1.tags.push('tagged');
            node.addChild(child1);
            node.addChild(child2);

            const tagged = node.findByTag('tagged');
            expect(tagged).toContain(child1);
            expect(tagged).not.toContain(child2);
        });
    });

    describe('traversal', () => {
        it('traverses depth-first', () => {
            const child1 = new Node4D('child1');
            const child2 = new Node4D('child2');
            const grandchild = new Node4D('grandchild');
            node.addChild(child1);
            node.addChild(child2);
            child1.addChild(grandchild);

            const visited = [];
            node.traverse(n => { visited.push(n.name); });

            expect(visited).toEqual(['testNode', 'child1', 'grandchild', 'child2']);
        });

        it('can stop traversal early', () => {
            node.addChild(new Node4D('child1'));
            node.addChild(new Node4D('child2'));

            let count = 0;
            node.traverse(() => {
                count++;
                return count < 2 ? undefined : false;
            });

            expect(count).toBe(2);
        });

        it('traverses visible only', () => {
            const visible = new Node4D('visible');
            const hidden = new Node4D('hidden');
            hidden.visible = false;
            node.addChild(visible);
            node.addChild(hidden);

            const visited = [];
            node.traverseVisible(n => { visited.push(n.name); });

            expect(visited).toContain('visible');
            expect(visited).not.toContain('hidden');
        });

        it('gets all descendants', () => {
            const child = new Node4D('child');
            const grandchild = new Node4D('grandchild');
            node.addChild(child);
            child.addChild(grandchild);

            const descendants = node.getDescendants();
            expect(descendants).toContain(child);
            expect(descendants).toContain(grandchild);
            expect(descendants).not.toContain(node);
        });
    });

    describe('cloning', () => {
        it('clones without children', () => {
            node.setPosition(1, 2, 3, 4);
            node.tags.push('test');
            node.addChild(new Node4D('child'));

            const cloned = node.clone();

            expect(cloned.id).not.toBe(node.id);
            expect(cloned.position.x).toBe(1);
            expect(cloned.tags).toContain('test');
            expect(cloned.childCount).toBe(0);
        });

        it('deep clones with children', () => {
            const child = new Node4D('child');
            child.setPosition(5, 5, 5, 5);
            node.addChild(child);

            const cloned = node.cloneDeep();

            expect(cloned.childCount).toBe(1);
            expect(cloned.children[0].name).toBe('child_clone');
            expect(cloned.children[0].position.x).toBe(5);
        });
    });

    describe('serialization', () => {
        it('serializes to JSON', () => {
            node.setPosition(1, 2, 3, 4);
            node.tags.push('test');

            const json = node.toJSON();

            expect(json.name).toBe('testNode');
            expect(json.position).toEqual([1, 2, 3, 4]);
            expect(json.tags).toContain('test');
        });

        it('deserializes from JSON', () => {
            const json = {
                name: 'loaded',
                position: [1, 2, 3, 4],
                rotation: [1, 0, 0, 0, 0, 0, 0, 0],
                scale: [2, 2, 2, 2],
                visible: true,
                enabled: true,
                tags: ['loaded'],
                layerMask: 1,
                children: []
            };

            const loaded = Node4D.fromJSON(json);

            expect(loaded.name).toBe('loaded');
            expect(loaded.position.x).toBe(1);
            expect(loaded.scale.x).toBe(2);
            expect(loaded.tags).toContain('loaded');
        });

        it('round-trips through JSON', () => {
            node.setPosition(1, 2, 3, 4);
            node.addChild(new Node4D('child'));

            const json = node.toJSON();
            const loaded = Node4D.fromJSON(json);

            expect(loaded.position.x).toBe(1);
            expect(loaded.childCount).toBe(1);
        });
    });

    describe('disposal', () => {
        it('removes all children on dispose', () => {
            const child = new Node4D('child');
            node.addChild(child);
            node.dispose();

            expect(node.childCount).toBe(0);
        });

        it('removes from parent on dispose', () => {
            const parent = new Node4D('parent');
            parent.addChild(node);
            node.dispose();

            expect(parent.childCount).toBe(0);
        });

        it('disposes deeply', () => {
            const child = new Node4D('child');
            const grandchild = new Node4D('grandchild');
            node.addChild(child);
            child.addChild(grandchild);

            node.disposeDeep();

            expect(node.childCount).toBe(0);
            expect(child.childCount).toBe(0);
        });
    });
});
