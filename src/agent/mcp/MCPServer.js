/**
 * VIB3+ MCP Server
 * Model Context Protocol server for agentic integration
 */

import { toolDefinitions, getToolList, validateToolInput } from './tools.js';
import { schemaRegistry } from '../../schemas/index.js';
import { telemetry, EventType, withTelemetry } from '../telemetry/index.js';

/**
 * Generate unique IDs
 */
function generateId(prefix = 'scene') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Geometry metadata lookup
 */
const BASE_GEOMETRIES = [
    { name: 'tetrahedron', vertices: 4, edges: 6, faces: 4 },
    { name: 'hypercube', vertices: 16, edges: 32, faces: 24 },
    { name: 'sphere', vertices: 'variable', edges: 'variable', faces: 'variable' },
    { name: 'torus', vertices: 'variable', edges: 'variable', faces: 'variable' },
    { name: 'klein_bottle', vertices: 'variable', edges: 'variable', faces: 'variable' },
    { name: 'fractal', vertices: 'variable', edges: 'variable', faces: 'variable' },
    { name: 'wave', vertices: 'variable', edges: 'variable', faces: 'variable' },
    { name: 'crystal', vertices: 8, edges: 12, faces: 6 }
];

const CORE_TYPES = ['base', 'hypersphere', 'hypertetrahedron'];

/**
 * MCP Server implementation
 */
export class MCPServer {
    constructor(engine = null) {
        this.engine = engine;
        this.sceneId = null;
        this.initialized = false;
    }

    /**
     * Set the VIB3 engine instance
     */
    setEngine(engine) {
        this.engine = engine;
        this.initialized = !!engine;
    }

    /**
     * Handle MCP tool call
     */
    async handleToolCall(toolName, args = {}) {
        const startTime = performance.now();

        // Validate input
        const validation = validateToolInput(toolName, args);
        if (!validation.valid) {
            telemetry.recordEvent(EventType.TOOL_INVOCATION_ERROR, {
                tool: toolName,
                error: validation.error.code
            });
            return { error: validation.error };
        }

        // Record start
        telemetry.recordEvent(EventType.TOOL_INVOCATION_START, { tool: toolName });

        try {
            let result;

            switch (toolName) {
                case 'create_4d_visualization':
                    result = await this.createVisualization(args);
                    break;
                case 'set_rotation':
                    result = this.setRotation(args);
                    break;
                case 'set_visual_parameters':
                    result = this.setVisualParameters(args);
                    break;
                case 'switch_system':
                    result = await this.switchSystem(args);
                    break;
                case 'change_geometry':
                    result = this.changeGeometry(args);
                    break;
                case 'get_state':
                    result = this.getState();
                    break;
                case 'randomize_parameters':
                    result = this.randomizeParameters(args);
                    break;
                case 'reset_parameters':
                    result = this.resetParameters();
                    break;
                case 'render_preview':
                    result = await this.renderPreview(args);
                    break;
                case 'save_to_gallery':
                    result = this.saveToGallery(args);
                    break;
                case 'load_from_gallery':
                    result = this.loadFromGallery(args);
                    break;
                case 'search_geometries':
                    result = this.searchGeometries(args);
                    break;
                case 'get_parameter_schema':
                    result = this.getParameterSchema();
                    break;
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }

            // Record success
            const duration = performance.now() - startTime;
            telemetry.recordEvent(EventType.TOOL_INVOCATION_END, {
                tool: toolName,
                duration_ms: duration,
                success: true
            });

            return {
                success: true,
                operation: toolName,
                timestamp: new Date().toISOString(),
                duration_ms: duration,
                ...result
            };

        } catch (error) {
            const duration = performance.now() - startTime;
            telemetry.recordEvent(EventType.TOOL_INVOCATION_ERROR, {
                tool: toolName,
                duration_ms: duration,
                error: error.message
            });

            return {
                error: {
                    type: 'SystemError',
                    code: 'TOOL_EXECUTION_FAILED',
                    message: error.message,
                    suggestion: 'Check engine initialization and parameters',
                    retry_possible: true
                }
            };
        }
    }

    /**
     * Create a new visualization
     */
    async createVisualization(args) {
        const { system = 'quantum', geometry_index = 0, projection = 'perspective' } = args;

        if (this.engine) {
            await this.engine.switchSystem(system);
            if (geometry_index !== undefined) {
                this.engine.setParameter('geometry', geometry_index);
            }
        }

        this.sceneId = generateId('scene_4d');

        const baseIndex = geometry_index % 8;
        const coreIndex = Math.floor(geometry_index / 8);

        return {
            scene_id: this.sceneId,
            geometry: {
                index: geometry_index,
                base_type: BASE_GEOMETRIES[baseIndex].name,
                core_type: CORE_TYPES[coreIndex],
                vertex_count: BASE_GEOMETRIES[baseIndex].vertices,
                edge_count: BASE_GEOMETRIES[baseIndex].edges
            },
            system,
            projection,
            render_info: {
                complexity: geometry_index > 15 ? 'high' : geometry_index > 7 ? 'medium' : 'low',
                estimated_fps: 60
            },
            suggested_next_actions: ['set_rotation', 'set_visual_parameters', 'render_preview']
        };
    }

