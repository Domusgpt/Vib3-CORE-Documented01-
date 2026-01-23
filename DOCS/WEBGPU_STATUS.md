# WebGPU status and testing requirements

This document records the current WebGPU backend state, what is implemented, and what is required
to validate it in local development or CI.

## Current status
- **Backend scaffold:** `WebGPUBackend` initializes adapter/device, configures the canvas, manages
  resize, and supports a clear-pass `renderFrame()` path.
- **Async context creation:** `createRenderContextAsync()` can instantiate WebGPU contexts using
  `{ backend: 'webgpu' }`.
- **Resource tracking:** depth textures are registered in the shared `RenderResourceRegistry`.

## What is still needed
1. **Pipeline parity:** implement basic shader pipelines (vertex/fragment) and buffer binding that
   match the WebGL backend command flow.
2. **Command buffer bridge:** map existing render commands to WebGPU render passes.
3. **Feature gating:** add host-app controls to toggle WebGPU via feature flags.
4. **Diagnostics:** add per-frame stats and resource delta reporting for WebGPU.

## Testing requirements
### Local smoke test
Prerequisites:
- A browser with WebGPU enabled (Chrome/Edge with `chrome://flags/#enable-unsafe-webgpu`, or a
  Chromium build with WebGPU support).
- A device with WebGPU-capable GPU drivers.

Suggested smoke flow:
1. Create a canvas and call `createRenderContextAsync(canvas, { backend: 'webgpu' })`.
2. Call `backend.renderFrame({ clearColor: [0.1, 0.1, 0.2, 1] })` and confirm the canvas clears.
3. Resize the canvas and ensure the clear pass still succeeds.

### CI validation
- WebGPU cannot be reliably validated in headless CI without GPU support.
- CI should instead run WebGL tests and lint/static checks; keep a manual WebGPU smoke checklist.

## File locations
- `src/render/backends/WebGPUBackend.js`
- `src/render/index.js` (`createRenderContextAsync`)
