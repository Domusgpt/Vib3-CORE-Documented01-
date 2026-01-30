/**
 * TransitionAnimator.js - VIB3+ Smooth Parameter Transition System
 *
 * Provides smooth animated transitions between arbitrary sets of VIB3+
 * parameters. Supports multiple concurrent transitions, a rich library of
 * easing functions, chainable sequences, cancellation, and completion
 * callbacks.
 *
 * @module creative/TransitionAnimator
 * @version 1.0.0
 * @author VIB3+ Creative Tooling - Phase B
 */

/**
 * @typedef {Object} TransitionOptions
 * @property {Object<string, number>} params - Target parameter values keyed by name
 * @property {number} [duration=1000] - Transition duration in milliseconds
 * @property {string} [easing='easeInOut'] - Easing function name
 * @property {number} [delay=0] - Delay before starting (ms)
 * @property {Function} [onComplete] - Callback when this transition completes
 * @property {Function} [onUpdate] - Callback on each frame with progress (0-1)
 */

/**
 * @typedef {Object} SequenceStep
 * @property {Object<string, number>} params - Target parameter values
 * @property {number} [duration=1000] - Step duration in milliseconds
 * @property {string} [easing='easeInOut'] - Easing function name
 * @property {number} [delay=0] - Delay before this step starts
 */

/**
 * @typedef {Object} ActiveTransition
 * @property {string} id - Unique transition identifier
 * @property {Object<string, number>} fromValues - Starting parameter values
 * @property {Object<string, number>} toValues - Target parameter values
 * @property {number} startTime - Timestamp when the transition started (ms)
 * @property {number} duration - Total duration (ms)
 * @property {string} easing - Easing function name
 * @property {Function|null} onComplete - Completion callback
 * @property {Function|null} onUpdate - Per-frame callback
 * @property {boolean} cancelled - Whether this transition has been cancelled
 */

let _nextTransitionId = 0;

/**
 * Smooth parameter transition animator for the VIB3+ engine.
 *
 * Transitions any set of VIB3+ parameters simultaneously from their current
 * values to target values over a configurable duration with configurable
 * easing. Multiple transitions can run concurrently, and transitions can
 * be chained into sequences.
 *
 * @example
 * const animator = new TransitionAnimator((name, value) => {
 *     engine.setParameter(name, value);
 * });
 *
 * // Simple transition
 * animator.transition({ hue: 120, intensity: 0.9 }, 1500, 'easeOut');
 *
 * // Sequence of transitions
 * animator.sequence([
 *     { params: { hue: 0, chaos: 0.8 }, duration: 1000, easing: 'elastic' },
 *     { params: { hue: 180, chaos: 0.1 }, duration: 2000, easing: 'easeInOut' },
 *     { params: { hue: 360, chaos: 0.5 }, duration: 1000, easing: 'bounce' }
 * ]);
 */
export class TransitionAnimator {
    /**
     * Create a new TransitionAnimator.
     *
     * @param {Function} parameterUpdateFn - Callback invoked as (paramName, value)
     *   whenever a VIB3+ parameter should be updated.
     * @param {Function} [parameterGetFn] - Optional callback to read current
     *   parameter values, invoked as (paramName) => number. If not provided,
     *   transitions will use the target values of any currently running
     *   transition or fall back to VIB3+ defaults.
     */
    constructor(parameterUpdateFn, parameterGetFn = null) {
        if (typeof parameterUpdateFn !== 'function') {
            throw new Error('TransitionAnimator requires a parameterUpdateFn callback');
        }

        /** @type {Function} */
        this.updateParameter = parameterUpdateFn;

        /** @type {Function|null} */
        this.getParameter = typeof parameterGetFn === 'function' ? parameterGetFn : null;

        /** @type {Map<string, ActiveTransition>} Active transitions keyed by ID */
        this.activeTransitions = new Map();

        /** @type {Array<{steps: SequenceStep[], currentIndex: number, id: string, onComplete: Function|null}>} */
        this.sequences = [];

        /** @type {number|null} requestAnimationFrame ID */
        this._frameId = null;

        /** @type {Object<string, number>} Snapshot of last-known parameter values */
        this._knownValues = {};

        /**
         * Map of all available easing functions.
         * @type {Object<string, Function>}
         */
        this.easingFunctions = this._buildEasingFunctions();
    }

    // -------------------------------------------------------------------------
    // Public API - Transitions
    // -------------------------------------------------------------------------

