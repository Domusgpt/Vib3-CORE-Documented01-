/**
 * ResourceManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceManager, ResourceTypes } from '../../src/scene/ResourceManager.js';

describe('ResourceManager', () => {
    let manager;

    beforeEach(() => {
        manager = new ResourceManager();
    });

    describe('registration', () => {
        it('registers a resource', () => {
            const resource = manager.register('test', 'geometry', { data: 'test' });

            expect(resource.id).toBe('test');
            expect(resource.type).toBe('geometry');
            expect(resource.refCount).toBe(1);
        });

        it('tracks memory size', () => {
            manager.register('test', 'geometry', { data: 'test' }, { size: 1024 });

            expect(manager.totalMemory).toBe(1024);
        });

        it('returns same resource for duplicate ID', () => {
            const res1 = manager.register('test', 'geometry', { data: 'test1' });
            const res2 = manager.register('test', 'geometry', { data: 'test2' });

            expect(res1).toBe(res2);
            expect(res1.refCount).toBe(2);
        });

        it('deduplicates by hash', () => {
            const hash = 'unique_hash';
            const res1 = manager.register('test1', 'geometry', { data: 'test' }, { hash });
            const res2 = manager.register('test2', 'geometry', { data: 'test' }, { hash });

            expect(res1).toBe(res2);
        });

        it('stores metadata', () => {
            const resource = manager.register('test', 'geometry', {}, {
                metadata: { version: 1, author: 'test' }
            });

            expect(resource.metadata.get('version')).toBe(1);
            expect(resource.metadata.get('author')).toBe('test');
        });
    });

    describe('retrieval', () => {
        beforeEach(() => {
            manager.register('test', 'geometry', { value: 42 });
        });

        it('gets resource by ID', () => {
            const resource = manager.get('test');
            expect(resource).toBeDefined();
            expect(resource.id).toBe('test');
        });

        it('gets data by ID', () => {
            const data = manager.getData('test');
            expect(data.value).toBe(42);
        });

        it('returns undefined for missing ID', () => {
            expect(manager.get('missing')).toBeUndefined();
            expect(manager.getData('missing')).toBeUndefined();
        });

        it('checks existence', () => {
            expect(manager.has('test')).toBe(true);
            expect(manager.has('missing')).toBe(false);
        });
    });

    describe('reference counting', () => {
        it('increments refCount on acquire', () => {
            manager.register('test', 'geometry', {});
            const resource = manager.acquire('test');

            expect(resource.refCount).toBe(2);
        });

        it('decrements refCount on release', () => {
            const resource = manager.register('test', 'geometry', {});
            manager.release('test');

            expect(resource.refCount).toBe(0);
        });

        it('disposes when refCount reaches 0 with autoGC', () => {
            manager.register('test', 'geometry', {});
            const disposed = manager.release('test');

            expect(disposed).toBe(true);
            expect(manager.has('test')).toBe(false);
        });

        it('does not dispose when autoGC is disabled', () => {
            manager.autoGC = false;
            manager.register('test', 'geometry', {});
            manager.release('test');

            const resource = manager.get('test');
            expect(resource.refCount).toBe(0);
            expect(resource.disposed).toBe(false);
        });
    });

    describe('type queries', () => {
        beforeEach(() => {
            manager.register('geo1', ResourceTypes.GEOMETRY, {}, { size: 100 });
            manager.register('geo2', ResourceTypes.GEOMETRY, {}, { size: 200 });
            manager.register('mat1', ResourceTypes.MATERIAL, {}, { size: 50 });
        });

        it('gets resources by type', () => {
            const geometries = manager.getByType(ResourceTypes.GEOMETRY);
            expect(geometries.length).toBe(2);
        });

        it('gets count by type', () => {
            expect(manager.getCountByType(ResourceTypes.GEOMETRY)).toBe(2);
            expect(manager.getCountByType(ResourceTypes.MATERIAL)).toBe(1);
        });

        it('gets memory by type', () => {
            expect(manager.getMemoryByType(ResourceTypes.GEOMETRY)).toBe(300);
            expect(manager.getMemoryByType(ResourceTypes.MATERIAL)).toBe(50);
        });
    });

    describe('garbage collection', () => {
        beforeEach(() => {
            manager.gcIdleTime = 0; // Immediate eligibility
        });

        it('collects unreferenced resources', () => {
            manager.autoGC = false; // Disable auto for manual test BEFORE release
            manager.register('test', 'geometry', {});
            manager.release('test');

            const disposed = manager.runGC();

            expect(disposed).toBe(1);
        });

        it('respects maxDispose limit', () => {
            manager.autoGC = false;
            manager.register('test1', 'geometry', {});
            manager.register('test2', 'geometry', {});
            manager.release('test1');
            manager.release('test2');

            const disposed = manager.runGC({ maxDispose: 1 });

            expect(disposed).toBe(1);
        });

        it('filters by type', () => {
            manager.autoGC = false;
            manager.register('geo', ResourceTypes.GEOMETRY, {});
            manager.register('mat', ResourceTypes.MATERIAL, {});
            manager.release('geo');
            manager.release('mat');

            const disposed = manager.runGC({ types: [ResourceTypes.GEOMETRY] });

            expect(disposed).toBe(1);
            expect(manager.has('mat')).toBe(true);
        });

        it('does not collect referenced resources', () => {
            manager.register('test', 'geometry', {});
            // refCount is 1, should not be collected

            const disposed = manager.runGC();

            expect(disposed).toBe(0);
            expect(manager.has('test')).toBe(true);
        });
    });

    describe('memory limit', () => {
        it('triggers GC when limit exceeded', () => {
            manager.memoryLimit = 1000;
            manager.gcThreshold = 0.5;
            manager.gcIdleTime = 0;

            // Register resources that exceed threshold
            manager.register('test1', 'geometry', {}, { size: 300 });
            manager.release('test1');

            manager.register('test2', 'geometry', {}, { size: 300 });

            // GC should have been triggered
            expect(manager.totalMemory).toBeLessThanOrEqual(600);
        });
    });

    describe('disposal', () => {
        it('calls custom dispose callback', () => {
            const callback = vi.fn();
            manager.register('test', 'geometry', { data: 'test' }, {
                disposeCallback: callback
            });

            manager.forceDispose('test');

            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        it('notifies dispose listeners', () => {
            const listener = vi.fn();
            manager.onDispose(listener);
            manager.register('test', 'geometry', {});

            manager.forceDispose('test');

            expect(listener).toHaveBeenCalled();
        });

        it('disposes all resources of type', () => {
            manager.register('geo1', ResourceTypes.GEOMETRY, {});
            manager.register('geo2', ResourceTypes.GEOMETRY, {});
            manager.register('mat1', ResourceTypes.MATERIAL, {});

            const disposed = manager.disposeType(ResourceTypes.GEOMETRY);

            expect(disposed).toBe(2);
            expect(manager.has('mat1')).toBe(true);
        });

        it('disposes all resources', () => {
            manager.register('test1', 'geometry', {});
            manager.register('test2', 'material', {});

            manager.disposeAll();

            expect(manager.resourceCount).toBe(0);
            expect(manager.totalMemory).toBe(0);
        });
    });

    describe('statistics', () => {
        it('returns correct stats', () => {
            manager.register('geo1', ResourceTypes.GEOMETRY, {}, { size: 100 });
            manager.register('geo2', ResourceTypes.GEOMETRY, {}, { size: 200 });
            manager.acquire('geo1');

            const stats = manager.getStats();

            expect(stats.totalResources).toBe(2);
            expect(stats.totalMemory).toBe(300);
            expect(stats.byType[ResourceTypes.GEOMETRY].count).toBe(2);
            expect(stats.byType[ResourceTypes.GEOMETRY].refs).toBe(3); // 1+1+1
        });
    });

    describe('hash generation', () => {
        it('generates string hash', () => {
            const hash = ResourceManager.generateHash('test string');
            expect(hash).toMatch(/^str_\d+$/);
        });

        it('generates array hash', () => {
            const arr = new Float32Array([1, 2, 3, 4]);
            const hash = ResourceManager.generateHash(arr);
            expect(hash).toMatch(/^arr_\d+$/);
        });

        it('generates object hash', () => {
            const hash = ResourceManager.generateHash({ key: 'value' });
            expect(hash).toMatch(/^obj_\d+$/);
        });
    });
});
