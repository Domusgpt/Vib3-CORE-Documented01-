/**
 * RenderResourceRegistry - Centralized GPU resource lifecycle tracking.
 *
 * Tracks WebGL resources by type with optional byte sizing to help
 * manage disposal and provide lifecycle visibility to renderer contracts.
 */

export class RenderResourceRegistry {
    constructor() {
        this._resources = new Map();
    }

    register(type, handle, disposer, options = {}) {
        if (!handle) {
            return null;
        }
        const entry = {
            handle,
            disposer,
            bytes: options.bytes ?? 0,
            label: options.label ?? null
        };
        const bucket = this._resources.get(type) ?? new Set();
        bucket.add(entry);
        this._resources.set(type, bucket);
        return entry;
    }

    release(type, handle) {
        const bucket = this._resources.get(type);
        if (!bucket) return false;
        for (const entry of bucket) {
            if (entry.handle === handle) {
                bucket.delete(entry);
                if (bucket.size === 0) {
                    this._resources.delete(type);
                }
                return true;
            }
        }
        return false;
    }

    dispose(type, handle) {
        const bucket = this._resources.get(type);
        if (!bucket) return false;
        for (const entry of bucket) {
            if (entry.handle === handle) {
                if (entry.disposer) {
                    entry.disposer();
                }
                bucket.delete(entry);
                if (bucket.size === 0) {
                    this._resources.delete(type);
                }
                return true;
            }
        }
        return false;
    }

    disposeAll() {
        for (const bucket of this._resources.values()) {
            for (const entry of bucket) {
                if (entry.disposer) {
                    entry.disposer();
                }
            }
        }
        this._resources.clear();
    }

    getStats() {
        const stats = {
            totalResources: 0,
            totalBytes: 0,
            byType: {}
        };

        for (const [type, bucket] of this._resources.entries()) {
            let bytes = 0;
            for (const entry of bucket) {
                stats.totalResources += 1;
                bytes += entry.bytes;
            }
            stats.totalBytes += bytes;
            stats.byType[type] = {
                count: bucket.size,
                bytes
            };
        }

        return stats;
    }
}

export default RenderResourceRegistry;
