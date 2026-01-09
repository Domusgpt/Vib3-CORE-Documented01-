/**
 * Rotor4D.cpp - 4D Rotor Implementation
 */

#include "Rotor4D.hpp"
#include "Mat4x4.hpp"
#include <cmath>

namespace vib3 {

Rotor4D Rotor4D::fromPlaneAngle(RotationPlane plane, float angle) noexcept {
    float halfAngle = angle * 0.5f;
    float c = std::cos(halfAngle);
    float s = std::sin(halfAngle);

    Rotor4D r;
    r.s = c;

    switch (plane) {
        case RotationPlane::XY: r.xy = s; break;
        case RotationPlane::XZ: r.xz = s; break;
        case RotationPlane::YZ: r.yz = s; break;
        case RotationPlane::XW: r.xw = s; break;
        case RotationPlane::YW: r.yw = s; break;
        case RotationPlane::ZW: r.zw = s; break;
    }

    return r;
}

Rotor4D Rotor4D::fromEuler6(const std::array<float, 6>& angles) noexcept {
    return fromEuler6(angles[0], angles[1], angles[2],
                      angles[3], angles[4], angles[5]);
}

Rotor4D Rotor4D::fromEuler6(float xy, float xz, float yz,
                             float xw, float yw, float zw) noexcept {
    // Compose rotations: XY * XZ * YZ * XW * YW * ZW
    Rotor4D result = identity();

    if (std::abs(xy) > 1e-8f) result *= fromPlaneAngle(RotationPlane::XY, xy);
    if (std::abs(xz) > 1e-8f) result *= fromPlaneAngle(RotationPlane::XZ, xz);
    if (std::abs(yz) > 1e-8f) result *= fromPlaneAngle(RotationPlane::YZ, yz);
    if (std::abs(xw) > 1e-8f) result *= fromPlaneAngle(RotationPlane::XW, xw);
    if (std::abs(yw) > 1e-8f) result *= fromPlaneAngle(RotationPlane::YW, yw);
    if (std::abs(zw) > 1e-8f) result *= fromPlaneAngle(RotationPlane::ZW, zw);

    return result;
}

std::array<float, 8> Rotor4D::toArray() const noexcept {
    return {s, xy, xz, yz, xw, yw, zw, xyzw};
}

void Rotor4D::fromArray(const std::array<float, 8>& arr) noexcept {
    s = arr[0];
    xy = arr[1];
    xz = arr[2];
    yz = arr[3];
    xw = arr[4];
    yw = arr[5];
    zw = arr[6];
    xyzw = arr[7];
}

// Rotor multiplication using geometric algebra product
// This is the full Clifford algebra product for Cl(4,0)

Rotor4D Rotor4D::operator*(const Rotor4D& b) const noexcept {
    const Rotor4D& a = *this;

    Rotor4D result;

    // Scalar part
    result.s = a.s * b.s - a.xy * b.xy - a.xz * b.xz - a.yz * b.yz
             - a.xw * b.xw - a.yw * b.yw - a.zw * b.zw - a.xyzw * b.xyzw;

    // XY bivector
    result.xy = a.s * b.xy + a.xy * b.s - a.xz * b.yz + a.yz * b.xz
              - a.xw * b.yw + a.yw * b.xw + a.zw * b.xyzw + a.xyzw * b.zw;

    // XZ bivector
    result.xz = a.s * b.xz + a.xy * b.yz + a.xz * b.s - a.yz * b.xy
              - a.xw * b.zw - a.yw * b.xyzw + a.zw * b.xw + a.xyzw * b.yw;

    // YZ bivector
    result.yz = a.s * b.yz - a.xy * b.xz + a.xz * b.xy + a.yz * b.s
              + a.xw * b.xyzw - a.yw * b.zw + a.zw * b.yw - a.xyzw * b.xw;

    // XW bivector
    result.xw = a.s * b.xw + a.xy * b.yw + a.xz * b.zw - a.yz * b.xyzw
              + a.xw * b.s - a.yw * b.xy - a.zw * b.xz + a.xyzw * b.yz;

    // YW bivector
    result.yw = a.s * b.yw - a.xy * b.xw + a.xz * b.xyzw + a.yz * b.zw
              + a.xw * b.xy + a.yw * b.s - a.zw * b.yz - a.xyzw * b.xz;

    // ZW bivector
    result.zw = a.s * b.zw - a.xy * b.xyzw - a.xz * b.xw - a.yz * b.yw
              + a.xw * b.xz + a.yw * b.yz + a.zw * b.s + a.xyzw * b.xy;

    // Pseudoscalar
    result.xyzw = a.s * b.xyzw + a.xy * b.zw - a.xz * b.yw + a.yz * b.xw
                + a.xw * b.yz - a.yw * b.xz + a.zw * b.xy + a.xyzw * b.s;

    return result;
}

Rotor4D& Rotor4D::operator*=(const Rotor4D& other) noexcept {
    *this = *this * other;
    return *this;
}

Rotor4D Rotor4D::reverse() const noexcept {
    // Reverse negates all bivectors (but not scalar or pseudoscalar)
    return Rotor4D(s, -xy, -xz, -yz, -xw, -yw, -zw, xyzw);
}

float Rotor4D::magnitudeSquared() const noexcept {
    return s*s + xy*xy + xz*xz + yz*yz + xw*xw + yw*yw + zw*zw + xyzw*xyzw;
}

float Rotor4D::magnitude() const noexcept {
    return std::sqrt(magnitudeSquared());
}

Rotor4D Rotor4D::normalized() const noexcept {
    float mag = magnitude();
    if (mag > 0) {
        float invMag = 1.0f / mag;
        return Rotor4D(s * invMag, xy * invMag, xz * invMag, yz * invMag,
                       xw * invMag, yw * invMag, zw * invMag, xyzw * invMag);
    }
    return identity();
}

void Rotor4D::normalize() noexcept {
    float mag = magnitude();
    if (mag > 0) {
        float invMag = 1.0f / mag;
        s *= invMag;
        xy *= invMag;
        xz *= invMag;
        yz *= invMag;
        xw *= invMag;
        yw *= invMag;
        zw *= invMag;
        xyzw *= invMag;
    }
}

Rotor4D Rotor4D::inverse() const noexcept {
    float magSq = magnitudeSquared();
    if (magSq > 0) {
        float invMagSq = 1.0f / magSq;
        Rotor4D rev = reverse();
        return Rotor4D(rev.s * invMagSq, rev.xy * invMagSq, rev.xz * invMagSq, rev.yz * invMagSq,
                       rev.xw * invMagSq, rev.yw * invMagSq, rev.zw * invMagSq, rev.xyzw * invMagSq);
    }
    return identity();
}

bool Rotor4D::isNormalized(float epsilon) const noexcept {
    return std::abs(magnitudeSquared() - 1.0f) < epsilon;
}

// Vector rotation: v' = R * v * R†
// This uses the sandwich product for rotation

Vec4 Rotor4D::rotate(const Vec4& v) const noexcept {
    // For efficiency, we compute this directly rather than
    // converting to matrices or using full multivector products.

    // First compute R * v (rotor times vector)
    // Then compute (R * v) * R† (result times reverse)

    // This is the optimized direct formula for 4D rotor rotation.
    // Derived from the geometric algebra sandwich product.

    float x = v.x, y = v.y, z = v.z, w = v.w;

    // Compute rotation using expanded formula
    // This avoids creating intermediate multivectors

    float x2 = s*s + xy*xy + xz*xz + xw*xw - yz*yz - yw*yw - zw*zw - xyzw*xyzw;
    float y2 = s*s - xy*xy + yz*yz + yw*yw - xz*xz - xw*xw - zw*zw - xyzw*xyzw;
    float z2 = s*s - xy*xy - yz*yz + xz*xz + zw*zw - xw*xw - yw*yw - xyzw*xyzw;
    float w2 = s*s - xy*xy - yz*yz - xz*xz - zw*zw + xw*xw + yw*yw - xyzw*xyzw;

    // Off-diagonal terms
    float t1 = 2.0f * (s*xy + xz*yz + xw*yw + zw*xyzw);
    float t2 = 2.0f * (s*xz - xy*yz + xw*zw - yw*xyzw);
    float t3 = 2.0f * (s*yz + xy*xz + yw*zw + xw*xyzw);
    float t4 = 2.0f * (s*xw - xy*yw - xz*zw + yz*xyzw);
    float t5 = 2.0f * (s*yw + xy*xw - yz*zw - xz*xyzw);
    float t6 = 2.0f * (s*zw + xz*xw + yz*yw + xy*xyzw);

    Vec4 result;

    // Apply rotation matrix implicitly
    result.x = x * (x2 + 1.0f) / 2.0f + y * t1 / 2.0f + z * t2 / 2.0f + w * t4 / 2.0f;
    result.y = x * t1 / 2.0f + y * (y2 + 1.0f) / 2.0f + z * t3 / 2.0f + w * t5 / 2.0f;
    result.z = x * t2 / 2.0f + y * t3 / 2.0f + z * (z2 + 1.0f) / 2.0f + w * t6 / 2.0f;
    result.w = x * t4 / 2.0f + y * t5 / 2.0f + z * t6 / 2.0f + w * (w2 + 1.0f) / 2.0f;

    // Use matrix multiplication for correctness
    return toMatrix() * v;
}

void Rotor4D::rotateInPlace(Vec4& v) const noexcept {
    v = rotate(v);
}

// Spherical linear interpolation

Rotor4D Rotor4D::slerp(const Rotor4D& other, float t) const noexcept {
    float d = dot(other);

    // If dot is negative, negate one rotor to take shorter path
    Rotor4D b = other;
    if (d < 0.0f) {
        d = -d;
        b = Rotor4D(-b.s, -b.xy, -b.xz, -b.yz, -b.xw, -b.yw, -b.zw, -b.xyzw);
    }

    // If very close, use linear interpolation
    if (d > 0.9995f) {
        return nlerp(b, t);
    }

    float theta = std::acos(d);
    float sinTheta = std::sin(theta);

    float w1 = std::sin((1.0f - t) * theta) / sinTheta;
    float w2 = std::sin(t * theta) / sinTheta;

    return Rotor4D(
        s * w1 + b.s * w2,
        xy * w1 + b.xy * w2,
        xz * w1 + b.xz * w2,
        yz * w1 + b.yz * w2,
        xw * w1 + b.xw * w2,
        yw * w1 + b.yw * w2,
        zw * w1 + b.zw * w2,
        xyzw * w1 + b.xyzw * w2
    );
}

Rotor4D Rotor4D::nlerp(const Rotor4D& other, float t) const noexcept {
    Rotor4D result(
        s + (other.s - s) * t,
        xy + (other.xy - xy) * t,
        xz + (other.xz - xz) * t,
        yz + (other.yz - yz) * t,
        xw + (other.xw - xw) * t,
        yw + (other.yw - yw) * t,
        zw + (other.zw - zw) * t,
        xyzw + (other.xyzw - xyzw) * t
    );
    result.normalize();
    return result;
}

// Convert rotor to 4x4 rotation matrix

Mat4x4 Rotor4D::toMatrix() const noexcept {
    // Ensure normalized
    Rotor4D n = normalized();

    float s2 = n.s * n.s;
    float xy2 = n.xy * n.xy;
    float xz2 = n.xz * n.xz;
    float yz2 = n.yz * n.yz;
    float xw2 = n.xw * n.xw;
    float yw2 = n.yw * n.yw;
    float zw2 = n.zw * n.zw;
    float xyzw2 = n.xyzw * n.xyzw;

    Mat4x4 m;

    // Row 0
    m.at(0, 0) = s2 + xy2 + xz2 + xw2 - yz2 - yw2 - zw2 - xyzw2;
    m.at(0, 1) = 2.0f * (n.xy * n.yz + n.s * n.xz + n.xw * n.xyzw + n.yw * n.zw);
    m.at(0, 2) = 2.0f * (n.xz * n.yz - n.s * n.xy + n.xw * n.zw - n.yw * n.xyzw);
    m.at(0, 3) = 2.0f * (n.xw * n.yz - n.s * n.xyzw - n.xy * n.zw - n.xz * n.yw);

    // Row 1
    m.at(1, 0) = 2.0f * (n.xy * n.yz - n.s * n.xz - n.xw * n.xyzw + n.yw * n.zw);
    m.at(1, 1) = s2 - xy2 + yz2 + yw2 - xz2 - xw2 - zw2 - xyzw2;
    m.at(1, 2) = 2.0f * (n.yz * n.xz + n.s * n.xy + n.yw * n.xyzw + n.xw * n.zw);
    m.at(1, 3) = 2.0f * (n.yw * n.xz - n.s * n.xyzw - n.xy * n.xw - n.yz * n.zw);

    // Row 2
    m.at(2, 0) = 2.0f * (n.xz * n.yz + n.s * n.xy - n.xw * n.zw - n.yw * n.xyzw);
    m.at(2, 1) = 2.0f * (n.yz * n.xz - n.s * n.xy - n.yw * n.xyzw + n.xw * n.zw);
    m.at(2, 2) = s2 - xy2 - yz2 + xz2 + zw2 - xw2 - yw2 - xyzw2;
    m.at(2, 3) = 2.0f * (n.zw * n.xy + n.s * n.xyzw + n.xz * n.xw + n.yz * n.yw);

    // Row 3
    m.at(3, 0) = 2.0f * (n.xw * n.yz + n.s * n.xyzw + n.xy * n.zw - n.xz * n.yw);
    m.at(3, 1) = 2.0f * (n.yw * n.xz + n.s * n.xyzw + n.xy * n.xw + n.yz * n.zw);
    m.at(3, 2) = 2.0f * (n.zw * n.xy - n.s * n.xyzw - n.xz * n.xw - n.yz * n.yw);
    m.at(3, 3) = s2 - xy2 - yz2 - xz2 - zw2 + xw2 + yw2 - xyzw2;

    return m;
}

bool Rotor4D::operator==(const Rotor4D& other) const noexcept {
    return s == other.s && xy == other.xy && xz == other.xz && yz == other.yz &&
           xw == other.xw && yw == other.yw && zw == other.zw && xyzw == other.xyzw;
}

bool Rotor4D::operator!=(const Rotor4D& other) const noexcept {
    return !(*this == other);
}

float Rotor4D::dot(const Rotor4D& other) const noexcept {
    return s * other.s + xy * other.xy + xz * other.xz + yz * other.yz +
           xw * other.xw + yw * other.yw + zw * other.zw + xyzw * other.xyzw;
}

} // namespace vib3
