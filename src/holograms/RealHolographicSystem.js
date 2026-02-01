/**
 * REAL Holographic System - Modified for holo-* canvas IDs
 * Uses the elaborate effects from active-holographic-systems-FIXED
 * Audio reactive only - no mouse/touch/scroll interference
 */
import { HolographicVisualizer } from './HolographicVisualizer.js';
import { MultiCanvasBridge } from '../render/MultiCanvasBridge.js';
import { shaderLoader } from '../render/ShaderLoader.js';

export class RealHolographicSystem {
    constructor(options = {}) {
        this.visualizers = [];
        this.currentVariant = 0;
        this.baseVariants = 30; // Original 30 variations
        this.totalVariants = 30;
        this.isActive = false;

        // Canvas override for single-canvas multi-instance mode
        /** @type {HTMLCanvasElement|null} */
        this.canvasOverride = options.canvas || null;

        // Bridge rendering state
        /** @type {MultiCanvasBridge|null} */
        this._multiCanvasBridge = null;
        /** @type {'direct'|'bridge'} */
        this._renderMode = 'direct';
        /** @type {number} time accumulator for bridge rendering (ms) */
        this._bridgeTime = 0;

        // Conditional reactivity: Use built-in only if ReactivityManager not active
        this.useBuiltInReactivity = !window.reactivityManager;

        // Audio reactivity system
        this.audioEnabled = false;
        this.audioContext = null;
        this.analyser = null;
        this.frequencyData = null;
        this.audioData = { bass: 0, mid: 0, high: 0 };
        
        // Variant names for display - SEQUENTIAL ORDER
        this.variantNames = [
            // 0-3: TETRAHEDRON variations
            'TETRAHEDRON LATTICE', 'TETRAHEDRON FIELD', 'TETRAHEDRON MATRIX', 'TETRAHEDRON RESONANCE',
            // 4-7: HYPERCUBE variations
            'HYPERCUBE LATTICE', 'HYPERCUBE FIELD', 'HYPERCUBE MATRIX', 'HYPERCUBE QUANTUM',
            // 8-11: SPHERE variations
            'SPHERE LATTICE', 'SPHERE FIELD', 'SPHERE MATRIX', 'SPHERE RESONANCE',
            // 12-15: TORUS variations
            'TORUS LATTICE', 'TORUS FIELD', 'TORUS MATRIX', 'TORUS QUANTUM',
            // 16-19: KLEIN BOTTLE variations
            'KLEIN BOTTLE LATTICE', 'KLEIN BOTTLE FIELD', 'KLEIN BOTTLE MATRIX', 'KLEIN BOTTLE QUANTUM',
            // 20-22: FRACTAL variations
            'FRACTAL LATTICE', 'FRACTAL FIELD', 'FRACTAL QUANTUM',
            // 23-25: WAVE variations
            'WAVE LATTICE', 'WAVE FIELD', 'WAVE QUANTUM',
            // 26-29: CRYSTAL variations
            'CRYSTAL LATTICE', 'CRYSTAL FIELD', 'CRYSTAL MATRIX', 'CRYSTAL QUANTUM'
        ];
        
        this.initialize();
    }
    
    initialize() {
        console.log('🎨 Initializing REAL Holographic System for Active Holograms tab...');
        this.createVisualizers();
        this.setupCenterDistanceReactivity(); // NEW: Center-distance grid density changes
        this.updateVariantDisplay();
        this.startRenderLoop();
    }
    
