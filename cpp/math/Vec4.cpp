/**
 * Vec4.cpp - 4D Vector Implementation
 */

#include "Vec4.hpp"
#include <random>
#include <limits>

namespace vib3 {

// Static random generator for randomUnit()
static std::mt19937& getRandomEngine() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    return gen;
}

Vec4 Vec4::randomUnit() noexcept {
    // Marsaglia method for uniform distribution on S³
    std::normal_distribution<float> dist(0.0f, 1.0f);
    auto& gen = getRandomEngine();

    Vec4 v(dist(gen), dist(gen), dist(gen), dist(gen));
    v.normalize();
    return v;
}

// Arithmetic operators

#if defined(VIB3_HAS_SSE41)

Vec4 Vec4::operator+(const Vec4& other) const noexcept {
    return Vec4(_mm_add_ps(simd, other.simd));
}

Vec4 Vec4::operator-(const Vec4& other) const noexcept {
    return Vec4(_mm_sub_ps(simd, other.simd));
}

Vec4 Vec4::operator*(float scalar) const noexcept {
    return Vec4(_mm_mul_ps(simd, _mm_set1_ps(scalar)));
}

Vec4 Vec4::operator/(float scalar) const noexcept {
    return Vec4(_mm_div_ps(simd, _mm_set1_ps(scalar)));
}

Vec4 Vec4::operator-() const noexcept {
    return Vec4(_mm_xor_ps(simd, _mm_set1_ps(-0.0f)));
}

float Vec4::dot(const Vec4& other) const noexcept {
    __m128 mul = _mm_mul_ps(simd, other.simd);
    __m128 sum = _mm_hadd_ps(mul, mul);
    sum = _mm_hadd_ps(sum, sum);
    return _mm_cvtss_f32(sum);
}

Vec4 Vec4::min(const Vec4& other) const noexcept {
    return Vec4(_mm_min_ps(simd, other.simd));
}

Vec4 Vec4::max(const Vec4& other) const noexcept {
    return Vec4(_mm_max_ps(simd, other.simd));
}

Vec4 Vec4::abs() const noexcept {
    __m128 mask = _mm_castsi128_ps(_mm_set1_epi32(0x7FFFFFFF));
    return Vec4(_mm_and_ps(simd, mask));
}

#elif defined(__EMSCRIPTEN__)

Vec4 Vec4::operator+(const Vec4& other) const noexcept {
    return Vec4(wasm_f32x4_add(simd, other.simd));
}

Vec4 Vec4::operator-(const Vec4& other) const noexcept {
    return Vec4(wasm_f32x4_sub(simd, other.simd));
}

Vec4 Vec4::operator*(float scalar) const noexcept {
    return Vec4(wasm_f32x4_mul(simd, wasm_f32x4_splat(scalar)));
}

Vec4 Vec4::operator/(float scalar) const noexcept {
    return Vec4(wasm_f32x4_div(simd, wasm_f32x4_splat(scalar)));
}

Vec4 Vec4::operator-() const noexcept {
    return Vec4(wasm_f32x4_neg(simd));
}

float Vec4::dot(const Vec4& other) const noexcept {
    v128_t mul = wasm_f32x4_mul(simd, other.simd);
    return wasm_f32x4_extract_lane(mul, 0) +
           wasm_f32x4_extract_lane(mul, 1) +
           wasm_f32x4_extract_lane(mul, 2) +
           wasm_f32x4_extract_lane(mul, 3);
}

Vec4 Vec4::min(const Vec4& other) const noexcept {
    return Vec4(wasm_f32x4_min(simd, other.simd));
}

Vec4 Vec4::max(const Vec4& other) const noexcept {
    return Vec4(wasm_f32x4_max(simd, other.simd));
}

Vec4 Vec4::abs() const noexcept {
    return Vec4(wasm_f32x4_abs(simd));
}

#else
// Scalar fallback

Vec4 Vec4::operator+(const Vec4& other) const noexcept {
    return Vec4(x + other.x, y + other.y, z + other.z, w + other.w);
}

Vec4 Vec4::operator-(const Vec4& other) const noexcept {
    return Vec4(x - other.x, y - other.y, z - other.z, w - other.w);
}

Vec4 Vec4::operator*(float scalar) const noexcept {
    return Vec4(x * scalar, y * scalar, z * scalar, w * scalar);
}

