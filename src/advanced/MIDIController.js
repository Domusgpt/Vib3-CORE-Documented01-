/**
 * VIB3+ MIDI Controller Integration
 * Maps MIDI input to visualization parameters via the Web MIDI API.
 *
 * Features:
 *  - Auto-detection of connected MIDI devices
 *  - Default DJ-controller layout mapping
 *  - MIDI Learn mode (map any CC/note to any parameter)
 *  - Per-mapping curve, scale, and invert options
 *  - Note-on/off action triggers (geometry presets, system switch, etc.)
 *  - Full serialization/deserialization of mappings
 *
 * @module advanced/MIDIController
 */

/**
 * Options for a CC-to-parameter mapping.
 * @typedef {Object} CCMappingOptions
 * @property {number} [min=0]     - Output minimum
 * @property {number} [max=1]     - Output maximum
 * @property {boolean} [invert=false] - Invert the CC direction
 * @property {'linear'|'exponential'|'logarithmic'|'scurve'} [curve='linear'] - Response curve
 * @property {number} [channel=0] - MIDI channel (0-15, 0 = omni)
 */

/**
 * A stored CC mapping entry.
 * @typedef {Object} CCMapping
 * @property {string} param      - VIB3 parameter name
 * @property {number} channel    - MIDI channel (0 = omni)
 * @property {number} cc         - Control Change number (0-127)
 * @property {number} min        - Mapped minimum value
 * @property {number} max        - Mapped maximum value
 * @property {boolean} invert    - Whether input is inverted
 * @property {string} curve      - Curve type
 */

/**
 * A stored note mapping entry.
 * @typedef {Object} NoteMapping
 * @property {string} action     - Action identifier (e.g. 'geometry:5', 'system:quantum')
 * @property {number} channel    - MIDI channel (0 = omni)
 * @property {number} note       - MIDI note number (0-127)
 * @property {'noteOn'|'noteOff'|'toggle'} trigger - When to fire the action
 */

export class MIDIController {
    /**
     * @param {Function} parameterUpdateFn - Callback invoked as parameterUpdateFn(name, value)
     *   whenever a MIDI message maps to a parameter change.
     */
    constructor(parameterUpdateFn) {
        /** @type {Function} */
        this.updateParameter = parameterUpdateFn;

        /** @type {MIDIAccess|null} */
        this.midiAccess = null;

        /** @type {Map<string, MIDIInput>} Connected inputs keyed by id */
        this.inputs = new Map();

        /**
         * CC mappings keyed by "channel:cc" (e.g. "0:74").
         * @type {Map<string, CCMapping>}
         */
        this.mappings = new Map();

        /**
         * Note mappings keyed by "channel:note".
         * @type {Map<string, NoteMapping>}
         */
        this.noteMappings = new Map();

        /** @type {boolean} Whether MIDI Learn mode is active */
        this.learning = false;

        /**
         * Callback invoked when a CC is received during Learn mode.
         * @type {Function|null}
         */
        this.learnCallback = null;

        /** @type {string|null} Parameter name being learned */
        this._learnTarget = null;

        /**
         * Most recent CC values keyed by "channel:cc".
         * @type {Map<string, number>}
         */
        this.lastValues = new Map();

        /**
         * Toggle state for note-mapped toggles keyed by "channel:note".
         * @type {Map<string, boolean>}
         */
        this._toggleState = new Map();

        /** @type {Function|null} External message listener */
        this._onRawMessage = null;

        /** @type {boolean} */
        this._destroyed = false;
    }

    // -----------------------------------------------------------------------
    //  Initialization
    // -----------------------------------------------------------------------

    /**
     * Request MIDI access via the Web MIDI API and begin listening for
     * device connections and messages.
     *
     * @returns {Promise<MIDIAccess>}
     * @throws {Error} If Web MIDI API is unavailable or access is denied
     */
    async initialize() {
        if (!navigator.requestMIDIAccess) {
            throw new Error('Web MIDI API is not supported in this browser.');
        }

        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

        // Register existing inputs
        for (const [id, input] of this.midiAccess.inputs) {
            this._registerInput(id, input);
        }

        // Listen for hot-plug events
        this.midiAccess.onstatechange = (event) => {
            this._onStateChange(event);
        };

        return this.midiAccess;
    }

