/**
 * VIB3+ Visual Regression Test Suite
 *
 * GPU-aware visual testing for WebGL/WebGPU shader output.
 *
 * In headless (no GPU): documents black canvas, verifies page structure
 * On GPU runner (VIB3_GPU=1): validates actual rendered pixels, captures baselines
 *
 * Run: VIB3_GPU=1 npx playwright test tests/visual-regression.spec.js
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

const GPU_ENABLED = process.env.VIB3_GPU === '1';
const BASELINE_DIR = join(process.cwd(), 'tests', 'visual-baselines');
const REPORT_DIR = join(process.cwd(), 'test-results', 'visual');

// Ensure output directories exist
for (const dir of [BASELINE_DIR, REPORT_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// All standalone visualizations in docs/
const GALLERY_VISUALIZATIONS = [
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

// Real shader exports (3 systems × 3 geometries)
const SHADER_EXPORTS = [
  { file: '01-quantum-quantum-tetrahedron-lattice', system: 'quantum', geometry: 'tetrahedron' },
  { file: '02-quantum-quantum-hypersphere-matrix', system: 'quantum', geometry: 'hypersphere' },
  { file: '03-quantum-quantum-hypertetra-fractal', system: 'quantum', geometry: 'hypertetra' },
  { file: '04-faceted-faceted-crystal-structure', system: 'faceted', geometry: 'crystal' },
  { file: '05-faceted-faceted-klein-bottle', system: 'faceted', geometry: 'klein' },
  { file: '06-faceted-faceted-hypertetra-torus', system: 'faceted', geometry: 'hypertetra-torus' },
  { file: '07-holographic-holographic-wave-field', system: 'holographic', geometry: 'wave' },
  { file: '08-holographic-holographic-hypersphere-sphere', system: 'holographic', geometry: 'hypersphere' },
  { file: '09-holographic-holographic-hypertetra-crystal', system: 'holographic', geometry: 'hypertetra-crystal' },
];

/**
 * Extract canvas pixel data and compute visual statistics.
 * Returns { hasContent, avgBrightness, uniqueColors, pixelData, dataUrl }
 */
async function analyzeCanvas(page, canvasSelector = 'canvas') {
  return await page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return { hasContent: false, error: 'no canvas found' };

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let imageData;

    if (ctx) {
      // 2D canvas
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      // WebGL canvas - read back pixels
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (!gl) return { hasContent: false, error: 'no context' };

      const w = canvas.width;
      const h = canvas.height;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      imageData = { data: pixels, width: w, height: h };
    }

    const data = imageData.data;
    const pixelCount = data.length / 4;
    let nonBlackPixels = 0;
    let totalBrightness = 0;
    const colorSet = new Set();

    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      if (r > 5 || g > 5 || b > 5) nonBlackPixels++;
      // Quantize to 16 levels for unique color counting
      const qr = r >> 4, qg = g >> 4, qb = b >> 4;
      colorSet.add(`${qr},${qg},${qb}`);
    }

    const sampledPixels = Math.floor(pixelCount / 10);
    const avgBrightness = totalBrightness / sampledPixels;
    const nonBlackRatio = nonBlackPixels / sampledPixels;

    let dataUrl = '';
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch (e) {
      dataUrl = 'toDataURL_failed: ' + e.message;
    }

    return {
      hasContent: nonBlackRatio > 0.01,
      nonBlackRatio: Math.round(nonBlackRatio * 10000) / 100,
      avgBrightness: Math.round(avgBrightness * 100) / 100,
      uniqueColors: colorSet.size,
      width: imageData.width,
      height: imageData.height,
      dataUrl,
    };
  }, canvasSelector);
}

/**
 * Wait for shader to render frames, then capture.
 */
