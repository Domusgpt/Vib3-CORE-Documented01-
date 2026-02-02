/**
 * ParameterTimeline.js - VIB3+ Parameter Animation Keyframe/Timeline System
 *
 * Provides a multi-track keyframe timeline for animating any set of VIB3+
 * parameters over time. Supports configurable easing per keyframe, multiple
 * playback modes (loop, bounce, once), play/pause/seek/speed controls,
 * BPM quantization for music sync, and full serialization.
 *
 * @module creative/ParameterTimeline
 * @version 1.0.0
 * @author VIB3+ Creative Tooling - Phase B
 */

/**
 * @typedef {Object} Keyframe
 * @property {number} time - Timestamp in milliseconds from timeline start
 * @property {number} value - Parameter value at this keyframe
 * @property {string} easing - Easing function name for interpolation TO this keyframe
 */

/**
 * @typedef {Object} Track
 * @property {string} param - Parameter name this track controls
 * @property {Keyframe[]} keyframes - Sorted array of keyframes
 * @property {boolean} enabled - Whether this track is active
 */

/**
 * @typedef {'loop'|'bounce'|'once'} LoopMode
 * - 'loop': restart from beginning when reaching the end
 * - 'bounce': reverse direction at each end (ping-pong)
 * - 'once': stop at the end
 */

/**
 * Parameter animation timeline with keyframe interpolation.
 *
 * Each parameter gets its own track containing ordered keyframes. During
 * playback, values are interpolated between keyframes using configurable
 * easing functions. Supports loop/bounce/once playback modes, variable
 * speed, BPM quantization, and full import/export.
 *
 * @example
 * const timeline = new ParameterTimeline((name, value) => {
 *     engine.setParameter(name, value);
 * });
 *
 * timeline.setDuration(8000); // 8 seconds
 *
 * // Add keyframes for hue parameter
 * timeline.addTrack('hue');
 * timeline.addKeyframe('hue', 0, 0, 'linear');
 * timeline.addKeyframe('hue', 2000, 120, 'easeInOut');
 * timeline.addKeyframe('hue', 4000, 240, 'easeInOut');
 * timeline.addKeyframe('hue', 8000, 360, 'easeOut');
 *
 * // Add keyframes for chaos
 * timeline.addTrack('chaos');
 * timeline.addKeyframe('chaos', 0, 0, 'linear');
 * timeline.addKeyframe('chaos', 4000, 1.0, 'bounce');
 * timeline.addKeyframe('chaos', 8000, 0, 'easeInOut');
 *
 * timeline.play();
 */
export class ParameterTimeline {
    /**
     * Create a new ParameterTimeline.
     *
     * @param {Function} parameterUpdateFn - Callback invoked as (paramName, value)
     *   whenever a VIB3+ parameter should be updated.
     */
    constructor(parameterUpdateFn) {
        if (typeof parameterUpdateFn !== 'function') {
            throw new Error('ParameterTimeline requires a parameterUpdateFn callback');
        }

        /** @type {Function} */
        this.updateParameter = parameterUpdateFn;

        /** @type {Map<string, Track>} Parameter tracks keyed by parameter name */
        this.tracks = new Map();

        /** @type {number} Total timeline duration in milliseconds */
        this.duration = 10000;

        /** @type {number} Current playback position in milliseconds */
        this.currentTime = 0;

        /** @type {boolean} Whether the timeline is currently playing */
        this.playing = false;

        /** @type {LoopMode} Playback loop mode */
        this.loopMode = 'loop';

        /** @type {number} Playback speed multiplier (0.1-10) */
        this.playbackSpeed = 1.0;

        /** @type {number} Beats per minute for quantization */
        this.bpm = 120;

        /** @type {number|null} requestAnimationFrame ID */
        this._frameId = null;

        /** @type {number} Timestamp of last animation frame */
        this._lastFrameTime = 0;

        /** @type {number} Direction for bounce mode: 1 = forward, -1 = reverse */
        this._bounceDirection = 1;

        /** @type {Function|null} Callback when playback reaches the end (once mode) */
        this._onComplete = null;

        /** @type {Function|null} Callback on each frame with current time */
        this._onTick = null;

        /** @type {Object<string, Function>} Easing function library */
        this._easingFunctions = this._buildEasingFunctions();
    }

