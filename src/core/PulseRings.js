import { paletteFromBands } from '../utils/colorMath.js';

export class PulseRings {
  constructor(gl, segments = 64) {
    this.gl = gl;
    this.segments = segments;
    this.program = this.createProgram();
    this.vao = this.createGeometry();
  }

  createProgram() {
    const gl = this.gl;
    const vsSource = `#version 300 es
      in vec2 aPosition;
      uniform float uRadius;
      uniform float uThickness;
      uniform float uAspect;
      void main() {
        vec2 scaled = aPosition * vec2(1.0, uAspect);
        vec2 pos = scaled * (uRadius + (aPosition.y > 0.0 ? uThickness : 0.0));
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      uniform vec3 uColor;
      uniform float uGlow;
      out vec4 fragColor;
      void main() {
        fragColor = vec4(uColor * (1.0 + uGlow), 0.65 + uGlow * 0.35);
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`PulseRings program link failed: ${gl.getProgramInfoLog(program)}`);
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`PulseRings shader compile failed: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  createGeometry() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const verts = [];
    for (let i = 0; i <= this.segments; i++) {
      const theta = (i / this.segments) * Math.PI * 2;
      const x = Math.cos(theta);
      const y = Math.sin(theta);
      verts.push(x, y, x, y); // inner and outer share direction; outer offset in shader via thickness
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.vertexCount = verts.length / 2;
    return vao;
  }

  render(target, time, bands = [], energy = 0, telemetry = {}) {
    const gl = this.gl;
    const palette = paletteFromBands(bands);
    const combo = Math.min(1, (telemetry.combo_multiplier ?? 0) / 5);
    const speed = 0.8 + (bands[6] ?? 0) * 2.5;
    const radius = 0.35 + combo * 0.25 + Math.sin(time * speed) * 0.05;
    const thickness = 0.05 + energy * 0.1;
    const glow = 0.1 + energy * 0.6 + combo * 0.3;

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform1f(gl.getUniformLocation(this.program, 'uRadius'), radius);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uThickness'), thickness);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uAspect'), target.width / target.height);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uColor'), palette.accent);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uGlow'), glow);

    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vertexCount);
    gl.enable(gl.DEPTH_TEST);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }
}
