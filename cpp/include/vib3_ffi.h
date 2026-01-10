/**
 * VIB3+ FFI Header
 *
 * C interface for cross-platform FFI bindings.
 * Used by Flutter, React Native, and other FFI-capable frameworks.
 */

#ifndef VIB3_FFI_H
#define VIB3_FFI_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// Platform export macros
#if defined(_WIN32) || defined(_WIN64)
    #define VIB3_EXPORT __declspec(dllexport)
#else
    #define VIB3_EXPORT __attribute__((visibility("default")))
#endif

// ============================================================================
// Types
// ============================================================================

/**
 * 4D Vector (16-byte aligned)
 */
typedef struct VIB3_EXPORT Vib3Vec4 {
    float x, y, z, w;
} Vib3Vec4;

/**
 * 4D Rotor (8 components for proper 4D rotation)
 */
typedef struct VIB3_EXPORT Vib3Rotor4D {
    float s;      // Scalar
    float xy;     // Bivector XY
    float xz;     // Bivector XZ
    float yz;     // Bivector YZ
    float xw;     // Bivector XW
    float yw;     // Bivector YW
    float zw;     // Bivector ZW
    float xyzw;   // Pseudoscalar
} Vib3Rotor4D;

/**
 * 4x4 Matrix (column-major)
 */
typedef struct VIB3_EXPORT Vib3Mat4x4 {
    float data[16];
} Vib3Mat4x4;

/**
 * Rotation plane enumeration
 */
typedef enum VIB3_EXPORT Vib3RotationPlane {
    VIB3_PLANE_XY = 0,
    VIB3_PLANE_XZ = 1,
    VIB3_PLANE_YZ = 2,
    VIB3_PLANE_XW = 3,
    VIB3_PLANE_YW = 4,
    VIB3_PLANE_ZW = 5
} Vib3RotationPlane;

/**
 * Projection type enumeration
 */
typedef enum VIB3_EXPORT Vib3ProjectionType {
    VIB3_PROJ_PERSPECTIVE = 0,
    VIB3_PROJ_STEREOGRAPHIC = 1,
    VIB3_PROJ_ORTHOGRAPHIC = 2,
    VIB3_PROJ_OBLIQUE = 3
} Vib3ProjectionType;

/**
 * Command batch result
 */
typedef struct VIB3_EXPORT Vib3BatchResult {
    int32_t success_count;
    int32_t error_count;
    int32_t result_size;
} Vib3BatchResult;

/**
 * Engine handle (opaque)
 */
typedef struct Vib3Engine* Vib3EngineHandle;

/**
 * Texture handle for rendering
 */
typedef struct {
    void* native_handle;  // Platform-specific texture handle
    int32_t width;
    int32_t height;
    int32_t format;
} Vib3TextureHandle;

// ============================================================================
// Vec4 Functions
// ============================================================================

VIB3_EXPORT Vib3Vec4* vib3_vec4_create(float x, float y, float z, float w);
VIB3_EXPORT void vib3_vec4_free(Vib3Vec4* v);
VIB3_EXPORT float vib3_vec4_dot(const Vib3Vec4* a, const Vib3Vec4* b);
VIB3_EXPORT float vib3_vec4_length(const Vib3Vec4* v);
VIB3_EXPORT void vib3_vec4_normalize(Vib3Vec4* v);
VIB3_EXPORT Vib3Vec4* vib3_vec4_add(const Vib3Vec4* a, const Vib3Vec4* b);
VIB3_EXPORT Vib3Vec4* vib3_vec4_sub(const Vib3Vec4* a, const Vib3Vec4* b);
VIB3_EXPORT Vib3Vec4* vib3_vec4_scale(const Vib3Vec4* v, float s);
VIB3_EXPORT Vib3Vec4* vib3_vec4_lerp(const Vib3Vec4* a, const Vib3Vec4* b, float t);

// ============================================================================
// Rotor4D Functions
// ============================================================================