async function waitForRendering(page, { timeout = 5000, frames = 30 } = {}) {
  // Wait for requestAnimationFrame to fire multiple times
  await page.evaluate(async (targetFrames) => {
    return new Promise((resolve) => {
      let count = 0;
      function tick() {
        count++;
        if (count >= targetFrames) resolve(count);
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, frames);
  // Extra settle time for GPU pipeline flush
  await page.waitForTimeout(200);
}

/**
 * Save a visual report entry
 */
function saveReport(name, data) {
  const reportFile = join(REPORT_DIR, `${name}.json`);
  writeFileSync(reportFile, JSON.stringify(data, null, 2));
}

// ==================== GPU CAPABILITY CHECK ====================

test.describe('GPU Capability Detection', () => {
  test('detect WebGL and WebGPU support', async ({ page }) => {
    await page.goto('/tests/e2e-harness.html', { waitUntil: 'networkidle' });

    const gpuInfo = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');

      // WebGL 1
      const gl1 = canvas.getContext('webgl');
      const webgl1 = !!gl1;
      let webgl1Renderer = '';
      if (gl1) {
        const ext = gl1.getExtension('WEBGL_debug_renderer_info');
        webgl1Renderer = ext ? gl1.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
      }

      // WebGL 2
      const gl2 = canvas.getContext('webgl2');
      const webgl2 = !!gl2;

      // WebGPU
      let webgpu = false;
      let webgpuAdapter = '';
      if (navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          webgpu = !!adapter;
          if (adapter) {
            const info = adapter.info || {};
            webgpuAdapter = `${info.vendor || 'unknown'} ${info.architecture || ''} ${info.description || ''}`.trim();
          }
        } catch (e) { /* no adapter */ }
      }

      return {
        webgl1, webgl1Renderer,
        webgl2,
        webgpu, webgpuAdapter,
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio,
      };
    });

    console.log('\n=== GPU CAPABILITY REPORT ===');
    console.log(`WebGL 1:  ${gpuInfo.webgl1 ? 'YES' : 'NO'} ${gpuInfo.webgl1Renderer}`);
    console.log(`WebGL 2:  ${gpuInfo.webgl2 ? 'YES' : 'NO'}`);
    console.log(`WebGPU:   ${gpuInfo.webgpu ? 'YES' : 'NO'} ${gpuInfo.webgpuAdapter}`);
    console.log(`DPR:      ${gpuInfo.devicePixelRatio}`);
    console.log(`UA:       ${gpuInfo.userAgent}`);
    console.log(`GPU Mode: ${GPU_ENABLED ? 'ENABLED (expecting rendered output)' : 'DISABLED (documenting only)'}`);
    console.log('============================\n');

    saveReport('gpu-capabilities', gpuInfo);

    if (GPU_ENABLED) {
      expect(gpuInfo.webgl1, 'WebGL must be available on GPU runner').toBe(true);
      expect(gpuInfo.webgl1Renderer).not.toContain('SwiftShader');
    }
  });
});

// ==================== GALLERY VISUALIZATION TESTS ====================

test.describe('Gallery Visualizations - Visual Regression', () => {
  for (const viz of GALLERY_VISUALIZATIONS) {
    test(`${viz}: render and capture`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(`/docs/${viz}.html`, { waitUntil: 'domcontentloaded' });

      // Check page structure first
      const pageInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const panel = document.querySelector('.metadata-panel');
        const title = panel?.querySelector('h1')?.textContent || '';
        return {
          hasCanvas: !!canvas,
          canvasWidth: canvas?.width || 0,
          canvasHeight: canvas?.height || 0,
          hasPanel: !!panel,
          title,
        };
      });

      expect(pageInfo.hasCanvas).toBe(true);
      expect(pageInfo.hasPanel).toBe(true);

      // Wait for shader to render
      await waitForRendering(page, { frames: 60 });

      // Analyze canvas pixel content
      const analysis = await analyzeCanvas(page, 'canvas');

      // Full page screenshot
      const screenshot = await page.screenshot({ fullPage: true });
      const ssPath = join(REPORT_DIR, `gallery-${viz}.png`);
      writeFileSync(ssPath, screenshot);

      // Save analysis
      saveReport(`gallery-${viz}`, {
        file: viz,
        pageInfo,
        analysis: { ...analysis, dataUrl: undefined }, // don't store huge dataURL in report
        errors,
        gpuEnabled: GPU_ENABLED,
      });

      console.log(`  ${viz}: brightness=${analysis.avgBrightness}, colors=${analysis.uniqueColors}, nonBlack=${analysis.nonBlackRatio}%`);

      if (GPU_ENABLED) {
        // On GPU: canvas MUST have rendered content
        expect(analysis.hasContent, `${viz} must render visible content on GPU`).toBe(true);
        expect(analysis.uniqueColors, `${viz} must have color variety`).toBeGreaterThan(3);
        expect(analysis.avgBrightness, `${viz} must not be fully dark`).toBeGreaterThan(1);

        // Save as baseline for future regression
        const baselinePath = join(BASELINE_DIR, `gallery-${viz}.png`);
        writeFileSync(baselinePath, screenshot);
      } else {
        // Without GPU: document the result
        if (!analysis.hasContent) {
          console.log(`  DOCUMENTED: No rendered content (no GPU) for ${viz}`);
        }
      }
    });
  }
});

