import { buildTesseractLines } from '../utils/tesseract.js';

const CUBE_LINES = new Float32Array([
  // front face
  -1, -1,  1,  1, -1,  1,
   1, -1,  1,  1,  1,  1,
   1,  1,  1, -1,  1,  1,
  -1,  1,  1, -1, -1,  1,
  // back face
  -1, -1, -1,  1, -1, -1,
   1, -1, -1,  1,  1, -1,
   1,  1, -1, -1,  1, -1,
  -1,  1, -1, -1, -1, -1,
  // connections
  -1, -1,  1, -1, -1, -1,
   1, -1,  1,  1, -1, -1,
   1,  1,  1,  1,  1, -1,
  -1,  1,  1, -1,  1, -1
]);

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan((fov * Math.PI) / 360);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ];
}

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[i * 4 + j] =
        a[i * 4] * b[j] +
        a[i * 4 + 1] * b[4 + j] +
        a[i * 4 + 2] * b[8 + j] +
        a[i * 4 + 3] * b[12 + j];
    }
  }
  return out;
}

function rotation(time, energy) {
  const t = time * 0.6 + energy * 1.5;
  const x = t * 0.9;
  const y = t * 1.1;
  const z = t * 0.7;
  const cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y);
  const cz = Math.cos(z), sz = Math.sin(z);

  const rotX = [
    1, 0, 0, 0,
    0, cx, -sx, 0,
    0, sx, cx, 0,
    0, 0, 0, 1
  ];

  const rotY = [
    cy, 0, sy, 0,
    0, 1, 0, 0,
    -sy, 0, cy, 0,
    0, 0, 0, 1
  ];

  const rotZ = [
    cz, -sz, 0, 0,
    sz, cz, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

  return multiply(rotZ, multiply(rotY, rotX));
}

export class WireframeRenderer {
  constructor(gl) {
    this.gl = gl;
    this.program = this.createProgram();
    this.buffer = gl.createBuffer();
    this.geometry = 'cube';
    this.lineWidth = 1.2;
    this.dynamicLines = null;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_LINES, gl.DYNAMIC_DRAW);
  }

  dispose() {
    const { gl } = this;
    if (this.program) gl.deleteProgram(this.program);
    if (this.buffer) gl.deleteBuffer(this.buffer);
  }

  createProgram() {
    const { gl } = this;
    const vsSource = `#version 300 es
      precision highp float;
      layout(location = 0) in vec3 position;
      uniform mat4 uMVP;
      void main() {
        gl_Position = uMVP * vec4(position * 0.9, 1.0);
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      out vec4 FragColor;
      uniform vec3 uColor;
      void main() {
        FragColor = vec4(uColor, 1.0);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error(`WireframeRenderer vs failed: ${gl.getShaderInfoLog(vs)}`);
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error(`WireframeRenderer fs failed: ${gl.getShaderInfoLog(fs)}`);
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'position');
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WireframeRenderer link failed: ${gl.getProgramInfoLog(program)}`);
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  setGeometry(type = 'cube') {
    this.geometry = type === 'tesseract' ? 'tesseract' : 'cube';
  }

  setLineWidth(width = 1.2) {
    this.lineWidth = Math.max(0.5, Math.min(4, width));
  }

  render(target, time, bands, energy, telemetry = {}) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.width, target.height);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    if (this.geometry === 'tesseract') {
      this.dynamicLines = buildTesseractLines(time, energy);
      gl.bufferData(gl.ARRAY_BUFFER, this.dynamicLines, gl.DYNAMIC_DRAW);
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, CUBE_LINES);
    }
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const aspect = target.width / target.height;
    const proj = perspective(55, aspect, 0.1, 32);
    const rot = rotation(time, energy);
    const mvp = multiply(proj, rot);

    const mvpLoc = gl.getUniformLocation(this.program, 'uMVP');
    gl.uniformMatrix4fv(mvpLoc, false, mvp);

    const hue = bands[3] ?? 0.2;
    const bright = bands[5] ?? 0.4;
    const zone = telemetry.zone ?? 'calm';
    const zoneBoost = zone === 'combat' ? 0.18 : zone === 'recover' ? -0.08 : 0;
    const color = [
      0.25 + hue * 0.6 + zoneBoost * 0.5,
      0.45 + hue * 0.35 + zoneBoost * 0.2,
      0.7 + bright * 0.25 + zoneBoost * 0.1
    ];
    const colorLoc = gl.getUniformLocation(this.program, 'uColor');
    gl.uniform3fv(colorLoc, color);

    gl.lineWidth(this.lineWidth);
    const count = this.geometry === 'tesseract'
      ? (this.dynamicLines?.length || 0) / 3
      : CUBE_LINES.length / 3;
    gl.drawArrays(gl.LINES, 0, count);

    gl.disableVertexAttribArray(0);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

export default WireframeRenderer;
