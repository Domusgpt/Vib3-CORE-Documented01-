/**
 * embind.cpp - Emscripten JavaScript Bindings
 *
 * Exposes VIB3+ C++ classes to JavaScript via WebAssembly.
 */

#include <emscripten/bind.h>
#include "../math/Vec4.hpp"
#include "../math/Rotor4D.hpp"
#include "../math/Mat4x4.hpp"
#include "../math/Projection.hpp"

using namespace emscripten;
using namespace vib3;

// Helper to convert std::array to JS array
template<typename T, size_t N>
val arrayToVal(const std::array<T, N>& arr) {
    val jsArray = val::array();
    for (size_t i = 0; i < N; ++i) {
        jsArray.call<void>("push", arr[i]);
    }
    return jsArray;
}

// Helper to convert JS array to std::array
template<typename T, size_t N>
std::array<T, N> valToArray(const val& jsArray) {
    std::array<T, N> arr;
    for (size_t i = 0; i < N; ++i) {
        arr[i] = jsArray[i].as<T>();
    }
    return arr;
}

EMSCRIPTEN_BINDINGS(vib3_math) {
    // ====== Vec4 ======

    class_<Vec4>("Vec4")
        .constructor<>()
        .constructor<float, float, float, float>()
        .constructor<float>()

        // Properties
        .property("x", &Vec4::x)
        .property("y", &Vec4::y)
        .property("z", &Vec4::z)
        .property("w", &Vec4::w)

        // Static factories
        .class_function("zero", &Vec4::zero)
        .class_function("one", &Vec4::one)
        .class_function("unitX", &Vec4::unitX)
        .class_function("unitY", &Vec4::unitY)
        .class_function("unitZ", &Vec4::unitZ)
        .class_function("unitW", &Vec4::unitW)
        .class_function("randomUnit", &Vec4::randomUnit)

        // Arithmetic
        .function("add", select_overload<Vec4(const Vec4&) const>(&Vec4::operator+))
        .function("sub", select_overload<Vec4(const Vec4&) const>(&Vec4::operator-))
        .function("mul", select_overload<Vec4(float) const>(&Vec4::operator*))
        .function("div", select_overload<Vec4(float) const>(&Vec4::operator/))
        .function("neg", select_overload<Vec4() const>(&Vec4::operator-))

        // Operations
        .function("dot", &Vec4::dot)
        .function("length", &Vec4::length)
        .function("lengthSquared", &Vec4::lengthSquared)
        .function("normalized", &Vec4::normalized)
        .function("normalize", &Vec4::normalize)
        .function("distanceTo", &Vec4::distanceTo)
        .function("distanceSquaredTo", &Vec4::distanceSquaredTo)
        .function("lerp", &Vec4::lerp)
        .function("min", &Vec4::min)
        .function("max", &Vec4::max)
        .function("clamp", &Vec4::clamp)
        .function("abs", &Vec4::abs)
        .function("projectOnto", &Vec4::projectOnto)
        .function("reflect", &Vec4::reflect)
        .function("isZero", &Vec4::isZero)
        .function("isNormalized", &Vec4::isNormalized)

        // Projections
        .function("projectPerspective", &Vec4::projectPerspective)
        .function("projectStereographic", &Vec4::projectStereographic)
        .function("projectOrthographic", &Vec4::projectOrthographic)

        // Conversion
        .function("toArray", optional_override([](const Vec4& self) {
            return arrayToVal<float, 4>(self.data);
        }))
        ;

    // Free function for Vec4 construction from array
    function("vec4FromArray", optional_override([](const val& arr) {
        return Vec4(arr[0].as<float>(), arr[1].as<float>(),
                    arr[2].as<float>(), arr[3].as<float>());
    }));

    // ====== Rotor4D ======

    enum_<RotationPlane>("RotationPlane")
        .value("XY", RotationPlane::XY)
        .value("XZ", RotationPlane::XZ)
        .value("YZ", RotationPlane::YZ)
        .value("XW", RotationPlane::XW)
        .value("YW", RotationPlane::YW)
        .value("ZW", RotationPlane::ZW)
        ;

    class_<Rotor4D>("Rotor4D")
        .constructor<>()
        .constructor<float, float, float, float, float, float, float, float>()

        // Components
        .property("s", &Rotor4D::s)
        .property("xy", &Rotor4D::xy)
        .property("xz", &Rotor4D::xz)
        .property("yz", &Rotor4D::yz)
        .property("xw", &Rotor4D::xw)
        .property("yw", &Rotor4D::yw)
        .property("zw", &Rotor4D::zw)
        .property("xyzw", &Rotor4D::xyzw)

        // Static factories
        .class_function("identity", &Rotor4D::identity)
        .class_function("fromPlaneAngle", &Rotor4D::fromPlaneAngle)
        .class_function("fromEuler6", select_overload<Rotor4D(float, float, float, float, float, float)>(&Rotor4D::fromEuler6))

        // Operations
        .function("mul", select_overload<Rotor4D(const Rotor4D&) const>(&Rotor4D::operator*))
        .function("reverse", &Rotor4D::reverse)
        .function("magnitude", &Rotor4D::magnitude)
        .function("magnitudeSquared", &Rotor4D::magnitudeSquared)
        .function("normalized", &Rotor4D::normalized)
        .function("normalize", &Rotor4D::normalize)
        .function("inverse", &Rotor4D::inverse)
        .function("isNormalized", &Rotor4D::isNormalized)

        // Vector rotation
        .function("rotate", &Rotor4D::rotate)

        // Interpolation
        .function("slerp", &Rotor4D::slerp)
        .function("nlerp", &Rotor4D::nlerp)
        .function("dot", &Rotor4D::dot)

        // Matrix conversion
        .function("toMatrix", &Rotor4D::toMatrix)

        // Conversion
        .function("toArray", optional_override([](const Rotor4D& self) {
            return arrayToVal<float, 8>(self.toArray());
        }))
        ;

    // Free function for rotor creation from angle array
    function("rotorFromEuler6Array", optional_override([](const val& arr) {
        return Rotor4D::fromEuler6(
            arr[0].as<float>(), arr[1].as<float>(), arr[2].as<float>(),
            arr[3].as<float>(), arr[4].as<float>(), arr[5].as<float>()
        );
    }));

    // ====== Mat4x4 ======

    class_<Mat4x4>("Mat4x4")
        .constructor<>()
        .constructor<float>()

        // Static factories
        .class_function("identity", &Mat4x4::identity)
        .class_function("zero", &Mat4x4::zero)
        .class_function("rotationXY", &Mat4x4::rotationXY)
        .class_function("rotationXZ", &Mat4x4::rotationXZ)
        .class_function("rotationYZ", &Mat4x4::rotationYZ)
        .class_function("rotationXW", &Mat4x4::rotationXW)
        .class_function("rotationYW", &Mat4x4::rotationYW)
        .class_function("rotationZW", &Mat4x4::rotationZW)
        .class_function("rotationFromAngles", select_overload<Mat4x4(float, float, float, float, float, float)>(&Mat4x4::rotationFromAngles))
        .class_function("scale", select_overload<Mat4x4(float)>(&Mat4x4::scale))

        // Element access
        .function("at", select_overload<float&(size_t, size_t)>(&Mat4x4::at))
        .function("column", &Mat4x4::column)
        .function("row", &Mat4x4::row)

        // Operations
        .function("mulMat", select_overload<Mat4x4(const Mat4x4&) const>(&Mat4x4::operator*))
        .function("mulVec", select_overload<Vec4(const Vec4&) const>(&Mat4x4::operator*))
        .function("mulScalar", select_overload<Mat4x4(float) const>(&Mat4x4::operator*))
        .function("add", select_overload<Mat4x4(const Mat4x4&) const>(&Mat4x4::operator+))
        .function("sub", select_overload<Mat4x4(const Mat4x4&) const>(&Mat4x4::operator-))
        .function("transposed", &Mat4x4::transposed)
        .function("transpose", &Mat4x4::transpose)
        .function("determinant", &Mat4x4::determinant)
        .function("inverse", &Mat4x4::inverse)
        .function("isOrthogonal", &Mat4x4::isOrthogonal)
        .function("isIdentity", &Mat4x4::isIdentity)

        // Conversion
        .function("toArray", optional_override([](const Mat4x4& self) {
            return arrayToVal<float, 16>(self.data);
        }))
        ;

    // Free function for matrix from angles array
    function("matrixFromAnglesArray", optional_override([](const val& arr) {
        return Mat4x4::rotationFromAngles(
            arr[0].as<float>(), arr[1].as<float>(), arr[2].as<float>(),
            arr[3].as<float>(), arr[4].as<float>(), arr[5].as<float>()
        );
    }));

    // ====== Projection ======

    value_object<Projection3D>("Projection3D")
        .field("x", &Projection3D::x)
        .field("y", &Projection3D::y)
        .field("z", &Projection3D::z)
        ;

    value_object<SliceResult>("SliceResult")
        .field("point", &SliceResult::point)
        .field("alpha", &SliceResult::alpha)
        .field("valid", &SliceResult::valid)
        ;

    // Projection functions
    function("projectPerspective", &projectPerspective);
    function("projectStereographic", &projectStereographic);
    function("projectOrthographic", &projectOrthographic);
    function("projectOblique", &projectOblique);
    function("projectSlice", &projectSlice);

    // Batch projections (returns typed array for efficiency)
    function("projectToFloatArray", optional_override([](const val& jsPoints, float distance) {
        std::vector<Vec4> points;
        size_t len = jsPoints["length"].as<size_t>();
        points.reserve(len);

        for (size_t i = 0; i < len; ++i) {
            points.push_back(jsPoints[i].as<Vec4>());
        }

        auto result = projectToFloatArray(points, distance);

        // Return as Float32Array for efficient GPU upload
        return val::global("Float32Array").new_(typed_memory_view(result.size(), result.data()));
    }));
}

// Module initialization
EMSCRIPTEN_BINDINGS(vib3_module) {
    // Version info
    function("getVersion", optional_override([]() {
        return std::string("1.0.0");
    }));

    // Feature detection
    function("hasSimd", optional_override([]() {
#if defined(VIB3_HAS_SSE41) || defined(__wasm_simd128__)
        return true;
#else
        return false;
#endif
    }));
}
