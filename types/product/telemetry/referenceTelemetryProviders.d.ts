import { TelemetryPayload, TelemetryProvider } from './createTelemetryFacade.js';

export interface ConsoleProviderOptions { summary?: boolean }
export interface JsonlFileProviderOptions { filePath?: string }
export interface HttpProviderOptions { endpoint?: string; headers?: Record<string, string> }

export function createConsoleProvider(options?: ConsoleProviderOptions): TelemetryProvider;
export function createJsonlFileProvider(options?: JsonlFileProviderOptions): TelemetryProvider;
export function createHttpProvider(options?: HttpProviderOptions): TelemetryProvider;
export const defaultProviders: (options?: { filePath?: string }) => TelemetryProvider[];
