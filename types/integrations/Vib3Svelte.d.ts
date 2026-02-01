/**
 * Vib3Svelte TypeScript Definitions
 * VIB3+ SDK - Svelte Component & Store Generator
 */

import { SystemName } from '../core/VIB3Engine';

/** Props for the generated Vib3Canvas Svelte component */
export interface Vib3SvelteProps {
    system?: SystemName;
    geometry?: number;
    hue?: number;
    saturation?: number;
    intensity?: number;
    speed?: number;
    gridDensity?: number;
    morphFactor?: number;
    chaos?: number;
    dimension?: number;
    rot4dXY?: number;
    rot4dXZ?: number;
    rot4dYZ?: number;
    rot4dXW?: number;
    rot4dYW?: number;
    rot4dZW?: number;
    preferWebGPU?: boolean;
    debug?: boolean;
    width?: number | string;
    height?: number | string;
}

/** Svelte store interface */
export interface Vib3StoreValue {
    engine: any;
    parameters: Record<string, number>;
    system: SystemName;
}

/** Svelte store with helper methods */
export interface Vib3Store {
    subscribe: (callback: (value: Vib3StoreValue) => void) => () => void;
    setParameter: (name: string, value: number) => void;
    switchSystem: (system: SystemName) => void;
    getParameter: (name: string) => number;
    getAllParameters: () => Record<string, number>;
}

/**
 * Static wrapper that generates Svelte component and store source code.
 */
export declare class Vib3SvelteWrapper {
    /** Get the Svelte component source code */
    static getComponent(): string;

    /** Get the writable store source code */
    static getStore(): string;

    /** Generate a package.json for the Svelte wrapper package */
    static generatePackageJSON(): Record<string, any>;

    /** Generate the complete NPM package structure */
    static generatePackage(): Record<string, any>;
}
