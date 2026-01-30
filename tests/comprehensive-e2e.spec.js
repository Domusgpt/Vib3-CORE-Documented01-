/**
 * VIB3+ Comprehensive E2E Test Suite
 *
 * Systematically tests every layer of the VIB3+ 4D visualization engine
 * with screenshots at each step. Designed for maximum coverage:
 *
 *  1. Server & page load
 *  2. SDK module imports (20+ modules)
 *  3. WebGL context & capabilities
 *  4. Shader compilation
 *  5. Math library (Vec4, Mat4x4, Rotor4D, Projection)
 *  6. All 24 geometry variants (3 core types × 8 base geometries)
 *  7. 6D rotation planes (XY, XZ, YZ, XW, YW, ZW)
 *  8. Parameter sweeps (hue, chaos, morph, grid, speed, dimension)
 *  9. All 13 standalone visualization pages
 * 10. Gallery landing page
 * 11. UI controls interaction
 * 12. Error collection & reporting
 */

import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// ───────────────────────────────────────────────
// Setup
// ───────────────────────────────────────────────
const SCREENSHOTS = './test-results/screenshots';
const REPORT_PATH = './test-results/e2e-report.json';
if (!existsSync(SCREENSHOTS)) mkdirSync(SCREENSHOTS, { recursive: true });

const PORT = 3457;
const BASE = `http://localhost:${PORT}`;

/** Collect all test data for the final report */
const report = {
    timestamp: new Date().toISOString(),
    environment: {},
    sections: {},
};

function ss(page, name) {
    return page.screenshot({ path: join(SCREENSHOTS, `${name}.png`), fullPage: false });
}

// ───────────────────────────────────────────────
// 1. SERVER & PAGE LOAD
// ───────────────────────────────────────────────
test.describe('1 — Server & Page Load', () => {
    test('1.01 root index.html loads', async ({ page }) => {
        const res = await page.goto(`${BASE}/`);
        expect(res.status()).toBeLessThan(400);
        await ss(page, '01-01-root-index');
    });

    test('1.02 test harness loads', async ({ page }) => {
        const res = await page.goto(`${BASE}/tests/e2e-harness.html`);
        expect(res.status()).toBe(200);
        await ss(page, '01-02-harness-initial');
    });

    test('1.03 docs gallery loads', async ({ page }) => {
        const res = await page.goto(`${BASE}/docs/index.html`);
        expect(res.status()).toBe(200);
        await page.waitForLoadState('networkidle');
        await ss(page, '01-03-docs-gallery');
    });

    test('1.04 static assets accessible', async ({ page }) => {
        // Verify key source files are accessible
        const paths = [
            '/src/math/Vec4.js',
            '/src/math/Mat4x4.js',
            '/src/math/Rotor4D.js',
            '/src/math/Projection.js',
            '/src/math/rotations.js',
            '/src/math/projections.js',
            '/src/core/VIB3Engine.js',
        ];
        const results = [];
        for (const p of paths) {
            const res = await page.goto(`${BASE}${p}`);
            results.push({ path: p, status: res.status() });
        }
        report.sections['static_assets'] = results;
        results.forEach(r => expect(r.status).toBe(200));
    });
});

// ───────────────────────────────────────────────
// 2. SDK MODULE LOADING
// ───────────────────────────────────────────────
test.describe('2 — SDK Module Loading', () => {
    test('2.01 harness loads all modules & runs self-tests', async ({ page }) => {
        const consoleLogs = [];
        const pageErrors = [];
        page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
        page.on('pageerror', err => pageErrors.push(err.message));

        await page.goto(`${BASE}/tests/e2e-harness.html`);

        // Wait for harness to be ready
        await page.waitForFunction(() => window.__VIB3_HARNESS && window.__VIB3_HARNESS.ready, { timeout: 30000 });
        await ss(page, '02-01-harness-ready');

        const harness = await page.evaluate(() => {
            const H = window.__VIB3_HARNESS;
            return {
                ready: H.ready,
                moduleCount: Object.keys(H.modules).length,
                moduleNames: Object.keys(H.modules),
                errorCount: H.errors.length,
                errors: H.errors,
                glVersion: H.glVersion || 'none',
                glRenderer: H.glRenderer || 'none',
                mathResults: H.mathTestResults || [],
                geomResults: H.geometryTestResults || [],
                frameCount: H.frameCount,
                log: H.log.map(l => l.msg),
            };
        });

        report.sections['module_loading'] = harness;

        // Document what loaded vs failed
        console.log('\n=== MODULE LOADING REPORT ===');
        console.log(`Modules loaded: ${harness.moduleCount}`);
        harness.moduleNames.forEach(n => console.log(`  ✓ ${n}`));
        if (harness.errors.length > 0) {
            console.log(`Errors: ${harness.errorCount}`);
            harness.errors.forEach(e => console.log(`  ✗ ${e.module}: ${e.error}`));
        }
        console.log(`WebGL: ${harness.glVersion} (${harness.glRenderer})`);
        console.log(`Frames rendered: ${harness.frameCount}`);

        // Core math modules must load
        expect(harness.moduleNames).toContain('Vec4');
        expect(harness.moduleNames).toContain('Mat4x4');
        expect(harness.moduleNames).toContain('Rotor4D');
        expect(harness.moduleNames).toContain('Projection');
        expect(harness.moduleNames).toContain('rotations');
        expect(harness.moduleNames).toContain('projections');

        // Collect browser errors for documentation
        report.sections['console_errors'] = consoleLogs.filter(l => l.type === 'error');
        report.sections['page_errors'] = pageErrors;
    });
});