    /**
     * Start a transition to the given parameter values.
     *
     * @param {Object<string, number>} params - Target parameter values
     * @param {number} [duration=1000] - Duration in milliseconds
     * @param {string} [easing='easeInOut'] - Easing function name
     * @param {Function} [onComplete] - Callback when complete
     * @param {Function} [onUpdate] - Callback on each frame with progress (0-1)
     * @returns {string} Transition ID (can be used to cancel)
     */
    transition(params, duration = 1000, easing = 'easeInOut', onComplete = null, onUpdate = null) {
        if (!params || typeof params !== 'object') {
            console.warn('TransitionAnimator: params must be an object');
            return null;
        }

        const id = `transition_${++_nextTransitionId}`;
        const fromValues = {};

        // Capture starting values for each parameter
        for (const paramName of Object.keys(params)) {
            fromValues[paramName] = this._getCurrentValue(paramName);
        }

        /** @type {ActiveTransition} */
        const record = {
            id,
            fromValues,
            toValues: { ...params },
            startTime: performance.now(),
            duration: Math.max(0, duration),
            easing: this.easingFunctions[easing] ? easing : 'easeInOut',
            onComplete: typeof onComplete === 'function' ? onComplete : null,
            onUpdate: typeof onUpdate === 'function' ? onUpdate : null,
            cancelled: false
        };

        this.activeTransitions.set(id, record);
        this._ensureAnimating();

        return id;
    }

    /**
     * Transition to a full target state (shorthand for `transition`).
     *
     * @param {Object<string, number>} targetState - Target parameter state
     * @param {number} [duration=1000] - Duration in ms
     * @param {string} [easing='easeInOut'] - Easing function name
     * @param {Function} [onComplete] - Completion callback
     * @returns {string} Transition ID
     */
    transitionTo(targetState, duration = 1000, easing = 'easeInOut', onComplete = null) {
        return this.transition(targetState, duration, easing, onComplete);
    }

    /**
     * Execute a sequence of transitions one after another.
     *
     * @param {SequenceStep[]} steps - Array of transition steps
     * @param {Function} [onComplete] - Callback when the entire sequence finishes
     * @returns {string} Sequence ID (can be used to cancel)
     */
    sequence(steps, onComplete = null) {
        if (!Array.isArray(steps) || steps.length === 0) {
            console.warn('TransitionAnimator: sequence requires a non-empty array of steps');
            return null;
        }

        const seqId = `sequence_${++_nextTransitionId}`;

        const seq = {
            id: seqId,
            steps: steps.map(step => ({
                params: { ...step.params },
                duration: step.duration != null ? step.duration : 1000,
                easing: step.easing || 'easeInOut',
                delay: step.delay || 0
            })),
            currentIndex: 0,
            onComplete: typeof onComplete === 'function' ? onComplete : null
        };

        this.sequences.push(seq);
        this._runNextSequenceStep(seq);

        return seqId;
    }

    // -------------------------------------------------------------------------
    // Public API - Cancellation
    // -------------------------------------------------------------------------

    /**
     * Cancel a specific transition or sequence by ID.
     *
     * @param {string} id - Transition or sequence ID
     * @returns {boolean} true if something was cancelled
     */
    cancel(id) {
        // Try transitions first
        const transition = this.activeTransitions.get(id);
        if (transition) {
            transition.cancelled = true;
            this.activeTransitions.delete(id);
            return true;
        }

        // Try sequences
        const seqIndex = this.sequences.findIndex(s => s.id === id);
        if (seqIndex >= 0) {
            const seq = this.sequences[seqIndex];
            // Cancel any active transition belonging to this sequence
            for (const [tId, t] of this.activeTransitions) {
                if (tId.startsWith(id + '_step_')) {
                    t.cancelled = true;
                    this.activeTransitions.delete(tId);
                }
            }
            this.sequences.splice(seqIndex, 1);
            return true;
        }

        return false;
    }

    /**
     * Cancel all active transitions and sequences immediately.
     */
    cancelAll() {
        for (const [, transition] of this.activeTransitions) {
            transition.cancelled = true;
        }
        this.activeTransitions.clear();
        this.sequences.length = 0;

        if (this._frameId !== null) {
            cancelAnimationFrame(this._frameId);
            this._frameId = null;
        }
    }

    // -------------------------------------------------------------------------
    // Public API - Queries
    // -------------------------------------------------------------------------

    /**
     * Check if any transitions are currently active.
     *
     * @returns {boolean}
     */
    isAnimating() {
        return this.activeTransitions.size > 0 || this.sequences.length > 0;
    }