    /**
     * Set rotation parameters
     */
    setRotation(args) {
        if (this.engine) {
            if (args.XY !== undefined) this.engine.setParameter('rot4dXY', args.XY);
            if (args.XZ !== undefined) this.engine.setParameter('rot4dXZ', args.XZ);
            if (args.YZ !== undefined) this.engine.setParameter('rot4dYZ', args.YZ);
            if (args.XW !== undefined) this.engine.setParameter('rot4dXW', args.XW);
            if (args.YW !== undefined) this.engine.setParameter('rot4dYW', args.YW);
            if (args.ZW !== undefined) this.engine.setParameter('rot4dZW', args.ZW);

            telemetry.recordEvent(EventType.PARAMETER_CHANGE, { type: 'rotation' });
        }

        return {
            rotation_state: {
                XY: args.XY ?? 0,
                XZ: args.XZ ?? 0,
                YZ: args.YZ ?? 0,
                XW: args.XW ?? 0,
                YW: args.YW ?? 0,
                ZW: args.ZW ?? 0
            },
            suggested_next_actions: ['set_visual_parameters', 'render_preview']
        };
    }

    /**
     * Set visual parameters
     */
    setVisualParameters(args) {
        if (this.engine) {
            for (const [key, value] of Object.entries(args)) {
                this.engine.setParameter(key, value);
            }
            telemetry.recordEvent(EventType.PARAMETER_BATCH_CHANGE, {
                count: Object.keys(args).length
            });
        }

        return {
            parameters_updated: Object.keys(args),
            suggested_next_actions: ['render_preview', 'save_to_gallery']
        };
    }

    /**
     * Switch visualization system
     */
    async switchSystem(args) {
        const { system } = args;

        if (this.engine) {
            await this.engine.switchSystem(system);
            telemetry.recordEvent(EventType.SYSTEM_SWITCH, { system });
        }

        return {
            active_system: system,
            available_geometries: 24,
            suggested_next_actions: ['change_geometry', 'set_visual_parameters']
        };
    }

    /**
     * Change geometry
     */
    changeGeometry(args) {
        let geometryIndex = args.geometry_index;

        // Convert from base_type + core_type if provided
        if (args.base_type !== undefined) {
            const baseIndex = BASE_GEOMETRIES.findIndex(g => g.name === args.base_type);
            if (baseIndex === -1) {
                return {
                    error: {
                        type: 'ValidationError',
                        code: 'INVALID_BASE_TYPE',
                        message: `Unknown base type: ${args.base_type}`,
                        valid_options: BASE_GEOMETRIES.map(g => g.name),
                        suggestion: 'Use one of the valid base geometry types'
                    }
                };
            }

            const coreIndex = CORE_TYPES.indexOf(args.core_type || 'base');
            geometryIndex = coreIndex * 8 + baseIndex;
        }

        if (this.engine && geometryIndex !== undefined) {
            this.engine.setParameter('geometry', geometryIndex);
            telemetry.recordEvent(EventType.GEOMETRY_CHANGE, { geometry: geometryIndex });
        }

        const baseIndex = geometryIndex % 8;
        const coreIndex = Math.floor(geometryIndex / 8);

        return {
            geometry: {
                index: geometryIndex,
                base_type: BASE_GEOMETRIES[baseIndex].name,
                core_type: CORE_TYPES[coreIndex]
            },
            suggested_next_actions: ['set_rotation', 'set_visual_parameters']
        };
    }

    /**
     * Get current state
     */
    getState() {
        let params = {};
        let system = 'quantum';

        if (this.engine) {
            params = this.engine.getAllParameters();
            system = this.engine.getCurrentSystem();
        }

        const geometryIndex = params.geometry || 0;
        const baseIndex = geometryIndex % 8;
        const coreIndex = Math.floor(geometryIndex / 8);

        return {
            scene_id: this.sceneId,
            system,
            geometry: {
                index: geometryIndex,
                base_type: BASE_GEOMETRIES[baseIndex].name,
                core_type: CORE_TYPES[coreIndex]
            },
            rotation_state: {
                XY: params.rot4dXY || 0,
                XZ: params.rot4dXZ || 0,
                YZ: params.rot4dYZ || 0,
                XW: params.rot4dXW || 0,
                YW: params.rot4dYW || 0,
                ZW: params.rot4dZW || 0
            },
            visual: {
                dimension: params.dimension,
                gridDensity: params.gridDensity,
                morphFactor: params.morphFactor,
                chaos: params.chaos,
                speed: params.speed,
                hue: params.hue,
                intensity: params.intensity,
                saturation: params.saturation
            },
            suggested_next_actions: ['set_rotation', 'set_visual_parameters', 'save_to_gallery']
        };
    }

