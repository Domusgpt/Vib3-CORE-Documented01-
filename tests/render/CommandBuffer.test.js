/**
 * CommandBuffer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    SortMode,
    CommandBuffer,
    CommandBufferPool,
    commandBufferPool
} from '../../src/render/CommandBuffer.js';
import {
    CommandType,
    ClearCommand,
    DrawCommand,
    DrawIndexedCommand,
    SetStateCommand
} from '../../src/render/RenderCommand.js';
import { RenderState } from '../../src/render/RenderState.js';

describe('SortMode', () => {
    it('has all expected sort modes', () => {
        expect(SortMode.NONE).toBe('none');
        expect(SortMode.STATE).toBe('state');
        expect(SortMode.FRONT_TO_BACK).toBe('front_to_back');
        expect(SortMode.BACK_TO_FRONT).toBe('back_to_front');
        expect(SortMode.CUSTOM).toBe('custom');
    });
});

describe('CommandBuffer', () => {
    let buffer;

    beforeEach(() => {
        buffer = new CommandBuffer();
    });

    it('creates with default values', () => {
        expect(buffer.sortMode).toBe(SortMode.STATE);
        expect(buffer.length).toBe(0);
        expect(buffer.isEmpty).toBe(true);
    });

    it('creates with custom options', () => {
        const buffer = new CommandBuffer({
            sortMode: SortMode.BACK_TO_FRONT,
            label: 'transparent pass'
        });

        expect(buffer.sortMode).toBe(SortMode.BACK_TO_FRONT);
        expect(buffer.label).toBe('transparent pass');
    });

    describe('recording', () => {
        it('records commands', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.end();

            expect(buffer.length).toBe(2);
            expect(buffer.isEmpty).toBe(false);
        });

        it('warns when adding without recording', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            buffer.add(new ClearCommand());

            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('adds multiple commands', () => {
            buffer.begin();
            buffer.addAll([
                new ClearCommand(),
                new DrawCommand({ vertexCount: 36 }),
                new DrawCommand({ vertexCount: 24 })
            ]);
            buffer.end();

            expect(buffer.length).toBe(3);
        });

        it('clears buffer', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.clear();

            expect(buffer.length).toBe(0);
            expect(buffer.isEmpty).toBe(true);
        });
    });

    describe('sorting', () => {
        it('sorts by state (priority then sortKey)', () => {
            buffer.begin();

            const draw1 = new DrawCommand({ sortKey: 3 });
            const draw2 = new DrawCommand({ sortKey: 1 });
            const clear = new ClearCommand(); // priority 1000
            const setState = new SetStateCommand(RenderState.opaque()); // priority 900

            buffer.add(draw1);
            buffer.add(draw2);
            buffer.add(clear);
            buffer.add(setState);
            buffer.end();

            buffer.sort();
            const commands = buffer.commands;

            // Clear (highest priority) should be first
            expect(commands[0].type).toBe(CommandType.CLEAR);
            // SetState next
            expect(commands[1].type).toBe(CommandType.SET_STATE);
            // Draws sorted by sortKey (lower first)
            expect(commands[2].sortKey).toBe(1);
            expect(commands[3].sortKey).toBe(3);
        });

        it('sorts front-to-back by depth', () => {
            buffer.sortMode = SortMode.FRONT_TO_BACK;
            buffer.begin();

            buffer.add(new DrawCommand({ depth: 10 }));
            buffer.add(new DrawCommand({ depth: 5 }));
            buffer.add(new DrawCommand({ depth: 15 }));
            buffer.end();

            buffer.sort();
            const commands = buffer.commands;

            // Front (smaller depth) first
            expect(commands[0].depth).toBe(5);
            expect(commands[1].depth).toBe(10);
            expect(commands[2].depth).toBe(15);
        });

        it('sorts back-to-front by depth', () => {
            buffer.sortMode = SortMode.BACK_TO_FRONT;
            buffer.begin();

            buffer.add(new DrawCommand({ depth: 10 }));
            buffer.add(new DrawCommand({ depth: 5 }));
            buffer.add(new DrawCommand({ depth: 15 }));
            buffer.end();

            buffer.sort();
            const commands = buffer.commands;

            // Back (larger depth) first
            expect(commands[0].depth).toBe(15);
            expect(commands[1].depth).toBe(10);
            expect(commands[2].depth).toBe(5);
        });

        it('uses custom comparator', () => {
            buffer.sortMode = SortMode.CUSTOM;
            buffer.customComparator = (a, b) => {
                // Sort by vertex count ascending
                return (a.vertexCount || 0) - (b.vertexCount || 0);
            };

            buffer.begin();
            buffer.add(new DrawCommand({ vertexCount: 100 }));
            buffer.add(new DrawCommand({ vertexCount: 50 }));
            buffer.add(new DrawCommand({ vertexCount: 200 }));
            buffer.end();

            buffer.sort();
            const commands = buffer.commands;

            expect(commands[0].vertexCount).toBe(50);
            expect(commands[1].vertexCount).toBe(100);
            expect(commands[2].vertexCount).toBe(200);
        });

        it('does not sort with NONE mode', () => {
            buffer.sortMode = SortMode.NONE;
            buffer.begin();

            buffer.add(new DrawCommand({ sortKey: 3 }));
            buffer.add(new DrawCommand({ sortKey: 1 }));
            buffer.add(new DrawCommand({ sortKey: 2 }));
            buffer.end();

            buffer.sort();
            const commands = buffer.commands;

            // Original order preserved
            expect(commands[0].sortKey).toBe(3);
            expect(commands[1].sortKey).toBe(1);
            expect(commands[2].sortKey).toBe(2);
        });

        it('only sorts once until modified', () => {
            buffer.begin();
            buffer.add(new DrawCommand({ sortKey: 2 }));
            buffer.add(new DrawCommand({ sortKey: 1 }));
            buffer.end();

            buffer.sort();
            const commands1 = buffer.commands;

            // Sorting again should return same result
            buffer.sort();
            const commands2 = buffer.commands;

            expect(commands1[0].sortKey).toBe(commands2[0].sortKey);
        });
    });

    describe('execution', () => {
        it('executes all commands', () => {
            const backend = {
                clear: vi.fn(),
                draw: vi.fn()
            };

            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.end();

            buffer.execute(backend);

            expect(backend.clear).toHaveBeenCalled();
            expect(backend.draw).toHaveBeenCalled();
        });

        it('sorts before execution if needed', () => {
            const backend = {
                clear: vi.fn(),
                setState: vi.fn(),
                draw: vi.fn()
            };

            buffer.begin();
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.add(new ClearCommand());
            buffer.end();

            buffer.execute(backend);

            // Clear should be called first (higher priority)
            expect(backend.clear.mock.invocationCallOrder[0])
                .toBeLessThan(backend.draw.mock.invocationCallOrder[0]);
        });

        it('executes with profiling', () => {
            const backend = {
                clear: vi.fn(),
                draw: vi.fn()
            };

            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.end();

            const stats = buffer.executeWithProfiling(backend);

            expect(stats.commandCount).toBe(2);
            expect(stats.drawCalls).toBe(1);
            expect(typeof stats.executionTime).toBe('number');
        });
    });

    describe('statistics', () => {
        it('tracks command count', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.add(new DrawCommand({ vertexCount: 24 }));
            buffer.end();

            expect(buffer.stats.commandCount).toBe(3);
        });

        it('tracks draw calls', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.add(new DrawIndexedCommand({ indexCount: 36 }));
            buffer.end();

            expect(buffer.stats.drawCalls).toBe(2);
        });

        it('tracks triangles', () => {
            buffer.begin();
            buffer.add(new DrawCommand({
                primitive: 'triangles',
                vertexCount: 36 // 12 triangles
            }));
            buffer.end();

            expect(buffer.stats.triangles).toBe(12);
        });

        it('tracks state changes', () => {
            buffer.begin();
            buffer.add(new SetStateCommand(RenderState.opaque()));
            buffer.add(new SetStateCommand(RenderState.transparent()));
            buffer.end();

            expect(buffer.stats.stateChanges).toBe(2);
        });
    });

    describe('utilities', () => {
        it('returns commands copy', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.end();

            const commands = buffer.commands;
            commands.pop();

            expect(buffer.length).toBe(1); // Original unchanged
        });

        it('filters by type', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.add(new DrawCommand({ vertexCount: 24 }));
            buffer.end();

            const draws = buffer.filterByType(CommandType.DRAW);
            expect(draws.length).toBe(2);
        });

        it('gets draw commands only', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new SetStateCommand(RenderState.opaque()));
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.add(new DrawIndexedCommand({ indexCount: 36 }));
            buffer.end();

            const draws = buffer.getDrawCommands();
            expect(draws.length).toBe(2);
        });

        it('merges another buffer', () => {
            const buffer2 = new CommandBuffer();

            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.end();

            buffer2.begin();
            buffer2.add(new DrawCommand({ vertexCount: 36 }));
            buffer2.end();

            // Use begin(false) to resume recording without clearing existing commands
            buffer.begin(false);
            buffer.merge(buffer2);
            buffer.end();

            expect(buffer.length).toBe(2);
        });

        it('clones buffer', () => {
            buffer.begin();
            buffer.add(new ClearCommand());
            buffer.add(new DrawCommand({ vertexCount: 36 }));
            buffer.end();

            const clone = buffer.clone();

            expect(clone.length).toBe(2);
            expect(clone.sortMode).toBe(buffer.sortMode);
            expect(clone._commands).not.toBe(buffer._commands);
        });
    });
});

describe('CommandBufferPool', () => {
    let pool;

    beforeEach(() => {
        pool = new CommandBufferPool(2);
    });

    it('pre-allocates buffers', () => {
        const stats = pool.getStats();
        expect(stats.available).toBe(2);
        expect(stats.inUse).toBe(0);
    });

    it('acquires buffer', () => {
        const buffer = pool.acquire({ sortMode: SortMode.BACK_TO_FRONT });

        expect(buffer).toBeInstanceOf(CommandBuffer);
        expect(buffer.sortMode).toBe(SortMode.BACK_TO_FRONT);

        const stats = pool.getStats();
        expect(stats.available).toBe(1);
        expect(stats.inUse).toBe(1);
    });

    it('releases buffer back to pool', () => {
        const buffer = pool.acquire();
        buffer.add(new ClearCommand());

        pool.release(buffer);

        const stats = pool.getStats();
        expect(stats.available).toBe(2);
        expect(stats.inUse).toBe(0);
        expect(buffer.isEmpty).toBe(true); // Cleared
    });

    it('creates new buffer when pool exhausted', () => {
        const b1 = pool.acquire();
        const b2 = pool.acquire();
        const b3 = pool.acquire(); // New buffer created

        expect(b3).toBeInstanceOf(CommandBuffer);

        const stats = pool.getStats();
        expect(stats.inUse).toBe(3);
    });

    it('releases all buffers', () => {
        pool.acquire();
        pool.acquire();
        pool.acquire();

        pool.releaseAll();

        const stats = pool.getStats();
        expect(stats.inUse).toBe(0);
        expect(stats.available).toBe(3);
    });

    it('ignores release of unknown buffer', () => {
        const unknownBuffer = new CommandBuffer();
        pool.release(unknownBuffer);

        const stats = pool.getStats();
        expect(stats.available).toBe(2); // Unchanged
    });
});

describe('commandBufferPool (global)', () => {
    it('is a CommandBufferPool instance', () => {
        expect(commandBufferPool).toBeInstanceOf(CommandBufferPool);
    });

    it('can acquire and release buffers', () => {
        const buffer = commandBufferPool.acquire();
        expect(buffer).toBeInstanceOf(CommandBuffer);
        commandBufferPool.release(buffer);
    });
});
