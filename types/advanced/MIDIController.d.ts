/**
 * MIDIController TypeScript Definitions
 * VIB3+ SDK - Web MIDI API with Learn Mode
 */

import { ParameterUpdateFn } from '../reactivity/index';

/** CC mapping options */
export interface CCMappingOptions {
    min?: number;
    max?: number;
    curve?: 'linear' | 'exponential' | 'logarithmic';
    invert?: boolean;
}

/** CC mapping entry */
export interface CCMapping {
    channel: number;
    cc: number;
    param: string;
    min: number;
    max: number;
    curve: string;
    invert: boolean;
}

/** Note mapping entry */
export interface NoteMapping {
    channel: number;
    note: number;
    action: string;
    trigger: 'noteOn' | 'noteOff' | 'toggle';
}

/** MIDI input device info */
export interface MIDIInputInfo {
    id: string;
    name: string;
}

/** Serialized mapping state */
export interface MIDIMappingState {
    cc: Record<string, CCMapping>;
    notes: Record<string, NoteMapping>;
}

/** Learn callback */
export type LearnCallback = (channel: number, cc: number) => void;

/**
 * Web MIDI controller with CC/note mapping and learn mode.
 * Maps MIDI control changes to VIB3+ parameters in real-time.
 */
export declare class MIDIController {
    readonly learning: boolean;

    constructor(parameterUpdateFn: ParameterUpdateFn);

    /** Initialize Web MIDI API access */
    initialize(): Promise<any>;

    /** Load the default CC mapping */
    loadDefaultMapping(): void;

    /** Map a MIDI CC to a parameter */
    mapCC(channel: number, cc: number, param: string, options?: CCMappingOptions): void;

    /** Unmap a MIDI CC */
    unmapCC(channel: number, cc: number): boolean;

    /** Map a MIDI note to an action */
    mapNote(channel: number, note: number, action: string, trigger?: 'noteOn' | 'noteOff' | 'toggle'): void;

    /** Unmap a MIDI note */
    unmapNote(channel: number, note: number): boolean;

    /** Start learn mode: next CC received will be mapped to param */
    startLearn(param: string, callback: LearnCallback): void;

    /** Stop learn mode */
    stopLearn(): void;

    /** Process a MIDI message (called internally) */
    onMIDIMessage(event: any): void;

    /** List connected MIDI inputs */
    listInputs(): MIDIInputInfo[];

    /** Get a specific CC mapping */
    getMapping(channel: number, cc: number): CCMapping | null;

    /** Export all mappings */
    exportMappings(): MIDIMappingState;

    /** Import mappings from serialized data */
    importMappings(data: MIDIMappingState): boolean;

    /** Destroy and disconnect */
    destroy(): void;
}
