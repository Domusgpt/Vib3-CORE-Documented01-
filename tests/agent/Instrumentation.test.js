/**
 * Instrumentation.test.js - Tests for auto-tracing utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    configureTelemetry,
    getTelemetry,
    traceFunction,
    traceObject,
    instrumentClass,
    withTiming,
    traceBatch,
    TraceContext
} from '../../src/agent/telemetry/Instrumentation.js';
import { SpanStatus } from '../../src/agent/telemetry/TelemetryService.js';

// Mock telemetry service
function createMockTelemetry() {
    const spans = [];
    const events = [];
    let spanIdCounter = 0;

    return {
        spans,
        events,
        startSpan: vi.fn((name, attributes) => {
            const span = {
                spanId: `span_${++spanIdCounter}`,
                name,
                attributes,
                events: []
            };
            spans.push(span);
            return span;
        }),
        endSpan: vi.fn((spanId, status, message) => {
            const span = spans.find(s => s.spanId === spanId);
            if (span) {
                span.status = status;
                span.statusMessage = message;
            }
        }),
        recordSpanError: vi.fn((spanId, error) => {
            const span = spans.find(s => s.spanId === spanId);
            if (span) {
                span.error = error;
            }
        }),
        addSpanEvent: vi.fn((spanId, name, attributes) => {
            const span = spans.find(s => s.spanId === spanId);
            if (span) {
                span.events.push({ name, attributes });
            }
        }),
        setSpanAttribute: vi.fn((spanId, key, value) => {
            const span = spans.find(s => s.spanId === spanId);
            if (span) {
                span.attributes = span.attributes || {};
                span.attributes[key] = value;
            }
        }),
        recordEvent: vi.fn((type, attrs) => {
            events.push({ type, ...attrs });
        }),
        getLastSpan: () => spans[spans.length - 1],
        reset: () => {
            spans.length = 0;
            events.length = 0;
            spanIdCounter = 0;
        }
    };
}

describe('traceFunction', () => {
    let telemetry;

    beforeEach(() => {
        telemetry = createMockTelemetry();
        configureTelemetry(telemetry);
    });

    afterEach(() => {
        configureTelemetry(null);
    });

    it('should trace sync function', () => {
        const fn = (a, b) => a + b;
        const traced = traceFunction(fn, 'add');

        const result = traced(2, 3);

        expect(result).toBe(5);
        expect(telemetry.startSpan).toHaveBeenCalledWith('add', expect.anything());
        expect(telemetry.endSpan).toHaveBeenCalledWith(expect.any(String), SpanStatus.OK);
    });

    it('should trace async function', async () => {
        const fn = async (value) => {
            await new Promise(r => setTimeout(r, 10));
            return value * 2;
        };
        const traced = traceFunction(fn, 'asyncDouble');

        const result = await traced(21);

        expect(result).toBe(42);
        expect(telemetry.endSpan).toHaveBeenCalledWith(expect.any(String), SpanStatus.OK);
    });

    it('should trace function that throws', () => {
        const fn = () => { throw new Error('Test error'); };
        const traced = traceFunction(fn, 'throwing');

        expect(() => traced()).toThrow('Test error');
        expect(telemetry.recordSpanError).toHaveBeenCalled();
        expect(telemetry.endSpan).toHaveBeenCalledWith(expect.any(String), SpanStatus.ERROR);
    });

    it('should trace async function that rejects', async () => {
        const fn = async () => { throw new Error('Async error'); };
        const traced = traceFunction(fn, 'rejecting');

        await expect(traced()).rejects.toThrow('Async error');
        expect(telemetry.recordSpanError).toHaveBeenCalled();
        expect(telemetry.endSpan).toHaveBeenCalledWith(expect.any(String), SpanStatus.ERROR);
    });

    it('should work without telemetry configured', () => {
        configureTelemetry(null);

        const fn = (x) => x * 2;
        const traced = traceFunction(fn, 'double');

        const result = traced(5);
        expect(result).toBe(10);
    });

    it('should preserve this context', () => {
        const obj = {
            value: 10,
            multiply(x) { return this.value * x; }
        };

        const traced = traceFunction(obj.multiply, 'multiply');
        const bound = traced.bind(obj);

        const result = bound(5);
        expect(result).toBe(50);
    });
});

describe('traceObject', () => {
    let telemetry;

    beforeEach(() => {
        telemetry = createMockTelemetry();
        configureTelemetry(telemetry);
    });

    afterEach(() => {
        configureTelemetry(null);
    });

    it('should trace object methods', () => {
        const obj = {
            add: (a, b) => a + b,
            multiply: (a, b) => a * b
        };

        const traced = traceObject(obj, 'Calculator');

        expect(traced.add(2, 3)).toBe(5);
        expect(traced.multiply(4, 5)).toBe(20);

        expect(telemetry.startSpan).toHaveBeenCalledTimes(2);
        expect(telemetry.startSpan).toHaveBeenCalledWith('Calculator.add', expect.anything());
        expect(telemetry.startSpan).toHaveBeenCalledWith('Calculator.multiply', expect.anything());
    });

    it('should not wrap non-function properties', () => {
        const obj = {
            value: 42,
            name: 'test',
            getValue: () => 42
        };

        const traced = traceObject(obj, 'Obj');

        expect(traced.value).toBe(42);
        expect(traced.name).toBe('test');
        expect(traced.getValue()).toBe(42);
    });
});

describe('instrumentClass', () => {
    let telemetry;

    beforeEach(() => {
        telemetry = createMockTelemetry();
        configureTelemetry(telemetry);
    });

    afterEach(() => {
        configureTelemetry(null);
    });

    it('should instrument class methods', () => {
        class Calculator {
            add(a, b) { return a + b; }
            multiply(a, b) { return a * b; }
        }

        instrumentClass(Calculator);

        const calc = new Calculator();
        expect(calc.add(2, 3)).toBe(5);
        expect(calc.multiply(4, 5)).toBe(20);

        expect(telemetry.startSpan).toHaveBeenCalledTimes(2);
    });

    it('should skip constructor', () => {
        class TestClass {
            constructor() {
                this.initialized = true;
            }
            method() { return 'result'; }
        }

        instrumentClass(TestClass);

        const instance = new TestClass();
        expect(instance.initialized).toBe(true);
        instance.method();

        // Only method should be traced, not constructor
        expect(telemetry.startSpan).toHaveBeenCalledTimes(1);
    });

    it('should respect exclude option', () => {
        class TestClass {
            methodA() { return 'A'; }
            methodB() { return 'B'; }
            methodC() { return 'C'; }
        }

        instrumentClass(TestClass, { exclude: ['constructor', 'methodB'] });

        const instance = new TestClass();
        instance.methodA();
        instance.methodB();
        instance.methodC();

        expect(telemetry.startSpan).toHaveBeenCalledTimes(2);
    });

    it('should respect include option', () => {
        class TestClass {
            methodA() { return 'A'; }
            methodB() { return 'B'; }
            methodC() { return 'C'; }
        }

        instrumentClass(TestClass, { include: ['methodA', 'methodC'] });

        const instance = new TestClass();
        instance.methodA();
        instance.methodB();
        instance.methodC();

        expect(telemetry.startSpan).toHaveBeenCalledTimes(2);
    });
});

describe('withTiming', () => {
    it('should measure sync function duration', () => {
        const durations = [];
        const fn = () => {
            let sum = 0;
            for (let i = 0; i < 1000; i++) sum += i;
            return sum;
        };

        const timed = withTiming(fn, (duration, error, result) => {
            durations.push({ duration, error, result });
        });

        const result = timed();

        expect(result).toBe(499500);
        expect(durations).toHaveLength(1);
        expect(durations[0].duration).toBeGreaterThan(0);
        expect(durations[0].error).toBeNull();
    });

    it('should measure async function duration', async () => {
        let measuredDuration = null;

        const fn = async () => {
            await new Promise(r => setTimeout(r, 50));
            return 'done';
        };

        const timed = withTiming(fn, (duration) => {
            measuredDuration = duration;
        });

        await timed();

        expect(measuredDuration).toBeGreaterThanOrEqual(50);
    });

    it('should capture errors', () => {
        let capturedError = null;

        const fn = () => { throw new Error('Test'); };
        const timed = withTiming(fn, (duration, error) => {
            capturedError = error;
        });

        expect(() => timed()).toThrow();
        expect(capturedError).toBeInstanceOf(Error);
    });
});

describe('traceBatch', () => {
    let telemetry;

    beforeEach(() => {
        telemetry = createMockTelemetry();
        configureTelemetry(telemetry);
    });

    afterEach(() => {
        configureTelemetry(null);
    });

    it('should trace batch operations', async () => {
        const results = [];

        const result = await traceBatch('batchOp', async (ctx) => {
            ctx.operation('op1', async () => results.push(1));
            ctx.operation('op2', async () => results.push(2));
            ctx.operation('op3', async () => results.push(3));
        });

        expect(result.completed).toBe(3);
        expect(result.failed).toBe(0);
        expect(results).toEqual([1, 2, 3]);
    });

    it('should track progress', async () => {
        await traceBatch('progressOp', async (ctx) => {
            ctx.progress(0, 3);
            ctx.operation('op1', async () => {});
            ctx.progress(1, 3);
            ctx.operation('op2', async () => {});
            ctx.progress(2, 3);
        });

        const span = telemetry.getLastSpan();
        expect(span.events.filter(e => e.name === 'progress')).toHaveLength(3);
    });

    it('should handle operation failures', async () => {
        const result = await traceBatch('failingBatch', async (ctx) => {
            ctx.operation('success', async () => {});
            ctx.operation('failure', async () => { throw new Error('Op failed'); });
            ctx.operation('skipped', async () => {});
        }, { continueOnError: true });

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(1);
    });
});

describe('TraceContext', () => {
    let telemetry;

    beforeEach(() => {
        telemetry = createMockTelemetry();
        configureTelemetry(telemetry);
    });

    afterEach(() => {
        configureTelemetry(null);
    });

    it('should manage span lifecycle', () => {
        const ctx = new TraceContext('testOp');

        ctx.enter();
        expect(telemetry.startSpan).toHaveBeenCalledWith('testOp', undefined);

        ctx.event('checkpoint', { step: 1 });
        expect(telemetry.addSpanEvent).toHaveBeenCalled();

        ctx.setAttribute('key', 'value');
        expect(telemetry.setSpanAttribute).toHaveBeenCalled();

        ctx.exit(SpanStatus.OK);
        expect(telemetry.endSpan).toHaveBeenCalledWith(expect.any(String), SpanStatus.OK, undefined);
    });

    it('should handle errors', () => {
        const ctx = new TraceContext('errorOp');
        ctx.enter();

        const error = new Error('Test error');
        ctx.error(error);

        expect(telemetry.recordSpanError).toHaveBeenCalled();
        expect(telemetry.endSpan).toHaveBeenCalledWith(
            expect.any(String),
            SpanStatus.ERROR,
            'Test error'
        );
    });

    it('should support method chaining', () => {
        const ctx = new TraceContext('chainOp');

        ctx.enter()
           .event('start')
           .setAttribute('foo', 'bar')
           .event('middle')
           .exit();

        expect(telemetry.startSpan).toHaveBeenCalled();
        expect(telemetry.addSpanEvent).toHaveBeenCalledTimes(2);
        expect(telemetry.setSpanAttribute).toHaveBeenCalled();
        expect(telemetry.endSpan).toHaveBeenCalled();
    });
});

describe('configureTelemetry', () => {
    it('should set and get telemetry service', () => {
        const mockTelemetry = createMockTelemetry();

        configureTelemetry(mockTelemetry);
        expect(getTelemetry()).toBe(mockTelemetry);

        configureTelemetry(null);
        expect(getTelemetry()).toBeNull();
    });
});
