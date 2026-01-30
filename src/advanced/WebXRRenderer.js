/**
 * VIB3+ WebXR Immersive Renderer
 * Renders 4D visualizations in VR/AR headsets via WebXR API.
 *
 * Provides stereoscopic rendering of VIB3 visualization systems
 * inside immersive WebXR sessions (VR, AR, or inline). Integrates
 * 6DOF head and controller tracking into the VIB3 parameter space,
 * mapping physical orientation to 4D rotation planes.
 *
 * @module advanced/WebXRRenderer
 */

/**
 * Supported XR session modes.
 * @typedef {'immersive-vr'|'immersive-ar'|'inline'} XRSessionMode
 */

/**
 * 6DOF pose data extracted from an XR frame.
 * @typedef {Object} SixDOFPose
 * @property {Float32Array} position   - [x, y, z] head position in meters
 * @property {Float32Array} orientation - [x, y, z, w] quaternion
 * @property {number} rotXY - Derived rotation in XY plane (radians)
 * @property {number} rotXZ - Derived rotation in XZ plane (radians)
 * @property {number} rotYZ - Derived rotation in YZ plane (radians)
 * @property {number} rotXW - Mapped 4D rotation in XW plane (radians)
 * @property {number} rotYW - Mapped 4D rotation in YW plane (radians)
 * @property {number} rotZW - Mapped 4D rotation in ZW plane (radians)
 */

export class WebXRRenderer {
    /**
     * @param {Object} engine - VIB3Engine instance
     */
    constructor(engine) {
        /** @type {Object} VIB3Engine reference */
        this.engine = engine;

        /** @type {XRSession|null} Active XR session */
        this.xrSession = null;

        /** @type {XRReferenceSpace|null} Reference space for pose calculations */
        this.xrRefSpace = null;

        /** @type {boolean} Whether an immersive session is active */
        this.isImmersive = false;

        /** @type {XRSessionMode} Current session mode */
        this.mode = 'immersive-vr';

        /** @type {WebGLRenderingContext|null} XR-compatible GL context */
        this.gl = null;

        /** @type {XRWebGLLayer|null} XR rendering layer */
        this.xrGLLayer = null;

        /** @type {number} Animation frame handle for cancellation */
        this._animFrameHandle = 0;

        /** @type {Map<string, XRInputSource>} Connected XR input sources */
        this._inputSources = new Map();

        /** @type {SixDOFPose|null} Most recent 6DOF pose data */
        this._lastPose = null;

        /** @type {Function|null} External frame callback */
        this._onFrameCallback = null;

        /** @type {boolean} Internal disposed flag */
        this._disposed = false;

        /** @type {Object} Support status cache */
        this._supportCache = {};
    }

    // -----------------------------------------------------------------------
    //  Capability Detection
    // -----------------------------------------------------------------------

    /**
     * Check whether WebXR is available and which session modes are supported.
     * @returns {Promise<{available: boolean, vr: boolean, ar: boolean, inline: boolean}>}
     */
    async checkSupport() {
        const result = { available: false, vr: false, ar: false, inline: false };

        if (!navigator.xr) {
            return result;
        }

        result.available = true;

        try {
            result.vr = await navigator.xr.isSessionSupported('immersive-vr');
        } catch (_e) {
            result.vr = false;
        }

        try {
            result.ar = await navigator.xr.isSessionSupported('immersive-ar');
        } catch (_e) {
            result.ar = false;
        }

        try {
            result.inline = await navigator.xr.isSessionSupported('inline');
        } catch (_e) {
            result.inline = false;
        }

        this._supportCache = result;
        return result;
    }

    // -----------------------------------------------------------------------
    //  Session Management
    // -----------------------------------------------------------------------

