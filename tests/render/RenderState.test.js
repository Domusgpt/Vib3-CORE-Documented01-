/**
 * RenderState Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    BlendMode,
    DepthFunc,
    CullFace,
    PolygonMode,
    StencilOp,
    BlendState,
    DepthState,
    StencilState,
    RasterizerState,
    Viewport,
    RenderState
} from '../../src/render/RenderState.js';

describe('BlendState', () => {
    it('creates with default values', () => {
        const state = new BlendState();
        expect(state.enabled).toBe(false);
        expect(state.mode).toBe(BlendMode.ALPHA);
        expect(state.srcRGB).toBe('src_alpha');
        expect(state.dstRGB).toBe('one_minus_src_alpha');
    });

    it('sets alpha blend mode', () => {
        const state = new BlendState();
        state.setMode(BlendMode.ALPHA);

        expect(state.enabled).toBe(true);
        expect(state.srcRGB).toBe('src_alpha');
        expect(state.dstRGB).toBe('one_minus_src_alpha');
    });

    it('sets additive blend mode', () => {
        const state = new BlendState();
        state.setMode(BlendMode.ADDITIVE);

        expect(state.enabled).toBe(true);
        expect(state.srcRGB).toBe('src_alpha');
        expect(state.dstRGB).toBe('one');
    });

    it('sets multiply blend mode', () => {
        const state = new BlendState();
        state.setMode(BlendMode.MULTIPLY);

        expect(state.enabled).toBe(true);
        expect(state.srcRGB).toBe('dst_color');
        expect(state.dstRGB).toBe('zero');
    });

    it('disables blending with NONE mode', () => {
        const state = new BlendState();
        state.setMode(BlendMode.ALPHA);
        state.setMode(BlendMode.NONE);

        expect(state.enabled).toBe(false);
    });

    it('clones correctly', () => {
        const state = new BlendState();
        state.setMode(BlendMode.ADDITIVE);
        state.color = [1, 0, 0, 1];

        const clone = state.clone();
        expect(clone.enabled).toBe(state.enabled);
        expect(clone.mode).toBe(state.mode);
        expect(clone.srcRGB).toBe(state.srcRGB);
        expect(clone.color).toEqual([1, 0, 0, 1]);
        expect(clone.color).not.toBe(state.color);
    });

    it('checks equality', () => {
        const state1 = new BlendState();
        const state2 = new BlendState();

        expect(state1.equals(state2)).toBe(true);

        state1.setMode(BlendMode.ADDITIVE);
        expect(state1.equals(state2)).toBe(false);
    });
});

describe('DepthState', () => {
    it('creates with default values', () => {
        const state = new DepthState();
        expect(state.testEnabled).toBe(true);
        expect(state.writeEnabled).toBe(true);
        expect(state.func).toBe(DepthFunc.LESS);
        expect(state.near).toBe(0);
        expect(state.far).toBe(1);
    });

    it('clones correctly', () => {
        const state = new DepthState();
        state.func = DepthFunc.LEQUAL;
        state.writeEnabled = false;

        const clone = state.clone();
        expect(clone.func).toBe(DepthFunc.LEQUAL);
        expect(clone.writeEnabled).toBe(false);
    });

    it('checks equality', () => {
        const state1 = new DepthState();
        const state2 = new DepthState();

        expect(state1.equals(state2)).toBe(true);

        state1.func = DepthFunc.GEQUAL;
        expect(state1.equals(state2)).toBe(false);
    });
});

describe('StencilState', () => {
    it('creates with default values', () => {
        const state = new StencilState();
        expect(state.enabled).toBe(false);
        expect(state.func).toBe('always');
        expect(state.ref).toBe(0);
        expect(state.mask).toBe(0xFF);
        expect(state.failOp).toBe(StencilOp.KEEP);
    });

    it('clones correctly', () => {
        const state = new StencilState();
        state.enabled = true;
        state.ref = 1;
        state.passOp = StencilOp.REPLACE;

        const clone = state.clone();
        expect(clone.enabled).toBe(true);
        expect(clone.ref).toBe(1);
        expect(clone.passOp).toBe(StencilOp.REPLACE);
    });

    it('checks equality', () => {
        const state1 = new StencilState();
        const state2 = new StencilState();

        expect(state1.equals(state2)).toBe(true);

        state1.enabled = true;
        expect(state1.equals(state2)).toBe(false);
    });
});

describe('RasterizerState', () => {
    it('creates with default values', () => {
        const state = new RasterizerState();
        expect(state.cullFace).toBe(CullFace.BACK);
        expect(state.frontFaceCCW).toBe(true);
        expect(state.polygonMode).toBe(PolygonMode.FILL);
        expect(state.scissorEnabled).toBe(false);
        expect(state.lineWidth).toBe(1);
    });

    it('clones correctly', () => {
        const state = new RasterizerState();
        state.cullFace = CullFace.FRONT;
        state.scissorRect = [10, 20, 100, 200];

        const clone = state.clone();
        expect(clone.cullFace).toBe(CullFace.FRONT);
        expect(clone.scissorRect).toEqual([10, 20, 100, 200]);
        expect(clone.scissorRect).not.toBe(state.scissorRect);
    });
});

describe('Viewport', () => {
    it('creates with default values', () => {
        const viewport = new Viewport();
        expect(viewport.x).toBe(0);
        expect(viewport.y).toBe(0);
        expect(viewport.width).toBe(800);
        expect(viewport.height).toBe(600);
    });

    it('creates with custom values', () => {
        const viewport = new Viewport(10, 20, 1920, 1080);
        expect(viewport.x).toBe(10);
        expect(viewport.y).toBe(20);
        expect(viewport.width).toBe(1920);
        expect(viewport.height).toBe(1080);
    });

    it('calculates aspect ratio', () => {
        const viewport = new Viewport(0, 0, 1920, 1080);
        expect(viewport.aspectRatio).toBeCloseTo(16 / 9, 5);
    });

    it('clones correctly', () => {
        const viewport = new Viewport(10, 20, 1920, 1080);
        const clone = viewport.clone();

        expect(clone.x).toBe(10);
        expect(clone.y).toBe(20);
        expect(clone.width).toBe(1920);
        expect(clone.height).toBe(1080);
        expect(clone).not.toBe(viewport);
    });

    it('checks equality', () => {
        const v1 = new Viewport(0, 0, 800, 600);
        const v2 = new Viewport(0, 0, 800, 600);
        const v3 = new Viewport(0, 0, 1920, 1080);

        expect(v1.equals(v2)).toBe(true);
        expect(v1.equals(v3)).toBe(false);
    });
});

describe('RenderState', () => {
    it('creates with all sub-states', () => {
        const state = new RenderState();

        expect(state.blend).toBeInstanceOf(BlendState);
        expect(state.depth).toBeInstanceOf(DepthState);
        expect(state.stencil).toBeInstanceOf(StencilState);
        expect(state.rasterizer).toBeInstanceOf(RasterizerState);
        expect(state.viewport).toBeInstanceOf(Viewport);
        expect(state.colorMask).toEqual([true, true, true, true]);
        expect(state.clearColor).toEqual([0, 0, 0, 1]);
    });

    it('creates opaque preset', () => {
        const state = RenderState.opaque();

        expect(state.blend.enabled).toBe(false);
        expect(state.depth.testEnabled).toBe(true);
        expect(state.depth.writeEnabled).toBe(true);
        expect(state.rasterizer.cullFace).toBe(CullFace.BACK);
    });

    it('creates transparent preset', () => {
        const state = RenderState.transparent();

        expect(state.blend.enabled).toBe(true);
        expect(state.blend.mode).toBe(BlendMode.ALPHA);
        expect(state.depth.testEnabled).toBe(true);
        expect(state.depth.writeEnabled).toBe(false);
        expect(state.rasterizer.cullFace).toBe(CullFace.NONE);
    });

    it('creates additive preset', () => {
        const state = RenderState.additive();

        expect(state.blend.enabled).toBe(true);
        expect(state.blend.mode).toBe(BlendMode.ADDITIVE);
        expect(state.depth.testEnabled).toBe(true);
        expect(state.depth.writeEnabled).toBe(false);
    });

    it('creates wireframe preset', () => {
        const state = RenderState.wireframe();

        expect(state.rasterizer.polygonMode).toBe(PolygonMode.LINE);
        expect(state.rasterizer.cullFace).toBe(CullFace.NONE);
    });

    it('clones completely', () => {
        const state = RenderState.transparent();
        state.clearColor = [0.5, 0.5, 0.5, 1];

        const clone = state.clone();

        expect(clone.blend.mode).toBe(BlendMode.ALPHA);
        expect(clone.depth.writeEnabled).toBe(false);
        expect(clone.clearColor).toEqual([0.5, 0.5, 0.5, 1]);
        expect(clone.clearColor).not.toBe(state.clearColor);
        expect(clone.blend).not.toBe(state.blend);
    });

    it('calculates diff', () => {
        const state1 = RenderState.opaque();
        const state2 = RenderState.transparent();

        const diff = state1.diff(state2);

        expect(diff.blend).toBeDefined();
        expect(diff.depth).toBeDefined();
        expect(diff.rasterizer).toBeDefined();
    });

    it('generates sort key', () => {
        const opaque = RenderState.opaque();
        const transparent = RenderState.transparent();

        const key1 = opaque.getSortKey();
        const key2 = transparent.getSortKey();

        expect(typeof key1).toBe('number');
        expect(typeof key2).toBe('number');
        expect(key1).not.toBe(key2);
    });
});
