/**
 * VIB3+ Schema Registry
 * Centralized schema loading with AJV validation
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Import schemas
import parametersSchema from './parameters.schema.json' assert { type: 'json' };
import toolResponseSchema from './tool-response.schema.json' assert { type: 'json' };
import errorSchema from './error.schema.json' assert { type: 'json' };

class SchemaRegistry {
    constructor() {
        this.ajv = new Ajv({
            allErrors: true,
            verbose: true,
            strict: false
        });

        // Add format validators
        try {
            addFormats(this.ajv);
        } catch (e) {
            // addFormats may not be available in all environments
            console.warn('ajv-formats not available, some format validations disabled');
        }

        this.dynamicValidators = new WeakMap();

        // Register schemas
        this.schemas = {
            parameters: parametersSchema,
            toolResponse: toolResponseSchema,
            error: errorSchema
        };

        // Compile validators
        this.validators = {};
        for (const [name, schema] of Object.entries(this.schemas)) {
            this.validators[name] = this.ajv.compile(schema);
        }
    }

    /**
     * Validate data against a schema
     * @param {string} schemaName - Name of the schema
     * @param {object} data - Data to validate
     * @returns {{ valid: boolean, errors: array|null }}
     */
    validate(schemaName, data) {
        const validator = this.validators[schemaName];
        if (!validator) {
            return {
                valid: false,
                errors: [{ message: `Unknown schema: ${schemaName}` }]
            };
        }

        const valid = validator(data);
        return {
            valid,
            errors: valid ? null : validator.errors
        };
    }

    /**
     * Validate data against a provided schema object
     * @param {object} schema
     * @param {object} data
     * @returns {{ valid: boolean, errors: array|null }}
     */
    validateSchema(schema, data) {
        if (!schema) {
            return {
                valid: false,
                errors: [{ message: 'No schema provided for validation.' }]
            };
        }

        let validator = this.dynamicValidators.get(schema);
        if (!validator) {
            validator = this.ajv.compile(schema);
            this.dynamicValidators.set(schema, validator);
        }

        const valid = validator(data);
        return {
            valid,
            errors: valid ? null : validator.errors
        };
    }

    /**
     * Validate parameters and return normalized structure
     * @param {object} params - Raw parameters
     * @returns {{ valid: boolean, normalized: object|null, errors: array|null }}
     */
    validateParameters(params) {
        // Normalize flat parameter format to nested structure
        const normalized = this.normalizeParameters(params);
        const result = this.validate('parameters', normalized);

        return {
            ...result,
            normalized: result.valid ? normalized : null
        };
    }

    /**
     * Normalize flat parameters to nested schema structure
     */
    normalizeParameters(params) {
        return {
            system: params.system || 'quantum',
            variation: params.variation ?? 0,
            geometry: params.geometry ?? 0,
            rotation: {
                XY: params.rot4dXY ?? params.rotation?.XY ?? 0,
                XZ: params.rot4dXZ ?? params.rotation?.XZ ?? 0,
                YZ: params.rot4dYZ ?? params.rotation?.YZ ?? 0,
                XW: params.rot4dXW ?? params.rotation?.XW ?? 0,
                YW: params.rot4dYW ?? params.rotation?.YW ?? 0,
                ZW: params.rot4dZW ?? params.rotation?.ZW ?? 0
            },
            visual: {
                dimension: params.dimension ?? params.visual?.dimension ?? 3.5,
                gridDensity: params.gridDensity ?? params.visual?.gridDensity ?? 15,
                morphFactor: params.morphFactor ?? params.visual?.morphFactor ?? 1.0,
                chaos: params.chaos ?? params.visual?.chaos ?? 0.2,
                speed: params.speed ?? params.visual?.speed ?? 1.0,
                hue: params.hue ?? params.visual?.hue ?? 200,
                intensity: params.intensity ?? params.visual?.intensity ?? 0.5,
                saturation: params.saturation ?? params.visual?.saturation ?? 0.8
            }
        };
    }

    /**
     * Flatten normalized parameters back to engine format
     */
    flattenParameters(normalized) {
        return {
            system: normalized.system,
            variation: normalized.variation,
            geometry: normalized.geometry,
            rot4dXY: normalized.rotation.XY,
            rot4dXZ: normalized.rotation.XZ,
            rot4dYZ: normalized.rotation.YZ,
            rot4dXW: normalized.rotation.XW,
            rot4dYW: normalized.rotation.YW,
            rot4dZW: normalized.rotation.ZW,
            dimension: normalized.visual.dimension,
            gridDensity: normalized.visual.gridDensity,
            morphFactor: normalized.visual.morphFactor,
            chaos: normalized.visual.chaos,
            speed: normalized.visual.speed,
            hue: normalized.visual.hue,
            intensity: normalized.visual.intensity,
            saturation: normalized.visual.saturation
        };
    }

    /**
     * Create an actionable error response
     */
    createError(type, code, message, details = {}) {
        return {
            error: {
                type,
                code,
                message,
                ...details,
                retry_possible: details.retry_possible ?? false
            }
        };
    }

    /**
     * Create a tool response
     */
    createToolResponse(operation, data) {
        return {
            success: true,
            operation,
            timestamp: new Date().toISOString(),
            ...data
        };
    }

    /**
     * Get schema for documentation/tooling
     */
    getSchema(name) {
        return this.schemas[name];
    }

    /**
     * Get all schemas for MCP tool registration
     */
    getAllSchemas() {
        return { ...this.schemas };
    }
}

// Singleton instance
export const schemaRegistry = new SchemaRegistry();

// Named exports
export { parametersSchema, toolResponseSchema, errorSchema };
export default schemaRegistry;
