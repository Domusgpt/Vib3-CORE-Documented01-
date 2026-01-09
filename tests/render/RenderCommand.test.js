/**
 * RenderCommand Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
    CommandType,
    PrimitiveType,
    RenderCommand,
    ClearCommand,
    SetStateCommand,
    BindShaderCommand,
    BindTextureCommand,
    BindVertexArrayCommand,
    BindRenderTargetCommand,
    SetUniformCommand,
    DrawCommand,
    DrawIndexedCommand,
    DrawInstancedCommand,
    DrawIndexedInstancedCommand,
    SetViewportCommand,
    CustomCommand
} from '../../src/render/RenderCommand.js';
import { RenderState } from '../../src/render/RenderState.js';

describe('CommandType', () => {
    it('has all expected command types', () => {
        expect(CommandType.CLEAR).toBe('clear');
        expect(CommandType.SET_STATE).toBe('set_state');
        expect(CommandType.DRAW).toBe('draw');
        expect(CommandType.DRAW_INDEXED).toBe('draw_indexed');
        expect(CommandType.DRAW_INSTANCED).toBe('draw_instanced');
        expect(CommandType.BIND_SHADER).toBe('bind_shader');
        expect(CommandType.BIND_TEXTURE).toBe('bind_texture');
    });
});

describe('PrimitiveType', () => {
    it('has all expected primitive types', () => {
        expect(PrimitiveType.POINTS).toBe('points');
        expect(PrimitiveType.LINES).toBe('lines');
        expect(PrimitiveType.TRIANGLES).toBe('triangles');
        expect(PrimitiveType.TRIANGLE_STRIP).toBe('triangle_strip');
    });
});

describe('RenderCommand', () => {
    it('has unique IDs', () => {
        const cmd1 = new RenderCommand(CommandType.CUSTOM);
        const cmd2 = new RenderCommand(CommandType.CUSTOM);

        expect(cmd1.id).toBeDefined();
        expect(cmd2.id).toBeDefined();
        expect(cmd1.id).not.toBe(cmd2.id);
    });

    it('sets label', () => {
        const cmd = new RenderCommand(CommandType.CUSTOM);
        const result = cmd.setLabel('test command');

        expect(cmd.label).toBe('test command');
        expect(result).toBe(cmd); // Chainable
    });

    it('throws on execute if not implemented', () => {
        const cmd = new RenderCommand(CommandType.CUSTOM);
        expect(() => cmd.execute({})).toThrow();
    });
});

describe('ClearCommand', () => {
    it('creates with default values', () => {
        const cmd = new ClearCommand();

        expect(cmd.type).toBe(CommandType.CLEAR);
        expect(cmd.clearColor).toBe(true);
        expect(cmd.clearDepth).toBe(true);
        expect(cmd.clearStencil).toBe(false);
        expect(cmd.colorValue).toEqual([0, 0, 0, 1]);
        expect(cmd.depthValue).toBe(1);
        expect(cmd.priority).toBe(1000); // High priority
    });

    it('creates with custom color', () => {
        const cmd = new ClearCommand({
            colorValue: [0.5, 0.5, 0.5, 1],
            depthValue: 0.5
        });

        expect(cmd.colorValue).toEqual([0.5, 0.5, 0.5, 1]);
        expect(cmd.depthValue).toBe(0.5);
    });

    it('creates color-only clear', () => {
        const cmd = ClearCommand.color([1, 0, 0, 1]);

        expect(cmd.clearColor).toBe(true);
        expect(cmd.clearDepth).toBe(false);
        expect(cmd.clearStencil).toBe(false);
        expect(cmd.colorValue).toEqual([1, 0, 0, 1]);
    });

    it('creates depth-only clear', () => {
        const cmd = ClearCommand.depth(0.5);

        expect(cmd.clearColor).toBe(false);
        expect(cmd.clearDepth).toBe(true);
        expect(cmd.depthValue).toBe(0.5);
    });

    it('executes on backend', () => {
        const backend = { clear: vi.fn() };
        const cmd = new ClearCommand();

        cmd.execute(backend);

        expect(backend.clear).toHaveBeenCalledWith(cmd);
    });
});

describe('SetStateCommand', () => {
    it('creates with state', () => {
        const state = RenderState.opaque();
        const cmd = new SetStateCommand(state);

        expect(cmd.type).toBe(CommandType.SET_STATE);
        expect(cmd.state).toBe(state);
        expect(cmd.priority).toBe(900);
    });

    it('executes on backend', () => {
        const backend = { setState: vi.fn() };
        const state = RenderState.opaque();
        const cmd = new SetStateCommand(state);

        cmd.execute(backend);

        expect(backend.setState).toHaveBeenCalledWith(state);
    });
});

describe('BindShaderCommand', () => {
    it('creates with shader', () => {
        const shader = { id: 1 };
        const cmd = new BindShaderCommand(shader);

        expect(cmd.type).toBe(CommandType.BIND_SHADER);
        expect(cmd.shader).toBe(shader);
        expect(cmd.priority).toBe(800);
    });

    it('executes on backend', () => {
        const backend = { bindShader: vi.fn() };
        const shader = { id: 1 };
        const cmd = new BindShaderCommand(shader);

        cmd.execute(backend);

        expect(backend.bindShader).toHaveBeenCalledWith(shader);
    });
});

describe('BindTextureCommand', () => {
    it('creates with texture and default slot', () => {
        const texture = { id: 1 };
        const cmd = new BindTextureCommand(texture);

        expect(cmd.type).toBe(CommandType.BIND_TEXTURE);
        expect(cmd.texture).toBe(texture);
        expect(cmd.slot).toBe(0);
    });

    it('creates with custom slot', () => {
        const texture = { id: 1 };
        const cmd = new BindTextureCommand(texture, 3);

        expect(cmd.slot).toBe(3);
    });

    it('executes on backend', () => {
        const backend = { bindTexture: vi.fn() };
        const texture = { id: 1 };
        const cmd = new BindTextureCommand(texture, 2);

        cmd.execute(backend);

        expect(backend.bindTexture).toHaveBeenCalledWith(texture, 2);
    });
});

describe('SetUniformCommand', () => {
    it('creates with name and value', () => {
        const cmd = new SetUniformCommand('u_color', [1, 0, 0, 1], 'vec4');

        expect(cmd.type).toBe(CommandType.SET_UNIFORM);
        expect(cmd.name).toBe('u_color');
        expect(cmd.value).toEqual([1, 0, 0, 1]);
        expect(cmd.uniformType).toBe('vec4');
    });

    it('executes on backend', () => {
        const backend = { setUniform: vi.fn() };
        const cmd = new SetUniformCommand('u_matrix', [1, 0, 0, 0], 'mat4');

        cmd.execute(backend);

        expect(backend.setUniform).toHaveBeenCalledWith('u_matrix', [1, 0, 0, 0], 'mat4');
    });
});

describe('DrawCommand', () => {
    it('creates with default values', () => {
        const cmd = new DrawCommand();

        expect(cmd.type).toBe(CommandType.DRAW);
        expect(cmd.primitive).toBe(PrimitiveType.TRIANGLES);
        expect(cmd.vertexCount).toBe(0);
        expect(cmd.firstVertex).toBe(0);
        expect(cmd.priority).toBe(0); // Low priority (drawn last)
    });

    it('creates with custom values', () => {
        const cmd = new DrawCommand({
            primitive: PrimitiveType.LINES,
            vertexCount: 100,
            firstVertex: 10,
            sortKey: 5,
            depth: 1.5
        });

        expect(cmd.primitive).toBe(PrimitiveType.LINES);
        expect(cmd.vertexCount).toBe(100);
        expect(cmd.firstVertex).toBe(10);
        expect(cmd.sortKey).toBe(5);
        expect(cmd.depth).toBe(1.5);
    });

    it('executes on backend', () => {
        const backend = { draw: vi.fn() };
        const cmd = new DrawCommand({ vertexCount: 36 });

        cmd.execute(backend);

        expect(backend.draw).toHaveBeenCalledWith(cmd);
    });
});

describe('DrawIndexedCommand', () => {
    it('creates with default values', () => {
        const cmd = new DrawIndexedCommand();

        expect(cmd.type).toBe(CommandType.DRAW_INDEXED);
        expect(cmd.indexCount).toBe(0);
        expect(cmd.firstIndex).toBe(0);
        expect(cmd.baseVertex).toBe(0);
        expect(cmd.indexType).toBe('uint16');
    });

    it('creates with custom values', () => {
        const cmd = new DrawIndexedCommand({
            indexCount: 6000,
            indexType: 'uint32'
        });

        expect(cmd.indexCount).toBe(6000);
        expect(cmd.indexType).toBe('uint32');
    });

    it('executes on backend', () => {
        const backend = { drawIndexed: vi.fn() };
        const cmd = new DrawIndexedCommand({ indexCount: 36 });

        cmd.execute(backend);

        expect(backend.drawIndexed).toHaveBeenCalledWith(cmd);
    });
});

describe('DrawInstancedCommand', () => {
    it('creates with instance count', () => {
        const cmd = new DrawInstancedCommand({
            vertexCount: 36,
            instanceCount: 100
        });

        expect(cmd.type).toBe(CommandType.DRAW_INSTANCED);
        expect(cmd.vertexCount).toBe(36);
        expect(cmd.instanceCount).toBe(100);
        expect(cmd.firstInstance).toBe(0);
    });

    it('executes on backend', () => {
        const backend = { drawInstanced: vi.fn() };
        const cmd = new DrawInstancedCommand({
            vertexCount: 36,
            instanceCount: 1000
        });

        cmd.execute(backend);

        expect(backend.drawInstanced).toHaveBeenCalledWith(cmd);
    });
});

describe('DrawIndexedInstancedCommand', () => {
    it('creates with all parameters', () => {
        const cmd = new DrawIndexedInstancedCommand({
            indexCount: 36,
            instanceCount: 100,
            indexType: 'uint32'
        });

        expect(cmd.type).toBe(CommandType.DRAW_INDEXED_INSTANCED);
        expect(cmd.indexCount).toBe(36);
        expect(cmd.instanceCount).toBe(100);
        expect(cmd.indexType).toBe('uint32');
    });

    it('executes on backend', () => {
        const backend = { drawIndexedInstanced: vi.fn() };
        const cmd = new DrawIndexedInstancedCommand({
            indexCount: 36,
            instanceCount: 1000
        });

        cmd.execute(backend);

        expect(backend.drawIndexedInstanced).toHaveBeenCalledWith(cmd);
    });
});

describe('SetViewportCommand', () => {
    it('creates with dimensions', () => {
        const cmd = new SetViewportCommand(0, 0, 1920, 1080);

        expect(cmd.type).toBe(CommandType.SET_VIEWPORT);
        expect(cmd.x).toBe(0);
        expect(cmd.y).toBe(0);
        expect(cmd.width).toBe(1920);
        expect(cmd.height).toBe(1080);
        expect(cmd.priority).toBe(900);
    });

    it('executes on backend', () => {
        const backend = { setViewport: vi.fn() };
        const cmd = new SetViewportCommand(10, 20, 800, 600);

        cmd.execute(backend);

        expect(backend.setViewport).toHaveBeenCalledWith(10, 20, 800, 600);
    });
});

describe('CustomCommand', () => {
    it('executes callback', () => {
        const callback = vi.fn();
        const backend = { gl: {} };
        const cmd = new CustomCommand(callback);

        cmd.execute(backend);

        expect(callback).toHaveBeenCalledWith(backend);
    });
});
