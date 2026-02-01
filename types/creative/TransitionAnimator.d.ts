/**
 * TransitionAnimator TypeScript Definitions
 * VIB3+ SDK - Smooth Parameter Transitions with Easing
 */

import { ParameterUpdateFn } from '../reactivity/index';

/** Available easing function names */
export type EasingName =
    | 'linear'
    | 'easeIn' | 'easeOut' | 'easeInOut'
    | 'easeInQuad' | 'easeOutQuad'
    | 'bounce' | 'elastic'
    | 'cubic'
    | 'backOut' | 'backIn'
    | 'expoOut' | 'expoIn'
    | 'sineInOut';

/** A single step in a sequence */
export interface SequenceStep {
    params: Record<string, number>;
    duration?: number;
    easing?: EasingName;
    delay?: number;
}

/**
 * Smooth parameter transitions with 14 easing functions.
 * Supports single transitions, target-state transitions, and multi-step sequences.
 */
export declare class TransitionAnimator {
    constructor(parameterUpdateFn: ParameterUpdateFn, parameterGetFn?: ((name: string) => number | null) | null);

    /** Transition specific parameters to values */
    transition(
        params: Record<string, number>,
        duration?: number,
        easing?: EasingName,
        onComplete?: () => void,
        onUpdate?: (progress: number) => void
    ): string;

    /** Transition from current values to target state */
    transitionTo(
        targetState: Record<string, number>,
        duration?: number,
        easing?: EasingName,
        onComplete?: () => void
    ): string;

    /** Run a sequence of transition steps */
    sequence(steps: SequenceStep[], onComplete?: () => void): string;

    /** Cancel a specific transition by ID */
    cancel(id: string): boolean;

    /** Cancel all active transitions */
    cancelAll(): void;

    /** Whether any transitions are active */
    isAnimating(): boolean;

    /** Get count of active transitions */
    getActiveCount(): number;

    /** Get all available easing function names */
    getEasingNames(): EasingName[];

    /** Dispose and cancel all */
    dispose(): void;
}