    /**
     * Register a MIDI input and attach the message handler.
     * @param {string} id
     * @param {MIDIInput} input
     * @private
     */
    _registerInput(id, input) {
        if (this.inputs.has(id)) return;

        input.onmidimessage = (event) => this.onMIDIMessage(event);
        this.inputs.set(id, input);
    }

    /**
     * Handle MIDI device connect / disconnect.
     * @param {MIDIConnectionEvent} event
     * @private
     */
    _onStateChange(event) {
        const port = event.port;
        if (port.type !== 'input') return;

        if (port.state === 'connected') {
            this._registerInput(port.id, port);
        } else if (port.state === 'disconnected') {
            this.inputs.delete(port.id);
        }
    }

    // -----------------------------------------------------------------------
    //  Default Mapping
    // -----------------------------------------------------------------------

    /**
     * Load a default mapping modeled on a standard DJ controller layout.
     *
     * Channel 0 (omni):
     *  - Faders (CC 1-4): hue, saturation, intensity, speed
     *  - Knobs (CC 16-19): rot4dXW, rot4dYW, rot4dZW, dimension
     *  - Knobs (CC 20-22): rot4dXY, rot4dXZ, rot4dYZ
     *  - Pitch bend (CC 74): morphFactor
     *  - Mod wheel (CC 1 alt / CC 71): chaos
     *  - Knob (CC 23): gridDensity
     *
     * Notes (channel 0):
     *  - Pads 36-59: geometry presets 0-23
     *  - Note 60: system switch to faceted
     *  - Note 61: system switch to quantum
     *  - Note 62: system switch to holographic
     *  - Note 63: randomize all
     *  - Note 64: save to gallery
     */
    loadDefaultMapping() {
        this.mappings.clear();
        this.noteMappings.clear();

        // -- Faders --
        this.mapCC(0, 1, 'hue',        { min: 0, max: 360, curve: 'linear' });
        this.mapCC(0, 2, 'saturation',  { min: 0, max: 1,   curve: 'linear' });
        this.mapCC(0, 3, 'intensity',   { min: 0, max: 1,   curve: 'linear' });
        this.mapCC(0, 4, 'speed',       { min: 0.1, max: 3, curve: 'exponential' });

        // -- Knobs: 4D rotations --
        this.mapCC(0, 16, 'rot4dXW',    { min: 0, max: Math.PI * 2, curve: 'linear' });
        this.mapCC(0, 17, 'rot4dYW',    { min: 0, max: Math.PI * 2, curve: 'linear' });
        this.mapCC(0, 18, 'rot4dZW',    { min: 0, max: Math.PI * 2, curve: 'linear' });
        this.mapCC(0, 19, 'dimension',  { min: 3.0, max: 4.5, curve: 'linear' });

        // -- Knobs: 3D rotations --
        this.mapCC(0, 20, 'rot4dXY',    { min: 0, max: Math.PI * 2, curve: 'linear' });
        this.mapCC(0, 21, 'rot4dXZ',    { min: 0, max: Math.PI * 2, curve: 'linear' });
        this.mapCC(0, 22, 'rot4dYZ',    { min: 0, max: Math.PI * 2, curve: 'linear' });

        // -- Extra knobs --
        this.mapCC(0, 23, 'gridDensity', { min: 4, max: 100, curve: 'logarithmic' });

        // -- Pitch bend / Mod wheel --
        this.mapCC(0, 74, 'morphFactor', { min: 0, max: 2, curve: 'linear' });
        this.mapCC(0, 71, 'chaos',       { min: 0, max: 1, curve: 'scurve' });

        // -- Pads: geometry presets --
        for (let i = 0; i < 24; i++) {
            this.mapNote(0, 36 + i, `geometry:${i}`);
        }

        // -- System switch buttons --
        this.mapNote(0, 60, 'system:faceted');
        this.mapNote(0, 61, 'system:quantum');
        this.mapNote(0, 62, 'system:holographic');
        this.mapNote(0, 63, 'action:randomize');
        this.mapNote(0, 64, 'action:save');
    }

    // -----------------------------------------------------------------------
    //  MIDI Learn
    // -----------------------------------------------------------------------

