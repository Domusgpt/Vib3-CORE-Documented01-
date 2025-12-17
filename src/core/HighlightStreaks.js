import { computeHighlightParams } from '../utils/highlightMath.js';

export class HighlightStreaks {
  constructor(gl) {
    this.gl = gl;
    this.program = this.createProgram();
    this.vao = this.createQuad();
  }

  dispose() {
    const { gl } = this;
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }

  createProgram() {
    const { gl } = this;
    const vsSource = `#version 300 es
      precision highp float;
      layout(location = 0) in vec2 position;
      out vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 FragColor;
      uniform float uTime;
      uniform float uEnergy;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform vec3 uTint;

      float streak(vec2 uv, float shift) {
        float angle = 0.43;
        vec2 dir = vec2(cos(angle), sin(angle));
        float lane = dot(uv + vec2(shift, 0.0), dir);
        float band = abs(lane);
        return exp(-band * 16.0);
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float t = uTime * uSpeed;
        float glow = 0.0;
        for (int i = 0; i < 4; i++) {
          float offset = fract(t * 0.15 + float(i) * 0.21) * 4.0 - 2.0;
          glow += streak(uv, offset);
        }
        glow = clamp(glow, 0.0, 1.0);
        float alpha = clamp(glow * (0.35 + uEnergy * 0.9) * uIntensity, 0.0, 1.0);
        FragColor = vec4(uTint, alpha);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error(`HighlightStreaks vs failed: ${gl.getShaderInfoLog(vs)}`);
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error(`HighlightStreaks fs failed: ${gl.getShaderInfoLog(fs)}`);
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'position');
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`HighlightStreaks link failed: ${gl.getProgramInfoLog(program)}`);
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  createQuad() {
    const { gl } = this;
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
      ]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vao;
  }

  render(target, time, bands, energy, telemetry = {}) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);

    const { speed, intensity, tint } = computeHighlightParams(bands, energy, telemetry.zone);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform1f(gl.getUniformLocation(this.program, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uEnergy'), energy);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uSpeed'), speed);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uIntensity'), intensity);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uTint'), tint);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

export default HighlightStreaks;
