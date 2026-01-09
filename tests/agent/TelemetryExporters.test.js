/**
 * TelemetryExporters.test.js - Tests for telemetry export formats
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    PrometheusExporter,
    JSONExporter,
    NDJSONExporter,
    ConsoleExporter,
    createExporter
} from '../../src/agent/telemetry/TelemetryExporters.js';
import { SpanStatus } from '../../src/agent/telemetry/TelemetryService.js';

describe('PrometheusExporter', () => {
    let exporter;

    beforeEach(() => {
        exporter = new PrometheusExporter({ prefix: 'test' });
    });

    it('should create with default options', () => {
        const defaultExporter = new PrometheusExporter();
        expect(defaultExporter.prefix).toBe('vib3');
    });

    it('should export metrics in Prometheus format', () => {
        const metrics = {
            toolInvocations: 100,
            toolErrors: 5,
            framesRendered: 1000,
            parameterChanges: 50,
            systemSwitches: 10,
            totalDurationMs: 5000,
            bufferSize: 25
        };

        const output = exporter.export(metrics);

        expect(output).toContain('# HELP test_tool_invocations_total');
        expect(output).toContain('# TYPE test_tool_invocations_total counter');
        expect(output).toContain('test_tool_invocations_total 100');
        expect(output).toContain('test_tool_errors_total 5');
        expect(output).toContain('test_buffer_size 25');
        expect(output).toContain('test_error_rate');
    });

    it('should include custom labels', () => {
        const labeledExporter = new PrometheusExporter({
            prefix: 'test',
            labels: { env: 'development', instance: 'main' }
        });

        const metrics = {
            toolInvocations: 10,
            toolErrors: 0,
            framesRendered: 100,
            parameterChanges: 5,
            systemSwitches: 1,
            totalDurationMs: 500,
            bufferSize: 10
        };

        const output = labeledExporter.export(metrics);
        expect(output).toContain('env="development"');
        expect(output).toContain('instance="main"');
    });

    it('should export histogram data', () => {
        const values = [1, 5, 10, 25, 50, 100, 250];
        const output = exporter.exportHistogram('latency', values);

        expect(output).toContain('# HELP test_latency');
        expect(output).toContain('# TYPE test_latency histogram');
        expect(output).toContain('test_latency_bucket{le="1"}');
        expect(output).toContain('test_latency_bucket{le="+Inf"}');
        expect(output).toContain('test_latency_sum');
        expect(output).toContain('test_latency_count 7');
    });
});

describe('JSONExporter', () => {
    let exporter;

    beforeEach(() => {
        exporter = new JSONExporter({
            serviceName: 'test-service',
            serviceVersion: '1.0.0'
        });
    });

    it('should export metrics as JSON', () => {
        const metrics = {
            toolInvocations: 100,
            toolErrors: 5,
            framesRendered: 1000,
            parameterChanges: 50,
            systemSwitches: 10,
            totalDurationMs: 5000,
            bufferSize: 25
        };

        const output = exporter.exportMetrics(metrics);
        const parsed = JSON.parse(output);

        expect(parsed['@timestamp']).toBeDefined();
        expect(parsed.service.name).toBe('test-service');
        expect(parsed.metrics.tool_invocations).toBe(100);
        expect(parsed.metrics.error_rate).toBe(0.05);
    });

    it('should export spans in OTLP format', () => {
        const spans = [{
            traceId: 'trace123',
            spanId: 'span456',
            parentSpanId: null,
            name: 'testOperation',
            startTime: Date.now(),
            endTime: Date.now() + 100,
            status: SpanStatus.OK,
            attributes: { 'test.key': 'value' },
            events: []
        }];

        const output = exporter.exportSpans(spans);
        const parsed = JSON.parse(output);

        expect(parsed.resourceSpans).toBeDefined();
        expect(parsed.resourceSpans[0].scopeSpans[0].spans).toHaveLength(1);
        expect(parsed.resourceSpans[0].scopeSpans[0].spans[0].name).toBe('testOperation');
    });

    it('should export events', () => {
        const events = [{
            timestamp: new Date().toISOString(),
            type: 'tool_invocation',
            traceId: 'trace123',
            attributes: { tool: 'rotate' }
        }];

        const output = exporter.exportEvents(events);
        const parsed = JSON.parse(output);

        expect(parsed.events).toHaveLength(1);
        expect(parsed.events[0].type).toBe('tool_invocation');
    });

    it('should support pretty printing', () => {
        const prettyExporter = new JSONExporter({ pretty: true });
        const metrics = {
            toolInvocations: 10,
            toolErrors: 0,
            framesRendered: 100,
            parameterChanges: 5,
            systemSwitches: 1,
            totalDurationMs: 500,
            bufferSize: 10
        };

        const output = prettyExporter.exportMetrics(metrics);
        expect(output).toContain('\n');
        expect(output).toContain('  ');
    });
});

describe('NDJSONExporter', () => {
    let exporter;

    beforeEach(() => {
        exporter = new NDJSONExporter({ serviceName: 'test-service' });
    });

    it('should export single event as NDJSON line', () => {
        const event = {
            type: 'tool_invocation',
            traceId: 'trace123',
            attributes: { tool: 'setParameter' }
        };

        const output = exporter.exportEvent(event);
        const parsed = JSON.parse(output);

        expect(parsed.service).toBe('test-service');
        expect(parsed.type).toBe('tool_invocation');
        expect(parsed.tool).toBe('setParameter');
        expect(output).not.toContain('\n');
    });

    it('should export span as NDJSON line', () => {
        const span = {
            name: 'testSpan',
            traceId: 'trace123',
            spanId: 'span456',
            parentSpanId: null,
            startTime: Date.now(),
            durationMs: 100,
            status: SpanStatus.OK,
            attributes: { key: 'value' }
        };

        const output = exporter.exportSpan(span);
        const parsed = JSON.parse(output);

        expect(parsed.span_name).toBe('testSpan');
        expect(parsed.duration_ms).toBe(100);
    });

    it('should export batch as multiple lines', () => {
        const events = [
            { type: 'event1', traceId: 't1', attributes: {} },
            { type: 'event2', traceId: 't2', attributes: {} },
            { type: 'event3', traceId: 't3', attributes: {} }
        ];

        const output = exporter.exportBatch(events);
        const lines = output.split('\n');

        expect(lines).toHaveLength(3);
        lines.forEach(line => {
            expect(() => JSON.parse(line)).not.toThrow();
        });
    });
});

describe('ConsoleExporter', () => {
    let exporter;
    let consoleLogs;

    beforeEach(() => {
        consoleLogs = [];
        const mockConsole = {
            log: (...args) => consoleLogs.push(args.join(' '))
        };
        global.console = { ...console, log: mockConsole.log };
        exporter = new ConsoleExporter({ colorize: false });
    });

    it('should log events', () => {
        const event = {
            type: 'tool_invocation',
            timestamp: new Date().toISOString()
        };

        exporter.logEvent(event);
        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs[0]).toContain('[tool_invocation]');
    });

    it('should log spans with status', () => {
        const span = {
            name: 'testSpan',
            status: SpanStatus.OK,
            durationMs: 100
        };

        exporter.logSpan(span);
        expect(consoleLogs[0]).toContain('[SPAN]');
        expect(consoleLogs[0]).toContain('testSpan');
    });

    it('should log metrics summary', () => {
        const metrics = {
            toolInvocations: 100,
            toolErrors: 5,
            framesRendered: 1000,
            parameterChanges: 50,
            systemSwitches: 10,
            totalDurationMs: 5000,
            bufferSize: 25
        };

        exporter.logMetrics(metrics);
        expect(consoleLogs.some(log => log.includes('Tool Invocations: 100'))).toBe(true);
    });
});

describe('createExporter', () => {
    it('should create prometheus exporter', () => {
        const exporter = createExporter('prometheus');
        expect(exporter).toBeInstanceOf(PrometheusExporter);
    });

    it('should create json exporter', () => {
        const exporter = createExporter('json');
        expect(exporter).toBeInstanceOf(JSONExporter);
    });

    it('should create ndjson exporter', () => {
        const exporter = createExporter('ndjson');
        expect(exporter).toBeInstanceOf(NDJSONExporter);
    });

    it('should create console exporter', () => {
        const exporter = createExporter('console');
        expect(exporter).toBeInstanceOf(ConsoleExporter);
    });

    it('should throw for unknown type', () => {
        expect(() => createExporter('unknown')).toThrow('Unknown exporter type');
    });

    it('should pass options to exporter', () => {
        const exporter = createExporter('prometheus', { prefix: 'custom' });
        expect(exporter.prefix).toBe('custom');
    });
});
