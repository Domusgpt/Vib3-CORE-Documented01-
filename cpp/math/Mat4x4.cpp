/**
 * Mat4x4.cpp - 4x4 Matrix Implementation
 */

#include "Mat4x4.hpp"
#include <cmath>
#include <algorithm>

namespace vib3 {

// Constructors

Mat4x4::Mat4x4() noexcept : data{} {
    // Zero-initialized
}

Mat4x4::Mat4x4(float diagonal) noexcept : data{} {
    data[0] = diagonal;
    data[5] = diagonal;
    data[10] = diagonal;
    data[15] = diagonal;
}

Mat4x4::Mat4x4(const std::array<float, 16>& elements) noexcept : data(elements) {}

Mat4x4::Mat4x4(const Vec4& col0, const Vec4& col1, const Vec4& col2, const Vec4& col3) noexcept {
    setColumn(0, col0);
    setColumn(1, col1);
    setColumn(2, col2);
    setColumn(3, col3);
}

// Static factories

Mat4x4 Mat4x4::identity() noexcept {
    return Mat4x4(1.0f);
}

Mat4x4 Mat4x4::zero() noexcept {
    return Mat4x4();
}

// Rotation matrices

Mat4x4 Mat4x4::rotationXY(float angle) noexcept {
    float c = std::cos(angle);
    float s = std::sin(angle);

    Mat4x4 m = identity();
    m.at(0, 0) = c;
    m.at(0, 1) = -s;
    m.at(1, 0) = s;
    m.at(1, 1) = c;
    return m;
}

Mat4x4 Mat4x4::rotationXZ(float angle) noexcept {
    float c = std::cos(angle);
    float s = std::sin(angle);

    Mat4x4 m = identity();
    m.at(0, 0) = c;
    m.at(0, 2) = -s;
    m.at(2, 0) = s;
    m.at(2, 2) = c;
    return m;
}

Mat4x4 Mat4x4::rotationYZ(float angle) noexcept {
    float c = std::cos(angle);
    float s = std::sin(angle);

    Mat4x4 m = identity();
    m.at(1, 1) = c;
    m.at(1, 2) = -s;
    m.at(2, 1) = s;
    m.at(2, 2) = c;
    return m;
}

Mat4x4 Mat4x4::rotationXW(float angle) noexcept {
    float c = std::cos(angle);
    float s = std::sin(angle);

    Mat4x4 m = identity();
    m.at(0, 0) = c;
    m.at(0, 3) = -s;
    m.at(3, 0) = s;
    m.at(3, 3) = c;
    return m;
}

Mat4x4 Mat4x4::rotationYW(float angle) noexcept {
    float c = std::cos(angle);
    float s = std::sin(angle);

    Mat4x4 m = identity();
    m.at(1, 1) = c;
    m.at(1, 3) = -s;
    m.at(3, 1) = s;
    m.at(3, 3) = c;
    return m;
}

Mat4x4 Mat4x4::rotationZW(float angle) noexcept {
    float c = std::cos(angle);
    float s = std::sin(angle);

    Mat4x4 m = identity();
    m.at(2, 2) = c;
    m.at(2, 3) = -s;
    m.at(3, 2) = s;
    m.at(3, 3) = c;
    return m;
}

Mat4x4 Mat4x4::rotationFromAngles(float xy, float xz, float yz,
                                    float xw, float yw, float zw) noexcept {
    // Compose rotations: XY * XZ * YZ * XW * YW * ZW
    Mat4x4 result = identity();

    if (std::abs(xy) > 1e-8f) result *= rotationXY(xy);
    if (std::abs(xz) > 1e-8f) result *= rotationXZ(xz);
    if (std::abs(yz) > 1e-8f) result *= rotationYZ(yz);
    if (std::abs(xw) > 1e-8f) result *= rotationXW(xw);
    if (std::abs(yw) > 1e-8f) result *= rotationYW(yw);
    if (std::abs(zw) > 1e-8f) result *= rotationZW(zw);

    return result;
}

Mat4x4 Mat4x4::rotationFromAngles(const std::array<float, 6>& angles) noexcept {
    return rotationFromAngles(angles[0], angles[1], angles[2],
                              angles[3], angles[4], angles[5]);
}

// Scale matrices

Mat4x4 Mat4x4::scale(float sx, float sy, float sz, float sw) noexcept {
    Mat4x4 m;
    m.at(0, 0) = sx;
    m.at(1, 1) = sy;
    m.at(2, 2) = sz;
    m.at(3, 3) = sw;
    return m;
}

Mat4x4 Mat4x4::scale(float uniform) noexcept {
    return scale(uniform, uniform, uniform, uniform);
}

Mat4x4 Mat4x4::scale(const Vec4& s) noexcept {
    return scale(s.x, s.y, s.z, s.w);
}

// Translation (homogeneous coordinates style)

Mat4x4 Mat4x4::translation(float tx, float ty, float tz, float tw) noexcept {
    Mat4x4 m = identity();
    m.at(0, 3) = tx;
    m.at(1, 3) = ty;
    m.at(2, 3) = tz;
    m.at(3, 3) = 1.0f + tw;
    return m;
}

Mat4x4 Mat4x4::translation(const Vec4& t) noexcept {
    return translation(t.x, t.y, t.z, t.w);
}

// Element access

float& Mat4x4::at(size_t row, size_t col) noexcept {
    return data[col * 4 + row];  // Column-major
}

const float& Mat4x4::at(size_t row, size_t col) const noexcept {
    return data[col * 4 + row];
}

Vec4 Mat4x4::column(size_t col) const noexcept {
    size_t base = col * 4;
    return Vec4(data[base], data[base + 1], data[base + 2], data[base + 3]);
}

void Mat4x4::setColumn(size_t col, const Vec4& v) noexcept {
    size_t base = col * 4;
    data[base] = v.x;
    data[base + 1] = v.y;
    data[base + 2] = v.z;
    data[base + 3] = v.w;
}

Vec4 Mat4x4::row(size_t r) const noexcept {
    return Vec4(at(r, 0), at(r, 1), at(r, 2), at(r, 3));
}

void Mat4x4::setRow(size_t r, const Vec4& v) noexcept {
    at(r, 0) = v.x;
    at(r, 1) = v.y;
    at(r, 2) = v.z;
    at(r, 3) = v.w;
}

// Matrix operations

Mat4x4 Mat4x4::operator*(const Mat4x4& other) const noexcept {
    Mat4x4 result;

    for (size_t col = 0; col < 4; ++col) {
        Vec4 c = other.column(col);
        result.setColumn(col, *this * c);
    }

    return result;
}

Mat4x4& Mat4x4::operator*=(const Mat4x4& other) noexcept {
    *this = *this * other;
    return *this;
}

Vec4 Mat4x4::operator*(const Vec4& v) const noexcept {
    return Vec4(
        at(0, 0) * v.x + at(0, 1) * v.y + at(0, 2) * v.z + at(0, 3) * v.w,
        at(1, 0) * v.x + at(1, 1) * v.y + at(1, 2) * v.z + at(1, 3) * v.w,
        at(2, 0) * v.x + at(2, 1) * v.y + at(2, 2) * v.z + at(2, 3) * v.w,
        at(3, 0) * v.x + at(3, 1) * v.y + at(3, 2) * v.z + at(3, 3) * v.w
    );
}

Vec4 Mat4x4::multiplyVec4(const Vec4& v) const noexcept {
    return *this * v;
}

Mat4x4 Mat4x4::operator*(float scalar) const noexcept {
    Mat4x4 result;
    for (size_t i = 0; i < 16; ++i) {
        result.data[i] = data[i] * scalar;
    }
    return result;
}

Mat4x4& Mat4x4::operator*=(float scalar) noexcept {
    for (float& elem : data) {
        elem *= scalar;
    }
    return *this;
}

Mat4x4 Mat4x4::operator+(const Mat4x4& other) const noexcept {
    Mat4x4 result;
    for (size_t i = 0; i < 16; ++i) {
        result.data[i] = data[i] + other.data[i];
    }
    return result;
}

Mat4x4& Mat4x4::operator+=(const Mat4x4& other) noexcept {
    for (size_t i = 0; i < 16; ++i) {
        data[i] += other.data[i];
    }
    return *this;
}

Mat4x4 Mat4x4::operator-(const Mat4x4& other) const noexcept {
    Mat4x4 result;
    for (size_t i = 0; i < 16; ++i) {
        result.data[i] = data[i] - other.data[i];
    }
    return result;
}

Mat4x4& Mat4x4::operator-=(const Mat4x4& other) noexcept {
    for (size_t i = 0; i < 16; ++i) {
        data[i] -= other.data[i];
    }
    return *this;
}

Mat4x4 Mat4x4::transposed() const noexcept {
    Mat4x4 result;
    for (size_t r = 0; r < 4; ++r) {
        for (size_t c = 0; c < 4; ++c) {
            result.at(c, r) = at(r, c);
        }
    }
    return result;
}

void Mat4x4::transpose() noexcept {
    std::swap(at(0, 1), at(1, 0));
    std::swap(at(0, 2), at(2, 0));
    std::swap(at(0, 3), at(3, 0));
    std::swap(at(1, 2), at(2, 1));
    std::swap(at(1, 3), at(3, 1));
    std::swap(at(2, 3), at(3, 2));
}

// Determinant using cofactor expansion

float Mat4x4::determinant() const noexcept {
    float a00 = at(0, 0), a01 = at(0, 1), a02 = at(0, 2), a03 = at(0, 3);
    float a10 = at(1, 0), a11 = at(1, 1), a12 = at(1, 2), a13 = at(1, 3);
    float a20 = at(2, 0), a21 = at(2, 1), a22 = at(2, 2), a23 = at(2, 3);
    float a30 = at(3, 0), a31 = at(3, 1), a32 = at(3, 2), a33 = at(3, 3);

    float b00 = a00 * a11 - a01 * a10;
    float b01 = a00 * a12 - a02 * a10;
    float b02 = a00 * a13 - a03 * a10;
    float b03 = a01 * a12 - a02 * a11;
    float b04 = a01 * a13 - a03 * a11;
    float b05 = a02 * a13 - a03 * a12;
    float b06 = a20 * a31 - a21 * a30;
    float b07 = a20 * a32 - a22 * a30;
    float b08 = a20 * a33 - a23 * a30;
    float b09 = a21 * a32 - a22 * a31;
    float b10 = a21 * a33 - a23 * a31;
    float b11 = a22 * a33 - a23 * a32;

    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}

// Inverse using adjugate method

Mat4x4 Mat4x4::inverse() const noexcept {
    float a00 = at(0, 0), a01 = at(0, 1), a02 = at(0, 2), a03 = at(0, 3);
    float a10 = at(1, 0), a11 = at(1, 1), a12 = at(1, 2), a13 = at(1, 3);
    float a20 = at(2, 0), a21 = at(2, 1), a22 = at(2, 2), a23 = at(2, 3);
    float a30 = at(3, 0), a31 = at(3, 1), a32 = at(3, 2), a33 = at(3, 3);

    float b00 = a00 * a11 - a01 * a10;
    float b01 = a00 * a12 - a02 * a10;
    float b02 = a00 * a13 - a03 * a10;
    float b03 = a01 * a12 - a02 * a11;
    float b04 = a01 * a13 - a03 * a11;
    float b05 = a02 * a13 - a03 * a12;
    float b06 = a20 * a31 - a21 * a30;
    float b07 = a20 * a32 - a22 * a30;
    float b08 = a20 * a33 - a23 * a30;
    float b09 = a21 * a32 - a22 * a31;
    float b10 = a21 * a33 - a23 * a31;
    float b11 = a22 * a33 - a23 * a32;

    float det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (std::abs(det) < 1e-10f) {
        return identity();  // Singular matrix
    }

    float invDet = 1.0f / det;

    Mat4x4 result;
    result.at(0, 0) = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
    result.at(0, 1) = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
    result.at(0, 2) = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
    result.at(0, 3) = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
    result.at(1, 0) = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
    result.at(1, 1) = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
    result.at(1, 2) = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
    result.at(1, 3) = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
    result.at(2, 0) = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
    result.at(2, 1) = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
    result.at(2, 2) = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
    result.at(2, 3) = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
    result.at(3, 0) = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
    result.at(3, 1) = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
    result.at(3, 2) = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
    result.at(3, 3) = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

    return result;
}

bool Mat4x4::isOrthogonal(float epsilon) const noexcept {
    // Check if M * M^T = I
    Mat4x4 product = *this * transposed();

    for (size_t i = 0; i < 4; ++i) {
        for (size_t j = 0; j < 4; ++j) {
            float expected = (i == j) ? 1.0f : 0.0f;
            if (std::abs(product.at(i, j) - expected) > epsilon) {
                return false;
            }
        }
    }
    return true;
}

bool Mat4x4::isIdentity(float epsilon) const noexcept {
    for (size_t i = 0; i < 4; ++i) {
        for (size_t j = 0; j < 4; ++j) {
            float expected = (i == j) ? 1.0f : 0.0f;
            if (std::abs(at(i, j) - expected) > epsilon) {
                return false;
            }
        }
    }
    return true;
}

bool Mat4x4::operator==(const Mat4x4& other) const noexcept {
    return data == other.data;
}

bool Mat4x4::operator!=(const Mat4x4& other) const noexcept {
    return !(*this == other);
}

} // namespace vib3