    /**
     * Enter MIDI Learn mode. The next incoming CC message will be mapped
     * to the specified parameter.
     *
     * @param {string} parameterName - VIB3 parameter name to learn
     * @param {Function} [callback] - Optional callback invoked with the
     *   learned mapping details: callback({channel, cc, param})
     */
    startLearn(parameterName) {
        this.learning = true;
        this._learnTarget = parameterName;
    }

    /**
     * Exit MIDI Learn mode without mapping.
     */
    stopLearn() {
        this.learning = false;
        this._learnTarget = null;
        this.learnCallback = null;
    }

    // -----------------------------------------------------------------------
    //  Manual Mapping
    // -----------------------------------------------------------------------

    /**
     * Map a MIDI Control Change to a VIB3 parameter.
     *
     * @param {number} channel - MIDI channel (0 = omni, 1-16 = specific)
     * @param {number} cc - Control Change number (0-127)
     * @param {string} param - VIB3 parameter name
     * @param {CCMappingOptions} [options={}]
     */
    mapCC(channel, cc, param, options = {}) {
        const key = `${channel}:${cc}`;
        this.mappings.set(key, {
            param,
            channel: channel || 0,
            cc,
            min: options.min !== undefined ? options.min : 0,
            max: options.max !== undefined ? options.max : 1,
            invert: options.invert || false,
            curve: options.curve || 'linear'
        });
    }

    /**
     * Map a MIDI note to an action.
     *
     * @param {number} channel - MIDI channel (0 = omni)
     * @param {number} note - MIDI note number (0-127)
     * @param {string} action - Action string (e.g. 'geometry:5', 'system:quantum',
     *   'action:randomize', 'action:save')
     * @param {'noteOn'|'noteOff'|'toggle'} [trigger='noteOn'] - When to fire
     */
    mapNote(channel, note, action, trigger = 'noteOn') {
        const key = `${channel}:${note}`;
        this.noteMappings.set(key, {
            action,
            channel: channel || 0,
            note,
            trigger
        });
    }

    /**
     * Remove a CC mapping.
     * @param {number} channel
     * @param {number} cc
     */
    unmapCC(channel, cc) {
        this.mappings.delete(`${channel}:${cc}`);
    }

    /**
     * Remove a note mapping.
     * @param {number} channel
     * @param {number} note
     */
    unmapNote(channel, note) {
        this.noteMappings.delete(`${channel}:${note}`);
    }

    // -----------------------------------------------------------------------
    //  MIDI Message Handler
    // -----------------------------------------------------------------------

    /**
     * Process an incoming MIDI message. Routes CC messages to parameter
     * updates and note messages to actions.
     *
     * @param {MIDIMessageEvent} event
     */
    onMIDIMessage(event) {
        if (this._destroyed) return;

        const data = event.data;
        if (!data || data.length < 2) return;

        // External raw listener
        if (this._onRawMessage) {
            this._onRawMessage(data);
        }

        const status = data[0] & 0xF0;
        const channel = (data[0] & 0x0F) + 1; // 1-16

        switch (status) {
            case 0xB0: // Control Change
                this._handleCC(channel, data[1], data[2]);
                break;

            case 0x90: // Note On (velocity > 0)
                if (data.length >= 3 && data[2] > 0) {
                    this._handleNoteOn(channel, data[1], data[2]);
                } else {
                    this._handleNoteOff(channel, data[1]);
                }
                break;

            case 0x80: // Note Off
                this._handleNoteOff(channel, data[1]);
                break;

            case 0xE0: // Pitch Bend
                if (data.length >= 3) {
                    // Convert 14-bit pitch bend to 0-127 range for CC processing
                    const pitchValue = ((data[2] << 7) | data[1]);
                    const normalized = Math.round(pitchValue / 16383 * 127);
                    this._handleCC(channel, 128, normalized); // Virtual CC 128 for pitch bend
                }
                break;

            default:
                break;
        }
    }

