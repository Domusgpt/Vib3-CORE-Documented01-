/**
 * Disposable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    Disposable,
    DisposalManager,
    DisposalState,
    CompositeDisposable,
    SerialDisposable,
    SingleAssignmentDisposable,
    createDisposable
} from '../../src/scene/Disposable.js';

describe('Disposable', () => {
    describe('basic disposal', () => {
        it('starts in active state', () => {
            const d = new Disposable();
            expect(d.disposalState).toBe(DisposalState.ACTIVE);
            expect(d.isActive).toBe(true);
            expect(d.isDisposed).toBe(false);
        });

        it('transitions to disposed state', () => {
            const d = new Disposable();
            d.dispose();

            expect(d.disposalState).toBe(DisposalState.DISPOSED);
            expect(d.isActive).toBe(false);
            expect(d.isDisposed).toBe(true);
        });

        it('only disposes once', () => {
            let disposeCount = 0;

            class CountingDisposable extends Disposable {
                _doDispose() {
                    disposeCount++;
                }
            }

            const d = new CountingDisposable();
            d.dispose();
            d.dispose();

            expect(disposeCount).toBe(1);
        });
    });

    describe('callbacks', () => {
        it('calls dispose callback', () => {
            const callback = vi.fn();
            const d = new Disposable();
            d.onDispose(callback);
            d.dispose();

            expect(callback).toHaveBeenCalled();
        });

        it('unsubscribes callback', () => {
            const callback = vi.fn();
            const d = new Disposable();
            const unsub = d.onDispose(callback);
            unsub();
            d.dispose();

            expect(callback).not.toHaveBeenCalled();
        });

        it('handles callback errors gracefully', () => {
            const d = new Disposable();
            d.onDispose(() => {
                throw new Error('Test error');
            });

            // Should not throw
            expect(() => d.dispose()).not.toThrow();
            expect(d.isDisposed).toBe(true);
        });
    });

    describe('dependencies', () => {
        it('adds dependency', () => {
            const d1 = new Disposable();
            const d2 = new Disposable();
            d1.addDependency(d2);

            expect(d1._dependencies.has(d2)).toBe(true);
            expect(d2._dependents.has(d1)).toBe(true);
        });

        it('prevents self-dependency', () => {
            const d = new Disposable();
            expect(() => d.addDependency(d)).toThrow();
        });

        it('prevents circular dependency', () => {
            const d1 = new Disposable();
            const d2 = new Disposable();
            d1.addDependency(d2);

            expect(() => d2.addDependency(d1)).toThrow();
        });

        it('cascades disposal to dependents', () => {
            const d1 = new Disposable();
            const d2 = new Disposable();
            d2.addDependency(d1); // d2 depends on d1

            d1.dispose();

            expect(d1.isDisposed).toBe(true);
            expect(d2.isDisposed).toBe(true);
        });

        it('removes dependency', () => {
            const d1 = new Disposable();
            const d2 = new Disposable();
            d1.addDependency(d2);
            d1.removeDependency(d2);

            expect(d1._dependencies.has(d2)).toBe(false);
            expect(d2._dependents.has(d1)).toBe(false);
        });
    });

    describe('assertNotDisposed', () => {
        it('does not throw when active', () => {
            const d = new Disposable();
            expect(() => d.assertNotDisposed()).not.toThrow();
        });

        it('throws when disposed', () => {
            const d = new Disposable();
            d.dispose();
            expect(() => d.assertNotDisposed('test')).toThrow();
        });
    });

    describe('labels', () => {
        it('sets debug label', () => {
            const d = new Disposable();
            d.setLabel('myResource');
            expect(d._label).toBe('myResource');
        });
    });
});

describe('DisposalManager', () => {
    let manager;

    beforeEach(() => {
        manager = new DisposalManager();
    });

    describe('tracking', () => {
        it('tracks objects', () => {
            const d = new Disposable();
            manager.track(d);

            expect(manager._tracked.has(d)).toBe(true);
        });

        it('untracks objects', () => {
            const d = new Disposable();
            manager.track(d);
            manager.untrack(d);

            expect(manager._tracked.has(d)).toBe(false);
        });
    });

    describe('deferred disposal', () => {
        it('marks for disposal', () => {
            const d = new Disposable();
            manager.track(d);
            manager.markForDisposal(d);

            expect(manager._pendingDisposal.has(d)).toBe(true);
            expect(d.isActive).toBe(true); // Not yet disposed
        });

        it('processes pending', () => {
            const d = new Disposable();
            manager.track(d);
            manager.markForDisposal(d);
            manager.processPending();

            expect(d.isDisposed).toBe(true);
            expect(manager._tracked.has(d)).toBe(false);
        });

        it('disposes in dependency order', () => {
            const order = [];

            class OrderedDisposable extends Disposable {
                constructor(name) {
                    super();
                    this.name = name;
                }
                _doDispose() {
                    order.push(this.name);
                }
            }

            const d1 = new OrderedDisposable('d1');
            const d2 = new OrderedDisposable('d2');
            d2.addDependency(d1); // d2 depends on d1

            manager.track(d1);
            manager.track(d2);
            manager.markForDisposal(d1);
            manager.markForDisposal(d2);
            manager.processPending();

            // d2 should be disposed first (as dependent)
            expect(order[0]).toBe('d2');
            expect(order[1]).toBe('d1');
        });
    });

    describe('disposeAll', () => {
        it('disposes all tracked', () => {
            const d1 = new Disposable();
            const d2 = new Disposable();
            manager.track(d1);
            manager.track(d2);

            manager.disposeAll();

            expect(d1.isDisposed).toBe(true);
            expect(d2.isDisposed).toBe(true);
        });
    });

    describe('statistics', () => {
        it('returns correct stats', () => {
            const active = new Disposable();
            const disposed = new Disposable();
            disposed.dispose();

            manager.track(active);
            manager.track(disposed);
            manager.markForDisposal(active);

            const stats = manager.getStats();

            expect(stats.tracked).toBe(2);
            expect(stats.active).toBe(1);
            expect(stats.disposed).toBe(1);
            expect(stats.pending).toBe(1);
        });
    });
});

describe('CompositeDisposable', () => {
    it('disposes all children', () => {
        const composite = new CompositeDisposable();
        const d1 = new Disposable();
        const d2 = new Disposable();

        composite.add(d1);
        composite.add(d2);
        composite.dispose();

        expect(d1.isDisposed).toBe(true);
        expect(d2.isDisposed).toBe(true);
    });

    it('removes child without disposing', () => {
        const composite = new CompositeDisposable();
        const d = new Disposable();

        composite.add(d);
        composite.remove(d);
        composite.dispose();

        expect(d.isActive).toBe(true);
    });

    it('throws when adding after disposal', () => {
        const composite = new CompositeDisposable();
        composite.dispose();

        expect(() => composite.add(new Disposable())).toThrow();
    });
});

describe('SerialDisposable', () => {
    it('disposes previous on reassignment', () => {
        const serial = new SerialDisposable();
        const d1 = new Disposable();
        const d2 = new Disposable();

        serial.set(d1);
        serial.set(d2);

        expect(d1.isDisposed).toBe(true);
        expect(d2.isActive).toBe(true);
    });

    it('disposes current on container disposal', () => {
        const serial = new SerialDisposable();
        const d = new Disposable();

        serial.set(d);
        serial.dispose();

        expect(d.isDisposed).toBe(true);
    });

    it('disposes new assignment if already disposed', () => {
        const serial = new SerialDisposable();
        serial.dispose();

        const d = new Disposable();
        serial.set(d);

        expect(d.isDisposed).toBe(true);
    });

    it('can set to null', () => {
        const serial = new SerialDisposable();
        const d = new Disposable();

        serial.set(d);
        serial.set(null);

        expect(d.isDisposed).toBe(true);
        expect(serial.get()).toBeNull();
    });
});

describe('SingleAssignmentDisposable', () => {
    it('allows single assignment', () => {
        const single = new SingleAssignmentDisposable();
        const d = new Disposable();

        single.set(d);
        expect(single._inner).toBe(d);
    });

    it('throws on second assignment', () => {
        const single = new SingleAssignmentDisposable();
        single.set(new Disposable());

        expect(() => single.set(new Disposable())).toThrow();
    });

    it('disposes inner on container disposal', () => {
        const single = new SingleAssignmentDisposable();
        const d = new Disposable();

        single.set(d);
        single.dispose();

        expect(d.isDisposed).toBe(true);
    });

    it('disposes assignment if already disposed', () => {
        const single = new SingleAssignmentDisposable();
        single.dispose();

        const d = new Disposable();
        single.set(d);

        expect(d.isDisposed).toBe(true);
    });
});

describe('createDisposable', () => {
    it('creates disposable from callback', () => {
        const cleanup = vi.fn();
        const d = createDisposable(cleanup);

        d.dispose();

        expect(cleanup).toHaveBeenCalled();
    });

    it('only calls callback once', () => {
        const cleanup = vi.fn();
        const d = createDisposable(cleanup);

        d.dispose();
        d.dispose();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