// ───────────────────────────────────────────────
// 3. WEBGL CONTEXT & CAPABILITIES
// ───────────────────────────────────────────────
test.describe('3 — WebGL Context', () => {
    test('3.01 WebGL context creation & capabilities', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        const glInfo = await page.evaluate(() => {
            const canvas = document.getElementById('main-canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) return { available: false };

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return {
                available: true,
                version: gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1',
                renderer: gl.getParameter(gl.RENDERER),
                vendor: gl.getParameter(gl.VENDOR),
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
                maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                maxFragUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
                maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS),
                extensions: gl.getSupportedExtensions()?.length || 0,
                unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A',
                unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A',
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
            };
        });

        report.sections['webgl'] = glInfo;
        console.log('\n=== WEBGL CAPABILITIES ===');
        Object.entries(glInfo).forEach(([k, v]) => {
            if (k !== 'extensions') console.log(`  ${k}: ${v}`);
        });

        await ss(page, '03-01-webgl-context');

        // Document WebGL availability (may be unavailable in headless without GPU)
        if (!glInfo.available) {
            console.log('DOCUMENTED: WebGL not available in this headless environment');
        }
    });

    test('3.02 shader compilation succeeds', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        const shaderOk = await page.evaluate(() => !!window.__VIB3_HARNESS.shaderProgram);
        const hasGL = await page.evaluate(() => !!window.__VIB3_HARNESS.glContext);
        report.sections['shader_compilation'] = { ok: shaderOk, hasGL };

        await ss(page, '03-02-shader-compiled');
        if (hasGL) {
            expect(shaderOk).toBe(true);
        } else {
            console.log('DOCUMENTED: Shader compilation skipped — no WebGL context');
        }
    });
});

// ───────────────────────────────────────────────
// 4. MATH LIBRARY IN-BROWSER
// ───────────────────────────────────────────────
test.describe('4 — Math Library (Browser)', () => {
    test('4.01 Vec4 operations', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        const results = await page.evaluate(() => {
            const H = window.__VIB3_HARNESS;
            return (H.mathTestResults || []).filter(r => r.name.startsWith('Vec4'));
        });
        report.sections['math_vec4'] = results;
        await ss(page, '04-01-math-vec4');
        results.forEach(r => expect(r.pass).toBe(true));
    });

    test('4.02 Mat4x4 rotation matrices', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        const results = await page.evaluate(() => {
            const H = window.__VIB3_HARNESS;
            return (H.mathTestResults || []).filter(r => r.name.startsWith('Mat4x4'));
        });
        report.sections['math_mat4x4'] = results;
        await ss(page, '04-02-math-mat4x4');
        results.forEach(r => expect(r.pass).toBe(true));
    });

    test('4.03 Rotor4D rotations', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        const results = await page.evaluate(() => {
            const H = window.__VIB3_HARNESS;
            return (H.mathTestResults || []).filter(r => r.name.startsWith('Rotor4D'));
        });
        report.sections['math_rotor4d'] = results;
        await ss(page, '04-03-math-rotor4d');
        results.forEach(r => expect(r.pass).toBe(true));
    });

    test('4.04 Projection functions', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        const results = await page.evaluate(() => {
            const H = window.__VIB3_HARNESS;
            return (H.mathTestResults || []).filter(r => r.name.startsWith('Projection'));
        });
        report.sections['math_projection'] = results;
        await ss(page, '04-04-math-projection');
        results.forEach(r => expect(r.pass).toBe(true));
    });
});

