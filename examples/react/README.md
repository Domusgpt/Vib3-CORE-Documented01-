# VIB3+ React Example

Minimal React integration using `VIB3Engine` with system switching, geometry selection, and hue control.

## Quick Start

```bash
npx create-vite my-vib3-app --template react
cd my-vib3-app
npm install @vib3code/sdk
```

Copy `index.jsx` to `src/App.jsx`, then:

```bash
npm run dev
```

## What It Shows

- Engine initialization and cleanup via `useEffect`
- System switching (Quantum / Faceted / Holographic)
- Real-time parameter control (geometry, hue)
- Proper cleanup on unmount
