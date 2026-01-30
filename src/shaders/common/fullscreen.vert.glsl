// VIB3+ Fullscreen Quad Vertex Shader (GLSL)
attribute vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