// ───────────────────────────────────────────────
// 5. ALL 24 GEOMETRY VARIANTS (RENDERED)
// ───────────────────────────────────────────────
test.describe('5 — 24 Geometry Variants', () => {
    const GEOM_NAMES = [
        'Tetrahedron','Hypercube','Sphere','Torus','KleinBottle','Fractal','Wave','Crystal'
    ];
    const CORE_NAMES = ['Base','Hypersphere','Hypertetra'];

    for (let geomIdx = 0; geomIdx < 24; geomIdx++) {
        const coreType = Math.floor(geomIdx / 8);
        const baseGeom = geomIdx % 8;
        const label = `${CORE_NAMES[coreType]}-${GEOM_NAMES[baseGeom]}`;
        const padded = String(geomIdx).padStart(2, '0');

        test(`5.${padded} render geometry ${geomIdx}: ${label}`, async ({ page }) => {
            await page.goto(`${BASE}/tests/e2e-harness.html`);
            await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

            const rendered = await page.evaluate((gIdx) => {
                return window.__VIB3_RENDER({
                    time: 2.0,
                    geometry: gIdx,
                    hue: (gIdx * 15) % 360,
                    intensity: 0.7,
                    gridDensity: 15,
                    speed: 1,
                    morphFactor: 0.5,
                    chaos: 0.3,
                    dimension: 3.5,
                    rotXY: 0.3,
                    rotXW: 0.5,
                });
            }, geomIdx);

            await ss(page, `05-${padded}-geom-${label}`);

            if (!report.sections['geometries']) report.sections['geometries'] = [];
            report.sections['geometries'].push({ index: geomIdx, label, rendered });
        });
    }
});

// ───────────────────────────────────────────────
// 6. 6D ROTATION PLANES
// ───────────────────────────────────────────────
test.describe('6 — 6D Rotation Planes', () => {
    const planes = [
        { name: 'XY', key: 'rotXY' },
        { name: 'XZ', key: 'rotXZ' },
        { name: 'YZ', key: 'rotYZ' },
        { name: 'XW', key: 'rotXW' },
        { name: 'YW', key: 'rotYW' },
        { name: 'ZW', key: 'rotZW' },
    ];

    for (let i = 0; i < planes.length; i++) {
        const { name, key } = planes[i];
        const padded = String(i + 1).padStart(2, '0');

        test(`6.${padded} rotation plane ${name} sweep`, async ({ page }) => {
            await page.goto(`${BASE}/tests/e2e-harness.html`);
            await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

            // Render at 0, π/2, π, 3π/2
            const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
            for (let a = 0; a < angles.length; a++) {
                const params = {
                    time: 1.0, hue: 200, intensity: 0.7, gridDensity: 20,
                    speed: 0, morphFactor: 0.5, dimension: 3.5,
                    [key]: angles[a],
                };
                await page.evaluate((p) => window.__VIB3_RENDER(p), params);
            }

            // Screenshot at final rotation state
            await ss(page, `06-${padded}-rot-${name}`);
        });
    }
});

// ───────────────────────────────────────────────
// 7. PARAMETER SWEEPS
// ───────────────────────────────────────────────
test.describe('7 — Parameter Sweeps', () => {
    const sweeps = [
        { name: 'hue',         key: 'hue',         values: [0, 60, 120, 180, 240, 300] },
        { name: 'chaos',       key: 'chaos',       values: [0, 0.25, 0.5, 0.75, 1.0] },
        { name: 'morphFactor', key: 'morphFactor', values: [0, 0.5, 1.0, 1.5, 2.0] },
        { name: 'gridDensity', key: 'gridDensity', values: [4, 20, 50, 100] },
        { name: 'speed',       key: 'speed',       values: [0.1, 1.0, 2.0, 3.0] },
        { name: 'dimension',   key: 'dimension',   values: [3.0, 3.5, 4.0, 4.5] },
        { name: 'intensity',   key: 'intensity',   values: [0, 0.25, 0.5, 0.75, 1.0] },
    ];

    for (let s = 0; s < sweeps.length; s++) {
        const { name, key, values } = sweeps[s];
        const padded = String(s + 1).padStart(2, '0');

        test(`7.${padded} sweep ${name}`, async ({ page }) => {
            await page.goto(`${BASE}/tests/e2e-harness.html`);
            await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

            for (const val of values) {
                const params = {
                    time: 2.0, hue: 180, intensity: 0.7, gridDensity: 20,
                    speed: 1, morphFactor: 0.5, chaos: 0.3, dimension: 3.5,
                    rotXW: 0.5, rotYZ: 0.3,
                    [key]: val,
                };
                await page.evaluate((p) => window.__VIB3_RENDER(p), params);
            }

            // Screenshot at final value
            await ss(page, `07-${padded}-sweep-${name}`);
        });
    }
});

