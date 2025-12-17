import { shadowParameters } from '../utils/shadowMath.js';

const VIGNETTE_FS = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uSoftness;
uniform float uNoiseAmount;
uniform float uEnergy;
uniform float uHealth;

out vec4 FragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 centered = uv * 2.0 - 1.0;
  float dist = length(centered);

  // Radial falloff with adjustable softness.
  float soft = max(0.05, uSoftness);
  float vignette = smoothstep(1.0, soft, dist);

  // Pulse in sync with upper energy to avoid flat shadows during peaks.
  float pulse = 0.85 + 0.3 * sin(uTime * 1.3 + uEnergy * 2.5);

  // Subtle animated noise to prevent banding.
  float noise = hash(gl_FragCoord.xy + uTime) * uNoiseAmount;

  float alpha = clamp(vignette * uIntensity * pulse + noise, 0.0, 1.0);
  // Fade out as health drops to simulate grounding loss.
  alpha *= mix(1.0, 1.2, 1.0 - uHealth);

  FragColor = vec4(vec3(0.0), alpha);
}
`;

const VERTEX_SRC = `#version 300 es
precision highp float;
const vec2 POS[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2(1.0, -1.0),
  vec2(-1.0, 1.0),
  vec2(1.0, 1.0)
);
out vec2 vUv;
void main() {
  vUv = (POS[gl_VertexID] + 1.0) * 0.5;
  gl_Position = vec4(POS[gl_VertexID], 0.0, 1.0);
}
`;

export class ShadowVignette {
  constructor(gl) {
    this.gl = gl;
    this.program = this.createProgram();
    this.vao = this.createVAO();
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`ShadowVignette shader compile failed: ${info}`);
    }
    return shader;
  }

  createProgram() {
    const vs = this.createShader(this.gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, VIGNETTE_FS);
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`ShadowVignette program link failed: ${info}`);
    }
    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);
    return program;
  }

  createVAO() {
    const vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(vao);
    this.gl.bindVertexArray(null);
    return vao;
  }

  render(target, time, bands, energy, telemetry = {}) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const resolutionLoc = gl.getUniformLocation(this.program, 'uResolution');
    const timeLoc = gl.getUniformLocation(this.program, 'uTime');
    const intensityLoc = gl.getUniformLocation(this.program, 'uIntensity');
    const softnessLoc = gl.getUniformLocation(this.program, 'uSoftness');
    const noiseLoc = gl.getUniformLocation(this.program, 'uNoiseAmount');
    const energyLoc = gl.getUniformLocation(this.program, 'uEnergy');
    const healthLoc = gl.getUniformLocation(this.program, 'uHealth');

    const { intensity, softness, noise, health } = shadowParameters(bands, telemetry);

    gl.uniform2f(resolutionLoc, target.width, target.height);
    gl.uniform1f(timeLoc, time);
    gl.uniform1f(intensityLoc, intensity);
    gl.uniform1f(softnessLoc, softness);
    gl.uniform1f(noiseLoc, noise);
    gl.uniform1f(energyLoc, energy);
    gl.uniform1f(healthLoc, health);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  dispose() {
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.vao) this.gl.deleteVertexArray(this.vao);
  }
}