    createVisualizers() {
        // Single-canvas override mode: lightweight content-only layer
        if (this.canvasOverride) {
            try {
                const visualizer = new HolographicVisualizer(
                    this.canvasOverride, 'content', 1.0, this.currentVariant
                );
                if (visualizer.gl) {
                    this.visualizers.push(visualizer);
                    console.log('✅ Created holographic single-canvas visualizer (content layer)');
                } else {
                    console.warn('⚠️ No WebGL context for holographic canvasOverride');
                }
            } catch (error) {
                console.warn('Failed to create holographic single-canvas visualizer:', error);
            }
            return;
        }

        // Create the 5 visualizers using HOLO canvas IDs
        const layers = [
            { id: 'holo-background-canvas', role: 'background', reactivity: 0.5 },
            { id: 'holo-shadow-canvas', role: 'shadow', reactivity: 0.7 },
            { id: 'holo-content-canvas', role: 'content', reactivity: 0.9 },
            { id: 'holo-highlight-canvas', role: 'highlight', reactivity: 1.1 },
            { id: 'holo-accent-canvas', role: 'accent', reactivity: 1.5 }
        ];

        let successfulLayers = 0;
        layers.forEach(layer => {
            try {
                // Check if canvas element exists
                const canvas = document.getElementById(layer.id);
                if (!canvas) {
                    console.error(`❌ Canvas not found: ${layer.id}`);
                    return;
                }

                console.log(`🔍 Creating holographic visualizer for: ${layer.id}`);
                const visualizer = new HolographicVisualizer(layer.id, layer.role, layer.reactivity, this.currentVariant);

                if (visualizer.gl) {
                    this.visualizers.push(visualizer);
                    successfulLayers++;
                    console.log(`✅ Created REAL holographic layer: ${layer.role} (${layer.id})`);
                } else {
                    console.error(`❌ No WebGL context for: ${layer.id}`);
                }
            } catch (error) {
                console.error(`❌ Failed to create REAL holographic layer ${layer.id}:`, error);
            }
        });

        console.log(`✅ Created ${successfulLayers}/5 REAL holographic layers`);

        if (successfulLayers === 0) {
            console.error('🚨 NO HOLOGRAPHIC VISUALIZERS CREATED! Check canvas elements and WebGL support.');
        }
    }

    /**
     * Initialize the Holographic system through UnifiedRenderBridge / MultiCanvasBridge.
     * Wires all 5 layers through the bridge for WebGL/WebGPU abstraction.
     * Falls back to direct WebGL if bridge initialization fails.
     *
     * @param {object} [options]
     * @param {boolean} [options.preferWebGPU=true]
     * @param {boolean} [options.debug=false]
     * @returns {Promise<boolean>} True if bridge mode activated
     */
    async initWithBridge(options = {}) {
        try {
            const bridge = await this.createMultiCanvasBridge(options);
            if (bridge && bridge.initialized) {
                this._renderMode = 'bridge';
                this._bridgeTime = 0;
                console.log(`Holographic System initialized via ${bridge.backendType} bridge (${bridge.layerCount} layers)`);
                return true;
            }
            console.warn('Holographic bridge init returned no bridge, staying in direct mode');
            return false;
        } catch (e) {
            console.error('Holographic bridge init failed, staying in direct mode:', e);
            this._renderMode = 'direct';
            return false;
        }
    }

    /**
     * Create a MultiCanvasBridge for WebGPU rendering.
     * Returns a configured bridge with holographic shaders compiled on all layers.
     *
     * @param {object} [options]
     * @param {boolean} [options.preferWebGPU=true]
     * @returns {Promise<MultiCanvasBridge|null>}
     */
    async createMultiCanvasBridge(options = {}) {
        const canvasMap = {};
        const layerIds = {
            background: 'holo-background-canvas',
            shadow: 'holo-shadow-canvas',
            content: 'holo-content-canvas',
            highlight: 'holo-highlight-canvas',
            accent: 'holo-accent-canvas'
        };

        for (const [role, id] of Object.entries(layerIds)) {
            const el = document.getElementById(id);
            if (el) canvasMap[role] = el;
        }

        if (Object.keys(canvasMap).length === 0) return null;

        const bridge = new MultiCanvasBridge();
        await bridge.initialize({ canvases: canvasMap, preferWebGPU: options.preferWebGPU !== false });

        // Load external shader files, fall back to inline if unavailable
        let sources = {
            glslVertex: 'attribute vec2 a_position;\nvoid main() { gl_Position = vec4(a_position, 0.0, 1.0); }',
            glslFragment: null,
            wgslFragment: null
        };

        try {
            const external = await shaderLoader.loadShaderPair('holographic', 'holographic/holographic.frag');
            if (external.glslVertex) sources.glslVertex = external.glslVertex;
            if (external.glslFragment) sources.glslFragment = external.glslFragment;
            if (external.wgslFragment) sources.wgslFragment = external.wgslFragment;
        } catch (loadErr) {
            console.warn('Holographic external shader load failed, using inline fallback');
        }

        if (sources.glslFragment || sources.wgslFragment) {
            const result = bridge.compileShaderAll('holographic', sources);
            if (result.failed.length > 0) {
                console.warn(`Holographic shader compilation failed on layers: ${result.failed.join(', ')}`);
            }
        }

        this._multiCanvasBridge = bridge;
        return bridge;
    }