    /**
     * Get the number of active transitions.
     *
     * @returns {number}
     */
    getActiveCount() {
        return this.activeTransitions.size;
    }

    /**
     * Get the list of available easing function names.
     *
     * @returns {string[]}
     */
    getEasingNames() {
        return Object.keys(this.easingFunctions);
    }

    // -------------------------------------------------------------------------
    // Public API - Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Clean up resources and cancel all animations.
     */
    dispose() {
        this.cancelAll();
        this._knownValues = {};
    }

    // -------------------------------------------------------------------------
    // Private - Animation Loop
    // -------------------------------------------------------------------------

    /**
     * Ensure the animation loop is running.
     * @private
     */
    _ensureAnimating() {
        if (this._frameId === null) {
            this._frameId = requestAnimationFrame(() => this._tick());
        }
    }

    /**
     * Main animation tick. Evaluates all active transitions.
     * @private
     */
    _tick() {
        this._frameId = null;
        const now = performance.now();
        const completed = [];

        for (const [id, t] of this.activeTransitions) {
            if (t.cancelled) {
                completed.push(id);
                continue;
            }

            const elapsed = now - t.startTime;
            const rawProgress = t.duration > 0 ? Math.min(elapsed / t.duration, 1) : 1;
            const easeFn = this.easingFunctions[t.easing] || this.easingFunctions.linear;
            const eased = easeFn(rawProgress);

            // Apply interpolated values
            for (const paramName of Object.keys(t.toValues)) {
                const from = t.fromValues[paramName];
                const to = t.toValues[paramName];

                // Special circular interpolation for hue
                let value;
                if (paramName === 'hue') {
                    value = this._lerpHue(from, to, eased);
                } else {
                    value = from + (to - from) * eased;
                }

                this.updateParameter(paramName, value);
                this._knownValues[paramName] = value;
            }

            // Per-frame callback
            if (t.onUpdate) {
                t.onUpdate(rawProgress);
            }

            // Check completion
            if (rawProgress >= 1) {
                completed.push(id);
            }
        }

        // Process completions
        for (const id of completed) {
            const t = this.activeTransitions.get(id);
            this.activeTransitions.delete(id);
            if (t && !t.cancelled && t.onComplete) {
                t.onComplete();
            }
        }

        // Continue loop if there is still work
        if (this.activeTransitions.size > 0) {
            this._frameId = requestAnimationFrame(() => this._tick());
        }
    }

    // -------------------------------------------------------------------------
    // Private - Sequence Runner
    // -------------------------------------------------------------------------

    /**
     * Run the next step in a sequence.
     *
     * @param {Object} seq - The sequence record
     * @private
     */
    _runNextSequenceStep(seq) {
        if (seq.currentIndex >= seq.steps.length) {
            // Sequence complete
            const idx = this.sequences.indexOf(seq);
            if (idx >= 0) {
                this.sequences.splice(idx, 1);
            }
            if (seq.onComplete) {
                seq.onComplete();
            }
            return;
        }

        const step = seq.steps[seq.currentIndex];
        const stepId = `${seq.id}_step_${seq.currentIndex}`;

        const startStep = () => {
            const fromValues = {};
            for (const paramName of Object.keys(step.params)) {
                fromValues[paramName] = this._getCurrentValue(paramName);
            }

            const record = {
                id: stepId,
                fromValues,
                toValues: { ...step.params },
                startTime: performance.now(),
                duration: Math.max(0, step.duration),
                easing: this.easingFunctions[step.easing] ? step.easing : 'easeInOut',
                onComplete: () => {
                    seq.currentIndex++;
                    this._runNextSequenceStep(seq);
                },
                onUpdate: null,
                cancelled: false
            };

            this.activeTransitions.set(stepId, record);
            this._ensureAnimating();
        };

        if (step.delay > 0) {
            setTimeout(startStep, step.delay);
        } else {
            startStep();
        }
    }

    // -------------------------------------------------------------------------
    // Private - Value Resolution
    // -------------------------------------------------------------------------