    /**
     * Handle a Control Change message.
     * @param {number} channel - 1-16
     * @param {number} cc - 0-127
     * @param {number} value - 0-127
     * @private
     */
    _handleCC(channel, cc, value) {
        // MIDI Learn mode
        if (this.learning && this._learnTarget) {
            this.mapCC(0, cc, this._learnTarget, { min: 0, max: 1 });

            if (this.learnCallback) {
                this.learnCallback({
                    channel,
                    cc,
                    param: this._learnTarget
                });
            }

            this.learning = false;
            this._learnTarget = null;
            this.learnCallback = null;
            // Fall through to also apply the value
        }

        // Store raw value
        const rawKey = `${channel}:${cc}`;
        this.lastValues.set(rawKey, value);

        // Look up mapping (try channel-specific first, then omni)
        const mapping = this.mappings.get(`${channel}:${cc}`)
            || this.mappings.get(`0:${cc}`);

        if (!mapping) return;

        // Normalize CC value (0-127 -> 0-1)
        let normalized = value / 127.0;

        // Invert
        if (mapping.invert) {
            normalized = 1.0 - normalized;
        }

        // Apply curve
        normalized = this._applyCurve(normalized, mapping.curve);

        // Scale to output range
        const outputValue = mapping.min + normalized * (mapping.max - mapping.min);

        // Fire parameter update
        if (this.updateParameter) {
            this.updateParameter(mapping.param, outputValue);
        }
    }

    /**
     * Handle a Note On message.
     * @param {number} channel - 1-16
     * @param {number} note - 0-127
     * @param {number} velocity - 1-127
     * @private
     */
    _handleNoteOn(channel, note, velocity) {
        const mapping = this.noteMappings.get(`${channel}:${note}`)
            || this.noteMappings.get(`0:${note}`);

        if (!mapping) return;

        if (mapping.trigger === 'toggle') {
            const key = `${channel}:${note}`;
            const current = this._toggleState.get(key) || false;
            this._toggleState.set(key, !current);

            if (!current) {
                this._executeAction(mapping.action, velocity);
            }
            return;
        }

        if (mapping.trigger === 'noteOn') {
            this._executeAction(mapping.action, velocity);
        }
    }

    /**
     * Handle a Note Off message.
     * @param {number} channel - 1-16
     * @param {number} note - 0-127
     * @private
     */
    _handleNoteOff(channel, note) {
        const mapping = this.noteMappings.get(`${channel}:${note}`)
            || this.noteMappings.get(`0:${note}`);

        if (!mapping) return;

        if (mapping.trigger === 'noteOff') {
            this._executeAction(mapping.action, 0);
        }
    }

    /**
     * Execute a mapped action string.
     *
     * Action format: "type:value"
     *  - "geometry:N"           -> Set geometry to N
     *  - "system:name"          -> Switch to system
     *  - "action:randomize"     -> Randomize all parameters
     *  - "action:save"          -> Save to gallery
     *  - "param:name:value"     -> Set arbitrary parameter
     *
     * @param {string} action
     * @param {number} velocity - Note velocity (0-127)
     * @private
     */
    _executeAction(action, velocity) {
        const parts = action.split(':');
        const type = parts[0];
        const value = parts.slice(1).join(':');

        switch (type) {
            case 'geometry':
                if (this.updateParameter) {
                    const geom = parseInt(value, 10);
                    if (!isNaN(geom) && geom >= 0 && geom <= 23) {
                        this.updateParameter('geometry', geom);
                    }
                }
                break;

            case 'system':
                if (this.updateParameter) {
                    this.updateParameter('system', value);
                }
                break;

            case 'action':
                if (value === 'randomize' && this.updateParameter) {
                    this.updateParameter('action', 'randomize');
                } else if (value === 'save' && this.updateParameter) {
                    this.updateParameter('action', 'save');
                }
                break;

            case 'param':
                if (parts.length >= 3 && this.updateParameter) {
                    const paramName = parts[1];
                    const paramValue = parseFloat(parts[2]);
                    if (!isNaN(paramValue)) {
                        this.updateParameter(paramName, paramValue);
                    }
                }
                break;

            default:
                break;
        }
    }

    // -----------------------------------------------------------------------
    //  Curve Functions
    // -----------------------------------------------------------------------

