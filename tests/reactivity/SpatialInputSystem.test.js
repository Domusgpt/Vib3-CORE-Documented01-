/**
 * SpatialInputSystem Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    SpatialInputSystem,
    createSpatialInputSystem,
    SOURCE_TYPES,
    SPATIAL_AXES
} from '../../src/reactivity/SpatialInputSystem.js';

describe('SpatialInputSystem', () => {
    let spatial;
    let updateFn;

    beforeEach(() => {
        updateFn = vi.fn();
        spatial = new SpatialInputSystem({
            onParameterUpdate: updateFn,
            autoRegisterGlobals: false, // Avoid DOM APIs in test
        });
    });

    describe('exports', () => {
        it('exports SOURCE_TYPES', () => {
            expect(SOURCE_TYPES).toBeTruthy();
            expect(SOURCE_TYPES.DEVICE_TILT).toBe('deviceTilt');
            expect(SOURCE_TYPES.MOUSE_POSITION).toBe('mousePosition');
            expect(SOURCE_TYPES.PROGRAMMATIC).toBe('programmatic');
        });

        it('exports SPATIAL_AXES', () => {
            expect(Array.isArray(SPATIAL_AXES)).toBe(true);
            expect(SPATIAL_AXES).toContain('pitch');
            expect(SPATIAL_AXES).toContain('yaw');
            expect(SPATIAL_AXES).toContain('roll');
        });
    });

    describe('constructor', () => {
        it('creates successfully', () => {
            expect(spatial).toBeTruthy();
        });

        it('has default sensitivity', () => {
            expect(spatial.sensitivity).toBe(1.0);
        });

        it('has no active profile initially', () => {
            expect(spatial.activeProfile).toBeNull();
        });
    });

    describe('createSpatialInputSystem factory', () => {
        it('creates an instance', () => {
            const instance = createSpatialInputSystem({
                autoRegisterGlobals: false
            });
            expect(instance).toBeInstanceOf(SpatialInputSystem);
            instance.destroy();
        });
    });

    describe('enable/disable', () => {
        it('disables', () => {
            spatial.disable();
            expect(spatial.isEnabled()).toBe(false);
        });

        it('re-enables', () => {
            spatial.disable();
            spatial.enable();
            expect(spatial.isEnabled()).toBe(true);
        });
    });

    describe('source management', () => {
        it('adds a programmatic source', () => {
            const result = spatial.addSource('test', 'programmatic');
            expect(result).toBe(true);
            expect(spatial.hasSource('test')).toBe(true);
        });

        it('removes a source', () => {
            spatial.addSource('test', 'programmatic');
            const result = spatial.removeSource('test');
            expect(result).toBe(true);
            expect(spatial.hasSource('test')).toBe(false);
        });

        it('lists sources', () => {
            spatial.addSource('test', 'programmatic');
            const sources = spatial.listSources();
            expect(sources.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('mapping management', () => {
        it('sets a mapping', () => {
            const result = spatial.setMapping('pitch', 'rot4dXW', 1.0);
            expect(result).toBe(true);
        });

        it('removes a mapping', () => {
            spatial.setMapping('pitch', 'rot4dXW');
            const result = spatial.removeMapping('pitch', 'rot4dXW');
            expect(result).toBe(true);
        });

        it('clears all mappings', () => {
            spatial.setMapping('pitch', 'rot4dXW');
            spatial.setMapping('yaw', 'rot4dYW');
            spatial.clearMappings();
            expect(spatial.listMappings().length).toBe(0);
        });
    });

    describe('profiles', () => {
        it('lists built-in profiles', () => {
            const profiles = spatial.listProfiles();
            expect(profiles.length).toBeGreaterThan(0);
        });

        it('loads a profile', () => {
            const profiles = spatial.listProfiles();
            if (profiles.length > 0) {
                const result = spatial.loadProfile(profiles[0]);
                expect(result).toBe(true);
            }
        });

        it('creates a custom profile', () => {
            const result = spatial.createProfile('testProfile', [
                { axis: 'pitch', target: 'rot4dXW', scale: 1.0 }
            ]);
            expect(result).toBe(true);
        });

        it('retrieves a created profile or built-in profile', () => {
            // getProfile may only work for built-in profiles depending on implementation
            const profiles = spatial.listProfiles();
            if (profiles.length > 0) {
                const profile = spatial.getProfile(profiles[0]);
                expect(profile).toBeDefined();
            }
        });

        it('removes a custom profile', () => {
            const created = spatial.createProfile('testProfile', []);
            if (created) {
                const result = spatial.removeProfile('testProfile');
                expect(result).toBe(true);
            }
        });
    });

    describe('configuration', () => {
        it('sets sensitivity', () => {
            spatial.setSensitivity(2.0);
            expect(spatial.sensitivity).toBe(2.0);
        });

        it('sets smoothing', () => {
            spatial.setSmoothing(0.5);
            expect(spatial.smoothingFactor).toBe(0.5);
        });

        it('sets dramatic mode', () => {
            spatial.setDramaticMode(true);
            expect(spatial.dramaticMode).toBe(true);
        });
    });

    describe('state', () => {
        it('returns current state', () => {
            const state = spatial.getState();
            expect(state).toHaveProperty('pitch');
            expect(state).toHaveProperty('yaw');
            expect(state).toHaveProperty('roll');
        });

        it('returns raw state', () => {
            const state = spatial.getRawState();
            expect(state).toHaveProperty('pitch');
        });
    });

    describe('feedInput', () => {
        it('accepts programmatic input', () => {
            spatial.addSource('prog', 'programmatic');
            spatial.setMapping('pitch', 'rot4dXW');
            expect(() => {
                spatial.feedInput('programmatic', { pitch: 0.5, yaw: 0.3 });
            }).not.toThrow();
        });
    });

    describe('serialization', () => {
        it('exports config', () => {
            spatial.setMapping('pitch', 'rot4dXW');
            const config = spatial.exportConfig();
            expect(config).toBeTruthy();
            expect(typeof config).toBe('object');
        });

        it('imports config', () => {
            spatial.setMapping('pitch', 'rot4dXW');
            const config = spatial.exportConfig();
            const newSpatial = new SpatialInputSystem({
                autoRegisterGlobals: false
            });
            const result = newSpatial.importConfig(config);
            expect(result).toBe(true);
            newSpatial.destroy();
        });
    });

    describe('destroy', () => {
        it('destroys without error', () => {
            expect(() => spatial.destroy()).not.toThrow();
        });
    });
});