    /**
     * Get the current value for a parameter.
     *
     * Priority:
     * 1. External getter function (if provided)
     * 2. Last known value from a transition
     * 3. VIB3+ parameter defaults
     *
     * @param {string} paramName
     * @returns {number}
     * @private
     */
    _getCurrentValue(paramName) {
        // Try external getter first
        if (this.getParameter) {
            const val = this.getParameter(paramName);
            if (typeof val === 'number' && Number.isFinite(val)) {
                return val;
            }
        }

        // Check last known value from a completed/in-progress transition
        if (paramName in this._knownValues) {
            return this._knownValues[paramName];
        }

        // Check in-flight transitions for target value
        for (const [, t] of this.activeTransitions) {
            if (paramName in t.toValues) {
                return t.toValues[paramName];
            }
        }

        // Fall back to VIB3+ defaults
        return this._getDefaultValue(paramName);
    }

    /**
     * VIB3+ default parameter values as defined in Parameters.js.
     *
     * @param {string} paramName
     * @returns {number}
     * @private
     */
    _getDefaultValue(paramName) {
        const defaults = {
            hue: 200,
            saturation: 0.8,
            intensity: 0.5,
            speed: 1.0,
            chaos: 0.2,
            morphFactor: 1.0,
            gridDensity: 15,
            dimension: 3.5,
            geometry: 0,
            rot4dXY: 0,
            rot4dXZ: 0,
            rot4dYZ: 0,
            rot4dXW: 0,
            rot4dYW: 0,
            rot4dZW: 0
        };
        return defaults[paramName] !== undefined ? defaults[paramName] : 0;
    }

    // -------------------------------------------------------------------------
    // Private - Math Utilities
    // -------------------------------------------------------------------------

    /**
     * Circular hue interpolation (shortest path around 360-degree wheel).
     *
     * @param {number} a - Start hue (0-360)
     * @param {number} b - End hue (0-360)
     * @param {number} t - Progress (0-1)
     * @returns {number}
     * @private
     */
    _lerpHue(a, b, t) {
        let diff = b - a;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        let result = a + diff * t;
        if (result < 0) result += 360;
        if (result >= 360) result -= 360;
        return result;
    }

    /**
     * Build the complete set of easing functions.
     *
     * @returns {Object<string, Function>}
     * @private
     */
    _buildEasingFunctions() {
        return {
            /**
             * No easing, constant velocity.
             * @param {number} t
             * @returns {number}
             */
            linear(t) {
                return t;
            },

            /**
             * Cubic acceleration from zero velocity.
             * @param {number} t
             * @returns {number}
             */
            easeIn(t) {
                return t * t * t;
            },

            /**
             * Cubic deceleration to zero velocity.
             * @param {number} t
             * @returns {number}
             */
            easeOut(t) {
                return 1 - Math.pow(1 - t, 3);
            },

            /**
             * Cubic acceleration then deceleration.
             * @param {number} t
             * @returns {number}
             */
            easeInOut(t) {
                return t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
            },

            /**
             * Quadratic ease-in.
             * @param {number} t
             * @returns {number}
             */
            easeInQuad(t) {
                return t * t;
            },

            /**
             * Quadratic ease-out.
             * @param {number} t
             * @returns {number}
             */
            easeOutQuad(t) {
                return 1 - (1 - t) * (1 - t);
            },

            /**
             * Bounce effect that simulates a ball bouncing to rest.
             * @param {number} t
             * @returns {number}
             */
            bounce(t) {
                const n1 = 7.5625;
                const d1 = 2.75;

                if (t < 1 / d1) {
                    return n1 * t * t;
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
            },

            /**
             * Elastic oscillation that overshoots then settles.
             * @param {number} t
             * @returns {number}
             */
            elastic(t) {
                if (t === 0 || t === 1) return t;
                const c4 = (2 * Math.PI) / 3;
                return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },

            /**
             * Smooth cubic Bezier-style ease.
             * @param {number} t
             * @returns {number}
             */
            cubic(t) {
                return t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
            },

            /**
             * Back ease-out: slightly overshoots then returns.
             * @param {number} t
             * @returns {number}
             */
            backOut(t) {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            },

            /**
             * Back ease-in: pulls back before accelerating.
             * @param {number} t
             * @returns {number}
             */
            backIn(t) {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return c3 * t * t * t - c1 * t * t;
            },

            /**
             * Exponential ease-out.
             * @param {number} t
             * @returns {number}
             */
            expoOut(t) {
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            },

            /**
             * Exponential ease-in.
             * @param {number} t
             * @returns {number}
             */
            expoIn(t) {
                return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
            },

            /**
             * Sinusoidal ease-in-out.
             * @param {number} t
             * @returns {number}
             */
            sineInOut(t) {
                return -(Math.cos(Math.PI * t) - 1) / 2;
            }
        };
    }
}
