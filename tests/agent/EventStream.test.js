/**
 * EventStream.test.js - Tests for SSE event streaming
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    EventStreamServer,
    SSEConnection,
    StreamEventType
} from '../../src/agent/telemetry/EventStream.js';

// Mock HTTP response
function createMockResponse() {
    const chunks = [];
    return {
        writeHead: vi.fn(),
        write: vi.fn((data) => chunks.push(data)),
        end: vi.fn(),
        chunks,
        getOutput: () => chunks.join('')
    };
}

// Mock HTTP request
function createMockRequest() {
    const listeners = {};
    return {
        on: vi.fn((event, callback) => {
            listeners[event] = callback;
        }),
        emit: (event) => listeners[event]?.(),
        headers: { host: 'localhost:3000' },
        url: '/events'
    };
}

describe('EventStreamServer', () => {
    let server;

    beforeEach(() => {
        server = new EventStreamServer({
            heartbeatInterval: 60000, // Disable heartbeat during tests
            maxConnections: 10
        });
    });

    afterEach(() => {
        server.close();
    });

    it('should create with default options', () => {
        const defaultServer = new EventStreamServer();
        expect(defaultServer.maxConnections).toBe(100);
        expect(defaultServer.connectionCount).toBe(0);
        defaultServer.close();
    });

    it('should handle new connection', () => {
        const req = createMockRequest();
        const res = createMockResponse();

        const connectionId = server.handleConnection(req, res);

        expect(connectionId).toBeTruthy();
        expect(connectionId).toMatch(/^conn_/);
        expect(server.connectionCount).toBe(1);
        expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
            'Content-Type': 'text/event-stream'
        }));
    });

    it('should send connected event on new connection', () => {
        const req = createMockRequest();
        const res = createMockResponse();

        server.handleConnection(req, res);

        const output = res.getOutput();
        expect(output).toContain('event: system');
        expect(output).toContain('"event":"connected"');
    });

    it('should reject connections when at max capacity', () => {
        const smallServer = new EventStreamServer({ maxConnections: 1 });

        const req1 = createMockRequest();
        const res1 = createMockResponse();
        smallServer.handleConnection(req1, res1);

        const req2 = createMockRequest();
        const res2 = createMockResponse();
        const result = smallServer.handleConnection(req2, res2);

        expect(result).toBeNull();
        expect(res2.writeHead).toHaveBeenCalledWith(503, expect.anything());
        smallServer.close();
    });

    it('should broadcast to all connections', () => {
        const req1 = createMockRequest();
        const res1 = createMockResponse();
        server.handleConnection(req1, res1);

        const req2 = createMockRequest();
        const res2 = createMockResponse();
        server.handleConnection(req2, res2);

        // Clear initial connection messages
        res1.chunks.length = 0;
        res2.chunks.length = 0;

        server.broadcast({ type: 'test', data: 'hello' });

        expect(res1.getOutput()).toContain('"data":"hello"');
        expect(res2.getOutput()).toContain('"data":"hello"');
    });

    it('should filter broadcast by channel', () => {
        const req1 = createMockRequest();
        req1.url = '/events?channels=metrics';
        const res1 = createMockResponse();
        server.handleConnection(req1, res1, { channels: ['metrics'] });

        const req2 = createMockRequest();
        req2.url = '/events?channels=spans';
        const res2 = createMockResponse();
        server.handleConnection(req2, res2, { channels: ['spans'] });

        res1.chunks.length = 0;
        res2.chunks.length = 0;

        server.broadcast({ type: 'metric', value: 100 }, 'metrics');

        expect(res1.getOutput()).toContain('"value":100');
        expect(res2.getOutput()).toBe('');
    });

    it('should send to specific connection', () => {
        const req1 = createMockRequest();
        const res1 = createMockResponse();
        const id1 = server.handleConnection(req1, res1);

        const req2 = createMockRequest();
        const res2 = createMockResponse();
        server.handleConnection(req2, res2);

        res1.chunks.length = 0;
        res2.chunks.length = 0;

        server.sendTo(id1, { type: 'private', message: 'just for you' });

        expect(res1.getOutput()).toContain('just for you');
        expect(res2.getOutput()).toBe('');
    });

    it('should stream telemetry event', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        server.handleConnection(req, res, { channels: ['telemetry'] });
        res.chunks.length = 0;

        server.streamTelemetry({
            type: 'tool_invocation',
            traceId: 'trace123',
            attributes: { tool: 'rotate' }
        });

        expect(res.getOutput()).toContain('event: telemetry');
        expect(res.getOutput()).toContain('tool_invocation');
    });

    it('should stream span start/end', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        server.handleConnection(req, res, { channels: ['spans'] });
        res.chunks.length = 0;

        const span = {
            traceId: 'trace123',
            spanId: 'span456',
            name: 'testOp',
            startTime: Date.now()
        };

        server.streamSpanStart(span);
        expect(res.getOutput()).toContain('event: span:start');

        res.chunks.length = 0;
        server.streamSpanEnd({ ...span, status: 'ok', durationMs: 100 });
        expect(res.getOutput()).toContain('event: span:end');
    });

    it('should stream metrics', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        server.handleConnection(req, res, { channels: ['metrics'] });
        res.chunks.length = 0;

        server.streamMetric('frame_rate', 60, { renderer: 'webgl' });

        expect(res.getOutput()).toContain('event: metric');
        expect(res.getOutput()).toContain('"name":"frame_rate"');
        expect(res.getOutput()).toContain('"value":60');
    });

    it('should handle connection close', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const connectionId = server.handleConnection(req, res);

        expect(server.connectionCount).toBe(1);

        // Simulate client disconnect
        req.emit('close');

        expect(server.connectionCount).toBe(0);
        expect(server.getConnectionIds()).not.toContain(connectionId);
    });

    it('should close specific connection', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const connectionId = server.handleConnection(req, res);

        server.closeConnection(connectionId);

        expect(server.connectionCount).toBe(0);
        expect(res.end).toHaveBeenCalled();
    });

    it('should emit events', () => {
        const connectHandler = vi.fn();
        const disconnectHandler = vi.fn();
        const broadcastHandler = vi.fn();

        server.on('connect', connectHandler);
        server.on('disconnect', disconnectHandler);
        server.on('broadcast', broadcastHandler);

        const req = createMockRequest();
        const res = createMockResponse();
        server.handleConnection(req, res);

        expect(connectHandler).toHaveBeenCalled();

        server.broadcast({ test: true });
        expect(broadcastHandler).toHaveBeenCalled();

        req.emit('close');
        expect(disconnectHandler).toHaveBeenCalled();
    });
});

describe('SSEConnection', () => {
    it('should create with options', () => {
        const res = createMockResponse();
        const connection = new SSEConnection({
            id: 'test_conn',
            response: res,
            filters: { type: 'metric' },
            channels: ['metrics', 'spans'],
            bufferSize: 50
        });

        expect(connection.id).toBe('test_conn');
        expect(connection.eventsSent).toBe(0);
    });

    it('should send formatted SSE event', () => {
        const res = createMockResponse();
        const connection = new SSEConnection({
            id: 'test',
            response: res,
            filters: {},
            channels: ['*'],
            bufferSize: 10
        });

        connection.send({
            id: 'evt_123',
            type: 'test',
            data: 'hello'
        });

        const output = res.getOutput();
        expect(output).toContain('id: evt_123');
        expect(output).toContain('event: test');
        expect(output).toContain('data:');
        expect(output).toContain('\n\n');
        expect(connection.eventsSent).toBe(1);
    });

    it('should match channels', () => {
        const res = createMockResponse();
        const connection = new SSEConnection({
            id: 'test',
            response: res,
            filters: {},
            channels: ['metrics', 'spans'],
            bufferSize: 10
        });

        expect(connection.matchesChannel('metrics')).toBe(true);
        expect(connection.matchesChannel('spans')).toBe(true);
        expect(connection.matchesChannel('errors')).toBe(false);
    });

    it('should match wildcard channel', () => {
        const res = createMockResponse();
        const connection = new SSEConnection({
            id: 'test',
            response: res,
            filters: {},
            channels: ['*'],
            bufferSize: 10
        });

        expect(connection.matchesChannel('anything')).toBe(true);
        expect(connection.matchesChannel('metrics')).toBe(true);
    });

    it('should match filters', () => {
        const res = createMockResponse();
        const connection = new SSEConnection({
            id: 'test',
            response: res,
            filters: { type: 'metric', level: 'info' },
            channels: ['*'],
            bufferSize: 10
        });

        expect(connection.matchesFilters({ type: 'metric', level: 'info' })).toBe(true);
        expect(connection.matchesFilters({ type: 'metric', level: 'error' })).toBe(false);
        expect(connection.matchesFilters({ type: 'span' })).toBe(false);
    });

    it('should close gracefully', () => {
        const res = createMockResponse();
        const connection = new SSEConnection({
            id: 'test',
            response: res,
            filters: {},
            channels: ['*'],
            bufferSize: 10
        });

        connection.close();
        expect(res.end).toHaveBeenCalled();

        // Should not throw on double close
        connection.close();
    });
});

describe('StreamEventType', () => {
    it('should have all expected types', () => {
        expect(StreamEventType.TELEMETRY).toBe('telemetry');
        expect(StreamEventType.SPAN_START).toBe('span:start');
        expect(StreamEventType.SPAN_END).toBe('span:end');
        expect(StreamEventType.METRIC).toBe('metric');
        expect(StreamEventType.ERROR).toBe('error');
        expect(StreamEventType.HEARTBEAT).toBe('heartbeat');
        expect(StreamEventType.SYSTEM).toBe('system');
    });
});
