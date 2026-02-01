/**
 * MIDIController Tests
 *
 * Note: Web MIDI API is not available in Node/Vitest.
 * These tests cover the mapping/configuration logic, not actual MIDI I/O.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MIDIController } from '../../src/advanced/MIDIController.js';

describe('MIDIController', () => {
    let midi;
    let updateFn;

    beforeEach(() => {
        updateFn = vi.fn();
        midi = new MIDIController(updateFn);
    });

    describe('constructor', () => {
        it('creates with update function', () => {
            expect(midi).toBeTruthy();
        });

        it('starts not in learn mode', () => {
            expect(midi.learning).toBe(false);
        });
    });

    describe('CC mapping', () => {
        it('maps a CC to a parameter', () => {
            midi.mapCC(0, 1, 'hue', { min: 0, max: 360 });
            const mappings = midi.getMappings();
            expect(mappings.length).toBeGreaterThan(0);
        });

        it('unmaps a CC without error', () => {
            midi.mapCC(0, 1, 'hue');
            expect(() => midi.unmapCC(0, 1)).not.toThrow();
        });

        it('unmapping nonexistent CC does not throw', () => {
            expect(() => midi.unmapCC(15, 127)).not.toThrow();
        });
    });

    describe('note mapping', () => {
        it('maps a note to an action', () => {
            midi.mapNote(0, 60, 'switchQuantum', 'noteOn');
        });

        it('unmaps a note without error', () => {
            midi.mapNote(0, 60, 'switchQuantum');
            expect(() => midi.unmapNote(0, 60)).not.toThrow();
        });
    });

    describe('learn mode', () => {
        it('starts learn mode', () => {
            midi.startLearn('hue');
            expect(midi.learning).toBe(true);
        });

        it('stops learn mode', () => {
            midi.startLearn('hue');
            midi.stopLearn();
            expect(midi.learning).toBe(false);
        });
    });

    describe('default mapping', () => {
        it('loads default mapping without error', () => {
            expect(() => midi.loadDefaultMapping()).not.toThrow();
        });
    });

    describe('export/import', () => {
        it('exports mapping', () => {
            midi.mapCC(0, 1, 'hue');
            midi.mapCC(0, 2, 'speed');
            const exported = midi.exportMapping();
            expect(exported).toBeTruthy();
            expect(typeof exported).toBe('object');
        });

        it('imports mapping without error', () => {
            midi.mapCC(0, 1, 'hue');
            const exported = midi.exportMapping();
            const newMidi = new MIDIController(updateFn);
            expect(() => newMidi.importMapping(exported)).not.toThrow();
            newMidi.destroy();
        });
    });

    describe('onMIDIMessage', () => {
        it('processes CC message and calls updateFn', () => {
            midi.mapCC(0, 7, 'hue', { min: 0, max: 360 });
            // MIDI CC message: status=0xB0 (CC on channel 0), cc=7, value=64
            const event = { data: new Uint8Array([0xB0, 7, 64]) };
            midi.onMIDIMessage(event);
            expect(updateFn).toHaveBeenCalled();
        });
    });

    describe('destroy', () => {
        it('destroys without error', () => {
            expect(() => midi.destroy()).not.toThrow();
        });
    });
});
