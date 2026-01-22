# Renderer lifecycle guide

This document describes the renderer lifecycle architecture used by the core visualization systems
and how to integrate new renderers safely. It is intended to keep renderer activation, resizing, and
resource cleanup predictable across Faceted, Holographic, Polychora, and Quantum systems.

## Goals
- Centralize renderer activation/deactivation so systems can be swapped without double-render loops.
- Provide a consistent `renderFrame()` entry point for external orchestration and tooling.
- Track GPU resources with a shared registry to prevent leaks and enable diagnostics.

## Key concepts
### Renderer contract
Renderers should expose the following behaviors:
- `setActive(isActive)` — start/stop internal animation loops (or mark the renderer inactive).
- `renderFrame()` — render a single frame without starting a new loop.
- `resize(width, height)` — update canvas size and viewport.

### Lifecycle manager
Use the lifecycle manager to:
- register renderers by id
- activate one renderer at a time
- forward resize events
- render an explicit frame on demand

### Resource registry
GPU-backed resources (programs, textures, buffers, framebuffers, VAOs, renderbuffers) should be
tracked and disposed through the shared registry to keep memory stable during renderer switching.

## Recommended integration checklist
1. Ensure your renderer implements `setActive()` and `renderFrame()` without side effects.
2. Register the renderer with the lifecycle manager once the system is constructed.
3. Route all resize events through the manager to keep viewports in sync.
4. Use the resource registry in your WebGL backend integration so disposal is centralized.
5. Validate lifecycle behavior by toggling active systems while monitoring resource counts.

## Troubleshooting
- **Duplicate animation loops:** verify `setActive(false)` stops any timers or rAF loops.
- **Black frames on switch:** call `resize()` before `renderFrame()` when activating a renderer.
- **GPU memory growth:** ensure resource creation and deletion always passes through the registry.