    /**
     * Build the VIB3+ standard uniform object from current parameters and audio data.
     * Used by bridge rendering to send uniforms to external shader programs.
     * @private
     * @returns {object}
     */
    _buildSharedUniforms() {
        const params = this.getParameters();
        const audio = this.audioData || { bass: 0, mid: 0, high: 0 };

        return {
            u_time: this._bridgeTime,
            u_resolution: null, // Set per-layer by MultiCanvasBridge
            u_geometry: params.geometry || 0,
            u_rot4dXY: params.rot4dXY || 0,
            u_rot4dXZ: params.rot4dXZ || 0,
            u_rot4dYZ: params.rot4dYZ || 0,
            u_rot4dXW: params.rot4dXW || 0,
            u_rot4dYW: params.rot4dYW || 0,
            u_rot4dZW: params.rot4dZW || 0,
            u_dimension: params.dimension || 3.5,
            u_gridDensity: params.gridDensity || 15,
            u_morphFactor: params.morphFactor || 1.0,
            u_chaos: params.chaos || 0.2,
            u_speed: params.speed || 1.0,
            u_hue: params.hue || 320,
            u_intensity: params.intensity || 0.6,
            u_saturation: params.saturation || 0.8,
            u_mouseIntensity: 0,
            u_clickIntensity: this.colorBurstIntensity || 0,
            u_bass: audio.bass || 0,
            u_mid: audio.mid || 0,
            u_high: audio.high || 0
        };
    }

    /**
     * Render a single frame via the MultiCanvasBridge.
     * Sets shared uniforms and renders all 5 layers with the external holographic shader.
     * @private
     */
    _renderBridgeFrame() {
        if (!this._multiCanvasBridge || !this._multiCanvasBridge.initialized) return;

        this._bridgeTime += 16; // ~60fps increment

        const uniforms = this._buildSharedUniforms();

        // Set canvas resolution per layer before rendering
        for (const layerName of this._multiCanvasBridge.layerNames) {
            const bridge = this._multiCanvasBridge.getBridge(layerName);
            if (bridge && bridge.canvas) {
                this._multiCanvasBridge.setLayerUniforms(layerName, {
                    u_resolution: [bridge.canvas.width, bridge.canvas.height]
                });
            }
        }

        this._multiCanvasBridge.setSharedUniforms(uniforms);
        this._multiCanvasBridge.renderAll('holographic', { clearColor: [0, 0, 0, 0] });
    }

    setActive(active) {
        this.isActive = active;

        if (active) {
            // Show holographic layers (skip in single-canvas override mode)
            if (!this.canvasOverride) {
                const holoLayers = document.getElementById('holographicLayers');
                if (holoLayers) {
                    holoLayers.style.display = 'block';
                }
            }

            // Start audio only if globally enabled and not already started
            if (!this.audioEnabled && window.audioEnabled === true) {
                this.initAudio();
            }
            console.log('🌌 REAL Active Holograms ACTIVATED with audio reactivity');
        } else {
            // Hide holographic layers (skip in single-canvas override mode)
            if (!this.canvasOverride) {
                const holoLayers = document.getElementById('holographicLayers');
                if (holoLayers) {
                    holoLayers.style.display = 'none';
                }
            }
            console.log('🌌 REAL Active Holograms DEACTIVATED');
        }
    }
    
    
    updateVariantDisplay() {
        // This will be called by the main UI system
        const variantName = this.variantNames[this.currentVariant];
        return {
            variant: this.currentVariant,
            name: variantName,
            geometryType: Math.floor(this.currentVariant / 4)
        };
    }
    
    nextVariant() {
        this.updateVariant(this.currentVariant + 1);
    }
    
    previousVariant() {
        this.updateVariant(this.currentVariant - 1);
    }
    
    randomVariant() {
        const randomIndex = Math.floor(Math.random() * this.totalVariants);
        this.updateVariant(randomIndex);
    }
    
    setVariant(variant) {
        this.updateVariant(variant);
    }
    
