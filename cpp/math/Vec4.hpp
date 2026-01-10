/**
 * Vec4.hpp - 4D Vector for VIB3+ SDK
 *
 * SIMD-optimized 4D vector with full geometric operations.
 * Uses float[4] for GPU compatibility and SIMD alignment.
 */

#pragma once

#include <array>
#include <cmath>
#include <numbers>
#include <algorithm>

#ifdef VIB3_HAS_SSE41
#include <smmintrin.h>
#endif

#ifdef __EMSCRIPTEN__
#include <wasm_simd128.h>
#endif

namespace vib3 {

/**
 * 4D Vector class
 *
 * Layout: [x, y, z, w] where w is the 4th dimension (not homogeneous coordinate)
 */
class alignas(16) Vec4 {
public:
    union {
        struct { float x, y, z, w; };
        std::array<float, 4> data;
#ifdef VIB3_HAS_SSE41
        __m128 simd;
#endif
#ifdef __EMSCRIPTEN__
        v128_t simd;
#endif
    };

    // Constructors
    constexpr Vec4() noexcept : x(0), y(0), z(0), w(0) {}
    constexpr Vec4(float x, float y, float z, float w) noexcept : x(x), y(y), z(z), w(w) {}
    constexpr explicit Vec4(float scalar) noexcept : x(scalar), y(scalar), z(scalar), w(scalar) {}
    constexpr Vec4(const std::array<float, 4>& arr) noexcept : data(arr) {}

#ifdef VIB3_HAS_SSE41
    Vec4(__m128 v) noexcept : simd(v) {}
#endif

    // Static factories
    static constexpr Vec4 zero() noexcept { return Vec4(0, 0, 0, 0); }
    static constexpr Vec4 one() noexcept { return Vec4(1, 1, 1, 1); }
    static constexpr Vec4 unitX() noexcept { return Vec4(1, 0, 0, 0); }
    static constexpr Vec4 unitY() noexcept { return Vec4(0, 1, 0, 0); }
    static constexpr Vec4 unitZ() noexcept { return Vec4(0, 0, 1, 0); }
    static constexpr Vec4 unitW() noexcept { return Vec4(0, 0, 0, 1); }

    /**
     * Create random unit vector on S³
     */
    static Vec4 randomUnit() noexcept;

    // Element access
    constexpr float& operator[](size_t i) noexcept { return data[i]; }
    constexpr const float& operator[](size_t i) const noexcept { return data[i]; }

    // Arithmetic operators
    Vec4 operator+(const Vec4& other) const noexcept;
    Vec4 operator-(const Vec4& other) const noexcept;
    Vec4 operator*(float scalar) const noexcept;
    Vec4 operator/(float scalar) const noexcept;
    Vec4 operator-() const noexcept;

    Vec4& operator+=(const Vec4& other) noexcept;
    Vec4& operator-=(const Vec4& other) noexcept;
    Vec4& operator*=(float scalar) noexcept;
    Vec4& operator/=(float scalar) noexcept;

    // Comparison
    bool operator==(const Vec4& other) const noexcept;
    bool operator!=(const Vec4& other) const noexcept;

    /**
     * Dot product
     */
    float dot(const Vec4& other) const noexcept;

    /**
     * Squared length (magnitude²)
     */
    float lengthSquared() const noexcept;

    /**
     * Length (magnitude)
     */
    float length() const noexcept;

    /**
     * Normalize to unit length
     */
    Vec4 normalized() const noexcept;

    /**
     * Normalize in place
     */
    void normalize() noexcept;

    /**
     * Distance to another point
     */
    float distanceTo(const Vec4& other) const noexcept;

    /**
     * Squared distance to another point
     */
    float distanceSquaredTo(const Vec4& other) const noexcept;

    /**
     * Linear interpolation
     */
    Vec4 lerp(const Vec4& other, float t) const noexcept;

    /**
     * Component-wise minimum
     */
    Vec4 min(const Vec4& other) const noexcept;

    /**
     * Component-wise maximum
     */
    Vec4 max(const Vec4& other) const noexcept;

    /**
     * Component-wise clamp
     */
    Vec4 clamp(const Vec4& minVal, const Vec4& maxVal) const noexcept;

    /**
     * Component-wise absolute value
     */
    Vec4 abs() const noexcept;

    /**
     * Project onto another vector
     */
    Vec4 projectOnto(const Vec4& other) const noexcept;

    /**
     * Reflect across a normal
     */
    Vec4 reflect(const Vec4& normal) const noexcept;

    /**
     * Check if approximately zero
     */
    bool isZero(float epsilon = 1e-6f) const noexcept;

    /**
     * Check if approximately unit length
     */
    bool isNormalized(float epsilon = 1e-6f) const noexcept;

    /**
     * Get pointer to data for GPU upload
     */
    const float* ptr() const noexcept { return data.data(); }
    float* ptr() noexcept { return data.data(); }

    // Projections (4D -> 3D)

    /**
     * Perspective projection: X = x*d/(d-w), Y = y*d/(d-w), Z = z*d/(d-w)
     */
    std::array<float, 3> projectPerspective(float distance) const noexcept;

    /**
     * Stereographic projection: X = x/(1-w), Y = y/(1-w), Z = z/(1-w)
     */
    std::array<float, 3> projectStereographic() const noexcept;

    /**
     * Orthographic projection: X = x, Y = y, Z = z
     */
    std::array<float, 3> projectOrthographic() const noexcept;
};

// Free function operators
inline Vec4 operator*(float scalar, const Vec4& v) noexcept {
    return v * scalar;
}

/**
 * Dot product free function
 */
inline float dot(const Vec4& a, const Vec4& b) noexcept {
    return a.dot(b);
}

/**
 * Cross product in 4D (returns bivector, not implemented here)
 * Use wedge product for proper 4D cross products
 */

/**
 * Distance free function
 */
inline float distance(const Vec4& a, const Vec4& b) noexcept {
    return a.distanceTo(b);
}

/**
 * Lerp free function
 */
inline Vec4 lerp(const Vec4& a, const Vec4& b, float t) noexcept {
    return a.lerp(b, t);
}

} // namespace vib3