    /**
     * Randomize parameters
     */
    randomizeParameters(args) {
        if (this.engine) {
            this.engine.randomizeAll();
            telemetry.recordEvent(EventType.PARAMETER_RANDOMIZE, {});
        }

        return {
            ...this.getState(),
            randomized: true
        };
    }

    /**
     * Reset parameters
     */
    resetParameters() {
        if (this.engine) {
            this.engine.resetAll();
            telemetry.recordEvent(EventType.PARAMETER_RESET, {});
        }

        return {
            ...this.getState(),
            reset: true
        };
    }

    /**
     * Render preview frame
     */
    async renderPreview(args) {
        const format = args.format || 'png';
        const quality = args.quality ?? 0.92;
        const includeState = args.include_state !== false;
        let dataUrl = null;
        let available = false;
        let method = 'unavailable';

        telemetry.recordEvent(EventType.RENDER_FRAME_START, { format });

        if (this.engine && typeof this.engine.captureFrame === 'function') {
            dataUrl = this.engine.captureFrame(format, quality);
            available = true;
            method = 'engine.captureFrame';
        }

        telemetry.recordEvent(EventType.RENDER_FRAME_END, { format, available });

        return {
            preview: {
                available,
                format,
                quality,
                method,
                data_url: dataUrl,
                note: available ? 'Preview captured.' : 'Preview capture not available; engine captureFrame missing.'
            },
            state_snapshot: includeState ? this.getState() : null,
            suggested_next_actions: ['set_rotation', 'set_visual_parameters', 'save_to_gallery']
        };
    }

    /**
     * Save to gallery
     */
    saveToGallery(args) {
        const { slot, name } = args;

        telemetry.recordEvent(EventType.GALLERY_SAVE, { slot });

        return {
            slot,
            name: name || `Variation ${slot}`,
            saved_at: new Date().toISOString(),
            suggested_next_actions: ['load_from_gallery', 'randomize_parameters']
        };
    }

    /**
     * Load from gallery
     */
    loadFromGallery(args) {
        const { slot } = args;

        if (this.engine) {
            // Apply variation
            const params = this.engine.parameters?.generateVariationParameters?.(slot) || {};
            this.engine.setParameters(params);
        }

        telemetry.recordEvent(EventType.GALLERY_LOAD, { slot });

        return {
            slot,
            loaded_at: new Date().toISOString(),
            ...this.getState()
        };
    }

    /**
     * Search geometries
     */
    searchGeometries(args) {
        const { core_type = 'all' } = args;

        const geometries = [];
        for (let i = 0; i < 24; i++) {
            const baseIndex = i % 8;
            const coreIndex = Math.floor(i / 8);
            const coreTypeName = CORE_TYPES[coreIndex];

            if (core_type !== 'all' && coreTypeName !== core_type) continue;

            geometries.push({
                index: i,
                base_type: BASE_GEOMETRIES[baseIndex].name,
                core_type: coreTypeName,
                vertex_count: BASE_GEOMETRIES[baseIndex].vertices,
                edge_count: BASE_GEOMETRIES[baseIndex].edges,
                description: this.getGeometryDescription(baseIndex, coreIndex)
            });
        }

        return {
            count: geometries.length,
            geometries,
            encoding_formula: 'geometry_index = core_index * 8 + base_index'
        };
    }

    /**
     * Get geometry description
     */
    getGeometryDescription(baseIndex, coreIndex) {
        const baseDesc = {
            0: 'Simple 4-vertex lattice, fundamental polytope',
            1: '4D cube projection with 16 vertices and 32 edges',
            2: 'Radial harmonic sphere with smooth surfaces',
            3: 'Toroidal field with continuous surface',
            4: 'Non-orientable surface with topological twist',
            5: 'Recursive subdivision with self-similar structure',
            6: 'Sinusoidal interference patterns',
            7: 'Octahedral crystal structure'
        };

        const coreDesc = {
            0: 'Pure base geometry',
            1: 'Wrapped in 4D hypersphere using warpHypersphereCore()',
            2: 'Wrapped in 4D hypertetrahedron using warpHypertetraCore()'
        };

        return `${baseDesc[baseIndex]}. ${coreDesc[coreIndex]}`;
    }

    /**
     * Get parameter schema
     */
    getParameterSchema() {
        return {
            schema: schemaRegistry.getSchema('parameters'),
            usage: 'Validate parameters using this schema before setting them',
            suggested_next_actions: ['set_rotation', 'set_visual_parameters']
        };
    }

    /**
     * Get available tools (for progressive disclosure)
     */
    listTools(includeSchemas = false) {
        if (includeSchemas) {
            return getToolList();
        }

        return Object.keys(toolDefinitions).map(name => ({
            name,
            description: toolDefinitions[name].description
        }));
    }
}

// Singleton instance
export const mcpServer = new MCPServer();
export default mcpServer;