    /**
     * Start an immersive XR session.
     * Creates an XR-compatible WebGL context, binds framebuffers, and begins
     * the XR render loop.
     *
     * @param {XRSessionMode} [mode='immersive-vr'] - Session mode
     * @returns {Promise<XRSession>} The active XR session
     * @throws {Error} If WebXR is not supported or session request fails
     */
    async startSession(mode = 'immersive-vr') {
        if (this.xrSession) {
            throw new Error('WebXRRenderer: Session already active. Call endSession() first.');
        }

        if (!navigator.xr) {
            throw new Error('WebXR API not available in this browser.');
        }

        const supported = await navigator.xr.isSessionSupported(mode);
        if (!supported) {
            throw new Error(`WebXR mode "${mode}" is not supported on this device.`);
        }

        this.mode = mode;

        // Request session with required features
        const sessionInit = {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['bounded-floor', 'hand-tracking']
        };

        this.xrSession = await navigator.xr.requestSession(mode, sessionInit);
        this.isImmersive = mode.startsWith('immersive');

        // Create XR-compatible WebGL context
        this.gl = this._createXRGLContext();

        // Create XR WebGL layer
        this.xrGLLayer = new XRWebGLLayer(this.xrSession, this.gl);

        // Apply render state
        await this.xrSession.updateRenderState({
            baseLayer: this.xrGLLayer,
            depthNear: 0.1,
            depthFar: 1000.0
        });

        // Obtain reference space
        try {
            this.xrRefSpace = await this.xrSession.requestReferenceSpace('local-floor');
        } catch (_e) {
            // Fall back to 'local' if 'local-floor' unavailable
            this.xrRefSpace = await this.xrSession.requestReferenceSpace('local');
        }

        // Listen for input source changes
        this.xrSession.addEventListener('inputsourceschange', (e) => {
            this._onInputSourcesChange(e);
        });

        // Listen for session end
        this.xrSession.addEventListener('end', () => {
            this._onSessionEnd();
        });

        // Start render loop
        this._animFrameHandle = this.xrSession.requestAnimationFrame(
            (time, frame) => this.onXRFrame(time, frame)
        );

        return this.xrSession;
    }

    /**
     * End the current XR session gracefully.
     * @returns {Promise<void>}
     */
    async endSession() {
        if (!this.xrSession) {
            return;
        }

        try {
            await this.xrSession.end();
        } catch (_e) {
            // Session may already be ended
        }

        this._onSessionEnd();
    }

    /**
     * Register a callback to be invoked each XR frame after rendering.
     * Receives (time, frame, pose) arguments.
     * @param {Function} callback
     */
    onFrame(callback) {
        this._onFrameCallback = callback;
    }

    // -----------------------------------------------------------------------
    //  Render Loop
    // -----------------------------------------------------------------------

    /**
     * XR frame callback. Retrieves viewer pose, renders each eye, and
     * extracts 6DOF data for SpatialInputSystem.
     *
     * @param {DOMHighResTimeStamp} time - Current timestamp
     * @param {XRFrame} frame - XR frame object
     */
    onXRFrame(time, frame) {
        if (this._disposed || !this.xrSession) {
            return;
        }

        // Request next frame first for smooth scheduling
        this._animFrameHandle = this.xrSession.requestAnimationFrame(
            (t, f) => this.onXRFrame(t, f)
        );

        const session = this.xrSession;
        const glLayer = this.xrGLLayer;
        const gl = this.gl;

        if (!gl || !glLayer || !this.xrRefSpace) {
            return;
        }

        const pose = frame.getViewerPose(this.xrRefSpace);
        if (!pose) {
            return;
        }

        // Extract and store 6DOF data
        this._lastPose = this._extract6DOF(pose);

        // Bind XR framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Render each eye view
        for (const view of pose.views) {
            const viewport = glLayer.getViewport(view);
            if (viewport) {
                this.renderEye(view, viewport);
            }
        }

        // Process controller inputs
        this._processInputSources(frame);

        // Invoke external callback
        if (this._onFrameCallback) {
            try {
                this._onFrameCallback(time, frame, this._lastPose);
            } catch (_e) {
                // Swallow errors in external callback to preserve render loop
            }
        }
    }

    /**
     * Render the VIB3 visualization for a single eye.
     *
     * @param {XRView} view - XR view containing projection and transform matrices
     * @param {XRViewport} viewport - Target viewport rectangle
     */
    renderEye(view, viewport) {
        const gl = this.gl;
        if (!gl) return;

        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

        // Extract matrices
        const projectionMatrix = view.projectionMatrix;
        const viewMatrix = view.transform.inverse.matrix;

        // Apply 6DOF pose to VIB3 rotation parameters
        if (this._lastPose && this.engine) {
            this._applyPoseToEngine(this._lastPose);
        }

        // Render the current VIB3 system into this viewport
        if (this.engine && typeof this.engine.renderFrame === 'function') {
            this.engine.renderFrame({
                gl,
                projectionMatrix,
                viewMatrix,
                viewport: {
                    x: viewport.x,
                    y: viewport.y,
                    width: viewport.width,
                    height: viewport.height
                },
                isXR: true
            });
        } else {
            // Fallback: draw a simple quad to confirm XR is active
            this._renderFallbackQuad(gl, projectionMatrix, viewMatrix);
        }
    }

    // -----------------------------------------------------------------------
    //  6DOF Extraction
    // -----------------------------------------------------------------------

    /**
     * Extract 6DOF pose data and derive VIB3-compatible rotation angles.
     * Maps physical head orientation to 3D rotation planes (XY, XZ, YZ)
     * and position displacement to 4D rotation planes (XW, YW, ZW).
     *
     * @param {XRViewerPose} pose - Viewer pose from XRFrame
     * @returns {SixDOFPose} Extracted and mapped pose data
     */
    get6DOFInput() {
        return this._lastPose;
    }

