/**
 * OffscreenWorker TypeScript Definitions
 * VIB3+ SDK - OffscreenCanvas Worker Rendering
 */

import { SystemName } from '../core/VIB3Engine';

/** Worker message types (sent to worker) */
export type WorkerMessageType = 'init' | 'params' | 'switchSystem' | 'resize';

/** Init message data */
export interface WorkerInitMessage {
    type: 'init';
    canvas: OffscreenCanvas;
    system: SystemName;
    width: number;
    height: number;
    params: Record<string, number>;
    pixelRatio: number;
    sharedBuffer?: SharedArrayBuffer;
}

/** Parameter update message */
export interface WorkerParamsMessage {
    type: 'params';
    params: Record<string, number>;
}

/** System switch message */
export interface WorkerSwitchMessage {
    type: 'switchSystem';
    system: SystemName;
}

/** Resize message */
export interface WorkerResizeMessage {
    type: 'resize';
    width: number;
    height: number;
}

/** Any worker message */
export type WorkerMessage =
    | WorkerInitMessage
    | WorkerParamsMessage
    | WorkerSwitchMessage
    | WorkerResizeMessage;

/**
 * Manages OffscreenCanvas worker rendering for background GPU work.
 * Uses transferControlToOffscreen() and optional SharedArrayBuffer for parameters.
 */
export declare class OffscreenCanvasManager {
    constructor();

    /** Create a worker renderer for a canvas element */
    createWorkerRenderer(canvasId: string, system?: SystemName): Promise<Worker>;

    /** Update all parameters on all workers */
    updateParameters(params: Record<string, number>): void;

    /** Set a single parameter on all workers */
    setParameter(name: string, value: number): void;

    /** Switch system on all workers */
    switchSystem(system: SystemName): void;

    /** Resize a specific worker's canvas */
    resizeCanvas(canvasId: string, width: number, height: number): void;

    /** Terminate a specific worker */
    terminateWorker(canvasId: string): void;

    /** Get the worker blob URL (for manual worker creation) */
    getWorkerBlobURL(): string;

    /** Get the worker script source */
    getWorkerScript(): string;

    /** Destroy all workers */
    destroy(): void;
}
