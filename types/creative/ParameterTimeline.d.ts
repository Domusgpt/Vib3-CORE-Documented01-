/**
 * ParameterTimeline TypeScript Definitions
 * VIB3+ SDK - Keyframe Animation with BPM Sync
 */

import { ParameterUpdateFn } from '../reactivity/index';
import { EasingName } from './TransitionAnimator';

/** Loop mode for timeline playback */
export type LoopMode = 'loop' | 'bounce' | 'once';

/** A single keyframe on a track */
export interface Keyframe {
    time: number;
    value: number;
    easing?: EasingName;
}

/** Serialized timeline state */
export interface TimelineState {
    tracks: Record<string, Keyframe[]>;
    duration: number;
    loopMode: LoopMode;
    playbackSpeed: number;
    bpm: number;
}

/**
 * Keyframe-based parameter animation with BPM synchronization.
 * Supports multiple parameter tracks, playback control, and serialization.
 */
export declare class ParameterTimeline {
    readonly playing: boolean;
    readonly currentTime: number;
    duration: number;
    loopMode: LoopMode;
    playbackSpeed: number;
    bpm: number;

    constructor(parameterUpdateFn: ParameterUpdateFn);

    // Track management
    addTrack(param: string): boolean;
    removeTrack(param: string): boolean;
    setTrackEnabled(param: string, enabled: boolean): boolean;
    getTrackNames(): string[];
    getTrackKeyframes(param: string): Keyframe[] | null;

    // Keyframe management
    addKeyframe(param: string, time: number, value: number, easing?: EasingName): boolean;
    updateKeyframe(param: string, time: number, newValue: number, easing?: EasingName): boolean;
    removeKeyframe(param: string, time: number): boolean;
    clearTrack(param: string): void;

    // Playback
    setDuration(ms: number): void;
    play(): void;
    pause(): void;
    stop(): void;
    seek(time: number): void;
    setLoopMode(mode: LoopMode): void;
    setPlaybackSpeed(speed: number): void;

    // Callbacks
    onComplete(callback: () => void): void;
    onTick(callback: (time: number, progress: number) => void): void;

    // Serialization
    exportState(): TimelineState;
    importState(data: TimelineState): boolean;

    // Lifecycle
    dispose(): void;
}
