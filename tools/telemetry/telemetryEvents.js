import crypto from 'node:crypto';

function generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
}

export function createTelemetrySpan(name, attributes = {}) {
    return {
        id: generateSpanId(),
        name,
        startTime: new Date().toISOString(),
        attributes,
    };
}

export function endTelemetrySpan(span, status = 'ok') {
    return {
        ...span,
        endTime: new Date().toISOString(),
        status,
    };
}

export function buildTelemetryError({ code, message, suggestion, validOptions = [], meta = {} }) {
    return {
        error: {
            type: 'ValidationError',
            code,
            message,
            suggestion,
            validOptions,
            meta,
        },
    };
}
