/**
 * CommandBuffer TypeScript Definitions
 * VIB3+ SDK - Command Batching and Sorting
 */

import { RenderCommand, RenderBackend, CommandType } from './RenderCommand';

/** Sort mode for command buffer */
export const enum SortMode {
    /** No sorting - commands execute in submission order */
    NONE = 'none',
    /** Sort by state to minimize GPU state changes */
    STATE = 'state',
    /** Sort front-to-back for early-z optimization */
    FRONT_TO_BACK = 'front_to_back',
    /** Sort back-to-front for correct transparency */
    BACK_TO_FRONT = 'back_to_front',
    /** Use custom comparator function */
    CUSTOM = 'custom'
}

/** Command buffer options */
export interface CommandBufferOptions {
    sortMode?: SortMode;
    label?: string;
}

/** Command buffer statistics */
export interface CommandBufferStats {
    commandCount: number;
    drawCalls: number;
    triangles: number;
    stateChanges: number;
}

/** Execution profiling result */
export interface ExecutionProfile extends CommandBufferStats {
    executionTime: number;
}

/** Custom command comparator */
export type CommandComparator = (a: RenderCommand, b: RenderCommand) => number;

/**
 * Command buffer for batching and sorting render commands
 */
export declare class CommandBuffer {
    sortMode: SortMode;
    customComparator: CommandComparator | null;
    label: string;

    constructor(options?: CommandBufferOptions);

    /**
     * Get number of commands in buffer
     */
    readonly length: number;

    /**
     * Check if buffer is empty
     */
    readonly isEmpty: boolean;

    /**
     * Get copy of commands array
     */
    readonly commands: RenderCommand[];

    /**
     * Get buffer statistics
     */
    readonly stats: CommandBufferStats;

    /**
     * Begin recording commands
     */
    begin(): void;

    /**
     * End recording commands
     */
    end(): void;

    /**
     * Add a command to the buffer
     */
    add(command: RenderCommand): void;

    /**
     * Add multiple commands to the buffer
     */
    addAll(commands: RenderCommand[]): void;

    /**
     * Clear all commands
     */
    clear(): void;

    /**
     * Sort commands according to sort mode
     */
    sort(): void;

    /**
     * Execute all commands on a backend
     */
    execute(backend: RenderBackend): void;

    /**
     * Execute with profiling and return statistics
     */
    executeWithProfiling(backend: RenderBackend): ExecutionProfile;

    /**
     * Filter commands by type
     */
    filterByType(type: CommandType): RenderCommand[];

    /**
     * Get only draw commands
     */
    getDrawCommands(): RenderCommand[];

    /**
     * Merge another buffer into this one
     */
    merge(other: CommandBuffer): void;

    /**
     * Clone this buffer
     */
    clone(): CommandBuffer;
}

/**
 * Pool for reusing command buffers
 */
export declare class CommandBufferPool {
    constructor(initialSize?: number);

    /**
     * Acquire a buffer from the pool
     */
    acquire(options?: CommandBufferOptions): CommandBuffer;

    /**
     * Release a buffer back to the pool
     */
    release(buffer: CommandBuffer): void;

    /**
     * Release all buffers back to the pool
     */
    releaseAll(): void;

    /**
     * Get pool statistics
     */
    getStats(): {
        available: number;
        inUse: number;
        total: number;
    };
}

/**
 * Global command buffer pool instance
 */
export declare const commandBufferPool: CommandBufferPool;
