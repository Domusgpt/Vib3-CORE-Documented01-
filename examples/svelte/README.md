# VIB3+ Svelte Example

Minimal Svelte integration with `VIB3Engine`.

## Quick Start

```bash
npx sv create my-vib3-app
cd my-vib3-app
npm install @vib3/sdk
```

Copy `index.js` to `src/routes/+page.svelte` (adapt into a proper Svelte component with markup), then:

```bash
npm run dev
```

## What It Shows

- Engine initialization and cleanup via `onMount`/`onDestroy`
- System switching with select control
- Real-time parameter control (geometry, hue, speed)
- Svelte reactive binding pattern for VIB3+
