/**
 * PostProcessingPipeline Tests
 *
 * Note: These tests mock the DOM since PostProcessingPipeline targets HTMLElement.
 * Full visual testing requires a browser environment (Playwright/E2E).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostProcessingPipeline } from '../../src/creative/PostProcessingPipeline.js';

// Mock minimal HTMLElement
function createMockElement() {
    return {
        style: {},
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        querySelector: vi.fn().mockReturnValue(null),
        classList: { add: vi.fn(), remove: vi.fn() },
        getBoundingClientRect: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    };
}

describe('PostProcessingPipeline', () => {
    let pipeline;
    let mockEl;

    beforeEach(() => {
        mockEl = createMockElement();
        pipeline = new PostProcessingPipeline(mockEl);
    });

    describe('constructor', () => {
        it('initializes with empty chain', () => {
            expect(pipeline.getChain().length).toBe(0);
        });

        it('is enabled by default', () => {
            expect(pipeline.enabled).toBe(true);
        });
    });

    describe('addEffect / removeEffect', () => {
        it('adds a built-in effect', () => {
            const result = pipeline.addEffect('bloom');
            expect(result).toBe(true);
            expect(pipeline.getChain()).toContain('bloom');
        });

        it('removes an effect', () => {
            pipeline.addEffect('bloom');
            const result = pipeline.removeEffect('bloom');
            expect(result).toBe(true);
            expect(pipeline.getChain()).not.toContain('bloom');
        });

        it('returns false removing nonexistent effect', () => {
            expect(pipeline.removeEffect('nonexistent')).toBe(false);
        });
    });

    describe('getEffects', () => {
        it('returns all available effects', () => {
            const effects = pipeline.getEffects();
            expect(effects.length).toBeGreaterThanOrEqual(14);
        });

        it('has added effects in the chain after addEffect', () => {
            pipeline.addEffect('bloom');
            pipeline.addEffect('vignette');
            const chain = pipeline.getChain();
            expect(chain).toContain('bloom');
            expect(chain).toContain('vignette');
        });
    });

    describe('getPresetChains', () => {
        it('returns available preset chains', () => {
            const chains = pipeline.getPresetChains();
            expect(Array.isArray(chains)).toBe(true);
            expect(chains.length).toBeGreaterThan(0);
            for (const c of chains) {
                expect(c).toHaveProperty('name');
                expect(c).toHaveProperty('description');
            }
        });
    });

    describe('loadPresetChain', () => {
        it('loads a preset chain', () => {
            const chains = pipeline.getPresetChains();
            if (chains.length === 0) return;
            const result = pipeline.loadPresetChain(chains[0].name);
            expect(result).toBe(true);
            expect(pipeline.getChain().length).toBeGreaterThan(0);
        });

        it('returns false for unknown chain', () => {
            expect(pipeline.loadPresetChain('__unknown__')).toBe(false);
        });
    });

    describe('reorder', () => {
        it('reorders the effect chain', () => {
            pipeline.addEffect('bloom');
            pipeline.addEffect('vignette');
            pipeline.reorder(['vignette', 'bloom']);
            expect(pipeline.getChain()).toEqual(['vignette', 'bloom']);
        });
    });

    describe('setEnabled', () => {
        it('disables the pipeline', () => {
            pipeline.setEnabled(false);
            expect(pipeline.enabled).toBe(false);
        });
    });

    describe('clear', () => {
        it('clears all effects', () => {
            pipeline.addEffect('bloom');
            pipeline.addEffect('vignette');
            pipeline.clear();
            expect(pipeline.getChain().length).toBe(0);
        });
    });

    describe('exportState / importState', () => {
        it('round-trips state', () => {
            pipeline.addEffect('bloom');
            const state = pipeline.exportState();
            expect(state).toHaveProperty('chain');
            expect(state).toHaveProperty('enabled');

            const newPipeline = new PostProcessingPipeline(createMockElement());
            const result = newPipeline.importState(state);
            expect(result).toBe(true);
            newPipeline.dispose();
        });
    });

    describe('dispose', () => {
        it('disposes without error', () => {
            expect(() => pipeline.dispose()).not.toThrow();
        });
    });
});
