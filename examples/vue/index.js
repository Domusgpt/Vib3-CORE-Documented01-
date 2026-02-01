/**
 * VIB3+ Vue 3 Example
 *
 * Run:
 *   npm create vue@latest my-vib3-app
 *   cd my-vib3-app
 *   npm install @vib3/sdk
 *   # Copy this file to src/App.vue (rename to .vue and use the template below)
 *   npm run dev
 *
 * This file demonstrates the Composition API integration pattern.
 * In a real .vue SFC, the template, script, and style sections are combined.
 */

// --- Composition API logic (goes in <script setup>) ---

import { ref, onMounted, onUnmounted, watch } from 'vue';
// In a real project: import { VIB3Engine } from '@vib3/sdk/core';
import { VIB3Engine } from '../../src/core/VIB3Engine.js';

const SYSTEMS = ['quantum', 'faceted', 'holographic'];

const system = ref('quantum');
const geometry = ref(0);
const hue = ref(200);
const speed = ref(1);
let engine = null;

onMounted(async () => {
    engine = new VIB3Engine();
    await engine.initialize();
    await engine.switchSystem(system.value);
});

onUnmounted(() => {
    if (engine && engine.destroy) engine.destroy();
});

watch(system, async (val) => {
    if (engine) await engine.switchSystem(val);
});

watch(geometry, (val) => {
    if (engine) engine.setParameter('geometry', val);
});

watch(hue, (val) => {
    if (engine) engine.setParameter('hue', val);
});

watch(speed, (val) => {
    if (engine) engine.setParameter('speed', val);
});

/*
  --- Vue 3 SFC Template ---

  <template>
    <div class="vib3-app">
      <h1>VIB3+ Vue Example</h1>
      <div id="vib3-container" class="canvas-area"></div>
      <div class="controls">
        <label>
          System:
          <select v-model="system">
            <option v-for="s in SYSTEMS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label>
          Geometry ({{ geometry }}):
          <input type="range" v-model.number="geometry" min="0" max="23" />
        </label>
        <label>
          Hue ({{ hue }}):
          <input type="range" v-model.number="hue" min="0" max="360" />
        </label>
        <label>
          Speed ({{ speed }}):
          <input type="range" v-model.number="speed" min="0.1" max="3" step="0.1" />
        </label>
      </div>
    </div>
  </template>

  <style scoped>
    .vib3-app { background: #07070f; min-height: 100vh; color: #ccc; font-family: monospace; padding: 24px; }
    h1 { color: #0fc; font-size: 24px; }
    .canvas-area { width: 100%; height: 480px; background: #111; border-radius: 8px; margin-bottom: 24px; }
    .controls { display: flex; gap: 24px; flex-wrap: wrap; }
    label { font-size: 13px; }
    select, input[type="range"] { margin-left: 8px; }
  </style>
*/
