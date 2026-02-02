/**
 * TouchDesignerExport TypeScript Definitions
 * VIB3+ SDK - GLSL TOP Export for TouchDesigner
 */

import { SystemName } from '../core/VIB3Engine';

/** Options for GLSL TOP export */
export interface GLSLTOPOptions {
    includeComments?: boolean;
    includeAudio?: boolean;
    useCustomParams?: boolean;
}

/** TD uniform mapping entry */
export interface TDUniformMapping {
    [paramName: string]: {
        tdName: string;
        type: string;
        range: [number, number];
    };
}

/**
 * Static exporter for TouchDesigner GLSL TOP shaders and .tox files.
 */
export declare class Vib3TouchDesignerExport {
    /** Export GLSL TOP shader code for a system */
    static exportGLSLTOP(system?: SystemName, options?: GLSLTOPOptions): string;

    /** Export a complete .tox file representation */
    static exportTOX(system?: SystemName): string;

    /** Get the mapping from VIB3 parameters to TD Custom Parameters */
    static getTDUniformMapping(): TDUniformMapping;
}