    updateParameter(param, value) {
        // Store custom parameter overrides
        if (!this.customParams) {
            this.customParams = {};
        }
        this.customParams[param] = value;
        
        console.log(`🌌 Updating holographic ${param}: ${value} (${this.visualizers.length} visualizers)`);
        
        // CRITICAL FIX: Call updateParameters method on ALL visualizers for immediate render
        this.visualizers.forEach((visualizer, index) => {
            try {
                if (visualizer.updateParameters) {
                    // Use new updateParameters method with proper parameter mapping
                    const params = {};
                    params[param] = value;
                    visualizer.updateParameters(params);
                    console.log(`✅ Updated holographic layer ${index} (${visualizer.role}) with ${param}=${value}`);
                } else {
                    console.warn(`⚠️ Holographic layer ${index} missing updateParameters method, using fallback`);
                    // Fallback for older method (direct parameter setting)
                    if (visualizer.variantParams) {
                        visualizer.variantParams[param] = value;
                        
                        // If it's a geometry type change, regenerate role params with new geometry
                        if (param === 'geometryType') {
                            visualizer.roleParams = visualizer.generateRoleParams(visualizer.role);
                        }
                        
                        // Force manual render for older visualizers
                        if (visualizer.render) {
                            visualizer.render();
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Failed to update holographic layer ${index}:`, error);
            }
        });
        
        console.log(`🔄 Holographic parameter update complete: ${param}=${value}`);
    }
    
    // Override updateVariant to preserve custom parameters
    updateVariant(newVariant) {
        if (newVariant < 0) newVariant = this.totalVariants - 1;
        if (newVariant >= this.totalVariants) newVariant = 0;
        
        this.currentVariant = newVariant;
        
        // Update all visualizers with new variant parameters
        this.visualizers.forEach(visualizer => {
            visualizer.variant = this.currentVariant;
            visualizer.variantParams = visualizer.generateVariantParams(this.currentVariant);
            visualizer.roleParams = visualizer.generateRoleParams(visualizer.role);
            
            // Apply any custom parameter overrides
            if (this.customParams) {
                Object.keys(this.customParams).forEach(param => {
                    visualizer.variantParams[param] = this.customParams[param];
                });
            }
        });
        
        this.updateVariantDisplay();
        console.log(`🔄 REAL Holograms switched to variant ${this.currentVariant + 1}: ${this.variantNames[this.currentVariant]}`);
    }
    
    getCurrentVariantInfo() {
        return {
            variant: this.currentVariant,
            name: this.variantNames[this.currentVariant],
            geometryType: Math.floor(this.currentVariant / 4)
        };
    }
    
    /**
     * Get current parameters for saving/export (CRITICAL for gallery saving)
     */
    getParameters() {
        // Collect parameters from UI sliders - same as other systems
        const params = {
            geometry: Math.floor(this.currentVariant / 4), // Extract geometry from variant
            gridDensity: parseFloat(document.getElementById('gridDensity')?.value || 15),
            morphFactor: parseFloat(document.getElementById('morphFactor')?.value || 1.0),
            chaos: parseFloat(document.getElementById('chaos')?.value || 0.2),
            speed: parseFloat(document.getElementById('speed')?.value || 1.0),
            hue: parseFloat(document.getElementById('hue')?.value || 320),
            intensity: parseFloat(document.getElementById('intensity')?.value || 0.6),
            saturation: parseFloat(document.getElementById('saturation')?.value || 0.8),
            rot4dXW: parseFloat(document.getElementById('rot4dXW')?.value || 0.0),
            rot4dYW: parseFloat(document.getElementById('rot4dYW')?.value || 0.0),
            rot4dZW: parseFloat(document.getElementById('rot4dZW')?.value || 0.0),
            variant: this.currentVariant
        };
        
        // Apply any custom parameter overrides
        if (this.customParams) {
            Object.assign(params, this.customParams);
        }
        
        console.log('🌌 Holographic system getParameters:', params);
        return params;
    }
    
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this._audioStream = stream;
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);

            this.audioEnabled = true;
            console.log('REAL Holograms audio reactivity enabled');
        } catch (error) {
            console.error('REAL Holograms audio initialization failed:', error);
        }
    }
    
    // NEW: Disable holographic audio (respects global audio toggle)
    disableAudio() {
        if (this.audioEnabled) {
            this.audioEnabled = false;
            // Stop audio stream tracks to release microphone
            if (this._audioStream) {
                this._audioStream.getTracks().forEach(track => track.stop());
                this._audioStream = null;
            }
            if (this.audioContext) {
                this.audioContext.close().catch(() => {});
                this.audioContext = null;
            }
            this.analyser = null;
            this.frequencyData = null;
            this.audioData = { bass: 0, mid: 0, high: 0 };
            console.log('REAL Holograms audio reactivity disabled');
        }
    }
    
    updateAudio() {
        if (!this.audioEnabled || !this.analyser || !this.isActive || window.audioEnabled === false) return;
        
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        const bassEnd = Math.floor(this.frequencyData.length * 0.1);
        const midEnd = Math.floor(this.frequencyData.length * 0.4);
        
        let bass = 0, mid = 0, high = 0;
        
        for (let i = 0; i < bassEnd; i++) {
            bass += this.frequencyData[i];
        }
        bass /= (bassEnd * 255);
        
        for (let i = bassEnd; i < midEnd; i++) {
            mid += this.frequencyData[i];
        }
        mid /= ((midEnd - bassEnd) * 255);
        
        for (let i = midEnd; i < this.frequencyData.length; i++) {
            high += this.frequencyData[i];
        }
        high /= ((this.frequencyData.length - midEnd) * 255);
        
        // Enhanced audio processing for better visual response
        const smoothedAudio = {
            bass: this.smoothAudioValue(bass, 'bass'),
            mid: this.smoothAudioValue(mid, 'mid'), 
            high: this.smoothAudioValue(high, 'high'),
            energy: (bass + mid + high) / 3,
            rhythm: this.detectRhythm(bass),
            melody: this.detectMelody(mid, high)
        };
        
        this.audioData = smoothedAudio;
        
        // Apply NEW AUDIO REACTIVITY GRID SETTINGS if available
        if (window.audioReactivitySettings) {
            this.applyAudioReactivityGrid(smoothedAudio);
        }
        
        // Apply audio reactivity to all visualizers
        this.visualizers.forEach(visualizer => {
            visualizer.updateAudio(this.audioData);
        });
    }
    
    smoothAudioValue(currentValue, type) {
        if (!this.audioSmoothing) {
            this.audioSmoothing = { bass: 0, mid: 0, high: 0 };
        }
        
        const smoothingFactor = 0.4;
        this.audioSmoothing[type] = this.audioSmoothing[type] * smoothingFactor + currentValue * (1 - smoothingFactor);
        
        const threshold = 0.05;
        return this.audioSmoothing[type] > threshold ? this.audioSmoothing[type] : 0;
    }
    
    detectRhythm(bassLevel) {
        if (!this.previousBass) this.previousBass = 0;
        const beatDetected = bassLevel > this.previousBass + 0.2;
        this.previousBass = bassLevel;
        return beatDetected ? 1.0 : 0.0;
    }
    
    detectMelody(midLevel, highLevel) {
        const melodicActivity = (midLevel + highLevel) / 2;
        return melodicActivity > 0.3 ? melodicActivity : 0.0;
    }
    
    applyAudioReactivityGrid(audioData) {
        const settings = window.audioReactivitySettings;
        if (!settings || settings.activeVisualModes.size === 0) return;
        
        // Get sensitivity multiplier
        const sensitivityMultiplier = settings.sensitivity[settings.activeSensitivity];
        
        // Apply audio changes to different visual modes
        settings.activeVisualModes.forEach(modeKey => {
            const [sensitivity, visualMode] = modeKey.split('-');
            const paramList = settings.visualModes[visualMode];
            
            if (!paramList) return;
            
            // Calculate audio intensity with sensitivity
            const audioIntensity = (audioData.energy * sensitivityMultiplier);
            const bassIntensity = (audioData.bass * sensitivityMultiplier);
            const rhythmIntensity = (audioData.rhythm * sensitivityMultiplier);
            
            paramList.forEach(param => {
                let currentValue = 0;
                
                switch (param) {
                    case 'hue':
                        // Color: Audio-reactive hue cycling
                        if (!this.audioHueBase) this.audioHueBase = 320;
                        this.audioHueBase += audioIntensity * 5; // Smooth color shifts
                        currentValue = this.audioHueBase % 360;
                        break;
                        
                    case 'saturation':
                        // Color: Beat-responsive saturation
                        currentValue = Math.min(1.0, 0.6 + (rhythmIntensity * 0.4));
                        break;
                        
                    case 'intensity':
                        // Color: Energy-responsive brightness
                        currentValue = Math.min(1.0, 0.4 + (audioIntensity * 0.6));
                        break;
                        
                    case 'morphFactor':
                        // Geometry: Audio-morphing shapes
                        currentValue = Math.min(2.0, 1.0 + (bassIntensity * 1.0));
                        break;
                        
                    case 'gridDensity':
                        // Geometry: Beat-responsive density
                        currentValue = Math.min(100, 15 + (rhythmIntensity * 50));
                        break;
                        
                    case 'chaos':
                        // Geometry: Energy-chaos correlation
                        currentValue = Math.min(1.0, audioIntensity * 0.8);
                        break;
                        
                    case 'speed':
                        // Movement: Tempo-responsive animation
                        currentValue = Math.min(3.0, 1.0 + (audioIntensity * 2.0));
                        break;
                        
                    case 'rot4dXW':
                        // Movement: Bass-driven rotation
                        if (!this.audioRotationXW) this.audioRotationXW = 0;
                        this.audioRotationXW += bassIntensity * 0.1;
                        currentValue = this.audioRotationXW % (Math.PI * 2);
                        break;
                        
                    case 'rot4dYW':
                        // Movement: Mid-frequency rotation
                        if (!this.audioRotationYW) this.audioRotationYW = 0;
                        this.audioRotationYW += audioData.mid * sensitivityMultiplier * 0.08;
                        currentValue = this.audioRotationYW % (Math.PI * 2);
                        break;
                        
                    case 'rot4dZW':
                        // Movement: High-frequency rotation  
                        if (!this.audioRotationZW) this.audioRotationZW = 0;
                        this.audioRotationZW += audioData.high * sensitivityMultiplier * 0.06;
                        currentValue = this.audioRotationZW % (Math.PI * 2);
                        break;
                }
                
                // Apply the parameter change
                if (window.updateParameter && currentValue !== undefined) {
                    window.updateParameter(param, currentValue.toFixed(2));
                }
            });
        });
    }
    
    setupCenterDistanceReactivity() {
        // AUDIO ONLY - No mouse/touch/scroll interference
        // Holographic system is purely audio-reactive now
        console.log('✨ Holographic system: AUDIO-ONLY mode (no mouse/touch reactivity)');

        if (this.canvasOverride) {
            console.log('✨ Holographic reactivity skipped (single-canvas override mode)');
            return;
        }

        // If ReactivityManager is active, it handles all interactivity
        if (!this.useBuiltInReactivity) {
            console.log('✨ Holographic built-in reactivity DISABLED - ReactivityManager active');
            return;
        }

        // NO EVENT LISTENERS - Audio reactivity only
        console.log('🎵 Holographic system will respond to audio input only');
    }
    
    updateHolographicShimmer(x, y) {
        // HOLOGRAPHIC TRADING CARD SHIMMER EFFECTS
        // Calculate position-based shimmer like real holographic cards
        
        // Create iridescent shimmer based on viewing angle (mouse position)
        const angleX = (x - 0.5) * Math.PI; // -π/2 to π/2 
        const angleY = (y - 0.5) * Math.PI;
        
        // Holographic rainbow shimmer - shifts through spectrum based on angle
        const baseHue = 320; // Start with magenta-pink
        const shimmerRange = 120; // Cover 120 degrees of spectrum
        const hueShimmer = Math.sin(angleX * 2) * Math.cos(angleY * 2) * shimmerRange;
        const shimmerHue = (baseHue + hueShimmer + 360) % 360;
        
        // Iridescent intensity - varies with viewing angle like real holograms
        const shimmerIntensity = 0.4 + (0.5 * Math.abs(Math.sin(angleX) * Math.cos(angleY)));
        
        // Holographic saturation pulse - high saturation for vivid colors
        const saturationPulse = 0.7 + (0.3 * Math.abs(Math.cos(angleX * 1.5) * Math.sin(angleY * 1.5)));
        
        // Subtle depth illusion - slight morph based on angle (much more subtle than faceted)
        const depthMorph = 1.0 + (0.15 * Math.sin(angleX * 0.8) * Math.cos(angleY * 0.8));
        
        // Update holographic shimmer parameters
        if (window.updateParameter) {
            window.updateParameter('hue', Math.round(shimmerHue));
            window.updateParameter('intensity', shimmerIntensity.toFixed(2));
            window.updateParameter('saturation', saturationPulse.toFixed(2));
            window.updateParameter('morphFactor', depthMorph.toFixed(2));
        }
        
        console.log(`✨ Holographic shimmer: angle=(${angleX.toFixed(2)}, ${angleY.toFixed(2)}) → Hue=${Math.round(shimmerHue)}, Intensity=${shimmerIntensity.toFixed(2)}`);
    }
    
    triggerHolographicColorBurst(x, y) {
        // DRAMATIC HOLOGRAPHIC COLOR BURST (like Quantum's dramatic click effects)
        
        // Calculate energy based on click position 
        const centerX = 0.5;
        const centerY = 0.5;
        const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const normalizedDistance = Math.min(distanceFromCenter / 0.707, 1.0);
        
        // QUANTUM-STYLE DRAMATIC EFFECTS
        this.colorBurstIntensity = 1.0; // Full burst intensity
        
        // Multi-parameter dramatic effects that decay back
        this.burstHueShift = 180; // Dramatic hue shift across spectrum
        this.burstIntensityBoost = 0.7; // Major intensity boost
        this.burstSaturationSpike = 0.8; // Vivid color spike
        this.burstChaosEffect = 0.6; // Chaos/morph burst effect
        this.burstSpeedBoost = 1.8; // Animation speed burst
        
        console.log(`🌈💥 HOLOGRAPHIC COLOR BURST: position=(${x.toFixed(2)}, ${y.toFixed(2)}), distance=${distanceFromCenter.toFixed(3)}`);
    }
    
    startHolographicColorBurstLoop() {
        const burstAnimation = () => {
            // DRAMATIC HOLOGRAPHIC COLOR BURST ANIMATION (like Quantum's multi-parameter effects)
            let hasActiveEffects = false;
            
            if (this.colorBurstIntensity > 0.01) {
                hasActiveEffects = true;
                
                // Phase-based burst animation with color cycling
                const burstPhase = this.colorBurstIntensity;
                
                // HUE BURST: Cycle through rainbow spectrum
                if (this.burstHueShift > 1) {
                    const baseHue = 320; // Holographic magenta base
                    const currentHueShift = this.burstHueShift * Math.sin(burstPhase * Math.PI * 2);
                    const burstHue = (baseHue + currentHueShift) % 360;
                    
                    if (window.updateParameter) {
                        window.updateParameter('hue', Math.round(burstHue));
                    }
                    this.burstHueShift *= 0.93; // Smooth decay
                }
                
                // INTENSITY BURST: Dramatic brightness flash
                if (this.burstIntensityBoost > 0.01) {
                    const baseIntensity = 0.5;
                    const burstIntensity = Math.min(1.0, baseIntensity + this.burstIntensityBoost * burstPhase);
                    
                    if (window.updateParameter) {
                        window.updateParameter('intensity', burstIntensity.toFixed(2));
                    }
                    this.burstIntensityBoost *= 0.92;
                }
                
                // SATURATION SPIKE: Vivid color explosion
                if (this.burstSaturationSpike > 0.01) {
                    const baseSaturation = 0.8;
                    const burstSaturation = Math.min(1.0, baseSaturation + this.burstSaturationSpike * burstPhase);
                    
                    if (window.updateParameter) {
                        window.updateParameter('saturation', burstSaturation.toFixed(2));
                    }
                    this.burstSaturationSpike *= 0.91;
                }
                
                // CHAOS/MORPH EFFECT: Geometric distortion burst
                if (this.burstChaosEffect > 0.01) {
                    const baseChaos = 0.2;
                    const burstChaos = baseChaos + this.burstChaosEffect * burstPhase;
                    
                    if (window.updateParameter) {
                        window.updateParameter('chaos', burstChaos.toFixed(2));
                    }
                    this.burstChaosEffect *= 0.90;
                }
                
                // SPEED BOOST: Animation acceleration
                if (this.burstSpeedBoost > 0.01) {
                    const baseSpeed = 1.0;
                    const burstSpeed = baseSpeed + this.burstSpeedBoost * burstPhase;
                    
                    if (window.updateParameter) {
                        window.updateParameter('speed', burstSpeed.toFixed(2));
                    }
                    this.burstSpeedBoost *= 0.89;
                }
                
                // Master intensity decay
                this.colorBurstIntensity *= 0.94;
            }
            
            if (this.isActive) {
                requestAnimationFrame(burstAnimation);
            }
        };
        
        burstAnimation();
    }
    
    startRenderLoop() {
        const render = () => {
            if (this.isActive) {
                // Update audio reactivity
                this.updateAudio();

                if (this._renderMode === 'bridge') {
                    this._renderBridgeFrame();
                } else {
                    // Direct mode: render all visualizers
                    this.visualizers.forEach(visualizer => {
                        visualizer.render();
                    });
                }
            }

            requestAnimationFrame(render);
        };

        render();
        console.log(`🎬 REAL Holographic render loop started (${this._renderMode} mode)`);
    }
    
    getVariantName(variant = this.currentVariant) {
        return this.variantNames[variant] || 'UNKNOWN';
    }
    
    destroy() {
        // Dispose bridge if active
        if (this._multiCanvasBridge) {
            this._multiCanvasBridge.dispose();
            this._multiCanvasBridge = null;
        }
        this._renderMode = 'direct';

        this.visualizers.forEach(visualizer => {
            if (visualizer.destroy) {
                visualizer.destroy();
            }
        });
        this.visualizers = [];

        if (this.audioContext) {
            this.audioContext.close();
        }

        console.log('🧹 REAL Holographic System destroyed');
    }

    // ============================================
    // RendererContract Compliance Methods
    // ============================================

    /**
     * Initialize the renderer (RendererContract.init)
     * For Holographic, initialization happens in constructor.
     * This method allows re-initialization with a new context, including
     * a canvas override for single-canvas multi-instance mode.
     *
     * @param {Object} [context] - Optional context
     * @param {HTMLCanvasElement} [context.canvas] - Canvas element override
     * @param {string} [context.canvasId] - Canvas ID to look up
     * @returns {boolean} Success status
     */
    init(context = {}) {
        const canvasEl = context.canvas ||
            (context.canvasId ? document.getElementById(context.canvasId) : null);

        if (canvasEl) {
            this.canvasOverride = canvasEl;
            // Tear down existing visualizers before re-init
            this.visualizers.forEach(v => v.destroy && v.destroy());
            this.visualizers = [];
        }

        // If already initialized (and no new canvas), just return success
        if (this.visualizers.length > 0) {
            return true;
        }
        // Otherwise initialize
        this.initialize();
        return this.visualizers.length > 0;
    }

    /**
     * Handle canvas resize (RendererContract.resize)
     * @param {number} width - New width in pixels
     * @param {number} height - New height in pixels
     * @param {number} [pixelRatio=1] - Device pixel ratio
     */
    resize(width, height, pixelRatio = 1) {
        if (this._renderMode === 'bridge' && this._multiCanvasBridge) {
            this._multiCanvasBridge.resizeAll(width, height, pixelRatio);
        } else {
            this.visualizers.forEach(visualizer => {
                if (visualizer.canvas && visualizer.gl) {
                    visualizer.canvas.width = width * pixelRatio;
                    visualizer.canvas.height = height * pixelRatio;
                    visualizer.canvas.style.width = `${width}px`;
                    visualizer.canvas.style.height = `${height}px`;
                    visualizer.gl.viewport(0, 0, visualizer.canvas.width, visualizer.canvas.height);
                }
            });
        }
        console.log(`🌌 Holographic resized to ${width}x${height} @${pixelRatio}x`);
    }

    /**
     * Render a single frame (RendererContract.render)
     * @param {Object} [frameState] - Frame state with time, params, audio
     */
    render(frameState = {}) {
        // Apply frameState parameters if provided
        if (frameState.params) {
            Object.keys(frameState.params).forEach(param => {
                this.updateParameter(param, frameState.params[param]);
            });
        }

        // Apply audio data if provided
        if (frameState.audio) {
            this.audioData = frameState.audio;
        }

        if (this._renderMode === 'bridge') {
            this._renderBridgeFrame();
        } else {
            // Render all visualizers in direct mode
            this.visualizers.forEach(visualizer => {
                if (visualizer.render) {
                    visualizer.render();
                }
            });
        }
    }

    /**
     * Get the current rendering backend type.
     * @returns {'direct-webgl'|string}
     */
    getBackendType() {
        if (this._renderMode === 'bridge' && this._multiCanvasBridge) {
            return this._multiCanvasBridge.backendType || 'bridge';
        }
        return 'direct-webgl';
    }

    /**
     * Clean up all resources (RendererContract.dispose)
     * Alias for destroy() for contract compliance
     */
    dispose() {
        // Disable audio first
        this.disableAudio();

        // Call existing destroy
        this.destroy();
    }
}