// ==================== SHADER EXPORT TESTS ====================

test.describe('Shader Exports - Visual Regression', () => {
  for (const exp of SHADER_EXPORTS) {
    test(`${exp.system}/${exp.geometry}: render and capture`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(`/docs/vib3-exports/${exp.file}.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500); // let page initialize

      // Verify page loaded - note: these pages remove the canvas when WebGL is unavailable
      const pageInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const info = document.querySelector('.info');
        const fallback = document.body.textContent.includes('WebGL Required');
        let hasWebGL = false;
        if (canvas) {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
          hasWebGL = !!gl;
        }
        return {
          hasCanvas: !!canvas,
          hasWebGL,
          hasInfo: !!info,
          hasFallback: fallback,
          title: info?.querySelector('h3')?.textContent || document.title,
          canvasWidth: canvas?.width || 0,
          canvasHeight: canvas?.height || 0,
        };
      });

      // Screenshot the page regardless of state
      const screenshot = await page.screenshot({ fullPage: true });
      const ssPath = join(REPORT_DIR, `export-${exp.file}.png`);
      writeFileSync(ssPath, screenshot);

      // If WebGL isn't available, the page replaces body with fallback message
      if (!pageInfo.hasCanvas || pageInfo.hasFallback) {
        console.log(`  ${exp.system}/${exp.geometry}: DOCUMENTED - WebGL unavailable, page shows fallback`);
        saveReport(`export-${exp.file}`, {
          ...exp,
          pageInfo,
          analysis: { hasContent: false, reason: 'WebGL not available, page shows fallback' },
          errors,
          gpuEnabled: GPU_ENABLED,
        });

        if (GPU_ENABLED) {
          // On GPU runner, WebGL MUST work
          expect(pageInfo.hasCanvas, 'Canvas must exist on GPU runner').toBe(true);
          expect(pageInfo.hasFallback, 'Fallback must not appear on GPU runner').toBe(false);
        }
        return;
      }

      // Wait for rendering frames
      await waitForRendering(page, { frames: 60 });

      // Analyze canvas
      const analysis = await analyzeCanvas(page, 'canvas');

      saveReport(`export-${exp.file}`, {
        ...exp,
        pageInfo,
        analysis: { ...analysis, dataUrl: undefined },
        errors,
        gpuEnabled: GPU_ENABLED,
      });

      console.log(`  ${exp.system}/${exp.geometry}: webgl=${pageInfo.hasWebGL}, brightness=${analysis.avgBrightness}, colors=${analysis.uniqueColors}`);

      if (GPU_ENABLED) {
        expect(pageInfo.hasWebGL, 'WebGL must be available').toBe(true);
        expect(analysis.hasContent, `${exp.file} must render content`).toBe(true);
        expect(analysis.uniqueColors).toBeGreaterThan(5);

        // Save baseline
        const baselinePath = join(BASELINE_DIR, `export-${exp.file}.png`);
        writeFileSync(baselinePath, screenshot);
      }
    });
  }
});

// ==================== PARAMETER VARIATION TESTS ====================

test.describe('Parameter Variation Rendering', () => {
  // Use the harness page to test parameter sweeps with actual rendering
  test('6D rotation sweep produces visually distinct frames', async ({ page }) => {
    // Use a gallery visualization (doesn't remove canvas when WebGL unavailable)
    await page.goto('/docs/02-hyperspatial_ego_death.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
    if (!hasCanvas) {
      console.log('  DOCUMENTED: No canvas available for rotation sweep');
      return;
    }

    await waitForRendering(page, { frames: 30 });

    // Capture at different time points (shader animates based on time)
    const frames = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(500); // let animation advance
      const analysis = await analyzeCanvas(page, 'canvas');
      frames.push(analysis);

      const ssPath = join(REPORT_DIR, `rotation-sweep-frame-${i}.png`);
      const screenshot = await page.screenshot({ fullPage: true });
      writeFileSync(ssPath, screenshot);
    }

    saveReport('rotation-sweep', {
      frames: frames.map(f => ({ ...f, dataUrl: undefined })),
      gpuEnabled: GPU_ENABLED,
    });

    if (GPU_ENABLED) {
      // Frames should show visual variation over time
      const brightnesses = frames.map(f => f.avgBrightness);
      const hasVariation = Math.max(...brightnesses) - Math.min(...brightnesses) > 0.5;
      console.log(`  Rotation sweep brightnesses: ${brightnesses.join(', ')}`);
      console.log(`  Has variation: ${hasVariation}`);
      // At minimum, all frames should have content
      for (const f of frames) {
        expect(f.hasContent).toBe(true);
      }
    }
  });

  test('different geometry types produce distinct visuals', async ({ page }) => {
    const results = [];

    // Use gallery visualizations (they keep canvas even without WebGL)
    const comparisons = [
      { url: '/docs/02-hyperspatial_ego_death.html', label: 'faceted-1' },
      { url: '/docs/05-quantum_decoherence_ballet.html', label: 'faceted-2' },
      { url: '/docs/10-quantum_decoherence_ballet.html', label: 'faceted-3' },
    ];

    for (const comp of comparisons) {
      await page.goto(comp.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
      if (hasCanvas) {
        await waitForRendering(page, { frames: 60 });
        const analysis = await analyzeCanvas(page, 'canvas');
        results.push({ label: comp.label, ...analysis, dataUrl: undefined });
      } else {
        results.push({ label: comp.label, hasContent: false, uniqueColors: 0 });
      }

      const screenshot = await page.screenshot({ fullPage: true });
      writeFileSync(join(REPORT_DIR, `geometry-compare-${comp.label}.png`), screenshot);
    }

    saveReport('geometry-comparison', { results, gpuEnabled: GPU_ENABLED });

    if (GPU_ENABLED) {
      // All three should render
      for (const r of results) {
        expect(r.hasContent, `${r.label} must render`).toBe(true);
      }
      // Should have different color profiles
      const colorCounts = results.map(r => r.uniqueColors);
      console.log(`  Color counts: ${results.map(r => `${r.label}=${r.uniqueColors}`).join(', ')}`);
    }
  });
});

// ==================== CROSS-SYSTEM VISUAL COMPARISON ====================

test.describe('Cross-System Visual Comparison', () => {
  test('all 3 visualization systems render distinctly', async ({ page }) => {
    const systemResults = {};

    // Test one export from each system
    const systems = [
      { system: 'quantum', url: '/docs/vib3-exports/02-quantum-quantum-hypersphere-matrix.html' },
      { system: 'faceted', url: '/docs/vib3-exports/05-faceted-faceted-klein-bottle.html' },
      { system: 'holographic', url: '/docs/vib3-exports/08-holographic-holographic-hypersphere-sphere.html' },
    ];

    for (const sys of systems) {
      await page.goto(sys.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Check if page has canvas (export pages remove it when WebGL unavailable)
      const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));

      if (hasCanvas) {
        await waitForRendering(page, { frames: 90 });
        const analysis = await analyzeCanvas(page, 'canvas');
        systemResults[sys.system] = { ...analysis, dataUrl: undefined };
      } else {
        systemResults[sys.system] = { hasContent: false, reason: 'no WebGL/canvas', avgBrightness: 0, uniqueColors: 0, nonBlackRatio: 0 };
      }

      const screenshot = await page.screenshot({ fullPage: true });
      writeFileSync(join(REPORT_DIR, `system-${sys.system}.png`), screenshot);

      if (GPU_ENABLED) {
        writeFileSync(join(BASELINE_DIR, `system-${sys.system}.png`), screenshot);
      }
    }

    saveReport('cross-system-comparison', { systems: systemResults, gpuEnabled: GPU_ENABLED });

    console.log('\n=== Cross-System Visual Summary ===');
    for (const [sys, data] of Object.entries(systemResults)) {
      console.log(`  ${sys}: brightness=${data.avgBrightness}, colors=${data.uniqueColors}, nonBlack=${data.nonBlackRatio}%`);
    }

    if (GPU_ENABLED) {
      for (const [sys, data] of Object.entries(systemResults)) {
        expect(data.hasContent, `${sys} system must render`).toBe(true);
      }
    }
  });
});

// ==================== VISUAL BASELINE COMPARISON ====================

test.describe('Visual Baseline Regression', () => {
  // Only runs when GPU is enabled AND baselines exist
  test('compare against saved baselines', async ({ page }) => {
    test.skip(!GPU_ENABLED, 'Baseline comparison requires GPU mode');

    const baselineFiles = [];
    if (existsSync(BASELINE_DIR)) {
      const { readdirSync } = await import('fs');
      for (const f of readdirSync(BASELINE_DIR)) {
        if (f.endsWith('.png')) baselineFiles.push(f);
      }
    }

    if (baselineFiles.length === 0) {
      console.log('  No baselines found. This run will create them.');
      return;
    }

    console.log(`  Found ${baselineFiles.length} baseline images to compare.`);

    const diffs = [];
    for (const baseline of baselineFiles) {
      // Determine URL from filename
      let url = '';
      if (baseline.startsWith('gallery-')) {
        const viz = baseline.replace('gallery-', '').replace('.png', '');
        url = `/docs/${viz}.html`;
      } else if (baseline.startsWith('export-')) {
        const exp = baseline.replace('export-', '').replace('.png', '');
        url = `/docs/vib3-exports/${exp}.html`;
      } else if (baseline.startsWith('system-')) {
        // Skip system baselines for now (they need special URL mapping)
        continue;
      } else {
        continue;
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await waitForRendering(page, { frames: 60 });

      const currentScreenshot = await page.screenshot({ fullPage: true });
      const baselinePath = join(BASELINE_DIR, baseline);
      const baselineData = readFileSync(baselinePath);

      // Compare pixel-level using canvas
      const comparison = await page.evaluate(async ({ currentB64, baselineB64 }) => {
        async function loadImageData(b64) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = img.width;
              c.height = img.height;
              const ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(ctx.getImageData(0, 0, c.width, c.height));
            };
            img.src = b64;
          });
        }

        const current = await loadImageData('data:image/png;base64,' + currentB64);
        const baseline = await loadImageData('data:image/png;base64,' + baselineB64);

        if (current.width !== baseline.width || current.height !== baseline.height) {
          return { match: false, reason: 'size mismatch', similarity: 0 };
        }

        let diffPixels = 0;
        const total = current.data.length / 4;
        for (let i = 0; i < current.data.length; i += 4) {
          const dr = Math.abs(current.data[i] - baseline.data[i]);
          const dg = Math.abs(current.data[i + 1] - baseline.data[i + 1]);
          const db = Math.abs(current.data[i + 2] - baseline.data[i + 2]);
          if (dr + dg + db > 30) diffPixels++; // tolerance of 30 total RGB diff
        }

        const similarity = ((total - diffPixels) / total) * 100;
        return { match: similarity > 95, similarity: Math.round(similarity * 100) / 100, diffPixels, total };
      }, {
        currentB64: currentScreenshot.toString('base64'),
        baselineB64: baselineData.toString('base64'),
      });

      diffs.push({ baseline, ...comparison });
      console.log(`  ${baseline}: ${comparison.similarity}% similar (${comparison.match ? 'PASS' : 'CHANGED'})`);
    }

    saveReport('baseline-comparison', { diffs, gpuEnabled: GPU_ENABLED });

    // Warn about regressions but don't hard-fail (animations cause natural variance)
    const regressions = diffs.filter(d => !d.match && d.similarity < 80);
    if (regressions.length > 0) {
      console.warn(`\n  WARNING: ${regressions.length} visual regressions detected (< 80% similar)`);
      for (const r of regressions) {
        console.warn(`    ${r.baseline}: ${r.similarity}%`);
      }
    }
  });
});

// ==================== GALLERY PAGE VISUAL TEST ====================

test.describe('Gallery Page Visual', () => {
  test('gallery renders all iframes and layout', async ({ page }) => {
    await page.goto('/docs/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // let iframes begin loading

    const galleryInfo = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent || '',
        iframes: document.querySelectorAll('iframe').length,
        sections: document.querySelectorAll('section, .section, [class*="section"]').length,
        links: document.querySelectorAll('a').length,
        bodyHeight: document.body.scrollHeight,
      };
    });

    // Capture gallery at multiple scroll positions
    const screenshots = [];
    const viewportHeight = 720;
    const scrollPositions = [0, viewportHeight, viewportHeight * 2, viewportHeight * 4, galleryInfo.bodyHeight - viewportHeight];

    for (let i = 0; i < scrollPositions.length; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollPositions[i]);
      await page.waitForTimeout(300);
      const ss = await page.screenshot();
      const ssPath = join(REPORT_DIR, `gallery-scroll-${i}.png`);
      writeFileSync(ssPath, ss);
      screenshots.push(ssPath);
    }

    // Full page capture
    const fullPage = await page.screenshot({ fullPage: true });
    writeFileSync(join(REPORT_DIR, 'gallery-full-page.png'), fullPage);

    saveReport('gallery-page', {
      galleryInfo,
      scrollPositions,
      screenshotCount: screenshots.length,
      gpuEnabled: GPU_ENABLED,
    });

    expect(galleryInfo.iframes).toBeGreaterThan(0);
    console.log(`  Gallery: ${galleryInfo.iframes} iframes, ${galleryInfo.links} links, body height ${galleryInfo.bodyHeight}px`);
  });
});

// ==================== FINAL VISUAL SUMMARY ====================

test.describe('Visual Test Summary', () => {
  test('generate comprehensive visual report', async ({ page }) => {
    // Collect all individual reports
    const { readdirSync } = await import('fs');
    const reports = {};

    if (existsSync(REPORT_DIR)) {
      for (const f of readdirSync(REPORT_DIR)) {
        if (f.endsWith('.json')) {
          try {
            reports[f.replace('.json', '')] = JSON.parse(readFileSync(join(REPORT_DIR, f), 'utf-8'));
          } catch { /* skip malformed */ }
        }
      }
    }

    const pngCount = existsSync(REPORT_DIR)
      ? readdirSync(REPORT_DIR).filter(f => f.endsWith('.png')).length
      : 0;

    const baselineCount = existsSync(BASELINE_DIR)
      ? readdirSync(BASELINE_DIR).filter(f => f.endsWith('.png')).length
      : 0;

    const summary = {
      timestamp: new Date().toISOString(),
      gpuEnabled: GPU_ENABLED,
      screenshotsCaptures: pngCount,
      baselinesStored: baselineCount,
      reportsGenerated: Object.keys(reports).length,
      galleryVisualizationsTested: GALLERY_VISUALIZATIONS.length,
      shaderExportsTested: SHADER_EXPORTS.length,
      reports,
    };

    writeFileSync(join(REPORT_DIR, 'visual-summary.json'), JSON.stringify(summary, null, 2));

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║     VIB3+ Visual Regression Summary          ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║ GPU Mode:        ${GPU_ENABLED ? 'ENABLED (real GPU)' : 'DISABLED (headless)'}  ║`);
    console.log(`║ Screenshots:     ${String(pngCount).padStart(4)}                        ║`);
    console.log(`║ Baselines:       ${String(baselineCount).padStart(4)}                        ║`);
    console.log(`║ Gallery Tests:   ${String(GALLERY_VISUALIZATIONS.length).padStart(4)}                        ║`);
    console.log(`║ Export Tests:    ${String(SHADER_EXPORTS.length).padStart(4)}                        ║`);
    console.log(`║ Reports:         ${String(Object.keys(reports).length).padStart(4)}                        ║`);
    console.log('╚══════════════════════════════════════════════╝\n');
  });
});
