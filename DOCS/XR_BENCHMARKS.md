# XR integration benchmarks (draft)

This document captures baseline metrics and targets for XR integration work.

## Baseline metrics to record
- Frame time (ms) and FPS on target hardware.
- CPU/GPU utilization and memory usage.
- Input latency for XR interactions (motion-to-photon).
- Render pass timings for 4D projection + shading.

## Target thresholds (initial)
- **Desktop XR**: 90 FPS sustained, <11ms frame time.
- **Mobile XR**: 72 FPS sustained, <14ms frame time.
- **Latency**: <20ms motion-to-photon.

## Benchmark workflow
1. Select representative scenes (simple, medium, complex).
2. Capture metrics with telemetry spans and profiler tools.
3. Store results in a dated benchmark log for regression tracking.