Vec4 Vec4::operator/(float scalar) const noexcept {
    float inv = 1.0f / scalar;
    return Vec4(x * inv, y * inv, z * inv, w * inv);
}

Vec4 Vec4::operator-() const noexcept {
    return Vec4(-x, -y, -z, -w);
}

float Vec4::dot(const Vec4& other) const noexcept {
    return x * other.x + y * other.y + z * other.z + w * other.w;
}

Vec4 Vec4::min(const Vec4& other) const noexcept {
    return Vec4(
        std::min(x, other.x),
        std::min(y, other.y),
        std::min(z, other.z),
        std::min(w, other.w)
    );
}

Vec4 Vec4::max(const Vec4& other) const noexcept {
    return Vec4(
        std::max(x, other.x),
        std::max(y, other.y),
        std::max(z, other.z),
        std::max(w, other.w)
    );
}

Vec4 Vec4::abs() const noexcept {
    return Vec4(std::abs(x), std::abs(y), std::abs(z), std::abs(w));
}

#endif

// Compound assignment (always scalar for simplicity)

Vec4& Vec4::operator+=(const Vec4& other) noexcept {
    *this = *this + other;
    return *this;
}

Vec4& Vec4::operator-=(const Vec4& other) noexcept {
    *this = *this - other;
    return *this;
}

Vec4& Vec4::operator*=(float scalar) noexcept {
    *this = *this * scalar;
    return *this;
}

Vec4& Vec4::operator/=(float scalar) noexcept {
    *this = *this / scalar;
    return *this;
}

// Comparison

bool Vec4::operator==(const Vec4& other) const noexcept {
    return x == other.x && y == other.y && z == other.z && w == other.w;
}

bool Vec4::operator!=(const Vec4& other) const noexcept {
    return !(*this == other);
}

// Length and normalization

float Vec4::lengthSquared() const noexcept {
    return dot(*this);
}

float Vec4::length() const noexcept {
    return std::sqrt(lengthSquared());
}

Vec4 Vec4::normalized() const noexcept {
    float len = length();
    if (len > 0) {
        return *this / len;
    }
    return Vec4::zero();
}

void Vec4::normalize() noexcept {
    float len = length();
    if (len > 0) {
        *this /= len;
    }
}

// Distance

float Vec4::distanceTo(const Vec4& other) const noexcept {
    return (*this - other).length();
}

float Vec4::distanceSquaredTo(const Vec4& other) const noexcept {
    return (*this - other).lengthSquared();
}

// Interpolation

Vec4 Vec4::lerp(const Vec4& other, float t) const noexcept {
    return *this + (other - *this) * t;
}

// Clamp

Vec4 Vec4::clamp(const Vec4& minVal, const Vec4& maxVal) const noexcept {
    return this->max(minVal).min(maxVal);
}

// Projection and reflection

Vec4 Vec4::projectOnto(const Vec4& other) const noexcept {
    float d = other.dot(other);
    if (d > 0) {
        return other * (dot(other) / d);
    }
    return Vec4::zero();
}

Vec4 Vec4::reflect(const Vec4& normal) const noexcept {
    return *this - normal * (2.0f * dot(normal));
}

// Validation

bool Vec4::isZero(float epsilon) const noexcept {
    return lengthSquared() < epsilon * epsilon;
}

bool Vec4::isNormalized(float epsilon) const noexcept {
    return std::abs(lengthSquared() - 1.0f) < epsilon;
}

// 4D -> 3D Projections

std::array<float, 3> Vec4::projectPerspective(float distance) const noexcept {
    float denom = distance - w;

    // Handle singularity
    if (std::abs(denom) < 1e-6f) {
        float sign = (denom >= 0) ? 1.0f : -1.0f;
        constexpr float large = 1e6f;
        return {x * sign * large, y * sign * large, z * sign * large};
    }

    float factor = distance / denom;
    return {x * factor, y * factor, z * factor};
}

std::array<float, 3> Vec4::projectStereographic() const noexcept {
    float denom = 1.0f - w;

    // Handle singularity at w = 1
    if (std::abs(denom) < 1e-6f) {
        constexpr float large = 1e6f;
        float sign = (x + y + z >= 0) ? 1.0f : -1.0f;
        return {sign * large, sign * large, sign * large};
    }

    float factor = 1.0f / denom;
    return {x * factor, y * factor, z * factor};
}

std::array<float, 3> Vec4::projectOrthographic() const noexcept {
    return {x, y, z};
}

} // namespace vib3
