/**
 * Projection.hpp - 4D to 3D Projection Functions
 *
 * Various projection methods for visualizing 4D geometry in 3D.
 */

#pragma once

#include "Vec4.hpp"
#include <array>
#include <vector>

namespace vib3 {

/**
 * 4D to 3D projection result
 */
struct Projection3D {
    float x, y, z;

    constexpr Projection3D() noexcept : x(0), y(0), z(0) {}
    constexpr Projection3D(float x, float y, float z) noexcept : x(x), y(y), z(z) {}

    /**
     * Convert to array
     */
    constexpr std::array<float, 3> toArray() const noexcept {
        return {x, y, z};
    }
};

/**
 * Projection parameters
 */
struct ProjectionParams {
    float distance = 2.0f;      // For perspective projection
    float viewerW = 0.0f;       // Viewer position in W
    float sliceW = 0.0f;        // For slice projection
    float sliceThickness = 0.1f;

    static ProjectionParams defaults() noexcept {
        return ProjectionParams{};
    }
};

/**
 * Perspective projection: X = x * d / (d - w)
 *
 * Projects 4D points as if viewed from w = distance.
 * Objects farther in w appear smaller (like depth in 3D).
 *
 * @param v 4D point
 * @param distance Projection distance
 * @return 3D projected point
 */
Projection3D projectPerspective(const Vec4& v, float distance = 2.0f) noexcept;

/**
 * Stereographic projection: X = x / (1 - w)
 *
 * Conformal projection from S³ (unit hypersphere).
 * Preserves angles but not distances.
 * Pole at w = 1 maps to infinity.
 *
 * @param v 4D point (ideally on unit hypersphere)
 * @return 3D projected point
 */
Projection3D projectStereographic(const Vec4& v) noexcept;

/**
 * Orthographic projection: X = x, Y = y, Z = z
 *
 * Simple parallel projection, discarding W.
 *
 * @param v 4D point
 * @return 3D projected point
 */
Projection3D projectOrthographic(const Vec4& v) noexcept;

/**
 * Oblique (cavalier) projection: X = x + shear.x * w, etc.
 *
 * @param v 4D point
 * @param shearX X shear factor
 * @param shearY Y shear factor
 * @param shearZ Z shear factor
 * @return 3D projected point
 */
Projection3D projectOblique(const Vec4& v,
                             float shearX = 0.5f,
                             float shearY = 0.5f,
                             float shearZ = 0.0f) noexcept;

/**
 * Cross-sectional slice projection
 *
 * Returns empty if point is outside the slice.
 *
 * @param v 4D point
 * @param sliceW W coordinate of the slice plane
 * @param thickness Half-thickness of the slice
 * @param fade If true, fade points near edges
 * @return 3D point if in slice, or empty optional
 */
struct SliceResult {
    Projection3D point;
    float alpha;  // 1.0 = center of slice, 0.0 = edge
    bool valid;

    static SliceResult invalid() noexcept {
        return SliceResult{{}, 0.0f, false};
    }
};

SliceResult projectSlice(const Vec4& v,
                          float sliceW = 0.0f,
                          float thickness = 0.1f,
                          bool fade = true) noexcept;

/**
 * Batch projection for efficiency
 */
std::vector<Projection3D> projectPerspectiveBatch(
    const std::vector<Vec4>& points,
    float distance = 2.0f
) noexcept;

std::vector<Projection3D> projectStereographicBatch(
    const std::vector<Vec4>& points
) noexcept;

std::vector<Projection3D> projectOrthographicBatch(
    const std::vector<Vec4>& points
) noexcept;

/**
 * Project to flat array (for GPU upload)
 *
 * @param points Input 4D points
 * @param distance Projection distance
 * @return Flat array [x0,y0,z0, x1,y1,z1, ...]
 */
std::vector<float> projectToFloatArray(
    const std::vector<Vec4>& points,
    float distance = 2.0f
) noexcept;

} // namespace vib3