    // -------------------------------------------------------------------------
    // Public API - Track Management
    // -------------------------------------------------------------------------

    /**
     * Add a new parameter track to the timeline.
     *
     * @param {string} param - VIB3+ parameter name (e.g., 'hue', 'chaos', 'speed')
     * @returns {boolean} true if the track was created, false if it already exists
     */
    addTrack(param) {
        if (typeof param !== 'string' || param.trim().length === 0) {
            console.warn('ParameterTimeline: Track param must be a non-empty string');
            return false;
        }

        if (this.tracks.has(param)) {
            return false; // Track already exists
        }

        this.tracks.set(param, {
            param,
            keyframes: [],
            enabled: true
        });

        return true;
    }

    /**
     * Remove a parameter track and all its keyframes.
     *
     * @param {string} param - Parameter name
     * @returns {boolean} true if the track was removed
     */
    removeTrack(param) {
        return this.tracks.delete(param);
    }

    /**
     * Enable or disable a track without removing it.
     *
     * @param {string} param - Parameter name
     * @param {boolean} enabled - New enabled state
     * @returns {boolean} true if the track was found
     */
    setTrackEnabled(param, enabled) {
        const track = this.tracks.get(param);
        if (!track) return false;
        track.enabled = Boolean(enabled);
        return true;
    }

    /**
     * Get all track names.
     *
     * @returns {string[]}
     */
    getTrackNames() {
        return Array.from(this.tracks.keys());
    }

    /**
     * Get all keyframes for a specific track.
     *
     * @param {string} param - Parameter name
     * @returns {Keyframe[]|null} Copy of the keyframes array, or null if track not found
     */
    getTrackKeyframes(param) {
        const track = this.tracks.get(param);
        if (!track) return null;
        return track.keyframes.map(kf => ({ ...kf }));
    }

    // -------------------------------------------------------------------------
    // Public API - Keyframe Management
    // -------------------------------------------------------------------------

    /**
     * Add a keyframe to a track. If no track exists for the parameter, one is
     * created automatically. Keyframes are kept sorted by time.
     *
     * @param {string} param - Parameter name
     * @param {number} time - Timestamp in milliseconds (0 to duration)
     * @param {number} value - Parameter value at this keyframe
     * @param {string} [easing='linear'] - Easing function name for interpolation TO this keyframe
     * @returns {number} Index of the inserted keyframe, or -1 on failure
     */
    addKeyframe(param, time, value, easing = 'linear') {
        // Auto-create track if needed
        if (!this.tracks.has(param)) {
            this.addTrack(param);
        }

        const track = this.tracks.get(param);
        if (!track) return -1;

        // Validate
        time = this._clamp(Number(time), 0, this.duration);
        value = Number(value);
        if (!Number.isFinite(value)) {
            console.warn(`ParameterTimeline: Non-finite value for keyframe on "${param}"`);
            return -1;
        }

        const easingName = this._easingFunctions[easing] ? easing : 'linear';

        /** @type {Keyframe} */
        const keyframe = { time, value, easing: easingName };

        // Insert in sorted order (by time)
        const insertIdx = this._findInsertIndex(track.keyframes, time);

        // If a keyframe at the exact same time already exists, replace it
        if (insertIdx < track.keyframes.length && track.keyframes[insertIdx].time === time) {
            track.keyframes[insertIdx] = keyframe;
            return insertIdx;
        }

        track.keyframes.splice(insertIdx, 0, keyframe);
        return insertIdx;
    }

    /**
     * Remove a keyframe by index from a track.
     *
     * @param {string} param - Parameter name
     * @param {number} index - Keyframe index
     * @returns {boolean} true if removed
     */
    removeKeyframe(param, index) {
        const track = this.tracks.get(param);
        if (!track) return false;

        if (index < 0 || index >= track.keyframes.length) {
            return false;
        }

        track.keyframes.splice(index, 1);
        return true;
    }

