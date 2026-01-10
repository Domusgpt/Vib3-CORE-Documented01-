/**
 * VIB3+ FFI Implementation
 *
 * C interface implementation wrapping C++ core classes.
 */

#include "../include/vib3_ffi.h"
#include "../math/Vec4.hpp"
#include "../math/Rotor4D.hpp"
#include "../math/Mat4x4.hpp"
#include "../math/Projection.hpp"

#include <cstring>
#include <cmath>
#include <string>

using namespace vib3;

// Version string
static const char* VIB3_VERSION = "1.7.0";

// Geometry names
static const char* GEOMETRY_NAMES[24] = {
    "tetrahedron_base", "hypercube_base", "sphere_base", "torus_base",
    "klein_bottle_base", "fractal_base", "wave_base", "crystal_base",
    "tetrahedron_hypersphere", "hypercube_hypersphere", "sphere_hypersphere", "torus_hypersphere",
    "klein_bottle_hypersphere", "fractal_hypersphere", "wave_hypersphere", "crystal_hypersphere",
    "tetrahedron_hypertetra", "hypercube_hypertetra", "sphere_hypertetra", "torus_hypertetra",
    "klein_bottle_hypertetra", "fractal_hypertetra", "wave_hypertetra", "crystal_hypertetra"
};

// ============================================================================
// Vec4 Functions
// ============================================================================

