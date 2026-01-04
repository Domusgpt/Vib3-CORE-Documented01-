import Ajv from 'ajv';
import { telemetrySchema } from './schema.js';
import { defaultProviders } from './providers/referenceTelemetryProviders.js';

function coerceNumber(value) {
  if (value === undefined || value === null) return value;
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

function normalizeEvent(eventName, payload, sessionId) {
  const now = new Date().toISOString();
  const normalized = {
    event: eventName,
    timestamp: payload?.timestamp || now,
    sessionId: payload?.sessionId || sessionId,
    context: payload?.context || {},
    metrics: payload?.metrics || {},
    meta: { userAgent: payload?.meta?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'node'), ...payload?.meta }
  };

  if (payload?.error) {
    normalized.error = {
      message: payload.error.message,
      stack: payload.error.stack,
      name: payload.error.name
    };
  }

  // Coerce numeric metrics and controls where possible
  if (normalized.context?.controls) {
    normalized.context.controls = Object.fromEntries(
      Object.entries(normalized.context.controls).map(([key, value]) => [key, coerceNumber(value)])
    );
  }
  if (normalized.metrics) {
    normalized.metrics = Object.fromEntries(
      Object.entries(normalized.metrics).map(([key, value]) => [key, coerceNumber(value)])
    );
  }

  return normalized;
}

export function createTelemetryFacade(options = {}) {
  const ajv = new Ajv({ allErrors: true, useDefaults: true, ...options.ajv });
  const validate = ajv.compile(telemetrySchema);
  const sessionId = options.sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`);
  const providers = options.providers && options.providers.length > 0 ? options.providers : defaultProviders({ filePath: options.filePath });

  async function emit(eventName, payload = {}) {
    const event = normalizeEvent(eventName, payload, sessionId);
    const valid = validate(event);

    if (!valid) {
      const error = new Error('Telemetry event failed schema validation');
      error.details = validate.errors;
      if (options.onValidationError) options.onValidationError(error);
      console.warn('⚠️ Telemetry validation failed', validate.errors);
      return { ok: false, errors: validate.errors };
    }

    for (const provider of providers) {
      try {
        await provider.send(event);
      } catch (error) {
        console.warn(`⚠️ Telemetry provider ${provider.id} failed:`, error.message);
      }
    }

    return { ok: true, event };
  }

  return {
    emit,
    getSessionId: () => sessionId,
    schema: telemetrySchema,
    providers
  };
}

export default createTelemetryFacade;
