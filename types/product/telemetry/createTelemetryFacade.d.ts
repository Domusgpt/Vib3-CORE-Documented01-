import { ValidateFunction } from 'ajv';
import { telemetrySchema } from '../../../src/product/telemetry/schema.js';
import { defaultProviders } from '../../../src/product/telemetry/providers/referenceTelemetryProviders.js';

export interface TelemetryContext {
  system?: string;
  geometry?: string | number;
  variation?: string | number;
  controls?: Record<string, number | boolean | string | null>;
  reactivity?: Record<string, boolean | string>;
  automation?: {
    state?: string;
    targetState?: string;
    rule?: string;
    sequence?: string;
    easing?: string;
    durationMs?: number;
    progress?: number;
    loop?: boolean;
    modulator?: string;
    control?: string;
    waveform?: string;
    periodMs?: number;
    amplitude?: number;
    center?: number;
    clampMin?: number;
    clampMax?: number;
    [key: string]: unknown;
  };
  source?: string;
  route?: string;
  [key: string]: unknown;
}

export interface TelemetryMetrics {
  frameTimeMs?: number;
  exportDurationMs?: number;
  samples?: number;
  [key: string]: number | string | boolean | null | undefined;
}

export interface TelemetryMeta {
  version?: string;
  userAgent?: string;
  cli?: boolean;
  [key: string]: string | number | boolean | null | undefined;
}

export interface TelemetryPayload {
  event: string;
  timestamp: string;
  sessionId: string;
  context?: TelemetryContext;
  metrics?: TelemetryMetrics;
  meta?: TelemetryMeta;
  error?: { message?: string; stack?: string; name?: string; [key: string]: unknown };
}

export interface TelemetryProvider {
  id: string;
  send(event: TelemetryPayload): Promise<void>;
}

export interface TelemetryFacadeOptions {
  providers?: TelemetryProvider[];
  sessionId?: string;
  filePath?: string;
  ajv?: Record<string, unknown>;
  onValidationError?: (error: Error) => void;
}

export interface TelemetryFacade {
  emit(event: string, payload?: Partial<TelemetryPayload>): Promise<{ ok: boolean; event?: TelemetryPayload; errors?: unknown }>;
  getSessionId(): string;
  schema: typeof telemetrySchema;
  providers: ReturnType<typeof defaultProviders> | TelemetryProvider[];
}

export function createTelemetryFacade(options?: TelemetryFacadeOptions): TelemetryFacade;
export default createTelemetryFacade;
