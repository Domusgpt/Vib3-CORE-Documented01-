// VIB3+ 6D Rotation Functions (GLSL)
// 3D space: XY, XZ, YZ | 4D hyperspace: XW, YW, ZW

mat4 rotateXY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
        c, -s, 0, 0,
        s,  c, 0, 0,
        0,  0, 1, 0,
        0,  0, 0, 1
    );
}

mat4 rotateXZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
        c, 0, -s, 0,
        0, 1,  0, 0,
        s, 0,  c, 0,
        0, 0,  0, 1
    );
}

mat4 rotateYZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
        1, 0,  0, 0,
        0, c, -s, 0,
        0, s,  c, 0,
        0, 0,  0, 1
    );
}

mat4 rotateXW(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
        c, 0, 0, -s,
        0, 1, 0,  0,
        0, 0, 1,  0,
        s, 0, 0,  c
    );
}

mat4 rotateYW(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
        1, 0, 0,  0,
        0, c, 0, -s,
        0, 0, 1,  0,
        0, s, 0,  c
    );
}

mat4 rotateZW(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(
        1, 0, 0,  0,
        0, 1, 0,  0,
        0, 0, c, -s,
        0, 0, s,  c
    );
}

// Apply all 6 rotations in canonical order: XY -> XZ -> YZ -> XW -> YW -> ZW
vec4 apply6DRotation(vec4 pos) {
    pos = rotateXY(u_rot4dXY) * pos;
    pos = rotateXZ(u_rot4dXZ) * pos;
    pos = rotateYZ(u_rot4dYZ) * pos;
    pos = rotateXW(u_rot4dXW) * pos;
    pos = rotateYW(u_rot4dYW) * pos;
    pos = rotateZW(u_rot4dZW) * pos;
    return pos;
}

// 4D -> 3D perspective projection
vec3 project4Dto3D(vec4 p) {
    float w = u_dimension / (u_dimension + p.w);
    return vec3(p.x * w, p.y * w, p.z * w);
}
