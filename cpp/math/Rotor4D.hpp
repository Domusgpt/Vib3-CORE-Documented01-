/**
 * Rotor4D.hpp - 4D Rotor for VIB3+ SDK
 *
 * 8-component rotor for proper 4D rotation using geometric algebra.
 * Components: scalar + 6 bivectors (XY, XZ, YZ, XW, YW, ZW) + pseudoscalar
 *
 * Unlike quaternions (which work for 3D), rotors handle all 6 rotation planes.
 */

#pragma once

#include "Vec4.hpp"
#include "Mat4x4.hpp"
#include <array>

namespace vib3 {

// Forward declaration
class Mat4x4;

/**
 * Rotation plane identifiers
 */
enum class RotationPlane {
    XY = 0,  // 3D rotation around Z
    XZ = 1,  // 3D rotation around Y
    YZ = 2,  // 3D rotation around X
    XW = 3,  // 4D rotation (X-W plane)
    YW = 4,  // 4D rotation (Y-W plane)
    ZW = 5   // 4D rotation (Z-W plane)
};

/**
 * 4D Rotor class
 *
 * Components:
 * - s:    scalar part
 * - xy:   XY bivector (rotation in XY plane)
 * - xz:   XZ bivector (rotation in XZ plane)
 * - yz:   YZ bivector (rotation in YZ plane)
 * - xw:   XW bivector (rotation in XW plane)
 * - yw:   YW bivector (rotation in YW plane)
 * - zw:   ZW bivector (rotation in ZW plane)
 * - xyzw: pseudoscalar (4D volume element)
 */
class Rotor4D {
public:
    float s;     // Scalar
    float xy;    // Bivector XY
    float xz;    // Bivector XZ
    float yz;    // Bivector YZ
    float xw;    // Bivector XW
    float yw;    // Bivector YW
    float zw;    // Bivector ZW
    float xyzw;  // Pseudoscalar

    // Constructors
    constexpr Rotor4D() noexcept
        : s(1), xy(0), xz(0), yz(0), xw(0), yw(0), zw(0), xyzw(0) {}

    constexpr Rotor4D(float s, float xy, float xz, float yz,
                      float xw, float yw, float zw, float xyzw) noexcept
        : s(s), xy(xy), xz(xz), yz(yz), xw(xw), yw(yw), zw(zw), xyzw(xyzw) {}

    /**
     * Identity rotor (no rotation)
     */
    static constexpr Rotor4D identity() noexcept {
        return Rotor4D(1, 0, 0, 0, 0, 0, 0, 0);
    }

    /**
     * Create rotor from rotation in a single plane
     * @param plane The rotation plane
     * @param angle Rotation angle in radians
     */
    static Rotor4D fromPlaneAngle(RotationPlane plane, float angle) noexcept;

    /**
     * Create rotor from 6 Euler-like angles (one per plane)
     * @param angles Array of 6 angles [XY, XZ, YZ, XW, YW, ZW]
     */
    static Rotor4D fromEuler6(const std::array<float, 6>& angles) noexcept;

    /**
     * Create rotor from 6 individual angles
     */
    static Rotor4D fromEuler6(float xy, float xz, float yz,
                               float xw, float yw, float zw) noexcept;

    /**
     * Get all components as array
     */
    std::array<float, 8> toArray() const noexcept;

    /**
     * Set all components from array
     */
    void fromArray(const std::array<float, 8>& arr) noexcept;

    // Rotor operations

    /**
     * Rotor multiplication (composition)
     */
    Rotor4D operator*(const Rotor4D& other) const noexcept;

    /**
     * Compound multiplication
     */
    Rotor4D& operator*=(const Rotor4D& other) noexcept;

    /**
     * Reverse (conjugate) - reverses rotation direction
     */
    Rotor4D reverse() const noexcept;

    /**
     * Squared magnitude
     */
    float magnitudeSquared() const noexcept;

    /**
     * Magnitude (norm)
     */
    float magnitude() const noexcept;

    /**
     * Normalize to unit rotor
     */
    Rotor4D normalized() const noexcept;

    /**
     * Normalize in place
     */
    void normalize() noexcept;

    /**
     * Inverse rotor
     */
    Rotor4D inverse() const noexcept;

    /**
     * Check if approximately unit rotor
     */
    bool isNormalized(float epsilon = 1e-5f) const noexcept;

    // Vector rotation

    /**
     * Rotate a 4D vector: v' = R * v * R†
     */
    Vec4 rotate(const Vec4& v) const noexcept;

    /**
     * Rotate a 4D vector (in place)
     */
    void rotateInPlace(Vec4& v) const noexcept;

    // Interpolation

    /**
     * Spherical linear interpolation
     */
    Rotor4D slerp(const Rotor4D& other, float t) const noexcept;

    /**
     * Normalized linear interpolation (faster but less accurate)
     */
    Rotor4D nlerp(const Rotor4D& other, float t) const noexcept;

    // Matrix conversion

    /**
     * Convert to 4x4 rotation matrix
     */
    Mat4x4 toMatrix() const noexcept;

    // Comparison

    bool operator==(const Rotor4D& other) const noexcept;
    bool operator!=(const Rotor4D& other) const noexcept;

    /**
     * Dot product between rotors (for slerp)
     */
    float dot(const Rotor4D& other) const noexcept;
};

/**
 * Compose two rotations
 */
inline Rotor4D compose(const Rotor4D& first, const Rotor4D& second) noexcept {
    return first * second;
}

/**
 * Slerp free function
 */
inline Rotor4D slerp(const Rotor4D& a, const Rotor4D& b, float t) noexcept {
    return a.slerp(b, t);
}

} // namespace vib3
