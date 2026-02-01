/**
 * ErrorReporter TypeScript Definitions
 * VIB3+ SDK - Opt-in Error Reporting
 */

/** Error report payload */
export interface ErrorReport {
    type: 'error' | 'unhandledrejection';
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
    timestamp: string;
    url: string;
    userAgent: string;
    sdkVersion: string;
}

/** ErrorReporter constructor options */
export interface ErrorReporterOptions {
    /** Endpoint URL for POST reports */
    endpoint?: string;
    /** Custom error handler callback */
    onError?: (report: ErrorReport) => void;
    /** Maximum reports to send per session (default: 50) */
    maxReports?: number;
    /** Include stack traces (default: true) */
    includeStack?: boolean;
}

/**
 * Opt-in error reporter that captures unhandled errors and promise rejections.
 * Disabled by default — must call enable() to activate.
 */
export declare class ErrorReporter {
    /** Whether the reporter is currently active */
    readonly isEnabled: boolean;

    constructor(options?: ErrorReporterOptions);

    /** Enable error capture */
    enable(): void;

    /** Disable error capture */
    disable(): void;

    /** Dispose and disable */
    dispose(): void;
}
