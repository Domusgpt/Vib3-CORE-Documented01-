#!/bin/bash
#
# VIB3+ WASM Build Script
#
# Usage:
#   ./build.sh              # Build release WASM
#   ./build.sh debug        # Build debug WASM
#   ./build.sh native       # Build native (with tests)
#   ./build.sh clean        # Clean build directory
#
# Requirements:
#   - CMake 3.20+
#   - Emscripten SDK (for WASM builds)
#   - C++20 compiler (for native builds)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
DIST_DIR="${SCRIPT_DIR}/../dist/wasm"
BUILD_TYPE="${1:-release}"
NPROC=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[VIB3]${NC} $*"; }
warn() { echo -e "${YELLOW}[VIB3]${NC} $*"; }
error() { echo -e "${RED}[VIB3]${NC} $*" >&2; }

case "${BUILD_TYPE}" in
    clean)
        log "Cleaning build directory..."
        rm -rf "${BUILD_DIR}"
        log "Done."
        exit 0
        ;;

    debug)
        log "Building WASM (Debug)..."

        if ! command -v emcmake &>/dev/null; then
            error "Emscripten not found. Install emsdk and activate it:"
            error "  git clone https://github.com/emscripten-core/emsdk.git"
            error "  cd emsdk && ./emsdk install latest && ./emsdk activate latest"
            error "  source emsdk_env.sh"
            exit 1
        fi

        mkdir -p "${BUILD_DIR}/wasm-debug"
        cd "${BUILD_DIR}/wasm-debug"

        emcmake cmake "${SCRIPT_DIR}" \
            -DCMAKE_BUILD_TYPE=Debug \
            -DVIB3_BUILD_WASM=ON \
            -DVIB3_BUILD_TESTS=OFF \
            -DVIB3_ENABLE_SIMD=ON

        cmake --build . -j"${NPROC}"

        # Copy outputs
        mkdir -p "${DIST_DIR}"
        cp -f bin/vib3.js bin/vib3.wasm "${DIST_DIR}/"
        [ -f bin/vib3.d.ts ] && cp -f bin/vib3.d.ts "${DIST_DIR}/"

        log "Debug WASM build complete. Output: ${DIST_DIR}/"
        ;;

    release)
        log "Building WASM (Release)..."

        if ! command -v emcmake &>/dev/null; then
            error "Emscripten not found. Install emsdk and activate it:"
            error "  git clone https://github.com/emscripten-core/emsdk.git"
            error "  cd emsdk && ./emsdk install latest && ./emsdk activate latest"
            error "  source emsdk_env.sh"
            exit 1
        fi

        mkdir -p "${BUILD_DIR}/wasm-release"
        cd "${BUILD_DIR}/wasm-release"

        emcmake cmake "${SCRIPT_DIR}" \
            -DCMAKE_BUILD_TYPE=Release \
            -DVIB3_BUILD_WASM=ON \
            -DVIB3_BUILD_TESTS=OFF \
            -DVIB3_ENABLE_SIMD=ON

        cmake --build . -j"${NPROC}"

        # Copy outputs
        mkdir -p "${DIST_DIR}"
        cp -f bin/vib3.js bin/vib3.wasm "${DIST_DIR}/"
        [ -f bin/vib3.d.ts ] && cp -f bin/vib3.d.ts "${DIST_DIR}/"

        log "Release WASM build complete. Output: ${DIST_DIR}/"
        ls -lh "${DIST_DIR}/"
        ;;

    native)
        log "Building native (with tests)..."

        mkdir -p "${BUILD_DIR}/native"
        cd "${BUILD_DIR}/native"

        cmake "${SCRIPT_DIR}" \
            -DCMAKE_BUILD_TYPE=Debug \
            -DVIB3_BUILD_WASM=OFF \
            -DVIB3_BUILD_TESTS=ON \
            -DVIB3_ENABLE_SIMD=ON

        cmake --build . -j"${NPROC}"

        log "Running tests..."
        ctest --output-on-failure

        log "Native build and tests complete."
        ;;

    *)
        error "Unknown build type: ${BUILD_TYPE}"
        echo "Usage: $0 [release|debug|native|clean]"
        exit 1
        ;;
esac