    /**
     * Remove a keyframe at a specific time from a track.
     *
     * @param {string} param - Parameter name
     * @param {number} time - Keyframe time in milliseconds
     * @param {number} [tolerance=10] - Time tolerance for matching (ms)
     * @returns {boolean} true if a keyframe was removed
     */
    removeKeyframeAtTime(param, time, tolerance = 10) {
        const track = this.tracks.get(param);
        if (!track) return false;

        const idx = track.keyframes.findIndex(kf => Math.abs(kf.time - time) <= tolerance);
        if (idx >= 0) {
            track.keyframes.splice(idx, 1);
            return true;
        }
        return false;
    }

    /**
     * Update an existing keyframe's value and/or easing.
     *
     * @param {string} param - Parameter name
     * @param {number} index - Keyframe index
     * @param {Object} updates - Properties to update: { value?, easing?, time? }
     * @returns {boolean} true if updated
     */
    updateKeyframe(param, index, updates) {
        const track = this.tracks.get(param);
        if (!track || index < 0 || index >= track.keyframes.length) {
            return false;
        }

        const kf = track.keyframes[index];

        if (typeof updates.value === 'number' && Number.isFinite(updates.value)) {
            kf.value = updates.value;
        }
        if (typeof updates.easing === 'string' && this._easingFunctions[updates.easing]) {
            kf.easing = updates.easing;
        }
        if (typeof updates.time === 'number' && Number.isFinite(updates.time)) {
            kf.time = this._clamp(updates.time, 0, this.duration);
            // Re-sort after time change
            track.keyframes.sort((a, b) => a.time - b.time);
        }

        return true;
    }

    /**
     * Clear all keyframes from a specific track.
     *
     * @param {string} param - Parameter name
     * @returns {boolean} true if the track was found and cleared
     */
    clearTrack(param) {
        const track = this.tracks.get(param);
        if (!track) return false;
        track.keyframes = [];
        return true;
    }

    /**
     * Clear all keyframes from all tracks.
     */
    clearAllKeyframes() {
        for (const [, track] of this.tracks) {
            track.keyframes = [];
        }
    }

    // -------------------------------------------------------------------------
    // Public API - Playback Controls
    // -------------------------------------------------------------------------

    /**
     * Start or resume playback.
     *
     * @param {Function} [onComplete] - Callback when playback completes (once mode only)
     */
    play(onComplete = null) {
        if (this.playing) return;

        this.playing = true;
        this._onComplete = typeof onComplete === 'function' ? onComplete : null;
        this._lastFrameTime = performance.now();

        // In 'once' mode, if we are at the end, reset to start
        if (this.loopMode === 'once' && this.currentTime >= this.duration) {
            this.currentTime = 0;
        }

        this._tick();
    }

    /**
     * Pause playback at the current position.
     */
    pause() {
        this.playing = false;
        if (this._frameId !== null) {
            cancelAnimationFrame(this._frameId);
            this._frameId = null;
        }
    }

    /**
     * Stop playback and reset to the beginning.
     */
    stop() {
        this.pause();
        this.currentTime = 0;
        this._bounceDirection = 1;
        this._applyCurrentValues();
    }

    /**
     * Seek to a specific time position.
     *
     * @param {number} time - Time in milliseconds (clamped to 0-duration)
     */
    seek(time) {
        this.currentTime = this._clamp(Number(time), 0, this.duration);
        this._applyCurrentValues();
    }

    /**
     * Seek to a specific normalized position.
     *
     * @param {number} position - Position from 0 (start) to 1 (end)
     */
    seekNormalized(position) {
        this.seek(this._clamp(Number(position), 0, 1) * this.duration);
    }

    /**
     * Set the playback speed multiplier.
     *
     * @param {number} speed - Speed multiplier (0.1-10)
     */
    setSpeed(speed) {
        this.playbackSpeed = this._clamp(Number(speed), 0.1, 10);
    }

    /**
     * Set the loop mode.
     *
     * @param {LoopMode} mode - 'loop', 'bounce', or 'once'
     */
    setLoopMode(mode) {
        if (['loop', 'bounce', 'once'].includes(mode)) {
            this.loopMode = mode;
        }
    }

