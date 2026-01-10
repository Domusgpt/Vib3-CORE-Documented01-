/**
 * AgentCLI.test.js - Tests for agent CLI interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable, Writable } from 'stream';
import {
    AgentCLI,
    BatchExecutor,
    CommandType,
    ResponseStatus
} from '../../src/agent/cli/AgentCLI.js';

// Mock engine
function createMockEngine() {
    const engine = {
        currentSystem: 'quantum',
        currentGeometry: 0,
        parameters: {},
        setParameter: null,
        getParameter: null,
        setGeometry: vi.fn(),
        setSystem: vi.fn(),
        rotate: vi.fn(),
        resetRotation: vi.fn()
    };
    // Use regular functions so 'this' refers to the engine object
    engine.setParameter = vi.fn(function(name, value) {
        engine.parameters[name] = value;
    });
    engine.getParameter = vi.fn(function(name) {
        return engine.parameters[name];
    });
    return engine;
}

// Create writable stream that captures output
function createOutputStream() {
    const chunks = [];
    const stream = new Writable({
        write(chunk, encoding, callback) {
            chunks.push(chunk.toString());
            callback();
        }
    });
    stream.getOutput = () => chunks.join('');
    stream.getLines = () => chunks.join('').split('\n').filter(l => l.trim());
    stream.getJSON = () => stream.getLines().map(l => JSON.parse(l));
    return stream;
}

describe('AgentCLI', () => {
    let cli;
    let engine;
    let output;

    beforeEach(() => {
        engine = createMockEngine();
        output = createOutputStream();
        cli = new AgentCLI(engine, {
            outputStream: output,
            inputStream: new Readable({ read() {} }),
            enableTelemetry: false
        });
    });

    afterEach(() => {
        cli.stop();
    });

    describe('Basic Commands', () => {
        it('should respond to ping', async () => {
            const result = await cli.execute({ type: CommandType.PING });
            expect(result.pong).toBe(true);
            expect(result.timestamp).toBeDefined();
        });

        it('should return status', async () => {
            const result = await cli.execute({ type: CommandType.STATUS });
            expect(result.running).toBe(false); // Not started
            expect(result.commandsProcessed).toBe(0);
            expect(result.engine).toBeDefined();
        });

        it('should return help', async () => {
            const result = await cli.execute({ type: CommandType.HELP });
            expect(result.commands).toBeDefined();
            expect(result.commands.length).toBeGreaterThan(0);
            expect(result.formats).toContain('jsonl');
        });

        it('should throw for unknown command', async () => {
            await expect(cli.execute({ type: 'unknown_command' }))
                .rejects.toThrow('Unknown command');
        });
    });

    describe('Parameter Commands', () => {
        it('should set parameter', async () => {
            const result = await cli.execute({
                type: CommandType.SET_PARAMETER,
                param: 'intensity',
                value: 0.8
            });

            expect(result.param).toBe('intensity');
            expect(result.value).toBe(0.8);
            expect(engine.setParameter).toHaveBeenCalledWith('intensity', 0.8);
        });

        it('should get parameter', async () => {
            engine.getParameter.mockReturnValue(0.5);

            const result = await cli.execute({
                type: CommandType.GET_PARAMETER,
                param: 'speed'
            });

            expect(result.param).toBe('speed');
            expect(engine.getParameter).toHaveBeenCalledWith('speed');
        });

        it('should throw if param missing', async () => {
            await expect(cli.execute({ type: CommandType.SET_PARAMETER }))
                .rejects.toThrow('Missing param');
        });
    });

    describe('Geometry Commands', () => {
        it('should set geometry', async () => {
            const result = await cli.execute({
                type: CommandType.SET_GEOMETRY,
                index: 8
            });

            expect(result.geometry).toBe(8);
            expect(engine.setGeometry).toHaveBeenCalledWith(8);
        });

        it('should set system', async () => {
            const result = await cli.execute({
                type: CommandType.SET_SYSTEM,
                system: 'holographic'
            });

            expect(result.system).toBe('holographic');
            expect(engine.setSystem).toHaveBeenCalledWith('holographic');
        });
    });

    describe('Rotation Commands', () => {
        it('should apply rotation', async () => {
            const result = await cli.execute({
                type: CommandType.ROTATE,
                plane: 'XW',
                angle: 0.5
            });

            expect(result.plane).toBe('XW');
            expect(result.angle).toBe(0.5);
            expect(engine.rotate).toHaveBeenCalledWith('XW', 0.5);
        });

        it('should reset rotation', async () => {
            const result = await cli.execute({
                type: CommandType.RESET_ROTATION
            });

            expect(result.reset).toBe(true);
            expect(engine.resetRotation).toHaveBeenCalled();
        });

        it('should batch rotate', async () => {
            const result = await cli.execute({
                type: CommandType.BATCH_ROTATE,
                rotations: {
                    XY: 0.1,
                    XZ: 0.2,
                    YZ: 0.3
                }
            });

            expect(engine.rotate).toHaveBeenCalledTimes(3);
            expect(engine.rotate).toHaveBeenCalledWith('XY', 0.1);
            expect(engine.rotate).toHaveBeenCalledWith('XZ', 0.2);
            expect(engine.rotate).toHaveBeenCalledWith('YZ', 0.3);
        });
    });

    describe('Batch Commands', () => {
        it('should execute batch of commands', async () => {
            const result = await cli.execute({
                type: CommandType.BATCH,
                commands: [
                    { type: CommandType.PING },
                    { type: CommandType.SET_GEOMETRY, index: 5 },
                    { type: CommandType.ROTATE, plane: 'XW', angle: 0.5 }
                ]
            });

            expect(result.total).toBe(3);
            expect(result.succeeded).toBe(3);
            expect(result.failed).toBe(0);
            expect(result.results).toHaveLength(3);
        });

        it('should handle batch failures', async () => {
            const result = await cli.execute({
                type: CommandType.BATCH,
                commands: [
                    { type: CommandType.PING },
                    { type: 'invalid_command' },
                    { type: CommandType.STATUS }
                ]
            });

            expect(result.succeeded).toBe(2);
            expect(result.failed).toBe(1);
        });
    });

    describe('Telemetry Commands', () => {
        it('should get metrics', async () => {
            const result = await cli.execute({
                type: CommandType.GET_METRICS
            });

            expect(result).toBeDefined();
        });

        it('should get metrics in prometheus format', async () => {
            const result = await cli.execute({
                type: CommandType.GET_METRICS,
                format: 'prometheus'
            });

            expect(result.format).toBe('prometheus');
            expect(result.data).toContain('vib3_');
        });

        it('should flush telemetry', async () => {
            const result = await cli.execute({
                type: CommandType.FLUSH_TELEMETRY
            });

            expect(result).toBeDefined();
        });
    });

    describe('Custom Handlers', () => {
        it('should register and execute custom handler', async () => {
            cli.registerHandler('custom_action', (cmd) => ({
                custom: true,
                value: cmd.value * 2
            }));

            const result = await cli.execute({
                type: 'custom_action',
                value: 21
            });

            expect(result.custom).toBe(true);
            expect(result.value).toBe(42);
        });
    });
});

describe('BatchExecutor', () => {
    let cli;
    let engine;
    let executor;

    beforeEach(() => {
        engine = createMockEngine();
        cli = new AgentCLI(engine, {
            outputStream: createOutputStream(),
            inputStream: new Readable({ read() {} }),
            enableTelemetry: false
        });
        executor = new BatchExecutor(cli);
    });

    it('should queue commands', () => {
        executor
            .add({ type: CommandType.PING })
            .add({ type: CommandType.STATUS });

        expect(executor.queue).toHaveLength(2);
    });

    it('should execute sequentially', async () => {
        executor
            .add({ type: CommandType.PING })
            .add({ type: CommandType.SET_GEOMETRY, index: 5 })
            .add({ type: CommandType.ROTATE, plane: 'XW', angle: 0.5 });

        const results = await executor.execute();

        expect(results).toHaveLength(3);
        expect(results[0].status).toBe('ok');
        expect(results[1].command).toBe(CommandType.SET_GEOMETRY);
        expect(executor.queue).toHaveLength(0); // Queue cleared
    });

    it('should execute in parallel', async () => {
        executor
            .add({ type: CommandType.PING })
            .add({ type: CommandType.STATUS })
            .add({ type: CommandType.HELP });

        const results = await executor.executeParallel();

        expect(results).toHaveLength(3);
        results.forEach(r => expect(r.status).toBe('ok'));
    });

    it('should handle errors in batch', async () => {
        executor
            .add({ type: CommandType.PING })
            .add({ type: 'invalid_command' })
            .add({ type: CommandType.STATUS });

        const results = await executor.execute();

        expect(results[0].status).toBe('ok');
        expect(results[1].status).toBe('error');
        expect(results[2].status).toBe('ok');
    });
});

describe('CommandType', () => {
    it('should have all expected command types', () => {
        expect(CommandType.SET_PARAMETER).toBe('set_parameter');
        expect(CommandType.GET_PARAMETER).toBe('get_parameter');
        expect(CommandType.SET_GEOMETRY).toBe('set_geometry');
        expect(CommandType.SET_SYSTEM).toBe('set_system');
        expect(CommandType.ROTATE).toBe('rotate');
        expect(CommandType.BATCH).toBe('batch');
        expect(CommandType.GET_METRICS).toBe('get_metrics');
        expect(CommandType.PING).toBe('ping');
        expect(CommandType.QUIT).toBe('quit');
    });
});

describe('ResponseStatus', () => {
    it('should have expected statuses', () => {
        expect(ResponseStatus.OK).toBe('ok');
        expect(ResponseStatus.ERROR).toBe('error');
        expect(ResponseStatus.PARTIAL).toBe('partial');
    });
});