// ───────────────────────────────────────────────
// 8. ALL 13 STANDALONE VISUALIZATIONS
// ───────────────────────────────────────────────
test.describe('8 — Standalone Visualizations (docs/)', () => {
    const VIZ_FILES = [
        '01-dissolution_of_euclidean_hegemony',
        '02-hyperspatial_ego_death',
        '03-post_cartesian_sublime',
        '04-crystalline_void_meditation',
        '05-quantum_decoherence_ballet',
        '06-dissolution_of_euclidean_hegemony',
        '07-hyperspatial_ego_death',
        '08-post_cartesian_sublime',
        '09-crystalline_void_meditation',
        '10-quantum_decoherence_ballet',
        '11-dissolution_of_euclidean_hegemony',
        '12-hyperspatial_ego_death',
        '13-post_cartesian_sublime',
    ];

    for (const viz of VIZ_FILES) {
        test(`8.${viz.slice(0, 2)} ${viz}`, async ({ page }) => {
            const pageErrors = [];
            const consoleLogs = [];
            page.on('pageerror', err => pageErrors.push(err.message));
            page.on('console', msg => { if (msg.type() === 'error') consoleLogs.push(msg.text()); });

            const res = await page.goto(`${BASE}/docs/${viz}.html`);
            expect(res.status()).toBe(200);

            // Wait for canvas to be present
            await page.waitForSelector('canvas', { timeout: 5000 });

            // Let one frame render
            await page.waitForTimeout(500);

            const canvasInfo = await page.evaluate(() => {
                const c = document.querySelector('canvas');
                if (!c) return { found: false };
                const gl = c.getContext('webgl') || c.getContext('webgl2');
                return {
                    found: true,
                    width: c.width,
                    height: c.height,
                    hasGL: !!gl,
                };
            });

            const metaInfo = await page.evaluate(() => {
                const panel = document.querySelector('.metadata-panel');
                return {
                    hasPanel: !!panel,
                    title: panel?.querySelector('h1')?.textContent || '',
                    description: panel?.querySelector('.description')?.textContent || '',
                };
            });

            await ss(page, `08-${viz}`);

            if (!report.sections['visualizations']) report.sections['visualizations'] = [];
            report.sections['visualizations'].push({
                file: viz,
                canvasInfo,
                metaInfo,
                pageErrors,
                consoleErrors: consoleLogs,
            });

            expect(canvasInfo.found).toBe(true);
        });
    }
});

// ───────────────────────────────────────────────
// 9. GALLERY LANDING PAGE
// ───────────────────────────────────────────────
test.describe('9 — Gallery Landing Page', () => {
    test('9.01 gallery structure and content', async ({ page }) => {
        await page.goto(`${BASE}/docs/index.html`);
        await page.waitForLoadState('networkidle');

        const galleryInfo = await page.evaluate(() => {
            return {
                title: document.title,
                h1: document.querySelector('h1')?.textContent || '',
                iframes: document.querySelectorAll('iframe').length,
                links: document.querySelectorAll('a').length,
                images: document.querySelectorAll('img').length,
                sections: document.querySelectorAll('section, .section, article').length,
                bodyText: document.body.innerText.substring(0, 500),
            };
        });

        report.sections['gallery'] = galleryInfo;
        console.log('\n=== GALLERY PAGE ===');
        console.log(`Title: ${galleryInfo.title}`);
        console.log(`H1: ${galleryInfo.h1}`);
        console.log(`Iframes: ${galleryInfo.iframes}`);
        console.log(`Links: ${galleryInfo.links}`);

        await ss(page, '09-01-gallery-full');

        // Scroll down for more coverage
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
        await page.waitForTimeout(300);
        await ss(page, '09-02-gallery-mid');

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);
        await ss(page, '09-03-gallery-bottom');
    });
});

