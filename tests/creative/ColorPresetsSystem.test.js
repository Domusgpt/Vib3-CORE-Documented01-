/**
 * ColorPresetsSystem Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorPresetsSystem } from '../../src/creative/ColorPresetsSystem.js';

describe('ColorPresetsSystem', () => {
    let system;
    let updateFn;

    beforeEach(() => {
        updateFn = vi.fn();
        system = new ColorPresetsSystem(updateFn);
    });

    describe('constructor', () => {
        it('initializes with no current preset', () => {
            expect(system.getCurrentPreset()).toBeNull();
        });

        it('is not transitioning initially', () => {
            expect(system.isTransitioning()).toBe(false);
        });
    });

    describe('getPresets', () => {
        it('returns built-in presets', () => {
            const presets = system.getPresets();
            expect(presets.length).toBeGreaterThan(0);
        });

        it('each preset has name, config, and isCustom flag', () => {
            const presets = system.getPresets();
            for (const p of presets) {
                expect(p).toHaveProperty('name');
                expect(p).toHaveProperty('config');
                expect(p).toHaveProperty('isCustom');
                expect(typeof p.name).toBe('string');
                expect(typeof p.config).toBe('object');
            }
        });
    });

    describe('getPresetsByCategory', () => {
        it('returns an object with category keys', () => {
            const categories = system.getPresetsByCategory();
            expect(typeof categories).toBe('object');
            const keys = Object.keys(categories);
            expect(keys.length).toBeGreaterThan(0);
        });
    });

    describe('applyPreset', () => {
        it('applies a known preset and calls update function', () => {
            const presets = system.getPresets();
            if (presets.length === 0) return;
            const name = presets[0].name;
            const result = system.applyPreset(name, false);
            expect(result).toBe(true);
            expect(updateFn).toHaveBeenCalled();
            expect(system.getCurrentPreset()).toBe(name);
        });

        it('returns false for unknown preset', () => {
            const result = system.applyPreset('__nonexistent_preset__', false);
            expect(result).toBe(false);
        });
    });

    describe('custom presets', () => {
        const customConfig = { hue: 42, saturation: 0.5, intensity: 0.8 };

        it('creates a custom preset', () => {
            const result = system.createCustomPreset('TestPreset', customConfig);
            expect(result).toBe(true);
        });

        it('retrieves a custom preset', () => {
            system.createCustomPreset('TestPreset', customConfig);
            const config = system.getPreset('TestPreset');
            expect(config).toBeTruthy();
            expect(config.hue).toBe(42);
        });

        it('updates a custom preset', () => {
            system.createCustomPreset('TestPreset', customConfig);
            const updated = system.updateCustomPreset('TestPreset', { hue: 100 });
            expect(updated).toBe(true);
            expect(system.getPreset('TestPreset').hue).toBe(100);
        });

        it('deletes a custom preset', () => {
            system.createCustomPreset('TestPreset', customConfig);
            const deleted = system.deleteCustomPreset('TestPreset');
            expect(deleted).toBe(true);
            expect(system.getPreset('TestPreset')).toBeNull();
        });

        it('cannot delete a built-in preset', () => {
            const presets = system.getPresets().filter(p => !p.isCustom);
            if (presets.length === 0) return;
            const deleted = system.deleteCustomPreset(presets[0].name);
            expect(deleted).toBe(false);
        });
    });

    describe('export/import', () => {
        it('exports a preset', () => {
            system.createCustomPreset('ExportTest', { hue: 99 });
            const exported = system.exportPreset('ExportTest');
            expect(exported).toBeTruthy();
        });

        it('imports a preset', () => {
            const data = { type: 'vib3-color-preset', name: 'ImportedPreset', config: { hue: 77 } };
            const result = system.importPreset(data);
            expect(result).toBe(true);
        });

        it('exports all custom presets', () => {
            system.createCustomPreset('A', { hue: 1 });
            system.createCustomPreset('B', { hue: 2 });
            const all = system.exportAllCustomPresets();
            expect(typeof all).toBe('object');
        });
    });

    describe('dispose', () => {
        it('disposes without error', () => {
            expect(() => system.dispose()).not.toThrow();
        });
    });
});
