// VIB3+ 6D Rotation Functions (WGSL)
// 3D space: XY, XZ, YZ | 4D hyperspace: XW, YW, ZW

fn rotateXY(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, -s, 0.0, 0.0),
        vec4<f32>(s,  c, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
    );
}

fn rotateXZ(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, -s, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(s, 0.0,  c, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
    );
}

fn rotateYZ(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, c, -s, 0.0),
        vec4<f32>(0.0, s,  c, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
    );
}

fn rotateXW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, 0.0, -s),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(s, 0.0, 0.0,  c)
    );
}

fn rotateYW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, c, 0.0, -s),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(0.0, s, 0.0,  c)
    );
}

fn rotateZW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, c, -s),
        vec4<f32>(0.0, 0.0, s,  c)
    );
}

// Apply all 6 rotations in canonical order: XY -> XZ -> YZ -> XW -> YW -> ZW
fn apply6DRotation(pos: vec4<f32>) -> vec4<f32> {
    var p = pos;
    p = rotateXY(u.rot4dXY) * p;
    p = rotateXZ(u.rot4dXZ) * p;
    p = rotateYZ(u.rot4dYZ) * p;
    p = rotateXW(u.rot4dXW) * p;
    p = rotateYW(u.rot4dYW) * p;
    p = rotateZW(u.rot4dZW) * p;
    return p;
}

// 4D -> 3D perspective projection
fn project4Dto3D(p: vec4<f32>) -> vec3<f32> {
    let w = u.dimension / (u.dimension + p.w);
    return vec3<f32>(p.x * w, p.y * w, p.z * w);
}