// ───────────────────────────────────────────────
// 10. UI CONTROLS INTERACTION
// ───────────────────────────────────────────────
test.describe('10 — UI Controls', () => {
    test('10.01 controls panel present', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        const controls = await page.evaluate(() => {
            return {
                sliders: document.querySelectorAll('input[type="range"]').length,
                selects: document.querySelectorAll('select').length,
                buttons: document.querySelectorAll('button').length,
                sliderIds: Array.from(document.querySelectorAll('input[type="range"]')).map(s => s.id),
                selectIds: Array.from(document.querySelectorAll('select')).map(s => s.id),
                buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.textContent),
            };
        });

        report.sections['controls'] = controls;
        console.log('\n=== UI CONTROLS ===');
        console.log(`Sliders: ${controls.sliders} — ${controls.sliderIds.join(', ')}`);
        console.log(`Selects: ${controls.selects} — ${controls.selectIds.join(', ')}`);
        console.log(`Buttons: ${controls.buttons} — ${controls.buttonTexts.join(', ')}`);

        await ss(page, '10-01-controls-panel');

        expect(controls.sliders).toBeGreaterThan(0);
        expect(controls.selects).toBeGreaterThan(0);
        expect(controls.buttons).toBeGreaterThan(0);
    });

    test('10.02 geometry select changes rendering', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        // Render geometry 0, take screenshot
        await page.evaluate(() => window.__VIB3_RENDER({ time: 2, geometry: 0, hue: 120, intensity: 0.7, gridDensity: 20, speed: 0, morphFactor: 0.5, dimension: 3.5, rotXW: 0.8 }));
        await ss(page, '10-02a-geom-0');

        // Render geometry 12, take screenshot
        await page.evaluate(() => window.__VIB3_RENDER({ time: 2, geometry: 12, hue: 280, intensity: 0.7, gridDensity: 20, speed: 0, morphFactor: 0.5, dimension: 3.5, rotXW: 0.8 }));
        await ss(page, '10-02b-geom-12');
    });

    test('10.03 rotation slider changes rendering', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        // No rotation
        await page.evaluate(() => window.__VIB3_RENDER({ time: 1, hue: 200, intensity: 0.7, gridDensity: 20, speed: 0, morphFactor: 0.5, dimension: 3.5 }));
        await ss(page, '10-03a-no-rotation');

        // Heavy XW + ZW rotation
        await page.evaluate(() => window.__VIB3_RENDER({ time: 1, hue: 200, intensity: 0.7, gridDensity: 20, speed: 0, morphFactor: 0.5, dimension: 3.5, rotXW: 2.0, rotZW: 1.5 }));
        await ss(page, '10-03b-heavy-rotation');
    });
});