    /**
     * @param {XRViewerPose} pose
     * @returns {SixDOFPose}
     * @private
     */
    _extract6DOF(pose) {
        const transform = pose.transform;
        const pos = transform.position;
        const ori = transform.orientation;

        const position = new Float32Array([pos.x, pos.y, pos.z]);
        const orientation = new Float32Array([ori.x, ori.y, ori.z, ori.w]);

        // Convert quaternion to Euler angles for 3D rotation planes
        const euler = this._quaternionToEuler(ori.x, ori.y, ori.z, ori.w);

        // Map position displacement to 4D rotations
        // Scale: 1 meter of movement = 1 radian of 4D rotation
        const posScale = 1.0;
        const rotXW = pos.x * posScale;
        const rotYW = pos.y * posScale;
        const rotZW = pos.z * posScale;

        return {
            position,
            orientation,
            rotXY: euler.yaw,    // Yaw  -> XY plane
            rotXZ: euler.pitch,  // Pitch -> XZ plane
            rotYZ: euler.roll,   // Roll  -> YZ plane
            rotXW: this._wrapAngle(rotXW),
            rotYW: this._wrapAngle(rotYW),
            rotZW: this._wrapAngle(rotZW)
        };
    }

    /**
     * Convert quaternion (x, y, z, w) to Euler angles (yaw, pitch, roll).
     * Uses ZYX convention.
     *
     * @param {number} qx
     * @param {number} qy
     * @param {number} qz
     * @param {number} qw
     * @returns {{yaw: number, pitch: number, roll: number}}
     * @private
     */
    _quaternionToEuler(qx, qy, qz, qw) {
        // Roll (X-axis)
        const sinr_cosp = 2.0 * (qw * qx + qy * qz);
        const cosr_cosp = 1.0 - 2.0 * (qx * qx + qy * qy);
        const roll = Math.atan2(sinr_cosp, cosr_cosp);

        // Pitch (Y-axis)
        const sinp = 2.0 * (qw * qy - qz * qx);
        let pitch;
        if (Math.abs(sinp) >= 1.0) {
            pitch = Math.sign(sinp) * (Math.PI / 2.0); // Clamp at poles
        } else {
            pitch = Math.asin(sinp);
        }

        // Yaw (Z-axis)
        const siny_cosp = 2.0 * (qw * qz + qx * qy);
        const cosy_cosp = 1.0 - 2.0 * (qy * qy + qz * qz);
        const yaw = Math.atan2(siny_cosp, cosy_cosp);

        return { yaw, pitch, roll };
    }

    /**
     * Wrap angle into [0, 2*PI) range.
     * @param {number} angle - Angle in radians
     * @returns {number}
     * @private
     */
    _wrapAngle(angle) {
        const TWO_PI = Math.PI * 2.0;
        let a = angle % TWO_PI;
        if (a < 0) a += TWO_PI;
        return a;
    }

    /**
     * Apply extracted 6DOF pose to the VIB3 engine parameters.
     * @param {SixDOFPose} pose
     * @private
     */
    _applyPoseToEngine(pose) {
        if (!this.engine || typeof this.engine.setParameter !== 'function') {
            return;
        }

        this.engine.setParameter('rot4dXY', pose.rotXY);
        this.engine.setParameter('rot4dXZ', pose.rotXZ);
        this.engine.setParameter('rot4dYZ', pose.rotYZ);
        this.engine.setParameter('rot4dXW', pose.rotXW);
        this.engine.setParameter('rot4dYW', pose.rotYW);
        this.engine.setParameter('rot4dZW', pose.rotZW);
    }

    // -----------------------------------------------------------------------
    //  Input Sources (Controllers / Hands)
    // -----------------------------------------------------------------------

    /**
     * Handle XR input source changes.
     * @param {XRInputSourcesChangeEvent} event
     * @private
     */
    _onInputSourcesChange(event) {
        for (const source of event.added) {
            this._inputSources.set(source.handedness || 'none', source);
        }

        for (const source of event.removed) {
            this._inputSources.delete(source.handedness || 'none');
        }
    }

