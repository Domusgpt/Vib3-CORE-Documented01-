import { paletteFromBands } from '../utils/colorMath.js';

export class BackgroundGradient {
  constructor(gl) {
    this.gl = gl;
    this.program = this.createProgram();
    this.vao = this.createQuad();
  }

  createProgram() {
    const gl = this.gl;
    const vsSource = `#version 300 es
      in vec2 aPosition;
      out vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 fragColor;
      uniform float uTime;
      uniform float uEnergy;
      uniform float uBass;
      uniform vec3 uInner;
      uniform vec3 uOuter;
      uniform vec2 uResolution;

      float vortex(vec2 uv) {
        vec2 centered = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
        float r = length(centered);
        float angle = atan(centered.y, centered.x);
        float wave = sin(angle * 2.5 + uTime * 0.2 + uBass * 6.2831);
        return smoothstep(0.9, 0.2, r + wave * 0.05);
      }

      void main() {
        float swirl = vortex(vUv);
        float mixAmount = clamp(vUv.y * 0.6 + swirl * 0.25, 0.0, 1.0);
        vec3 base = mix(uInner, uOuter, mixAmount);
        float glow = uEnergy * 0.35 + uBass * 0.25;
        vec3 color = base + glow;
        fragColor = vec4(color, 1.0);
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
      throw new Error(`BackgroundGradient program link failed: ${gl.getProgramInfoLog(program)}`);
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
      throw new Error(`BackgroundGradient shader compile failed: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  createQuad() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    return vao;
  }

  render(target, time, bands = [], energy = 0) {
    const gl = this.gl;
    const palette = paletteFromBands(bands);
    const bass = bands[0] ?? 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform1f(gl.getUniformLocation(this.program, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uEnergy'), energy);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uBass'), bass);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uInner'), palette.inner);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uOuter'), palette.outer);
    gl.uniform2f(gl.getUniformLocation(this.program, 'uResolution'), target.width, target.height);

    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }
}
