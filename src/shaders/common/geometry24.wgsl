// VIB3+ 24 Geometry SDF Library (WGSL)
// 8 base + 8 Hypersphere Core + 8 Hypertetrahedron Core

fn baseGeometry(p: vec4<f32>, t: f32) -> f32 {
    if (t < 0.5) {
        // 0: Tetrahedron
        return max(max(max(abs(p.x + p.y) - p.z, abs(p.x - p.y) - p.z),
                       abs(p.x + p.y) + p.z), abs(p.x - p.y) + p.z) / sqrt(3.0);
    } else if (t < 1.5) {
        // 1: Hypercube
        let q = abs(p) - vec4<f32>(0.8);
        return length(max(q, vec4<f32>(0.0))) + min(max(max(max(q.x, q.y), q.z), q.w), 0.0);
    } else if (t < 2.5) {
        // 2: Sphere
        return length(p) - 1.0;
    } else if (t < 3.5) {
        // 3: Torus
        let t2 = vec2<f32>(length(p.xy) - 0.8, p.z);
        return length(t2) - 0.3;
    } else if (t < 4.5) {
        // 4: Klein Bottle (simplified)
        let r = length(p.xy);
        return abs(r - 0.7) - 0.2 + sin(atan2(p.y, p.x) * 3.0 + p.z * 5.0) * 0.1;
    } else if (t < 5.5) {
        // 5: Fractal (Mandelbulb approximation)
        return length(p) - 0.8 + sin(p.x * 5.0) * sin(p.y * 5.0) * sin(p.z * 5.0) * 0.2;
    } else if (t < 6.5) {
        // 6: Wave
        return abs(p.z - sin(p.x * 5.0 + u.time) * cos(p.y * 5.0 + u.time) * 0.3) - 0.1;
    } else {
        // 7: Crystal
        let q = abs(p);
        return max(max(max(q.x, q.y), q.z), q.w) - 0.8;
    }
}

fn hypersphereCore(p: vec4<f32>, baseType: f32) -> f32 {
    return max(baseGeometry(p, baseType), length(p) - 1.2);
}

fn hypertetrahedronCore(p: vec4<f32>, baseType: f32) -> f32 {
    let tf = max(max(max(
        abs(p.x + p.y) - p.z - p.w,
        abs(p.x - p.y) - p.z + p.w),
        abs(p.x + p.y) + p.z - p.w),
        abs(p.x - p.y) + p.z + p.w) / sqrt(4.0);
    return max(baseGeometry(p, baseType), tf);
}

fn geometry(p: vec4<f32>, t: f32) -> f32 {
    if (t < 8.0) { return baseGeometry(p, t); }
    else if (t < 16.0) { return hypersphereCore(p, t - 8.0); }
    else { return hypertetrahedronCore(p, t - 16.0); }
}
