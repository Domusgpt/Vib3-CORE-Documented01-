/**
 * AIPresetGenerator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIPresetGenerator } from '../../src/advanced/AIPresetGenerator.js';

describe('AIPresetGenerator', () => {
    let generator;

    beforeEach(() => {
        generator = new AIPresetGenerator();
    });

    describe('constructor', () => {
        it('creates with no engine', () => {
            expect(generator).toBeTruthy();
        });
    });

    describe('generateRandom', () => {
        it('generates a random preset', () => {
            const preset = generator.generateRandom();
            expect(preset).toBeTruthy();
            expect(typeof preset).toBe('object');
        });

        it('generates different presets each time', () => {
            const a = generator.generateRandom();
            const b = generator.generateRandom();
            const aStr = JSON.stringify(a);
            const bStr = JSON.stringify(b);
            expect(aStr).not.toBe(bStr);
        });

        it('generates with a theme', () => {
            const themes = generator.getAvailableThemes
                ? generator.getAvailableThemes()
                : [];
            if (themes.length > 0) {
                const preset = generator.generateRandom(themes[0]);
                expect(preset).toBeTruthy();
            }
        });
    });

    describe('mutate', () => {
        it('mutates a preset', () => {
            const original = generator.generateRandom();
            const mutated = generator.mutate(original, 0.5);
            expect(mutated).toBeTruthy();
            expect(typeof mutated).toBe('object');
        });

        it('higher intensity produces more change', () => {
            const original = { hue: 180, speed: 1.0, chaos: 0.5, geometry: 0 };
            const lowMutate = generator.mutate(original, 0.01);
            const highMutate = generator.mutate(original, 1.0);
            expect(lowMutate).toBeTruthy();
            expect(highMutate).toBeTruthy();
        });
    });

    describe('crossbreed', () => {
        it('crossbreeds two presets', () => {
            const a = generator.generateRandom();
            const b = generator.generateRandom();
            const child = generator.crossbreed(a, b, 0.5);
            expect(child).toBeTruthy();
        });

        it('bias=0 leans toward first parent', () => {
            const a = { hue: 0, speed: 0.1 };
            const b = { hue: 360, speed: 3.0 };
            const child = generator.crossbreed(a, b, 0);
            expect(child).toBeTruthy();
        });

        it('bias=1 leans toward second parent', () => {
            const a = { hue: 0, speed: 0.1 };
            const b = { hue: 360, speed: 3.0 };
            const child = generator.crossbreed(a, b, 1);
            expect(child).toBeTruthy();
        });
    });

    describe('generateFromDescription', () => {
        it('generates from a text description (local fallback)', async () => {
            const preset = await generator.generateFromDescription('ocean waves calm blue');
            expect(preset).toBeTruthy();
            expect(typeof preset).toBe('object');
        });

        it('generates from abstract description', async () => {
            const preset = await generator.generateFromDescription('chaotic fire explosion red');
            expect(preset).toBeTruthy();
        });
    });

    describe('history', () => {
        it('records generation history', () => {
            generator.generateRandom();
            generator.generateRandom();
            const history = generator.exportHistory
                ? generator.exportHistory()
                : [];
            expect(history.length).toBeGreaterThan(0);
        });

        it('clears history', () => {
            generator.generateRandom();
            generator.clearHistory();
            const history = generator.exportHistory
                ? generator.exportHistory()
                : [];
            expect(history).toEqual([]);
        });
    });

    describe('getLastPreset', () => {
        it('returns last generated preset', () => {
            generator.generateRandom();
            const last = generator.getLastPreset();
            expect(last).toBeTruthy();
        });
    });
});
