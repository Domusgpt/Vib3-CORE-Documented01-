const PANEL_ID = 'unified-debug-panel';

function ensurePanelStyles() {
  if (document.getElementById(`${PANEL_ID}-styles`)) return;
  const style = document.createElement('style');
  style.id = `${PANEL_ID}-styles`;
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 320px;
      max-height: 70vh;
      overflow: auto;
      background: rgba(8, 12, 18, 0.92);
      border: 1px solid rgba(0, 255, 170, 0.25);
      border-radius: 10px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
      color: #e8f7ff;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      z-index: 9999;
      padding: 12px;
      backdrop-filter: blur(8px);
    }
    #${PANEL_ID} h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 15px;
      letter-spacing: 0.4px;
    }
    #${PANEL_ID} .controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 8px;
    }
    #${PANEL_ID} button,
    #${PANEL_ID} select,
    #${PANEL_ID} input[type="range"] {
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(0, 255, 170, 0.35);
      color: #e8f7ff;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
    }
    #${PANEL_ID} button:hover {
      background: rgba(0, 255, 170, 0.14);
    }
    #${PANEL_ID} .row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 4px 0;
    }
    #${PANEL_ID} .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      background: rgba(255, 255, 255, 0.03);
      padding: 8px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    #${PANEL_ID} .metric {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
    }
    #${PANEL_ID} .metric span.value {
      font-weight: 700;
      color: #7cf5e0;
      font-size: 13px;
    }
  `;
  document.head.appendChild(style);
}

function createPanel() {
  if (document.getElementById(PANEL_ID)) return;
  ensurePanelStyles();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <h3>🧪 Unified Canvas Debug</h3>
    <div class="controls">
      <button data-action="start">Start</button>
      <button data-action="stop">Stop</button>
      <button data-action="mic">Mic</button>
      <button data-action="diag">Diag</button>
    </div>
    <div class="row">
      <label style="width: 88px;">Health</label>
      <input type="range" data-field="health" min="0" max="1" step="0.01" value="1">
      <span data-label="health" style="width: 38px; text-align: right;">1.00</span>
    </div>
    <div class="row">
      <label style="width: 88px;">Combo</label>
      <input type="range" data-field="combo" min="0" max="4" step="0.1" value="0">
      <span data-label="combo" style="width: 38px; text-align: right;">0.0</span>
    </div>
    <div class="row">
      <label style="width: 88px;">Zone</label>
      <select data-field="zone">
        <option value="calm">calm</option>
        <option value="combat">combat</option>
        <option value="recover">recover</option>
      </select>
    </div>
    <div class="row">
      <label style="width: 88px;">Geometry</label>
      <select data-geometry>
        <option value="cube">cube</option>
        <option value="tesseract">tesseract</option>
      </select>
    </div>
    <div class="row">
      <label style="width: 88px;">Line Width</label>
      <input type="range" data-linewidth min="0.5" max="3" step="0.1" value="1.2">
      <span data-label="linewidth" style="width: 38px; text-align: right;">1.2</span>
    </div>
    <div class="metrics">
      <div class="metric"><span>Energy</span><span class="value" data-value="energy">0.00</span></div>
      <div class="metric"><span>FPS*</span><span class="value" data-value="fps">0</span></div>
      <div class="metric"><span>Width</span><span class="value" data-value="width">-</span></div>
      <div class="metric"><span>Height</span><span class="value" data-value="height">-</span></div>
    </div>
    <small style="display:block;margin-top:6px;color:#a8bacc;">*Approximate; recomputed per second.</small>
  `;

  document.body.appendChild(panel);
  return panel;
}

function wirePanel(panel) {
  const demo = window.vibUnifiedDemo;
  if (!demo) return;

  const energyEl = panel.querySelector('[data-value="energy"]');
  const fpsEl = panel.querySelector('[data-value="fps"]');
  const widthEl = panel.querySelector('[data-value="width"]');
  const heightEl = panel.querySelector('[data-value="height"]');

  let lastTick = performance.now();
  let frameCount = 0;

  const updateMetrics = () => {
    frameCount += 1;
    const now = performance.now();
    if (now - lastTick >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastTick));
      fpsEl.textContent = `${fps}`;
      frameCount = 0;
      lastTick = now;
    }

    const diag = demo.compositor?.getDiagnostics?.();
    energyEl.textContent = demo.inputs?.state?.energy?.toFixed(2) ?? '0.00';
    widthEl.textContent = diag?.drawingBuffer?.width ?? '-';
    heightEl.textContent = diag?.drawingBuffer?.height ?? '-';

    requestAnimationFrame(updateMetrics);
  };

  updateMetrics();

  panel.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'start') demo.start();
      if (action === 'stop') demo.stop();
      if (action === 'mic') demo.inputs?.enableMic?.();
      if (action === 'diag') console.log('🧪 Unified diagnostics', demo.compositor?.getDiagnostics());
    });
  });

  panel.querySelectorAll('input[data-field], select[data-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const field = input.dataset.field;
      const value = field === 'zone' ? input.value : Number(input.value);
      panel.querySelector(`[data-label="${field}"]`).textContent =
        typeof value === 'number' ? value.toFixed(field === 'combo' ? 1 : 2) : value;
      demo.pushTelemetry?.({
        player_health: field === 'health' ? value : undefined,
        combo_multiplier: field === 'combo' ? value : undefined,
        zone: field === 'zone' ? value : undefined
      });
    });
  });

  const geometrySelect = panel.querySelector('[data-geometry]');
  geometrySelect.addEventListener('change', () => {
    demo.setGeometry?.(geometrySelect.value);
  });

  const lineWidthInput = panel.querySelector('[data-linewidth]');
  lineWidthInput.addEventListener('input', () => {
    const width = Number(lineWidthInput.value);
    panel.querySelector('[data-label="linewidth"]').textContent = width.toFixed(1);
    demo.setLineWidth?.(width);
  });
}

function bootPanelWhenReady() {
  if (!window.vibUnifiedDemo) {
    setTimeout(bootPanelWhenReady, 120);
    return;
  }
  const panel = createPanel();
  wirePanel(panel);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootPanelWhenReady();
} else {
  document.addEventListener('DOMContentLoaded', bootPanelWhenReady);
}
