# Contributing to VIB3+ CORE

Thank you for your interest in contributing to VIB3+.

## Getting Started

```bash
git clone https://github.com/Domusgpt/Vib3-CORE-Documented01-.git
cd Vib3-CORE-Documented01-
npm install
npm run dev
```

## Development

- `npm run dev` — Start dev server with hot reload
- `npm test` — Run unit tests (Vitest)
- `npm run test:e2e` — Run E2E tests (Playwright, requires `npx playwright install`)
- `npm run verify:shaders` — Verify inline shaders match external files
- `npm run storybook` — Launch Storybook component browser

## Project Structure

See [CLAUDE.md](CLAUDE.md) for full technical reference. Key directories:

- `src/core/` — Engine orchestration
- `src/quantum/`, `src/faceted/`, `src/holograms/` — Visualization systems
- `src/geometry/` — 24-geometry system
- `src/render/` — WebGL/WebGPU backends
- `src/creative/` — Color presets, transitions, post-FX, timeline
- `src/integrations/` — React, Vue, Svelte, Figma, Three.js, TouchDesigner, OBS
- `src/advanced/` — WebXR, WebGPU compute, MIDI, AI presets, OffscreenWorker

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `npm test` and `npm run verify:shaders`
5. Commit with clear messages
6. Open a PR against `main`

## Code Style

- ES modules (`import`/`export`)
- JSDoc comments on public APIs
- No TypeScript in source (types are in `types/` as `.d.ts` declarations)
- Follow existing patterns in the codebase

## Reporting Issues

Use GitHub Issues with the provided templates (Bug Report or Feature Request).
