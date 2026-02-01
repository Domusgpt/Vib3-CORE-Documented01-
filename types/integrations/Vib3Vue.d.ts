/**
 * Vib3Vue TypeScript Definitions
 * VIB3+ SDK - Vue 3 Component & Composable Generator
 */

import { SystemName } from '../core/VIB3Engine';

/** Props for the generated Vib3Canvas Vue component */
export interface Vib3VueProps {
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

/** Return type of the generated useVib3() composable */
export interface UseVib3ComposableReturn {
    engine: any;
    parameters: Record<string, number>;
    setParameter: (name: string, value: number) => void;
    switchSystem: (system: SystemName) => void;
}

/**
 * Static wrapper that generates Vue 3 component and composable source code.
 */
export declare class Vib3VueWrapper {
    /** Get the Vue 3 SFC source code */
    static getComponent(): string;

    /** Get the useVib3() composable source code */
    static getComposable(): string;

    /** Generate a package.json for the Vue wrapper package */
    static generatePackageJSON(): Record<string, any>;

    /** Generate the complete NPM package structure */
    static generatePackage(): Record<string, any>;
}
