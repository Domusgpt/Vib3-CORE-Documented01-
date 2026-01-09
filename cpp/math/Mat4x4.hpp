/**
 * Mat4x4.hpp - 4x4 Matrix for VIB3+ SDK
 *
 * Column-major layout for direct GPU upload.
 * All 6 rotation plane matrices for 4D rotation.
 */

#pragma once

#include "Vec4.hpp"
#include <array>

namespace vib3 {

// Forward declaration
class Rotor4D;

/**
 * 4x4 Matrix class (column-major)
 *
 * Layout: [col0, col1, col2, col3] where each column is Vec4
 * Element access: m[col][row] or m.at(row, col)
 */
class alignas(64) Mat4x4 {
public:
    std::array<float, 16> data;

    // Constructors
    Mat4x4() noexcept;
    explicit Mat4x4(float diagonal) noexcept;
    Mat4x4(const std::array<float, 16>& elements) noexcept;
    Mat4x4(const Vec4& col0, const Vec4& col1, const Vec4& col2, const Vec4& col3) noexcept;

    // Static factories
    static Mat4x4 identity() noexcept;
    static Mat4x4 zero() noexcept;

    /**
     * Create rotation matrix for XY plane (around Z axis in 3D)
     */
    static Mat4x4 rotationXY(float angle) noexcept;

    /**
     * Create rotation matrix for XZ plane (around Y axis in 3D)
     */
    static Mat4x4 rotationXZ(float angle) noexcept;

    /**
     * Create rotation matrix for YZ plane (around X axis in 3D)
     */
    static Mat4x4 rotationYZ(float angle) noexcept;

    /**
     * Create rotation matrix for XW plane (4D rotation)
     */
    static Mat4x4 rotationXW(float angle) noexcept;

    /**
     * Create rotation matrix for YW plane (4D rotation)
     */
    static Mat4x4 rotationYW(float angle) noexcept;

    /**
     * Create rotation matrix for ZW plane (4D rotation)
     */
    static Mat4x4 rotationZW(float angle) noexcept;

    /**
     * Create combined rotation from all 6 angles
     * Order: XY * XZ * YZ * XW * YW * ZW
     */
    static Mat4x4 rotationFromAngles(float xy, float xz, float yz,
                                      float xw, float yw, float zw) noexcept;

    /**
     * Create combined rotation from angle array
     */
    static Mat4x4 rotationFromAngles(const std::array<float, 6>& angles) noexcept;

    /**
     * Create scale matrix
     */
    static Mat4x4 scale(float sx, float sy, float sz, float sw) noexcept;
    static Mat4x4 scale(float uniform) noexcept;
    static Mat4x4 scale(const Vec4& s) noexcept;

    /**
     * Create translation matrix (in homogeneous coordinates)
     * Note: Standard 4D doesn't use translation matrices the same way
     */
    static Mat4x4 translation(float tx, float ty, float tz, float tw = 0) noexcept;
    static Mat4x4 translation(const Vec4& t) noexcept;

    // Element access

    /**
     * Access element (row, col) - note: stored column-major
     */
    float& at(size_t row, size_t col) noexcept;
    const float& at(size_t row, size_t col) const noexcept;

    /**
     * Get column as Vec4
     */
    Vec4 column(size_t col) const noexcept;

    /**
     * Set column from Vec4
     */
    void setColumn(size_t col, const Vec4& v) noexcept;

    /**
     * Get row as Vec4
     */
    Vec4 row(size_t row) const noexcept;

    /**
     * Set row from Vec4
     */
    void setRow(size_t row, const Vec4& v) noexcept;

    // Matrix operations

    /**
     * Matrix multiplication
     */
    Mat4x4 operator*(const Mat4x4& other) const noexcept;

    /**
     * Compound multiplication
     */
    Mat4x4& operator*=(const Mat4x4& other) noexcept;

    /**
     * Transform a Vec4
     */
    Vec4 operator*(const Vec4& v) const noexcept;

    /**
     * Scalar multiplication
     */
    Mat4x4 operator*(float scalar) const noexcept;
    Mat4x4& operator*=(float scalar) noexcept;

    /**
     * Matrix addition
     */
    Mat4x4 operator+(const Mat4x4& other) const noexcept;
    Mat4x4& operator+=(const Mat4x4& other) noexcept;

    /**
     * Matrix subtraction
     */
    Mat4x4 operator-(const Mat4x4& other) const noexcept;
    Mat4x4& operator-=(const Mat4x4& other) noexcept;

    /**
     * Transpose
     */
    Mat4x4 transposed() const noexcept;

    /**
     * Transpose in place
     */
    void transpose() noexcept;

    /**
     * Determinant
     */
    float determinant() const noexcept;

    /**
     * Inverse (returns identity if singular)
     */
    Mat4x4 inverse() const noexcept;

    /**
     * Check if orthogonal (columns are orthonormal)
     */
    bool isOrthogonal(float epsilon = 1e-5f) const noexcept;

    /**
     * Check if identity matrix
     */
    bool isIdentity(float epsilon = 1e-5f) const noexcept;

    // Comparison

    bool operator==(const Mat4x4& other) const noexcept;
    bool operator!=(const Mat4x4& other) const noexcept;

    /**
     * Get pointer to data for GPU upload
     */
    const float* ptr() const noexcept { return data.data(); }
    float* ptr() noexcept { return data.data(); }

    /**
     * Transform Vec4 (same as operator*)
     */
    Vec4 multiplyVec4(const Vec4& v) const noexcept;
};

// Free function operators
inline Mat4x4 operator*(float scalar, const Mat4x4& m) noexcept {
    return m * scalar;
}

} // namespace vib3
