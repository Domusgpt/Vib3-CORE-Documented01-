/**
 * Projection.cpp - 4D to 3D Projection Implementation
 */

#include "Projection.hpp"
#include <cmath>
#include <algorithm>

namespace vib3 {

constexpr float LARGE_VALUE = 1e6f;
constexpr float EPSILON = 1e-6f;

Projection3D projectPerspective(const Vec4& v, float distance) noexcept {
    float denom = distance - v.w;

    // Handle singularity
    if (std::abs(denom) < EPSILON) {
        float sign = (denom >= 0) ? 1.0f : -1.0f;
        return Projection3D(
            v.x * sign * LARGE_VALUE,
            v.y * sign * LARGE_VALUE,
            v.z * sign * LARGE_VALUE
        );
    }

    float factor = distance / denom;
    return Projection3D(v.x * factor, v.y * factor, v.z * factor);
}

Projection3D projectStereographic(const Vec4& v) noexcept {
    float denom = 1.0f - v.w;

    // Handle singularity at w = 1 (north pole of hypersphere)
    if (std::abs(denom) < EPSILON) {
        // Return direction at infinity
        float sign = (v.x + v.y + v.z >= 0) ? 1.0f : -1.0f;
        return Projection3D(sign * LARGE_VALUE, sign * LARGE_VALUE, sign * LARGE_VALUE);
    }

    float factor = 1.0f / denom;
    return Projection3D(v.x * factor, v.y * factor, v.z * factor);
}

Projection3D projectOrthographic(const Vec4& v) noexcept {
    return Projection3D(v.x, v.y, v.z);
}

Projection3D projectOblique(const Vec4& v,
                             float shearX,
                             float shearY,
                             float shearZ) noexcept {
    return Projection3D(
        v.x + shearX * v.w,
        v.y + shearY * v.w,
        v.z + shearZ * v.w
    );
}

SliceResult projectSlice(const Vec4& v,
                          float sliceW,
                          float thickness,
                          bool fade) noexcept {
    float dist = std::abs(v.w - sliceW);

    if (dist > thickness) {
        return SliceResult::invalid();
    }

    float alpha = 1.0f;
    if (fade && thickness > 0) {
        alpha = 1.0f - (dist / thickness);
        alpha = std::max(0.0f, std::min(1.0f, alpha));
    }

    return SliceResult{
        Projection3D(v.x, v.y, v.z),
        alpha,
        true
    };
}

// Batch projections

std::vector<Projection3D> projectPerspectiveBatch(
    const std::vector<Vec4>& points,
    float distance
) noexcept {
    std::vector<Projection3D> result;
    result.reserve(points.size());

    for (const auto& p : points) {
        result.push_back(projectPerspective(p, distance));
    }

    return result;
}

std::vector<Projection3D> projectStereographicBatch(
    const std::vector<Vec4>& points
) noexcept {
    std::vector<Projection3D> result;
    result.reserve(points.size());

    for (const auto& p : points) {
        result.push_back(projectStereographic(p));
    }

    return result;
}

std::vector<Projection3D> projectOrthographicBatch(
    const std::vector<Vec4>& points
) noexcept {
    std::vector<Projection3D> result;
    result.reserve(points.size());

    for (const auto& p : points) {
        result.push_back(projectOrthographic(p));
    }

    return result;
}

std::vector<float> projectToFloatArray(
    const std::vector<Vec4>& points,
    float distance
) noexcept {
    std::vector<float> result;
    result.reserve(points.size() * 3);

    for (const auto& p : points) {
        auto proj = projectPerspective(p, distance);
        result.push_back(proj.x);
        result.push_back(proj.y);
        result.push_back(proj.z);
    }

    return result;
}

} // namespace vib3
