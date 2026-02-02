// VIB3+ 24 Geometry SDF Library (GLSL)
// 8 base + 8 Hypersphere Core + 8 Hypertetrahedron Core

// Base geometry SDFs (0-7)
float baseGeometry(vec4 p, float type) {
    if (type < 0.5) {
        // 0: Tetrahedron
        return max(max(max(abs(p.x + p.y) - p.z, abs(p.x - p.y) - p.z),
                           abs(p.x + p.y) + p.z), abs(p.x - p.y) + p.z) / sqrt(3.0);
    } else if (type < 1.5) {
        // 1: Hypercube
        vec4 q = abs(p) - 0.8;
        return length(max(q, 0.0)) + min(max(max(max(q.x, q.y), q.z), q.w), 0.0);
    } else if (type < 2.5) {
        // 2: Sphere
        return length(p) - 1.0;
    } else if (type < 3.5) {
        // 3: Torus
        vec2 t = vec2(length(p.xy) - 0.8, p.z);
        return length(t) - 0.3;
    } else if (type < 4.5) {
        // 4: Klein Bottle (simplified)
        float r = length(p.xy);
        return abs(r - 0.7) - 0.2 + sin(atan(p.y, p.x) * 3.0 + p.z * 5.0) * 0.1;
    } else if (type < 5.5) {
        // 5: Fractal (Mandelbulb approximation)
        return length(p) - 0.8 + sin(p.x * 5.0) * sin(p.y * 5.0) * sin(p.z * 5.0) * 0.2;
    } else if (type < 6.5) {
        // 6: Wave
        return abs(p.z - sin(p.x * 5.0 + u_time) * cos(p.y * 5.0 + u_time) * 0.3) - 0.1;
    } else {
        // 7: Crystal
        vec4 q = abs(p);
        return max(max(max(q.x, q.y), q.z), q.w) - 0.8;
    }
}

// Hypersphere Core wrapper (8-15)
float hypersphereCore(vec4 p, float baseType) {
    float baseShape = baseGeometry(p, baseType);
    float sphereField = length(p) - 1.2;
    return max(baseShape, sphereField);
}

// Hypertetrahedron Core wrapper (16-23)
float hypertetrahedronCore(vec4 p, float baseType) {
    float baseShape = baseGeometry(p, baseType);
    float tetraField = max(max(max(
        abs(p.x + p.y) - p.z - p.w,
        abs(p.x - p.y) - p.z + p.w),
        abs(p.x + p.y) + p.z - p.w),
        abs(p.x - p.y) + p.z + p.w) / sqrt(4.0);
    return max(baseShape, tetraField);
}

// Main geometry dispatcher (0-23)
float geometry(vec4 p, float type) {
    if (type < 8.0) {
        return baseGeometry(p, type);
    } else if (type < 16.0) {
        return hypersphereCore(p, type - 8.0);
    } else {
        return hypertetrahedronCore(p, type - 16.0);
    }
}
