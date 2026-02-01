/**
 * Vib3React TypeScript Definitions
 * VIB3+ SDK - React Component & Hook Generator
 */

import { SystemName } from '../core/VIB3Engine';

/** Props for the generated <Vib3Canvas> React component */
export interface Vib3CanvasProps {
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
    width?: number | string;
    height?: number | string;
    className?: string;
    style?: Record<string, any>;
    onReady?: (engine: any) => void;
    onError?: (error: Error) => void;
    engineRef?: { current: any };
}

/** Return type of the generated useVib3() hook */
export interface UseVib3Return {
    engine: any;
    parameters: Record<string, number>;
    setParameter: (name: string, value: number) => void;
    switchSystem: (system: SystemName) => void;
}

/** Package.json structure for the generated package */
export interface GeneratedPackageJSON {
    name: string;
    version: string;
    main: string;
    peerDependencies: Record<string, string>;
    [key: string]: any;
}

/** Generated package structure */
export interface GeneratedPackage {
    'package.json': GeneratedPackageJSON;
    [filename: string]: string | GeneratedPackageJSON;
}

/**
 * Static wrapper that generates React component and hook source code.
 * Use the generated code in a React project with @vib3/sdk as a dependency.
 */
export declare class Vib3ReactWrapper {
    /** Get the React component JSX source code */
    static getComponent(): string;

    /** Get the useVib3() hook source code */
    static getHook(): string;

    /** Generate a package.json for the React wrapper package */
    static generatePackageJSON(): GeneratedPackageJSON;

    /** Generate the complete NPM package structure */
    static generatePackage(): GeneratedPackage;
}