    /**
     * Set the total timeline duration.
     *
     * @param {number} ms - Duration in milliseconds (minimum 100ms)
     */
    setDuration(ms) {
        this.duration = Math.max(100, Number(ms) || 10000);
        // Clamp current time
        if (this.currentTime > this.duration) {
            this.currentTime = this.duration;
        }
    }

    /**
     * Set an on-tick callback that fires each animation frame with the current time.
     *
     * @param {Function|null} callback - (currentTime: number, normalizedTime: number) => void
     */
    onTick(callback) {
        this._onTick = typeof callback === 'function' ? callback : null;
    }

    // -------------------------------------------------------------------------
    // Public API - BPM / Music Sync
    // -------------------------------------------------------------------------

    /**
     * Set the BPM (beats per minute) for quantization.
     *
     * @param {number} bpm - Beats per minute (20-300)
     */
    setBPM(bpm) {
        this.bpm = this._clamp(Number(bpm), 20, 300);
    }

    /**
     * Get the duration of one beat in milliseconds at the current BPM.
     *
     * @returns {number} Beat duration in ms
     */
    getBeatDuration() {
        return 60000 / this.bpm;
    }

    /**
     * Get the duration of one bar (4 beats) in milliseconds.
     *
     * @returns {number} Bar duration in ms
     */
    getBarDuration() {
        return this.getBeatDuration() * 4;
    }

    /**
     * Convert a beat number to a timestamp.
     *
     * @param {number} beat - Beat number (0-based)
     * @returns {number} Timestamp in milliseconds
     */
    beatToTime(beat) {
        return beat * this.getBeatDuration();
    }

    /**
     * Convert a timestamp to a beat number.
     *
     * @param {number} time - Timestamp in milliseconds
     * @returns {number} Beat number (fractional)
     */
    timeToBeat(time) {
        return time / this.getBeatDuration();
    }

    /**
     * Quantize all keyframe times to the nearest beat subdivision.
     *
     * @param {number} [subdivision=1] - Beat subdivision (1 = whole beat,
     *   0.5 = half beat, 0.25 = quarter beat, etc.)
     */
    quantizeToBeats(subdivision = 1) {
        const beatMs = this.getBeatDuration() * subdivision;
        if (beatMs <= 0) return;

        for (const [, track] of this.tracks) {
            for (const kf of track.keyframes) {
                kf.time = Math.round(kf.time / beatMs) * beatMs;
                kf.time = this._clamp(kf.time, 0, this.duration);
            }
            // Re-sort after quantization
            track.keyframes.sort((a, b) => a.time - b.time);
            // Remove duplicates at same time (keep last)
            this._deduplicateKeyframes(track);
        }
    }

    /**
     * Snap the timeline duration to the nearest number of bars.
     *
     * @param {number} [bars] - Number of bars. If not specified, rounds the
     *   current duration to the nearest whole bar count.
     */
    snapDurationToBars(bars) {
        const barMs = this.getBarDuration();
        if (typeof bars === 'number' && bars > 0) {
            this.duration = Math.round(bars) * barMs;
        } else {
            this.duration = Math.max(barMs, Math.round(this.duration / barMs) * barMs);
        }
    }

    // -------------------------------------------------------------------------
    // Public API - Value Interpolation
    // -------------------------------------------------------------------------

    /**
     * Get the interpolated value of a parameter at a specific time.
     *
     * @param {string} param - Parameter name
     * @param {number} time - Time in milliseconds
     * @returns {number|null} Interpolated value, or null if no keyframes exist
     */
    getValueAtTime(param, time) {
        const track = this.tracks.get(param);
        if (!track || track.keyframes.length === 0) {
            return null;
        }

        const keyframes = track.keyframes;

        // Before first keyframe
        if (time <= keyframes[0].time) {
            return keyframes[0].value;
        }

        // After last keyframe
        if (time >= keyframes[keyframes.length - 1].time) {
            return keyframes[keyframes.length - 1].value;
        }

        // Find surrounding keyframes
        for (let i = 0; i < keyframes.length - 1; i++) {
            const kf0 = keyframes[i];
            const kf1 = keyframes[i + 1];

            if (time >= kf0.time && time <= kf1.time) {
                const segment = kf1.time - kf0.time;
                if (segment === 0) return kf1.value;

                const localT = (time - kf0.time) / segment;
                const easeFn = this._easingFunctions[kf1.easing] || this._easingFunctions.linear;
                const eased = easeFn(localT);

                // Special circular interpolation for hue
                if (param === 'hue') {
                    return this._lerpHue(kf0.value, kf1.value, eased);
                }

                return kf0.value + (kf1.value - kf0.value) * eased;
            }
        }

        return keyframes[keyframes.length - 1].value;
    }

