import { telemetryControls } from '../../src/product/telemetry/schema.js';

const sessionKey = 'vib3-telemetry-session';
const getSessionId = () => {
  const stored = localStorage.getItem(sessionKey);
  if (stored) return stored;
  const newId = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
  localStorage.setItem(sessionKey, newId);
  return newId;
};

const baseSchemaKeys = ['event', 'timestamp', 'sessionId'];

function buildEvent(event, payload = {}) {
  const timestamp = new Date().toISOString();
  return {
    event,
    timestamp,
    sessionId: payload.sessionId || getSessionId(),
    context: payload.context || {},
    metrics: payload.metrics || {},
    meta: {
      version: payload.meta?.version || 'browser',
      userAgent: navigator.userAgent,
      ...payload.meta
    },
    error: payload.error
  };
}

function validateEvent(event) {
  return baseSchemaKeys.every((key) => Boolean(event[key]));
}

function summarize(event) {
  const parts = [event.event, event.context?.system, event.context?.geometry, event.context?.variation];
  return parts.filter(Boolean).join(' | ');
}

class BrowserTelemetry {
  constructor() {
    this.queue = [];
    this.listeners = [];
    this.sessionId = getSessionId();
  }

  emit(eventName, payload = {}) {
    const event = buildEvent(eventName, payload);
    if (!validateEvent(event)) {
      console.warn('⚠️ Telemetry event missing required fields', event);
      return { ok: false };
    }

    // Coerce control values
    if (event.context?.controls) {
      event.context.controls = Object.fromEntries(
        Object.entries(event.context.controls).map(([k, v]) => [k, typeof v === 'string' && !Number.isNaN(Number(v)) ? Number(v) : v])
      );
    }

    this.queue.push(event);
    this.listeners.forEach((fn) => fn(event));
    console.log(`🛰️ ${summarize(event)}`);
    return { ok: true, event };
  }

  ingest(event) {
    if (!event?.event) return { ok: false };
    const normalized = buildEvent(event.event, event);
    this.queue.push(normalized);
    this.listeners.forEach((fn) => fn(normalized));
    console.log(`🛰️ [ingest] ${summarize(normalized)}`);
    return { ok: true, event: normalized };
  }

  onEvent(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }
}

const telemetry = new BrowserTelemetry();
window.telemetry = telemetry;
export default telemetry;
