# VIB3+ Vue 3 Example

Minimal Vue 3 Composition API integration with `VIB3Engine`.

## Quick Start

```bash
npm create vue@latest my-vib3-app
cd my-vib3-app
npm install @vib3/sdk
```

Copy `index.js` to `src/App.vue` (adapt into a proper SFC with `<template>`, `<script setup>`, and `<style>` sections), then:

```bash
npm run dev
```

## What It Shows

- Engine initialization and cleanup via `onMounted`/`onUnmounted`
- Reactive system switching with `watch()`
- Real-time parameter control (geometry, hue, speed)
- Composition API pattern for VIB3+ integration
