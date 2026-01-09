/**
 * RenderTarget Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    TextureFormat,
    AttachmentType,
    FilterMode,
    WrapMode,
    AttachmentDescriptor,
    RenderTarget,
    RenderTargetPool,
    renderTargetPool
} from '../../src/render/RenderTarget.js';

describe('TextureFormat', () => {
    it('has color formats', () => {
        expect(TextureFormat.RGBA8).toBe('rgba8');
        expect(TextureFormat.RGBA16F).toBe('rgba16f');
        expect(TextureFormat.RGBA32F).toBe('rgba32f');
        expect(TextureFormat.RGB8).toBe('rgb8');
    });

    it('has depth formats', () => {
        expect(TextureFormat.DEPTH16).toBe('depth16');
        expect(TextureFormat.DEPTH24).toBe('depth24');
        expect(TextureFormat.DEPTH32F).toBe('depth32f');
    });

    it('has depth-stencil formats', () => {
        expect(TextureFormat.DEPTH24_STENCIL8).toBe('depth24_stencil8');
        expect(TextureFormat.DEPTH32F_STENCIL8).toBe('depth32f_stencil8');
    });
});

describe('AttachmentType', () => {
    it('has all attachment types', () => {
        expect(AttachmentType.COLOR).toBe('color');
        expect(AttachmentType.DEPTH).toBe('depth');
        expect(AttachmentType.STENCIL).toBe('stencil');
        expect(AttachmentType.DEPTH_STENCIL).toBe('depth_stencil');
    });
});

describe('FilterMode', () => {
    it('has all filter modes', () => {
        expect(FilterMode.NEAREST).toBe('nearest');
        expect(FilterMode.LINEAR).toBe('linear');
        expect(FilterMode.LINEAR_MIPMAP_LINEAR).toBe('linear_mipmap_linear');
    });
});

describe('WrapMode', () => {
    it('has all wrap modes', () => {
        expect(WrapMode.REPEAT).toBe('repeat');
        expect(WrapMode.CLAMP_TO_EDGE).toBe('clamp_to_edge');
        expect(WrapMode.MIRRORED_REPEAT).toBe('mirrored_repeat');
    });
});

describe('AttachmentDescriptor', () => {
    it('creates with default values', () => {
        const desc = new AttachmentDescriptor();

        expect(desc.type).toBe(AttachmentType.COLOR);
        expect(desc.format).toBe(TextureFormat.RGBA8);
        expect(desc.index).toBe(0);
        expect(desc.useTexture).toBe(true);
        expect(desc.minFilter).toBe(FilterMode.LINEAR);
        expect(desc.magFilter).toBe(FilterMode.LINEAR);
        expect(desc.wrapS).toBe(WrapMode.CLAMP_TO_EDGE);
        expect(desc.wrapT).toBe(WrapMode.CLAMP_TO_EDGE);
        expect(desc.generateMipmaps).toBe(false);
        expect(desc.samples).toBe(0);
    });

    it('creates with custom options', () => {
        const desc = new AttachmentDescriptor({
            type: AttachmentType.DEPTH,
            format: TextureFormat.DEPTH32F,
            samples: 4
        });

        expect(desc.type).toBe(AttachmentType.DEPTH);
        expect(desc.format).toBe(TextureFormat.DEPTH32F);
        expect(desc.samples).toBe(4);
    });

    it('creates color attachment', () => {
        const desc = AttachmentDescriptor.color({
            format: TextureFormat.RGBA16F,
            index: 1
        });

        expect(desc.type).toBe(AttachmentType.COLOR);
        expect(desc.format).toBe(TextureFormat.RGBA16F);
        expect(desc.index).toBe(1);
    });

    it('creates depth attachment', () => {
        const desc = AttachmentDescriptor.depth();

        expect(desc.type).toBe(AttachmentType.DEPTH);
        expect(desc.format).toBe(TextureFormat.DEPTH24);
        expect(desc.useTexture).toBe(false);
    });

    it('creates depth-stencil attachment', () => {
        const desc = AttachmentDescriptor.depthStencil();

        expect(desc.type).toBe(AttachmentType.DEPTH_STENCIL);
        expect(desc.format).toBe(TextureFormat.DEPTH24_STENCIL8);
        expect(desc.useTexture).toBe(false);
    });

    it('detects depth format', () => {
        const color = AttachmentDescriptor.color();
        const depth = AttachmentDescriptor.depth();
        const depthStencil = AttachmentDescriptor.depthStencil();

        expect(color.isDepthFormat()).toBe(false);
        expect(depth.isDepthFormat()).toBe(true);
        expect(depthStencil.isDepthFormat()).toBe(true);
    });
});

describe('RenderTarget', () => {
    it('creates with dimensions', () => {
        const target = new RenderTarget(1920, 1080);

        expect(target.width).toBe(1920);
        expect(target.height).toBe(1080);
        expect(target.id).toBeDefined();
    });

    it('creates with default attachments', () => {
        const target = new RenderTarget(800, 600);

        expect(target.colorAttachments.length).toBe(1);
        expect(target.depthAttachment).toBeDefined();
    });

    it('creates with custom attachments', () => {
        const target = new RenderTarget(800, 600, {
            colorAttachments: [
                AttachmentDescriptor.color({ format: TextureFormat.RGBA16F }),
                AttachmentDescriptor.color({ format: TextureFormat.RGBA8, index: 1 })
            ],
            depthAttachment: AttachmentDescriptor.depthStencil()
        });

        expect(target.colorAttachments.length).toBe(2);
        expect(target.depthAttachment.type).toBe(AttachmentType.DEPTH_STENCIL);
    });

    it('calculates aspect ratio', () => {
        const target = new RenderTarget(1920, 1080);

        expect(target.aspectRatio).toBeCloseTo(16 / 9, 5);
    });

    it('checks for depth attachment', () => {
        const withDepth = new RenderTarget(800, 600);
        const withoutDepth = new RenderTarget(800, 600, {
            depthAttachment: null
        });

        expect(withDepth.hasDepth).toBe(true);
        expect(withoutDepth.hasDepth).toBe(false);
    });

    it('gets color attachment count', () => {
        const target = new RenderTarget(800, 600, {
            colorAttachments: [
                AttachmentDescriptor.color(),
                AttachmentDescriptor.color({ index: 1 }),
                AttachmentDescriptor.color({ index: 2 })
            ]
        });

        expect(target.colorAttachmentCount).toBe(3);
    });

    it('resizes', () => {
        const target = new RenderTarget(800, 600);
        target.setHandle({}); // Simulate allocation

        target.resize(1920, 1080);

        expect(target.width).toBe(1920);
        expect(target.height).toBe(1080);
        expect(target._needsReallocation).toBe(true);
    });

    it('does not resize when dimensions unchanged', () => {
        const target = new RenderTarget(800, 600);
        target._needsReallocation = false;

        target.resize(800, 600);

        expect(target._needsReallocation).toBeFalsy();
    });

    it('manages handle', () => {
        const target = new RenderTarget(800, 600);
        const handle = { fb: 1 };

        target.setHandle(handle);

        expect(target.getHandle()).toBe(handle);
        expect(target._allocated).toBe(true);
    });

    it('disposes resources', () => {
        const target = new RenderTarget(800, 600);
        target.setHandle({ fb: 1 });
        target._colorTextures = [{ tex: 1 }];
        target._depthTexture = { tex: 2 };

        target.dispose();

        expect(target.getHandle()).toBeNull();
        expect(target._colorTextures).toEqual([]);
        expect(target._depthTexture).toBeNull();
        expect(target._allocated).toBe(false);
        expect(target._disposed).toBe(true);
    });

    describe('factory methods', () => {
        it('creates simple target', () => {
            const target = RenderTarget.create(800, 600);

            expect(target.colorAttachments.length).toBe(1);
            expect(target.hasDepth).toBe(true);
        });

        it('creates simple target without depth', () => {
            const target = RenderTarget.create(800, 600, { depth: false });

            expect(target.hasDepth).toBe(false);
        });

        it('creates HDR target', () => {
            const target = RenderTarget.createHDR(800, 600);

            expect(target.colorAttachments[0].format).toBe(TextureFormat.RGBA16F);
        });

        it('creates G-buffer', () => {
            const target = RenderTarget.createGBuffer(1920, 1080);

            expect(target.colorAttachments.length).toBe(3);
            expect(target.colorAttachments[0].format).toBe(TextureFormat.RGBA16F);
            expect(target.colorAttachments[1].format).toBe(TextureFormat.RGBA16F);
            expect(target.colorAttachments[2].format).toBe(TextureFormat.RGBA8);
            expect(target.depthAttachment.type).toBe(AttachmentType.DEPTH_STENCIL);
            expect(target.label).toBe('GBuffer');
        });

        it('creates shadow map', () => {
            const target = RenderTarget.createShadowMap(2048);

            expect(target.width).toBe(2048);
            expect(target.height).toBe(2048);
            expect(target.colorAttachments.length).toBe(0);
            expect(target.depthAttachment.format).toBe(TextureFormat.DEPTH32F);
            expect(target.depthAttachment.useTexture).toBe(true);
            expect(target.label).toBe('ShadowMap');
        });

        it('creates MSAA target', () => {
            const target = RenderTarget.createMSAA(800, 600, 4);

            expect(target.colorAttachments[0].samples).toBe(4);
            expect(target.depthAttachment.samples).toBe(4);
            expect(target.label).toBe('MSAA_4x');
        });
    });
});

describe('RenderTargetPool', () => {
    let pool;

    beforeEach(() => {
        pool = new RenderTargetPool();
    });

    it('creates empty pool', () => {
        const stats = pool.getStats();

        expect(stats.pooled).toBe(0);
        expect(stats.inUse).toBe(0);
        expect(stats.poolCount).toBe(0);
    });

    it('acquires new target', () => {
        const target = pool.acquire(800, 600, TextureFormat.RGBA8);

        expect(target).toBeInstanceOf(RenderTarget);
        expect(target.width).toBe(800);
        expect(target.height).toBe(600);

        const stats = pool.getStats();
        expect(stats.inUse).toBe(1);
    });

    it('releases target back to pool', () => {
        const target = pool.acquire(800, 600);

        pool.release(target);

        const stats = pool.getStats();
        expect(stats.pooled).toBe(1);
        expect(stats.inUse).toBe(0);
    });

    it('reuses pooled targets', () => {
        const target1 = pool.acquire(800, 600, TextureFormat.RGBA8);
        pool.release(target1);

        const target2 = pool.acquire(800, 600, TextureFormat.RGBA8);

        expect(target2).toBe(target1);
    });

    it('creates new target when pool empty', () => {
        const target1 = pool.acquire(800, 600);
        const target2 = pool.acquire(800, 600);

        expect(target2).not.toBe(target1);

        const stats = pool.getStats();
        expect(stats.inUse).toBe(2);
    });

    it('separates pools by key', () => {
        const small = pool.acquire(800, 600);
        const large = pool.acquire(1920, 1080);
        const hdr = pool.acquire(800, 600, TextureFormat.RGBA16F);

        pool.release(small);
        pool.release(large);
        pool.release(hdr);

        const stats = pool.getStats();
        expect(stats.poolCount).toBe(3);
        expect(stats.pooled).toBe(3);
    });

    it('clears all pools', () => {
        pool.acquire(800, 600);
        pool.acquire(1920, 1080);

        const target = pool.acquire(640, 480);
        pool.release(target);

        pool.clear();

        const stats = pool.getStats();
        expect(stats.pooled).toBe(0);
        expect(stats.inUse).toBe(0);
        expect(stats.poolCount).toBe(0);
    });

    it('ignores release of unknown target', () => {
        const unknownTarget = new RenderTarget(800, 600);

        pool.release(unknownTarget);

        const stats = pool.getStats();
        expect(stats.pooled).toBe(0);
    });
});

describe('renderTargetPool (global)', () => {
    it('is a RenderTargetPool instance', () => {
        expect(renderTargetPool).toBeInstanceOf(RenderTargetPool);
    });
});