VIB3_EXPORT Vib3Rotor4D* vib3_rotor4d_identity(void);
VIB3_EXPORT Vib3Rotor4D* vib3_rotor4d_from_plane_angle(Vib3RotationPlane plane, float angle);
VIB3_EXPORT Vib3Rotor4D* vib3_rotor4d_from_euler6(
    float xy, float xz, float yz,
    float xw, float yw, float zw
);
VIB3_EXPORT void vib3_rotor4d_free(Vib3Rotor4D* r);
VIB3_EXPORT Vib3Rotor4D* vib3_rotor4d_multiply(const Vib3Rotor4D* a, const Vib3Rotor4D* b);
VIB3_EXPORT Vib3Vec4* vib3_rotor4d_rotate(const Vib3Rotor4D* r, const Vib3Vec4* v);
VIB3_EXPORT Vib3Rotor4D* vib3_rotor4d_slerp(const Vib3Rotor4D* a, const Vib3Rotor4D* b, float t);
VIB3_EXPORT void vib3_rotor4d_normalize(Vib3Rotor4D* r);
VIB3_EXPORT Vib3Mat4x4* vib3_rotor4d_to_matrix(const Vib3Rotor4D* r);

// ============================================================================
// Mat4x4 Functions
// ============================================================================

VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_identity(void);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_rotation_xy(float angle);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_rotation_xz(float angle);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_rotation_yz(float angle);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_rotation_xw(float angle);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_rotation_yw(float angle);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_rotation_zw(float angle);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_rotation_from_angles(
    float xy, float xz, float yz,
    float xw, float yw, float zw
);
VIB3_EXPORT void vib3_mat4x4_free(Vib3Mat4x4* m);
VIB3_EXPORT Vib3Mat4x4* vib3_mat4x4_multiply(const Vib3Mat4x4* a, const Vib3Mat4x4* b);
VIB3_EXPORT Vib3Vec4* vib3_mat4x4_multiply_vec4(const Vib3Mat4x4* m, const Vib3Vec4* v);
VIB3_EXPORT void vib3_mat4x4_get_data(const Vib3Mat4x4* m, float* out);

// ============================================================================
// Projection Functions
// ============================================================================

VIB3_EXPORT Vib3Vec4* vib3_project_perspective(const Vib3Vec4* v, float distance);
VIB3_EXPORT Vib3Vec4* vib3_project_stereographic(const Vib3Vec4* v);
VIB3_EXPORT Vib3Vec4* vib3_project_orthographic(const Vib3Vec4* v);
VIB3_EXPORT Vib3Vec4* vib3_project_oblique(const Vib3Vec4* v, float shear_x, float shear_y);

// Batch projection (for geometry arrays)
VIB3_EXPORT int32_t vib3_project_batch(
    const float* positions,   // Input: [x,y,z,w, x,y,z,w, ...]
    int32_t count,            // Number of Vec4s
    Vib3ProjectionType type,
    float param,              // Distance for perspective, unused for others
    float* out                // Output: [x,y,z, x,y,z, ...]
);

// ============================================================================
// Command Batching
// ============================================================================

/**
 * Process a batch of commands
 *
 * @param commands Binary command buffer
 * @param size Size of command buffer in bytes
 * @param results Output buffer for results
 * @return Number of bytes written to results
 */
VIB3_EXPORT int32_t vib3_process_command_batch(
    const uint8_t* commands,
    uint32_t size,
    uint8_t* results
);

// ============================================================================
// Engine Functions
// ============================================================================

VIB3_EXPORT Vib3EngineHandle vib3_engine_create(void);
VIB3_EXPORT void vib3_engine_destroy(Vib3EngineHandle engine);

VIB3_EXPORT bool vib3_engine_initialize(
    Vib3EngineHandle engine,
    int32_t width,
    int32_t height
);

VIB3_EXPORT void vib3_engine_set_system(Vib3EngineHandle engine, const char* system);
VIB3_EXPORT void vib3_engine_set_geometry(Vib3EngineHandle engine, int32_t index);
VIB3_EXPORT void vib3_engine_set_rotation(
    Vib3EngineHandle engine,
    Vib3RotationPlane plane,
    float angle
);
VIB3_EXPORT void vib3_engine_set_all_rotations(
    Vib3EngineHandle engine,
    float xy, float xz, float yz,
    float xw, float yw, float zw
);
VIB3_EXPORT void vib3_engine_reset_rotation(Vib3EngineHandle engine);

VIB3_EXPORT void vib3_engine_set_visual_param(
    Vib3EngineHandle engine,
    const char* param,
    float value
);

VIB3_EXPORT void vib3_engine_render(Vib3EngineHandle engine);
VIB3_EXPORT Vib3TextureHandle vib3_engine_get_texture(Vib3EngineHandle engine);

// ============================================================================
// Utility Functions
// ============================================================================

VIB3_EXPORT const char* vib3_version(void);
VIB3_EXPORT const char* vib3_geometry_name(int32_t index);
VIB3_EXPORT bool vib3_has_simd(void);

#ifdef __cplusplus
}
#endif

#endif // VIB3_FFI_H
