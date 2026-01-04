export const telemetrySchema = {
  $id: 'https://vib3.plus/telemetry/schema.json',
  type: 'object',
  required: ['event', 'timestamp', 'sessionId'],
  additionalProperties: false,
  properties: {
    event: { type: 'string', minLength: 1 },
    timestamp: { type: 'string', format: 'date-time' },
    sessionId: { type: 'string', minLength: 4 },
    context: {
      type: 'object',
      additionalProperties: true,
      properties: {
        system: { type: 'string' },
        geometry: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        variation: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        controls: {
          type: 'object',
          additionalProperties: { type: ['number', 'boolean', 'string', 'null'] }
        },
        reactivity: { type: 'object', additionalProperties: { type: ['boolean', 'string'] } },
        automation: {
          type: 'object',
          additionalProperties: true,
          properties: {
            state: { type: 'string' },
            targetState: { type: 'string' },
            rule: { type: 'string' },
            sequence: { type: 'string' },
            easing: { type: 'string' },
            durationMs: { type: 'number' },
            progress: { type: 'number' },
            loop: { type: 'boolean' },
            modulator: { type: 'string' },
            control: { type: 'string' },
            waveform: { type: 'string' },
            periodMs: { type: 'number' },
            amplitude: { type: 'number' },
            center: { type: 'number' },
            clampMin: { type: 'number' },
            clampMax: { type: 'number' }
          }
        },
        source: { type: 'string' },
        route: { type: 'string' }
      }
    },
    metrics: {
      type: 'object',
      additionalProperties: { type: ['number', 'string', 'boolean', 'null'] },
      properties: {
        frameTimeMs: { type: 'number' },
        exportDurationMs: { type: 'number' },
        samples: { type: 'number' }
      }
    },
    meta: {
      type: 'object',
      additionalProperties: { type: ['string', 'number', 'boolean', 'null'] },
      properties: {
        version: { type: 'string' },
        userAgent: { type: 'string' },
        cli: { type: 'boolean' }
      }
    },
    error: {
      type: 'object',
      additionalProperties: true,
      properties: {
        message: { type: 'string' },
        stack: { type: 'string' },
        name: { type: 'string' }
      }
    }
  }
};

export const telemetryControls = [
  'rot4dXY', 'rot4dXZ', 'rot4dYZ', 'rot4dXW', 'rot4dYW', 'rot4dZW',
  'gridDensity', 'morphFactor', 'chaos', 'speed', 'hue', 'saturation', 'intensity',
  'audioReactive', 'bgAudioGain',
  // Reactivity grid toggles
  'facetedMouse', 'facetedClick', 'facetedScroll',
  'quantumMouse', 'quantumClick', 'quantumScroll',
  'holographicMouse', 'holographicClick', 'holographicScroll',
  // Audio sensitivity and modes
  'lowColor', 'lowGeometry', 'lowMovement',
  'mediumColor', 'mediumGeometry', 'mediumMovement',
  'highColor', 'highGeometry', 'highMovement',
  // Global interaction flags
  'interactivityEnabled', 'audioEnabled'
];