    /**
     * Apply a response curve to a normalized (0-1) value.
     *
     * @param {number} value - Normalized input (0-1)
     * @param {string} curve - Curve type
     * @returns {number} Curved output (0-1)
     * @private
     */
    _applyCurve(value, curve) {
        switch (curve) {
            case 'exponential':
                // Quadratic curve for smoother low-end response
                return value * value;

            case 'logarithmic':
                // Inverse quadratic for more control at high end
                return Math.sqrt(value);

            case 'scurve':
                // S-curve (sigmoid-like) for smooth center transition
                return value * value * (3.0 - 2.0 * value);

            case 'linear':
            default:
                return value;
        }
    }

    // -----------------------------------------------------------------------
    //  Serialization
    // -----------------------------------------------------------------------

    /**
     * Export all current mappings as a JSON-serializable object.
     *
     * @returns {{version: number, cc: CCMapping[], notes: NoteMapping[]}}
     */
    exportMapping() {
        return {
            version: 1,
            cc: Array.from(this.mappings.values()),
            notes: Array.from(this.noteMappings.values())
        };
    }

    /**
     * Import mappings from a previously exported object. Replaces all
     * current mappings.
     *
     * @param {{version: number, cc: CCMapping[], notes: NoteMapping[]}} data
     * @throws {Error} If data format is invalid
     */
    importMapping(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid mapping data: must be an object.');
        }

        if (!Array.isArray(data.cc) || !Array.isArray(data.notes)) {
            throw new Error('Invalid mapping data: missing cc or notes arrays.');
        }

        this.mappings.clear();
        this.noteMappings.clear();

        for (const mapping of data.cc) {
            if (mapping && typeof mapping.cc === 'number' && typeof mapping.param === 'string') {
                const key = `${mapping.channel || 0}:${mapping.cc}`;
                this.mappings.set(key, {
                    param: mapping.param,
                    channel: mapping.channel || 0,
                    cc: mapping.cc,
                    min: mapping.min !== undefined ? mapping.min : 0,
                    max: mapping.max !== undefined ? mapping.max : 1,
                    invert: mapping.invert || false,
                    curve: mapping.curve || 'linear'
                });
            }
        }

        for (const mapping of data.notes) {
            if (mapping && typeof mapping.note === 'number' && typeof mapping.action === 'string') {
                const key = `${mapping.channel || 0}:${mapping.note}`;
                this.noteMappings.set(key, {
                    action: mapping.action,
                    channel: mapping.channel || 0,
                    note: mapping.note,
                    trigger: mapping.trigger || 'noteOn'
                });
            }
        }
    }

    // -----------------------------------------------------------------------
    //  Utilities
    // -----------------------------------------------------------------------

    /**
     * Get a list of all currently connected MIDI input devices.
     *
     * @returns {{id: string, name: string, manufacturer: string, state: string}[]}
     */
    getConnectedDevices() {
        const devices = [];
        for (const [id, input] of this.inputs) {
            devices.push({
                id,
                name: input.name || 'Unknown Device',
                manufacturer: input.manufacturer || 'Unknown',
                state: input.state || 'unknown'
            });
        }
        return devices;
    }

    /**
     * Get all current CC mappings as an array.
     * @returns {CCMapping[]}
     */
    getMappings() {
        return Array.from(this.mappings.values());
    }

    /**
     * Get all current note mappings as an array.
     * @returns {NoteMapping[]}
     */
    getNoteMappings() {
        return Array.from(this.noteMappings.values());
    }

    /**
     * Register a listener for raw MIDI messages (for debugging or displays).
     * @param {Function} callback - Receives Uint8Array of MIDI data
     */
    onRawMessage(callback) {
        this._onRawMessage = callback;
    }

    /**
     * Destroy the controller. Removes all listeners and clears state.
     */
    destroy() {
        this._destroyed = true;

        // Remove message handlers from all inputs
        for (const [, input] of this.inputs) {
            try {
                input.onmidimessage = null;
            } catch (_e) {
                // Ignore
            }
        }

        if (this.midiAccess) {
            this.midiAccess.onstatechange = null;
        }

        this.inputs.clear();
        this.mappings.clear();
        this.noteMappings.clear();
        this.lastValues.clear();
        this._toggleState.clear();
        this.midiAccess = null;
        this.updateParameter = null;
        this.learnCallback = null;
        this._onRawMessage = null;
    }
}
