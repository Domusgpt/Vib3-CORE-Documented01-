// src/core/WebGLResourceManager.js
class WebGLResourceManager {
  constructor(gl) {
    this.gl = gl;
    this.resources = {
      textures: new Set(),
      buffers: new Set(),
      programs: new Set(),
      framebuffers: new Set(),
      renderbuffers: new Set(),
      vertexArrays: new Set()
    };
    this.resourceRegistry = new Map();
  }

  getTypeSet(type) {
    return this.resources[type] || null;
  }

  getTypeRegistry(type) {
    if (!this.resourceRegistry.has(type)) {
      this.resourceRegistry.set(type, new Map());
    }
    return this.resourceRegistry.get(type);
  }

  registerResource(type, id, resource, bytes = 0) {
    const registry = this.getTypeRegistry(type);
    const key = id ?? resource;
    registry.set(key, { resource, bytes });
    const typeSet = this.getTypeSet(type);
    if (typeSet) {
      typeSet.add(resource);
    }
    return resource;
  }

  releaseResource(type, id) {
    const registry = this.getTypeRegistry(type);
    const entry = registry.get(id);
    if (!entry) {
      return false;
    }

    const resource = entry.resource;
    switch (type) {
      case 'textures':
        this.deleteTexture(resource);
        break;
      case 'buffers':
        this.deleteBuffer(resource);
        break;
      case 'programs':
        this.deleteProgram(resource);
        break;
      case 'framebuffers':
        this.deleteFramebuffer(resource);
        break;
      case 'renderbuffers':
        this.deleteRenderbuffer(resource);
        break;
      case 'vertexArrays':
        this.deleteVertexArray(resource);
        break;
      default:
        break;
    }

    registry.delete(id);
    return true;
  }

  trackTexture(texture) {
    return this.registerResource('textures', texture, texture);
  }

  trackBuffer(buffer) {
    return this.registerResource('buffers', buffer, buffer);
  }

  trackProgram(program) {
    return this.registerResource('programs', program, program);
  }

  trackFramebuffer(framebuffer) {
    return this.registerResource('framebuffers', framebuffer, framebuffer);
  }

  trackRenderbuffer(renderbuffer) {
    return this.registerResource('renderbuffers', renderbuffer, renderbuffer);
  }

  trackVertexArray(vertexArray) {
    return this.registerResource('vertexArrays', vertexArray, vertexArray);
  }

  createTexture() {
    const texture = this.gl.createTexture();
    return this.trackTexture(texture);
  }

  createBuffer() {
    const buffer = this.gl.createBuffer();
    return this.trackBuffer(buffer);
  }

  createProgram() {
    const program = this.gl.createProgram();
    return this.trackProgram(program);
  }

  createFramebuffer() {
    const framebuffer = this.gl.createFramebuffer();
    return this.trackFramebuffer(framebuffer);
  }

  createRenderbuffer() {
    const renderbuffer = this.gl.createRenderbuffer();
    return this.trackRenderbuffer(renderbuffer);
  }

  createVertexArray() {
    const vertexArray = this.gl.createVertexArray();
    return this.trackVertexArray(vertexArray);
  }

  deleteTexture(texture) {
    this.gl.deleteTexture(texture);
    this.resources.textures.delete(texture);
  }

  deleteBuffer(buffer) {
    this.gl.deleteBuffer(buffer);
    this.resources.buffers.delete(buffer);
  }

  deleteProgram(program) {
    this.gl.deleteProgram(program);
    this.resources.programs.delete(program);
  }

  deleteFramebuffer(framebuffer) {
    this.gl.deleteFramebuffer(framebuffer);
    this.resources.framebuffers.delete(framebuffer);
  }

  deleteRenderbuffer(renderbuffer) {
    this.gl.deleteRenderbuffer(renderbuffer);
    this.resources.renderbuffers.delete(renderbuffer);
  }

  deleteVertexArray(vertexArray) {
    this.gl.deleteVertexArray(vertexArray);
    this.resources.vertexArrays.delete(vertexArray);
  }

  disposeAll() {
    // Delete all tracked resources
    this.resources.textures.forEach(texture => {
      this.gl.deleteTexture(texture);
    });

    this.resources.buffers.forEach(buffer => {
      this.gl.deleteBuffer(buffer);
    });

    this.resources.programs.forEach(program => {
      this.gl.deleteProgram(program);
    });

    this.resources.framebuffers.forEach(framebuffer => {
      this.gl.deleteFramebuffer(framebuffer);
    });

    this.resources.renderbuffers.forEach(renderbuffer => {
      this.gl.deleteRenderbuffer(renderbuffer);
    });

    if (this.resources.vertexArrays.size > 0) {
      this.resources.vertexArrays.forEach(vertexArray => {
        this.gl.deleteVertexArray(vertexArray);
      });
    }

    // Clear all sets
    Object.values(this.resources).forEach(set => set.clear());
    this.resourceRegistry.clear();
  }

  getResourceCount() {
    const bytes = {};
    let totalBytes = 0;

    this.resourceRegistry.forEach((registry, type) => {
      const typeBytes = Array.from(registry.values()).reduce((sum, entry) => sum + entry.bytes, 0);
      bytes[type] = typeBytes;
      totalBytes += typeBytes;
    });

    return {
      textures: this.resources.textures.size,
      buffers: this.resources.buffers.size,
      programs: this.resources.programs.size,
      framebuffers: this.resources.framebuffers.size,
      renderbuffers: this.resources.renderbuffers.size,
      vertexArrays: this.resources.vertexArrays.size,
      total: Object.values(this.resources).reduce((sum, set) => sum + set.size, 0),
      bytes,
      totalBytes
    };
  }
}

export default WebGLResourceManager;