    /**
     * Get all parameter values at a specific time.
     *
     * @param {number} time - Time in milliseconds
     * @returns {Object<string, number>} Map of parameter names to interpolated values
     */
    getAllValuesAtTime(time) {
        const values = {};
        for (const [param, track] of this.tracks) {
            if (track.enabled && track.keyframes.length > 0) {
                const value = this.getValueAtTime(param, time);
                if (value !== null) {
                    values[param] = value;
                }
            }
        }
        return values;
    }

    // -------------------------------------------------------------------------
    // Public API - Serialization
    // -------------------------------------------------------------------------

    /**
     * Export the entire timeline as a serializable object.
     *
     * @returns {Object} Timeline data
     */
    exportTimeline() {
        const tracks = {};
        for (const [param, track] of this.tracks) {
            tracks[param] = {
                enabled: track.enabled,
                keyframes: track.keyframes.map(kf => ({
                    time: kf.time,
                    value: kf.value,
                    easing: kf.easing
                }))
            };
        }

        return {
            type: 'vib3-parameter-timeline',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            duration: this.duration,
            loopMode: this.loopMode,
            playbackSpeed: this.playbackSpeed,
            bpm: this.bpm,
            tracks
        };
    }

    /**
     * Import a timeline from serialized data.
     *
     * @param {Object} data - Timeline data as returned by exportTimeline()
     * @returns {boolean} true if imported successfully
     */
    importTimeline(data) {
        if (!data || data.type !== 'vib3-parameter-timeline') {
            console.warn('ParameterTimeline: Invalid import data');
            return false;
        }

        // Stop playback during import
        this.pause();

        // Restore settings
        if (typeof data.duration === 'number' && data.duration > 0) {
            this.duration = data.duration;
        }
        if (typeof data.loopMode === 'string') {
            this.setLoopMode(data.loopMode);
        }
        if (typeof data.playbackSpeed === 'number') {
            this.playbackSpeed = this._clamp(data.playbackSpeed, 0.1, 10);
        }
        if (typeof data.bpm === 'number') {
            this.bpm = this._clamp(data.bpm, 20, 300);
        }

        // Import tracks
        this.tracks.clear();
        this.currentTime = 0;

        if (data.tracks && typeof data.tracks === 'object') {
            for (const [param, trackData] of Object.entries(data.tracks)) {
                this.addTrack(param);
                const track = this.tracks.get(param);
                if (!track) continue;

                track.enabled = trackData.enabled !== false;

                if (Array.isArray(trackData.keyframes)) {
                    for (const kf of trackData.keyframes) {
                        if (typeof kf.time === 'number' && typeof kf.value === 'number') {
                            track.keyframes.push({
                                time: this._clamp(kf.time, 0, this.duration),
                                value: kf.value,
                                easing: this._easingFunctions[kf.easing] ? kf.easing : 'linear'
                            });
                        }
                    }
                    track.keyframes.sort((a, b) => a.time - b.time);
                }
            }
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Public API - Queries
    // -------------------------------------------------------------------------

    /**
     * Get the current normalized playback position (0-1).
     *
     * @returns {number}
     */
    getNormalizedTime() {
        return this.duration > 0 ? this.currentTime / this.duration : 0;
    }

    /**
     * Get the current beat position.
     *
     * @returns {number} Current beat number (fractional)
     */
    getCurrentBeat() {
        return this.timeToBeat(this.currentTime);
    }

    /**
     * Get the total number of beats in the timeline.
     *
     * @returns {number}
     */
    getTotalBeats() {
        return this.timeToBeat(this.duration);
    }

    /**
     * Get available easing function names.
     *
     * @returns {string[]}
     */
    getEasingNames() {
        return Object.keys(this._easingFunctions);
    }

    // -------------------------------------------------------------------------
    // Public API - Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Clean up resources and stop playback.
     */
    dispose() {
        this.pause();
        this.tracks.clear();
        this._onComplete = null;
        this._onTick = null;
    }

    // -------------------------------------------------------------------------
    // Private - Animation Loop
    // -------------------------------------------------------------------------

    /**
     * Main animation frame tick.
     * @private
     */
    _tick() {
        if (!this.playing) return;

        const now = performance.now();
        const delta = (now - this._lastFrameTime) * this.playbackSpeed;
        this._lastFrameTime = now;

        // Advance time based on mode
        if (this.loopMode === 'bounce') {
            this.currentTime += delta * this._bounceDirection;

            if (this.currentTime >= this.duration) {
                this.currentTime = this.duration;
                this._bounceDirection = -1;
            } else if (this.currentTime <= 0) {
                this.currentTime = 0;
                this._bounceDirection = 1;
            }
        } else {
            this.currentTime += delta;

            if (this.currentTime >= this.duration) {
                if (this.loopMode === 'loop') {
                    this.currentTime = this.currentTime % this.duration;
                } else {
                    // 'once' mode
                    this.currentTime = this.duration;
                    this._applyCurrentValues();
                    this.playing = false;
                    this._frameId = null;
                    if (this._onComplete) {
                        this._onComplete();
                    }
                    return;
                }
            }
        }

        // Apply interpolated values
        this._applyCurrentValues();

        // Notify tick callback
        if (this._onTick) {
            this._onTick(this.currentTime, this.getNormalizedTime());
        }

        // Schedule next frame
        this._frameId = requestAnimationFrame(() => this._tick());
    }

    /**
     * Evaluate and apply all track values at the current time.
     * @private
     */
    _applyCurrentValues() {
        for (const [param, track] of this.tracks) {
            if (!track.enabled || track.keyframes.length === 0) continue;

            const value = this.getValueAtTime(param, this.currentTime);
            if (value !== null) {
                this.updateParameter(param, value);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private - Keyframe Utilities
    // -------------------------------------------------------------------------

    /**
     * Find the insertion index for a keyframe at a given time (binary search).
     *
     * @param {Keyframe[]} keyframes - Sorted keyframes array
     * @param {number} time - Target time
     * @returns {number} Insertion index
     * @private
     */
    _findInsertIndex(keyframes, time) {
        let low = 0;
        let high = keyframes.length;

        while (low < high) {
            const mid = (low + high) >>> 1;
            if (keyframes[mid].time < time) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }

    /**
     * Remove duplicate keyframes at the same time, keeping the last one.
     *
     * @param {Track} track
     * @private
     */
    _deduplicateKeyframes(track) {
        const seen = new Map();
        for (let i = track.keyframes.length - 1; i >= 0; i--) {
            const time = track.keyframes[i].time;
            if (seen.has(time)) {
                track.keyframes.splice(i, 1);
            } else {
                seen.set(time, true);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private - Math Utilities
    // -------------------------------------------------------------------------

    /**
     * Clamp a value to a range.
     *
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     * @private
     */
    _clamp(value, min, max) {
        if (!Number.isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

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
             * Smooth cubic Bezier-style ease (alias for easeInOut).
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
             * Stepped/staircase easing (4 steps).
             * @param {number} t
             * @returns {number}
             */
            steps(t) {
                return Math.floor(t * 4) / 4;
            },

            /**
             * Sinusoidal ease-in-out.
             * @param {number} t
             * @returns {number}
             */
            sineInOut(t) {
                return -(Math.cos(Math.PI * t) - 1) / 2;
            },

            /**
             * Exponential ease-out.
             * @param {number} t
             * @returns {number}
             */
            expoOut(t) {
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            }
        };
    }
}