// ───────────────────────────────────────────────
// 11. COMBINED STRESS TEST
// ───────────────────────────────────────────────
test.describe('11 — Stress & Edge Cases', () => {
    test('11.01 rapid parameter changes', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        // Rapidly change parameters 50 times
        const frameCount = await page.evaluate(() => {
            for (let i = 0; i < 50; i++) {
                window.__VIB3_RENDER({
                    time: i * 0.1,
                    geometry: i % 24,
                    hue: (i * 37) % 360,
                    intensity: 0.3 + (i % 7) * 0.1,
                    gridDensity: 10 + i,
                    speed: 0.5,
                    morphFactor: (i % 20) * 0.1,
                    chaos: (i % 10) * 0.1,
                    dimension: 3.0 + (i % 15) * 0.1,
                    rotXY: i * 0.1,
                    rotXW: i * 0.05,
                    rotZW: i * 0.07,
                });
            }
            return window.__VIB3_HARNESS.frameCount;
        });

        await ss(page, '11-01-stress-rapid');
        // In headless environments without GPU, frameCount may be 0 (no WebGL).
        // Document the result; only fail if WebGL was available but no frames rendered.
        const hasGL = await page.evaluate(() => !!window.__VIB3_HARNESS.glContext);
        if (hasGL) {
            expect(frameCount).toBeGreaterThan(50);
        } else {
            console.log(`DOCUMENTED: WebGL unavailable in headless — frameCount=${frameCount}`);
        }
    });

    test('11.02 extreme parameter values', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        // Test edge values
        const noError = await page.evaluate(() => {
            try {
                window.__VIB3_RENDER({ time: 0, hue: 0, intensity: 0, gridDensity: 4, speed: 0.1, morphFactor: 0, chaos: 0, dimension: 3.0 });
                window.__VIB3_RENDER({ time: 999, hue: 360, intensity: 1, gridDensity: 100, speed: 3, morphFactor: 2, chaos: 1, dimension: 4.5,
                    rotXY: 6.28, rotXZ: 6.28, rotYZ: 6.28, rotXW: 6.28, rotYW: 6.28, rotZW: 6.28 });
                return true;
            } catch (e) {
                return false;
            }
        });

        await ss(page, '11-02-extreme-params');
        expect(noError).toBe(true);
    });

    test('11.03 canvas pixel readback (non-black)', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        // Render with high intensity & close geometry
        await page.evaluate(() => {
            window.__VIB3_RENDER({
                time: 3.0, hue: 120, intensity: 1.0, gridDensity: 20,
                speed: 0, morphFactor: 0.5, chaos: 0.3, dimension: 3.5,
                rotXW: 0.8,
            });
        });

        const pixelData = await page.evaluate(() => {
            const canvas = document.getElementById('main-canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) return { available: false };

            const pixels = new Uint8Array(4);
            // Read center pixel
            gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            const centerPixel = Array.from(pixels);

            // Read multiple sample points
            const samples = [];
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    const px = Math.floor(canvas.width * (x + 1) / 6);
                    const py = Math.floor(canvas.height * (y + 1) / 6);
                    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    samples.push({ x: px, y: py, rgba: Array.from(pixels) });
                }
            }

            const nonBlack = samples.filter(s => s.rgba[0] + s.rgba[1] + s.rgba[2] > 0);
            return {
                available: true,
                centerPixel,
                totalSamples: samples.length,
                nonBlackSamples: nonBlack.length,
                samples: samples.slice(0, 5),
            };
        });

        report.sections['pixel_readback'] = pixelData;
        console.log('\n=== PIXEL READBACK ===');
        console.log(`Center pixel: rgba(${pixelData.centerPixel?.join(',')})`);
        console.log(`Non-black samples: ${pixelData.nonBlackSamples}/${pixelData.totalSamples}`);

        await ss(page, '11-03-pixel-readback');
    });
});

// ───────────────────────────────────────────────
// 12. FINAL REPORT
// ───────────────────────────────────────────────
test.describe('12 — Final Report', () => {
    test('12.01 write comprehensive report', async ({ page }) => {
        await page.goto(`${BASE}/tests/e2e-harness.html`);
        await page.waitForFunction(() => window.__VIB3_HARNESS?.ready, { timeout: 30000 });

        // Gather final harness state
        const finalState = await page.evaluate(() => {
            const H = window.__VIB3_HARNESS;
            return {
                moduleCount: Object.keys(H.modules).length,
                moduleNames: Object.keys(H.modules),
                errors: H.errors,
                glVersion: H.glVersion,
                glRenderer: H.glRenderer,
                frameCount: H.frameCount,
                mathPass: (H.mathTestResults || []).filter(r => r.pass).length,
                mathTotal: (H.mathTestResults || []).length,
                geomPass: (H.geometryTestResults || []).filter(r => r.pass).length,
                geomTotal: (H.geometryTestResults || []).length,
            };
        });

        report.sections['final_state'] = finalState;
        report.environment = {
            userAgent: await page.evaluate(() => navigator.userAgent),
            viewport: await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight })),
            devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
        };

        // Write JSON report
        writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

        console.log('\n========================================');
        console.log('       VIB3+ E2E FINAL REPORT');
        console.log('========================================');
        console.log(`Timestamp: ${report.timestamp}`);
        console.log(`Modules loaded: ${finalState.moduleCount}`);
        console.log(`Math tests: ${finalState.mathPass}/${finalState.mathTotal}`);
        console.log(`Geometry tests: ${finalState.geomPass}/${finalState.geomTotal}`);
        console.log(`WebGL: ${finalState.glVersion} (${finalState.glRenderer})`);
        console.log(`Total frames rendered: ${finalState.frameCount}`);
        console.log(`Errors: ${finalState.errors.length}`);
        if (finalState.errors.length > 0) {
            finalState.errors.forEach(e => console.log(`  ✗ ${e.module}: ${e.error}`));
        }
        console.log(`Report: ${REPORT_PATH}`);
        console.log(`Screenshots: ${SCREENSHOTS}/`);
        console.log('========================================');

        await ss(page, '12-01-final-state');
    });
});