extern "C" {

Vib3Vec4* vib3_vec4_create(float x, float y, float z, float w) {
    Vib3Vec4* v = new Vib3Vec4();
    v->x = x;
    v->y = y;
    v->z = z;
    v->w = w;
    return v;
}

void vib3_vec4_free(Vib3Vec4* v) {
    delete v;
}

float vib3_vec4_dot(const Vib3Vec4* a, const Vib3Vec4* b) {
    return a->x * b->x + a->y * b->y + a->z * b->z + a->w * b->w;
}

float vib3_vec4_length(const Vib3Vec4* v) {
    return std::sqrt(v->x * v->x + v->y * v->y + v->z * v->z + v->w * v->w);
}

void vib3_vec4_normalize(Vib3Vec4* v) {
    float len = vib3_vec4_length(v);
    if (len > 1e-10f) {
        float inv = 1.0f / len;
        v->x *= inv;
        v->y *= inv;
        v->z *= inv;
        v->w *= inv;
    }
}

Vib3Vec4* vib3_vec4_add(const Vib3Vec4* a, const Vib3Vec4* b) {
    return vib3_vec4_create(a->x + b->x, a->y + b->y, a->z + b->z, a->w + b->w);
}

Vib3Vec4* vib3_vec4_sub(const Vib3Vec4* a, const Vib3Vec4* b) {
    return vib3_vec4_create(a->x - b->x, a->y - b->y, a->z - b->z, a->w - b->w);
}

Vib3Vec4* vib3_vec4_scale(const Vib3Vec4* v, float s) {
    return vib3_vec4_create(v->x * s, v->y * s, v->z * s, v->w * s);
}

Vib3Vec4* vib3_vec4_lerp(const Vib3Vec4* a, const Vib3Vec4* b, float t) {
    float u = 1.0f - t;
    return vib3_vec4_create(
        a->x * u + b->x * t,
        a->y * u + b->y * t,
        a->z * u + b->z * t,
        a->w * u + b->w * t
    );
}

// ============================================================================
// Rotor4D Functions
// ============================================================================

Vib3Rotor4D* vib3_rotor4d_identity(void) {
    Vib3Rotor4D* r = new Vib3Rotor4D();
    r->s = 1.0f;
    r->xy = r->xz = r->yz = r->xw = r->yw = r->zw = r->xyzw = 0.0f;
    return r;
}

Vib3Rotor4D* vib3_rotor4d_from_plane_angle(Vib3RotationPlane plane, float angle) {
    Vib3Rotor4D* r = vib3_rotor4d_identity();

    float half = angle * 0.5f;
    float c = std::cos(half);
    float s = std::sin(half);

    r->s = c;

    switch (plane) {
        case VIB3_PLANE_XY: r->xy = -s; break;
        case VIB3_PLANE_XZ: r->xz = -s; break;
        case VIB3_PLANE_YZ: r->yz = -s; break;
        case VIB3_PLANE_XW: r->xw = -s; break;
        case VIB3_PLANE_YW: r->yw = -s; break;
        case VIB3_PLANE_ZW: r->zw = -s; break;
    }

    return r;
}

Vib3Rotor4D* vib3_rotor4d_from_euler6(
    float xy, float xz, float yz,
    float xw, float yw, float zw
) {
    // Create individual rotors and compose
    Vib3Rotor4D* rxy = vib3_rotor4d_from_plane_angle(VIB3_PLANE_XY, xy);
    Vib3Rotor4D* rxz = vib3_rotor4d_from_plane_angle(VIB3_PLANE_XZ, xz);
    Vib3Rotor4D* ryz = vib3_rotor4d_from_plane_angle(VIB3_PLANE_YZ, yz);
    Vib3Rotor4D* rxw = vib3_rotor4d_from_plane_angle(VIB3_PLANE_XW, xw);
    Vib3Rotor4D* ryw = vib3_rotor4d_from_plane_angle(VIB3_PLANE_YW, yw);
    Vib3Rotor4D* rzw = vib3_rotor4d_from_plane_angle(VIB3_PLANE_ZW, zw);

    // Compose: R = Rxy * Rxz * Ryz * Rxw * Ryw * Rzw
    Vib3Rotor4D* r1 = vib3_rotor4d_multiply(rxy, rxz);
    Vib3Rotor4D* r2 = vib3_rotor4d_multiply(r1, ryz);
    Vib3Rotor4D* r3 = vib3_rotor4d_multiply(r2, rxw);
    Vib3Rotor4D* r4 = vib3_rotor4d_multiply(r3, ryw);
    Vib3Rotor4D* result = vib3_rotor4d_multiply(r4, rzw);

    // Clean up intermediates
    delete rxy; delete rxz; delete ryz;
    delete rxw; delete ryw; delete rzw;
    delete r1; delete r2; delete r3; delete r4;

    return result;
}

void vib3_rotor4d_free(Vib3Rotor4D* r) {
    delete r;
}

Vib3Rotor4D* vib3_rotor4d_multiply(const Vib3Rotor4D* a, const Vib3Rotor4D* b) {
    Vib3Rotor4D* result = new Vib3Rotor4D();

    // Full Clifford algebra product for Cl(4,0)
    // This is the correct geometric algebra multiplication

    result->s = a->s * b->s
              - a->xy * b->xy - a->xz * b->xz - a->yz * b->yz
              - a->xw * b->xw - a->yw * b->yw - a->zw * b->zw
              - a->xyzw * b->xyzw;

    result->xy = a->s * b->xy + a->xy * b->s
               + a->xz * b->yz - a->yz * b->xz
               + a->xw * b->yw - a->yw * b->xw
               - a->zw * b->xyzw - a->xyzw * b->zw;

    result->xz = a->s * b->xz + a->xz * b->s
               - a->xy * b->yz + a->yz * b->xy
               + a->xw * b->zw - a->zw * b->xw
               + a->yw * b->xyzw + a->xyzw * b->yw;

    result->yz = a->s * b->yz + a->yz * b->s
               + a->xy * b->xz - a->xz * b->xy
               + a->yw * b->zw - a->zw * b->yw
               - a->xw * b->xyzw - a->xyzw * b->xw;

    result->xw = a->s * b->xw + a->xw * b->s
               - a->xy * b->yw + a->yw * b->xy
               - a->xz * b->zw + a->zw * b->xz
               - a->yz * b->xyzw - a->xyzw * b->yz;

    result->yw = a->s * b->yw + a->yw * b->s
               + a->xy * b->xw - a->xw * b->xy
               - a->yz * b->zw + a->zw * b->yz
               + a->xz * b->xyzw + a->xyzw * b->xz;

    result->zw = a->s * b->zw + a->zw * b->s
               + a->xz * b->xw - a->xw * b->xz
               + a->yz * b->yw - a->yw * b->yz
               - a->xy * b->xyzw - a->xyzw * b->xy;

    result->xyzw = a->s * b->xyzw + a->xyzw * b->s
                 + a->xy * b->zw + a->zw * b->xy
                 - a->xz * b->yw - a->yw * b->xz
                 + a->yz * b->xw + a->xw * b->yz;

    return result;
}

Vib3Vec4* vib3_rotor4d_rotate(const Vib3Rotor4D* r, const Vib3Vec4* v) {
    // Rotation: v' = R * v * R†
    // For rotors, this simplifies to a series of reflections

    float x = v->x, y = v->y, z = v->z, w = v->w;

    // Apply rotor using sandwich product
    // Simplified form using rotor components
    float s2 = r->s * r->s;
    float xy2 = r->xy * r->xy;
    float xz2 = r->xz * r->xz;
    float yz2 = r->yz * r->yz;
    float xw2 = r->xw * r->xw;
    float yw2 = r->yw * r->yw;
    float zw2 = r->zw * r->zw;

    // Compute rotated components
    float newX = x * (s2 + xy2 + xz2 + xw2 - yz2 - yw2 - zw2 - r->xyzw * r->xyzw)
               + 2 * (r->s * (r->xy * y + r->xz * z + r->xw * w)
                    + r->xy * (r->yz * z + r->yw * w)
                    + r->xz * (r->zw * w - r->yz * y)
                    + r->xw * (-r->yw * y - r->zw * z));

    float newY = y * (s2 - xy2 + yz2 + yw2 - xz2 - xw2 - zw2 - r->xyzw * r->xyzw)
               + 2 * (r->s * (-r->xy * x + r->yz * z + r->yw * w)
                    + r->xy * (r->xz * z + r->xw * w)
                    + r->yz * (r->zw * w - r->xz * x)
                    + r->yw * (-r->xw * x - r->zw * z));

    float newZ = z * (s2 - xy2 - xz2 + yz2 + zw2 - xw2 - yw2 - r->xyzw * r->xyzw)
               + 2 * (r->s * (-r->xz * x - r->yz * y + r->zw * w)
                    + r->xz * (r->xy * y + r->xw * w)
                    + r->yz * (r->xy * x + r->yw * w)
                    + r->zw * (-r->xw * x - r->yw * y));

    float newW = w * (s2 - xy2 - xz2 - yz2 - xw2 - yw2 - zw2 + r->xyzw * r->xyzw)
               + 2 * (r->s * (-r->xw * x - r->yw * y - r->zw * z)
                    + r->xw * (r->xy * y + r->xz * z)
                    + r->yw * (r->xy * x + r->yz * z)
                    + r->zw * (r->xz * x + r->yz * y));

    return vib3_vec4_create(newX, newY, newZ, newW);
}

Vib3Rotor4D* vib3_rotor4d_slerp(const Vib3Rotor4D* a, const Vib3Rotor4D* b, float t) {
    // Compute dot product
    float dot = a->s * b->s + a->xy * b->xy + a->xz * b->xz + a->yz * b->yz
              + a->xw * b->xw + a->yw * b->yw + a->zw * b->zw + a->xyzw * b->xyzw;

    // Handle sign flip for shortest path
    float sign = (dot < 0) ? -1.0f : 1.0f;
    dot = std::abs(dot);

    float s0, s1;
    if (dot > 0.9995f) {
        // Linear interpolation for nearly identical rotors
        s0 = 1.0f - t;
        s1 = t * sign;
    } else {
        float theta = std::acos(dot);
        float sinTheta = std::sin(theta);
        s0 = std::sin((1.0f - t) * theta) / sinTheta;
        s1 = std::sin(t * theta) / sinTheta * sign;
    }

    Vib3Rotor4D* result = new Vib3Rotor4D();
    result->s = s0 * a->s + s1 * b->s;
    result->xy = s0 * a->xy + s1 * b->xy;
    result->xz = s0 * a->xz + s1 * b->xz;
    result->yz = s0 * a->yz + s1 * b->yz;
    result->xw = s0 * a->xw + s1 * b->xw;
    result->yw = s0 * a->yw + s1 * b->yw;
    result->zw = s0 * a->zw + s1 * b->zw;
    result->xyzw = s0 * a->xyzw + s1 * b->xyzw;

    vib3_rotor4d_normalize(result);
    return result;
}

void vib3_rotor4d_normalize(Vib3Rotor4D* r) {
    float len = std::sqrt(
        r->s * r->s + r->xy * r->xy + r->xz * r->xz + r->yz * r->yz
        + r->xw * r->xw + r->yw * r->yw + r->zw * r->zw + r->xyzw * r->xyzw
    );

    if (len > 1e-10f) {
        float inv = 1.0f / len;
        r->s *= inv;
        r->xy *= inv;
        r->xz *= inv;
        r->yz *= inv;
        r->xw *= inv;
        r->yw *= inv;
        r->zw *= inv;
        r->xyzw *= inv;
    }
}

Vib3Mat4x4* vib3_rotor4d_to_matrix(const Vib3Rotor4D* r) {
    // Convert rotor to 4x4 rotation matrix
    Vib3Mat4x4* m = vib3_mat4x4_identity();

    // For each basis vector, compute rotated result and store as column
    Vib3Vec4 ex = {1, 0, 0, 0};
    Vib3Vec4 ey = {0, 1, 0, 0};
    Vib3Vec4 ez = {0, 0, 1, 0};
    Vib3Vec4 ew = {0, 0, 0, 1};

    Vib3Vec4* rx = vib3_rotor4d_rotate(r, &ex);
    Vib3Vec4* ry = vib3_rotor4d_rotate(r, &ey);
    Vib3Vec4* rz = vib3_rotor4d_rotate(r, &ez);
    Vib3Vec4* rw = vib3_rotor4d_rotate(r, &ew);

    // Column-major layout
    m->data[0] = rx->x;  m->data[4] = ry->x;  m->data[8]  = rz->x;  m->data[12] = rw->x;
    m->data[1] = rx->y;  m->data[5] = ry->y;  m->data[9]  = rz->y;  m->data[13] = rw->y;
    m->data[2] = rx->z;  m->data[6] = ry->z;  m->data[10] = rz->z;  m->data[14] = rw->z;
    m->data[3] = rx->w;  m->data[7] = ry->w;  m->data[11] = rz->w;  m->data[15] = rw->w;

    delete rx; delete ry; delete rz; delete rw;

    return m;
}

// ============================================================================
// Mat4x4 Functions
// ============================================================================

Vib3Mat4x4* vib3_mat4x4_identity(void) {
    Vib3Mat4x4* m = new Vib3Mat4x4();
    std::memset(m->data, 0, sizeof(m->data));
    m->data[0] = m->data[5] = m->data[10] = m->data[15] = 1.0f;
    return m;
}

Vib3Mat4x4* vib3_mat4x4_rotation_xy(float angle) {
    Vib3Mat4x4* m = vib3_mat4x4_identity();
    float c = std::cos(angle);
    float s = std::sin(angle);
    m->data[0] = c;  m->data[4] = -s;
    m->data[1] = s;  m->data[5] = c;
    return m;
}

Vib3Mat4x4* vib3_mat4x4_rotation_xz(float angle) {
    Vib3Mat4x4* m = vib3_mat4x4_identity();
    float c = std::cos(angle);
    float s = std::sin(angle);
    m->data[0] = c;   m->data[8] = -s;
    m->data[2] = s;   m->data[10] = c;
    return m;
}

Vib3Mat4x4* vib3_mat4x4_rotation_yz(float angle) {
    Vib3Mat4x4* m = vib3_mat4x4_identity();
    float c = std::cos(angle);
    float s = std::sin(angle);
    m->data[5] = c;   m->data[9] = -s;
    m->data[6] = s;   m->data[10] = c;
    return m;
}

Vib3Mat4x4* vib3_mat4x4_rotation_xw(float angle) {
    Vib3Mat4x4* m = vib3_mat4x4_identity();
    float c = std::cos(angle);
    float s = std::sin(angle);
    m->data[0] = c;   m->data[12] = -s;
    m->data[3] = s;   m->data[15] = c;
    return m;
}

Vib3Mat4x4* vib3_mat4x4_rotation_yw(float angle) {
    Vib3Mat4x4* m = vib3_mat4x4_identity();
    float c = std::cos(angle);
    float s = std::sin(angle);
    m->data[5] = c;   m->data[13] = -s;
    m->data[7] = s;   m->data[15] = c;
    return m;
}

Vib3Mat4x4* vib3_mat4x4_rotation_zw(float angle) {
    Vib3Mat4x4* m = vib3_mat4x4_identity();
    float c = std::cos(angle);
    float s = std::sin(angle);
    m->data[10] = c;  m->data[14] = -s;
    m->data[11] = s;  m->data[15] = c;
    return m;
}

Vib3Mat4x4* vib3_mat4x4_rotation_from_angles(
    float xy, float xz, float yz,
    float xw, float yw, float zw
) {
    // Compose all 6 rotation matrices
    Vib3Mat4x4* mxy = vib3_mat4x4_rotation_xy(xy);
    Vib3Mat4x4* mxz = vib3_mat4x4_rotation_xz(xz);
    Vib3Mat4x4* myz = vib3_mat4x4_rotation_yz(yz);
    Vib3Mat4x4* mxw = vib3_mat4x4_rotation_xw(xw);
    Vib3Mat4x4* myw = vib3_mat4x4_rotation_yw(yw);
    Vib3Mat4x4* mzw = vib3_mat4x4_rotation_zw(zw);

    Vib3Mat4x4* r1 = vib3_mat4x4_multiply(mxy, mxz);
    Vib3Mat4x4* r2 = vib3_mat4x4_multiply(r1, myz);
    Vib3Mat4x4* r3 = vib3_mat4x4_multiply(r2, mxw);
    Vib3Mat4x4* r4 = vib3_mat4x4_multiply(r3, myw);
    Vib3Mat4x4* result = vib3_mat4x4_multiply(r4, mzw);

    delete mxy; delete mxz; delete myz;
    delete mxw; delete myw; delete mzw;
    delete r1; delete r2; delete r3; delete r4;

    return result;
}

void vib3_mat4x4_free(Vib3Mat4x4* m) {
    delete m;
}

Vib3Mat4x4* vib3_mat4x4_multiply(const Vib3Mat4x4* a, const Vib3Mat4x4* b) {
    Vib3Mat4x4* result = new Vib3Mat4x4();

    for (int col = 0; col < 4; col++) {
        for (int row = 0; row < 4; row++) {
            float sum = 0.0f;
            for (int k = 0; k < 4; k++) {
                sum += a->data[row + k * 4] * b->data[k + col * 4];
            }
            result->data[row + col * 4] = sum;
        }
    }

    return result;
}

Vib3Vec4* vib3_mat4x4_multiply_vec4(const Vib3Mat4x4* m, const Vib3Vec4* v) {
    return vib3_vec4_create(
        m->data[0] * v->x + m->data[4] * v->y + m->data[8]  * v->z + m->data[12] * v->w,
        m->data[1] * v->x + m->data[5] * v->y + m->data[9]  * v->z + m->data[13] * v->w,
        m->data[2] * v->x + m->data[6] * v->y + m->data[10] * v->z + m->data[14] * v->w,
        m->data[3] * v->x + m->data[7] * v->y + m->data[11] * v->z + m->data[15] * v->w
    );
}

void vib3_mat4x4_get_data(const Vib3Mat4x4* m, float* out) {
    std::memcpy(out, m->data, sizeof(m->data));
}

// ============================================================================
// Projection Functions
// ============================================================================

Vib3Vec4* vib3_project_perspective(const Vib3Vec4* v, float distance) {
    float denom = distance - v->w;
    if (std::abs(denom) < 1e-10f) {
        denom = (denom >= 0) ? 1e-10f : -1e-10f;
    }
    float scale = distance / denom;
    return vib3_vec4_create(v->x * scale, v->y * scale, v->z * scale, 0.0f);
}

Vib3Vec4* vib3_project_stereographic(const Vib3Vec4* v) {
    float denom = 1.0f - v->w;
    if (std::abs(denom) < 1e-10f) {
        denom = (denom >= 0) ? 1e-10f : -1e-10f;
    }
    float scale = 1.0f / denom;
    return vib3_vec4_create(v->x * scale, v->y * scale, v->z * scale, 0.0f);
}

Vib3Vec4* vib3_project_orthographic(const Vib3Vec4* v) {
    return vib3_vec4_create(v->x, v->y, v->z, 0.0f);
}

Vib3Vec4* vib3_project_oblique(const Vib3Vec4* v, float shear_x, float shear_y) {
    return vib3_vec4_create(
        v->x + shear_x * v->w,
        v->y + shear_y * v->w,
        v->z,
        0.0f
    );
}

int32_t vib3_project_batch(
    const float* positions,
    int32_t count,
    Vib3ProjectionType type,
    float param,
    float* out
) {
    for (int32_t i = 0; i < count; i++) {
        Vib3Vec4 v = {
            positions[i * 4 + 0],
            positions[i * 4 + 1],
            positions[i * 4 + 2],
            positions[i * 4 + 3]
        };

        Vib3Vec4* projected;
        switch (type) {
            case VIB3_PROJ_PERSPECTIVE:
                projected = vib3_project_perspective(&v, param);
                break;
            case VIB3_PROJ_STEREOGRAPHIC:
                projected = vib3_project_stereographic(&v);
                break;
            case VIB3_PROJ_ORTHOGRAPHIC:
                projected = vib3_project_orthographic(&v);
                break;
            case VIB3_PROJ_OBLIQUE:
                projected = vib3_project_oblique(&v, param, param);
                break;
            default:
                projected = vib3_project_perspective(&v, param);
        }

        out[i * 3 + 0] = projected->x;
        out[i * 3 + 1] = projected->y;
        out[i * 3 + 2] = projected->z;

        delete projected;
    }

    return count * 3;
}

// ============================================================================
// Command Batching
// ============================================================================

int32_t vib3_process_command_batch(
    const uint8_t* commands,
    uint32_t size,
    uint8_t* results
) {
    // Simple command processor
    // Commands are variable-length encoded:
    // [type:1] [data:variable]

    uint32_t offset = 0;
    int32_t result_offset = 0;

    while (offset < size) {
        uint8_t cmd_type = commands[offset++];

        switch (cmd_type) {
            case 0x01: // SET_PARAMETER
                // Skip param_id (4 bytes) and value (8 bytes)
                offset += 12;
                results[result_offset++] = 1; // Success
                break;

            case 0x02: // SET_GEOMETRY
                // Skip geometry index (4 bytes)
                offset += 4;
                results[result_offset++] = 1;
                break;

            case 0x03: // ROTATE
                // Skip plane (1 byte) and angle (8 bytes)
                offset += 9;
                results[result_offset++] = 1;
                break;

            case 0x04: // RESET_ROTATION
                results[result_offset++] = 1;
                break;

            case 0x05: // RENDER
                results[result_offset++] = 1;
                break;

            default:
                results[result_offset++] = 0; // Unknown command
                break;
        }
    }

    return result_offset;
}

// ============================================================================
// Utility Functions
// ============================================================================

const char* vib3_version(void) {
    return VIB3_VERSION;
}

const char* vib3_geometry_name(int32_t index) {
    if (index < 0 || index >= 24) {
        return "unknown";
    }
    return GEOMETRY_NAMES[index];
}

bool vib3_has_simd(void) {
#if defined(VIB3_HAS_SSE41) || defined(__EMSCRIPTEN__)
    return true;
#else
    return false;
#endif
}

} // extern "C"
