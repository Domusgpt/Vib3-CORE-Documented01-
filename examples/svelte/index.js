/**
 * VIB3+ Svelte Example
 *
 * Run:
 *   npx sv create my-vib3-app
 *   cd my-vib3-app
 *   npm install @vib3code/sdk
 *   # Copy this file to src/routes/+page.svelte (adapt into Svelte syntax)
 *   npm run dev
 *
 * This file demonstrates the Svelte integration pattern.
 * In a real .svelte file, the script and markup are combined.
 */

// --- Svelte script logic (goes in <script>) ---

import { onMount, onDestroy } from 'svelte';
// In a real project: import { VIB3Engine } from '@vib3code/sdk/core';
import { VIB3Engine } from '../../src/core/VIB3Engine.js';

const SYSTEMS = ['quantum', 'faceted', 'holographic'];

let system = 'quantum';
let geometry = 0;
let hue = 200;
let speed = 1;
let engine = null;

onMount(async () => {
    engine = new VIB3Engine();
    await engine.initialize();
    await engine.switchSystem(system);
});

onDestroy(() => {
    if (engine && engine.destroy) engine.destroy();
});

function onSystemChange(e) {
    system = e.target.value;
    if (engine) engine.switchSystem(system);
}

function onGeometryChange(e) {
    geometry = +e.target.value;
    if (engine) engine.setParameter('geometry', geometry);
}

function onHueChange(e) {
    hue = +e.target.value;
    if (engine) engine.setParameter('hue', hue);
}

function onSpeedChange(e) {
    speed = +e.target.value;
    if (engine) engine.setParameter('speed', speed);
}

/*
  --- Svelte Template ---

  <div class="vib3-app">
    <h1>VIB3+ Svelte Example</h1>
    <div id="vib3-container" class="canvas-area"></div>
    <div class="controls">
      <label>
        System:
        <select bind:value={system} on:change={onSystemChange}>
          {#each SYSTEMS as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </label>
      <label>
        Geometry ({geometry}):
        <input type="range" bind:value={geometry} on:input={onGeometryChange} min="0" max="23" />
      </label>
      <label>
        Hue ({hue}):
        <input type="range" bind:value={hue} on:input={onHueChange} min="0" max="360" />
      </label>
      <label>
        Speed ({speed}):
        <input type="range" bind:value={speed} on:input={onSpeedChange} min="0.1" max="3" step="0.1" />
      </label>
    </div>
  </div>

  <style>
    .vib3-app { background: #07070f; min-height: 100vh; color: #ccc; font-family: monospace; padding: 24px; }
    h1 { color: #0fc; font-size: 24px; }
    .canvas-area { width: 100%; height: 480px; background: #111; border-radius: 8px; margin-bottom: 24px; }
    .controls { display: flex; gap: 24px; flex-wrap: wrap; }
    label { font-size: 13px; }
    select, input[type="range"] { margin-left: 8px; }
  </style>
*/
