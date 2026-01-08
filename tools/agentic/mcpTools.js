import { createRotationMatrix4D } from '../../src/math/rotations.js';
import { buildTelemetryError } from '../telemetry/telemetryEvents.js';

const VALID_PLANES = ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'];

export const MCP_TOOL_DEFINITIONS = [
    {
        name: 'create_scene',
        description: 'Create a 4D visualization scene with geometry and projection.',
        parameters: {
            type: 'object',
            required: ['geometryType', 'projection'],
            properties: {
                geometryType: { type: 'string' },
                projection: { type: 'string', enum: ['stereographic', 'perspective', 'orthographic'] },
                metadata: { type: 'object' },
            },
        },
    },
    {
        name: 'apply_rotation',
        description: 'Apply a 4D rotation to a scene using a plane + angle.',
        parameters: {
            type: 'object',
            required: ['sceneId', 'plane', 'angle'],
            properties: {
                sceneId: { type: 'string' },
                plane: { type: 'string', enum: VALID_PLANES },
                angle: { type: 'number' },
            },
        },
    },
    {
        name: 'render_preview',
        description: 'Render a preview frame for a scene.',
        parameters: {
            type: 'object',
            required: ['sceneId'],
            properties: {
                sceneId: { type: 'string' },
                width: { type: 'number' },
                height: { type: 'number' },
            },
        },
    },
];

export function invokeTool(toolName, payload) {
    switch (toolName) {
        case 'create_scene':
            return {
                sceneId: payload.sceneId || `scene-${Date.now()}`,
                geometryType: payload.geometryType,
                projection: payload.projection,
                metadata: payload.metadata || {},
                suggestedNextActions: ['apply_rotation', 'render_preview'],
            };
        case 'apply_rotation':
            if (!VALID_PLANES.includes(payload.plane)) {
                return buildTelemetryError({
                    code: 'INVALID_ROTATION_PLANE',
                    message: `Rotation plane '${payload.plane}' is not valid`,
                    suggestion: 'Use one of the six rotation planes.',
                    validOptions: VALID_PLANES,
                });
            }
            return {
                sceneId: payload.sceneId,
                plane: payload.plane,
                angle: payload.angle,
                rotationMatrix: createRotationMatrix4D(payload.plane, payload.angle),
            };
        case 'render_preview':
            return {
                sceneId: payload.sceneId,
                width: payload.width || 320,
                height: payload.height || 180,
                previewHint: 'Use TelemetryDirector.generatePreviewSprites for real rendering.',
            };
        default:
            return buildTelemetryError({
                code: 'UNKNOWN_TOOL',
                message: `Tool '${toolName}' is not registered.`,
                suggestion: 'Use one of the MCP_TOOL_DEFINITIONS entries.',
                validOptions: MCP_TOOL_DEFINITIONS.map((tool) => tool.name),
            });
    }
}
