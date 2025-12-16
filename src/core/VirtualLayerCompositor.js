const BLEND_MODES = {
  normal: (gl) => {
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  },
  additive: (gl) => {
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
  },
  multiply: (gl) => {
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.DST_COLOR, gl.ZERO);
  }
};

const DEFAULT_LAYERS = [
  { name: 'background', mode: 'multiply', clearColor: [0.03, 0.06, 0.12, 1] },
  { name: 'shadow', mode: 'multiply', clearColor: [0, 0, 0, 0.6] },
  { name: 'content', mode: 'normal', clearColor: [0.08, 0.1, 0.16, 1] },
  { name: 'highlight', mode: 'additive', clearColor: [0.05, 0.08, 0.1, 0.4] },
  { name: 'accent', mode: 'additive', clearColor: [0.1, 0.12, 0.18, 0.2] }
];

export class VirtualLayerCompositor {
  constructor({ containerId = 'canvasContainer', antialias = false } = {}) {
    this.container = document.getElementById(containerId) || document.body;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'unified-layer-canvas';
    this.canvas.dataset.preserve = 'true';
    this.canvas.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    `;

    // Ensure container is positioned
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }

    this.container.prepend(this.canvas);

    this.gl = this.canvas.getContext('webgl2', {
      antialias,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });

    if (!this.gl) {
      throw new Error('WebGL2 not available for VirtualLayerCompositor');
    }

    this.layers = [];
    this.renderCallbacks = {};
    this.time = 0;
    this.animationFrame = null;

    this.quadProgram = this.createQuadProgram();
    this.quadVAO = this.createQuadVAO();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  defineLayers(layerDefinitions = DEFAULT_LAYERS) {
    this.disposeLayers();
    this.layers = layerDefinitions.map((def) => ({
      ...def,
      target: this.createRenderTarget()
    }));
  }

  start(renderCallbacks = {}) {
    this.renderCallbacks = renderCallbacks;
    const loop = (ts) => {
      this.time = ts * 0.001;
      this.renderFrame();
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  renderFrame() {
    this.layers.forEach((layer) => {
      const { target, name, clearColor } = layer;
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.width, target.height);
      gl.clearColor(...clearColor);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const renderFn = this.renderCallbacks[name];
      if (renderFn) {
        renderFn(gl, target, this.time, layer);
      }
    });

    this.compose();
  }

  compose() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(this.quadProgram);
    gl.bindVertexArray(this.quadVAO);

    this.layers.forEach((layer) => {
      const setBlend = BLEND_MODES[layer.mode] || BLEND_MODES.normal;
      setBlend(gl);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, layer.target.texture);
      gl.uniform1i(gl.getUniformLocation(this.quadProgram, 'uTexture'), 0);
      gl.uniform1f(gl.getUniformLocation(this.quadProgram, 'uAlpha'), layer.alpha ?? 1.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  createRenderTarget() {
    const gl = this.gl;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('⚠️ Framebuffer incomplete');
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, texture, width, height };
  }

  createQuadProgram() {
    const gl = this.gl;
    const vertexSrc = `#version 300 es
      precision mediump float;
      const vec2 pos[4] = vec2[4](
        vec2(-1.0, -1.0),
        vec2(1.0, -1.0),
        vec2(-1.0, 1.0),
        vec2(1.0, 1.0)
      );
      out vec2 vUv;
      void main() {
        vUv = (pos[gl_VertexID] + 1.0) * 0.5;
        gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
      }
    `;

    const fragmentSrc = `#version 300 es
      precision mediump float;
      uniform sampler2D uTexture;
      uniform float uAlpha;
      in vec2 vUv;
      out vec4 FragColor;
      void main() {
        vec4 texColor = texture(uTexture, vUv);
        FragColor = vec4(texColor.rgb, texColor.a * uAlpha);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexSrc);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    return program;
  }

  createQuadVAO() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindVertexArray(null);
    return vao;
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.layers.forEach((layer) => {
        this.gl.deleteFramebuffer(layer.target.fbo);
        this.gl.deleteTexture(layer.target.texture);
        layer.target = this.createRenderTarget();
      });
    }
  }

  disposeLayers() {
    if (!this.layers.length) return;
    this.layers.forEach((layer) => {
      this.gl.deleteFramebuffer(layer.target.fbo);
      this.gl.deleteTexture(layer.target.texture);
    });
    this.layers = [];
  }

  dispose() {
    this.stop();
    this.disposeLayers();
    if (this.quadProgram) this.gl.deleteProgram(this.quadProgram);
    if (this.quadVAO) this.gl.deleteVertexArray(this.quadVAO);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  getDiagnostics() {
    return {
      glVersion: this.gl.getParameter(this.gl.VERSION),
      shadingLanguage: this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION),
      drawingBuffer: {
        width: this.gl.drawingBufferWidth,
        height: this.gl.drawingBufferHeight
      },
      layers: this.layers.map((layer) => ({
        name: layer.name,
        mode: layer.mode,
        size: [layer.target.width, layer.target.height]
      }))
    };
  }
}

export { DEFAULT_LAYERS };