    /**
     * Process input sources each frame for controller data.
     * Maps controller axes/buttons to VIB3 parameters.
     *
     * @param {XRFrame} frame
     * @private
     */
    _processInputSources(frame) {
        if (!this.engine || typeof this.engine.setParameter !== 'function') {
            return;
        }

        for (const [hand, source] of this._inputSources) {
            if (!source.gamepad) continue;

            const gp = source.gamepad;

            // Map thumbstick axes to additional parameters
            if (gp.axes.length >= 2) {
                if (hand === 'left') {
                    // Left stick: morph and chaos
                    const morphValue = (gp.axes[0] + 1.0) * 1.0; // 0..2
                    const chaosValue = (gp.axes[1] + 1.0) * 0.5; // 0..1
                    this.engine.setParameter('morphFactor', morphValue);
                    this.engine.setParameter('chaos', chaosValue);
                } else if (hand === 'right') {
                    // Right stick: gridDensity and speed
                    const densityValue = 4.0 + (gp.axes[0] + 1.0) * 48.0; // 4..100
                    const speedValue = 0.1 + (gp.axes[1] + 1.0) * 1.45;   // 0.1..3
                    this.engine.setParameter('gridDensity', densityValue);
                    this.engine.setParameter('speed', speedValue);
                }
            }

            // Map trigger to intensity
            if (gp.buttons.length > 0 && gp.buttons[0]) {
                const triggerVal = gp.buttons[0].value; // 0..1
                if (hand === 'right') {
                    this.engine.setParameter('intensity', triggerVal);
                }
            }

            // Map grip to dimension
            if (gp.buttons.length > 1 && gp.buttons[1]) {
                const gripVal = gp.buttons[1].value;
                if (hand === 'left') {
                    const dimValue = 3.0 + gripVal * 1.5; // 3.0..4.5
                    this.engine.setParameter('dimension', dimValue);
                }
            }

            // A/B or X/Y buttons for geometry cycling
            if (gp.buttons.length > 4 && gp.buttons[4] && gp.buttons[4].pressed) {
                if (this.engine.getParameter) {
                    const currentGeom = this.engine.getParameter('geometry') || 0;
                    const nextGeom = (currentGeom + 1) % 24;
                    this.engine.setParameter('geometry', nextGeom);
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    //  GL Context & Fallback
    // -----------------------------------------------------------------------

    /**
     * Create a WebGL rendering context compatible with WebXR.
     * @returns {WebGLRenderingContext}
     * @private
     */
    _createXRGLContext() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2', { xrCompatible: true })
            || canvas.getContext('webgl', { xrCompatible: true });

        if (!gl) {
            throw new Error('Failed to create XR-compatible WebGL context.');
        }

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        return gl;
    }

    /**
     * Render a simple colored quad as a fallback when the VIB3 engine
     * does not provide a renderFrame method.
     *
     * @param {WebGLRenderingContext} gl
     * @param {Float32Array} projectionMatrix
     * @param {Float32Array} viewMatrix
     * @private
     */
    _renderFallbackQuad(gl, projectionMatrix, viewMatrix) {
        // Simple pass-through vertex shader
        const vsSource = `
            attribute vec4 a_position;
            void main() {
                gl_Position = a_position;
            }
        `;

        // Animated color fragment shader
        const fsSource = `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0.2, 0.6, 1.0, 1.0);
            }
        `;

        if (!this._fallbackProgram) {
            const vs = this._compileShader(gl, gl.VERTEX_SHADER, vsSource);
            const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
            if (!vs || !fs) return;

            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                return;
            }

            this._fallbackProgram = program;

            // Full-screen triangle pair
            const verts = new Float32Array([
                -1, -1, 0, 1,
                 1, -1, 0, 1,
                -1,  1, 0, 1,
                 1,  1, 0, 1
            ]);

            this._fallbackVBO = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this._fallbackVBO);
            gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        }

        gl.useProgram(this._fallbackProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._fallbackVBO);

        const posLoc = gl.getAttribLocation(this._fallbackProgram, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 4, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Compile a GLSL shader.
     * @param {WebGLRenderingContext} gl
     * @param {number} type
     * @param {string} source
     * @returns {WebGLShader|null}
     * @private
     */
    _compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    // -----------------------------------------------------------------------
    //  Session End & Cleanup
    // -----------------------------------------------------------------------

    /**
     * Internal handler for session termination.
     * @private
     */
    _onSessionEnd() {
        this.xrSession = null;
        this.xrRefSpace = null;
        this.xrGLLayer = null;
        this.isImmersive = false;
        this._inputSources.clear();
        this._lastPose = null;
        this._animFrameHandle = 0;
    }

    /**
     * Dispose of all resources. After calling, this instance should not be reused.
     */
    dispose() {
        this._disposed = true;

        if (this.xrSession) {
            try {
                this.xrSession.end();
            } catch (_e) {
                // Ignore
            }
        }

        this._onSessionEnd();

        if (this.gl) {
            if (this._fallbackProgram) {
                this.gl.deleteProgram(this._fallbackProgram);
                this._fallbackProgram = null;
            }
            if (this._fallbackVBO) {
                this.gl.deleteBuffer(this._fallbackVBO);
                this._fallbackVBO = null;
            }
            this.gl = null;
        }

        this.engine = null;
        this._onFrameCallback = null;
    }
}
