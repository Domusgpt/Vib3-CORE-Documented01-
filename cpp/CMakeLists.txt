cmake_minimum_required(VERSION 3.20)
project(vib3_core VERSION 1.0.0 LANGUAGES CXX)

# C++20 required for concepts, ranges, and std::numbers
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build options
option(VIB3_BUILD_WASM "Build WebAssembly module" ON)
option(VIB3_BUILD_TESTS "Build unit tests" ON)
option(VIB3_ENABLE_SIMD "Enable SIMD optimizations" ON)
option(VIB3_ENABLE_THREADS "Enable threading support" OFF)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Compiler warnings
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    add_compile_options(
        -Wall
        -Wextra
        -Wpedantic
        -Wconversion
        -Wsign-conversion
        -Wno-unused-parameter
    )
endif()

# SIMD support
if(VIB3_ENABLE_SIMD)
    if(EMSCRIPTEN)
        add_compile_options(-msimd128)
        add_link_options(-msimd128)
    elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
        # Detect CPU architecture
        include(CheckCXXCompilerFlag)
        check_cxx_compiler_flag("-mavx2" COMPILER_SUPPORTS_AVX2)
        check_cxx_compiler_flag("-msse4.1" COMPILER_SUPPORTS_SSE41)

        if(COMPILER_SUPPORTS_AVX2)
            add_compile_options(-mavx2 -mfma)
            add_definitions(-DVIB3_HAS_AVX2)
        elseif(COMPILER_SUPPORTS_SSE41)
            add_compile_options(-msse4.1)
            add_definitions(-DVIB3_HAS_SSE41)
        endif()
    endif()
endif()

# Math library
add_library(vib3_math STATIC
    math/Vec4.cpp
    math/Rotor4D.cpp
    math/Mat4x4.cpp
    math/Projection.cpp
)

target_include_directories(vib3_math PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Geometry library
add_library(vib3_geometry STATIC
    geometry/GeometryGenerator.cpp
    geometry/Tesseract.cpp
    geometry/Tetrahedron.cpp
    geometry/Sphere.cpp
    geometry/Torus.cpp
    geometry/KleinBottle.cpp
    geometry/Fractal.cpp
    geometry/Wave.cpp
    geometry/Crystal.cpp
    geometry/WarpFunctions.cpp
)

target_link_libraries(vib3_geometry PUBLIC vib3_math)

target_include_directories(vib3_geometry PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# WebAssembly build
if(EMSCRIPTEN AND VIB3_BUILD_WASM)
    # Combined WASM module
    add_executable(vib3_wasm
        bindings/embind.cpp
    )

    target_link_libraries(vib3_wasm PRIVATE
        vib3_math
        vib3_geometry
    )

    # Emscripten settings
    set_target_properties(vib3_wasm PROPERTIES
        OUTPUT_NAME "vib3"
        SUFFIX ".js"
    )

    # Emscripten link options
    target_link_options(vib3_wasm PRIVATE
        # Output formats
        -sWASM=1
        -sMODULARIZE=1
        -sEXPORT_NAME=createVIB3Module
        -sEXPORT_ES6=1

        # Memory settings
        -sALLOW_MEMORY_GROWTH=1
        -sINITIAL_MEMORY=16777216  # 16MB initial
        -sMAXIMUM_MEMORY=268435456 # 256MB max
        -sSTACK_SIZE=1048576       # 1MB stack

        # Bindings
        --bind
        -sNO_DISABLE_EXCEPTION_CATCHING

        # Optimizations
        -sASSERTIONS=0
        -sMALLOC=emmalloc

        # Environment
        -sENVIRONMENT=web,worker
        -sFILESYSTEM=0
        -sNO_EXIT_RUNTIME=1

        # TypeScript definitions
        --emit-tsd vib3.d.ts
    )

    # SIMD for WASM
    if(VIB3_ENABLE_SIMD)
        target_link_options(vib3_wasm PRIVATE -msimd128)
    endif()

    # Threading for WASM (optional)
    if(VIB3_ENABLE_THREADS)
        target_link_options(vib3_wasm PRIVATE
            -pthread
            -sPTHREAD_POOL_SIZE=4
        )
    endif()

    # Debug vs Release
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        target_link_options(vib3_wasm PRIVATE
            -sASSERTIONS=2
            -sSAFE_HEAP=1
            -sSTACK_OVERFLOW_CHECK=2
            -g
        )
    else()
        target_link_options(vib3_wasm PRIVATE
            -O3
            -flto
            --closure 1
        )
    endif()

    # Install WASM files
    install(
        FILES
            ${CMAKE_BINARY_DIR}/bin/vib3.js
            ${CMAKE_BINARY_DIR}/bin/vib3.wasm
            ${CMAKE_BINARY_DIR}/bin/vib3.d.ts
        DESTINATION ${CMAKE_SOURCE_DIR}/../dist/wasm
    )
endif()

# Native tests (not for WASM)
if(VIB3_BUILD_TESTS AND NOT EMSCRIPTEN)
    enable_testing()

    # Find or fetch GoogleTest
    include(FetchContent)
    FetchContent_Declare(
        googletest
        URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
    )
    FetchContent_MakeAvailable(googletest)

    # Math tests
    add_executable(math_tests
        tests/Vec4_test.cpp
        tests/Rotor4D_test.cpp
        tests/Mat4x4_test.cpp
        tests/Projection_test.cpp
    )

    target_link_libraries(math_tests PRIVATE
        vib3_math
        GTest::gtest_main
    )

    # Geometry tests
    add_executable(geometry_tests
        tests/Geometry_test.cpp
    )

    target_link_libraries(geometry_tests PRIVATE
        vib3_geometry
        GTest::gtest_main
    )

    include(GoogleTest)
    gtest_discover_tests(math_tests)
    gtest_discover_tests(geometry_tests)
endif()

# Print configuration summary
message(STATUS "")
message(STATUS "VIB3 Core Configuration:")
message(STATUS "  Version:       ${PROJECT_VERSION}")
message(STATUS "  C++ Standard:  ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build WASM:    ${VIB3_BUILD_WASM}")
message(STATUS "  Build Tests:   ${VIB3_BUILD_TESTS}")
message(STATUS "  Enable SIMD:   ${VIB3_ENABLE_SIMD}")
message(STATUS "  Enable Threads:${VIB3_ENABLE_THREADS}")
message(STATUS "  Build Type:    ${CMAKE_BUILD_TYPE}")
message(STATUS "")
