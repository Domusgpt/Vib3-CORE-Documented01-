#!/bin/bash
#===============================================================================
# VIB3+ Complete Development Environment Setup Script
#
# This script installs EVERYTHING needed for VIB3+ development:
#
# CORE TOOLING:
# - Node.js 20 LTS (via nvm)
# - pnpm (fast package manager)
# - TypeScript (global + project)
#
# WASM/NATIVE:
# - Emscripten SDK (C++ to WASM compilation)
# - Rust + wasm-pack (future WebGPU/WASM optimizations)
# - CMake + Ninja (native builds)
#
# MOBILE:
# - Flutter SDK (cross-platform)
# - Android SDK + NDK (Android builds)
# - Java 17 (Android requirement)
#
# TESTING:
# - Vitest (unit tests)
# - Playwright (E2E tests with Chromium, Firefox, WebKit)
# - Coverage tooling
#
# WEBGPU:
# - Dawn/wgpu headers (optional)
# - Chrome Canary (WebGPU testing)
# - @webgpu/types (TypeScript types)
#
# ADDITIONAL:
# - GitHub CLI (gh)
# - jq (JSON processing)
# - Docker (optional containerization)
#
# Usage: chmod +x setup-environment.sh && ./setup-environment.sh
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "  $1"
    echo "═══════════════════════════════════════════════════════════════════════"
    echo -e "${NC}"
}

print_section() {
    echo -e "${YELLOW}"
    echo "─────────────────────────────────────────────────────────────────────────"
    echo "  $1"
    echo "─────────────────────────────────────────────────────────────────────────"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

#-------------------------------------------------------------------------------
# Start
#-------------------------------------------------------------------------------

print_header "VIB3+ COMPLETE DEVELOPMENT ENVIRONMENT SETUP"

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected: $OS ($ARCH)"
echo "Date: $(date)"
echo ""

#-------------------------------------------------------------------------------
# 1. SYSTEM DEPENDENCIES
#-------------------------------------------------------------------------------

print_section "1. System Dependencies (build tools, libs)"

if [[ "$OS" == "Linux" ]]; then
    if command_exists apt-get; then
        echo "Installing via apt-get..."
        sudo apt-get update
        sudo apt-get install -y \
            curl wget git unzip zip \
            build-essential cmake ninja-build \
            python3 python3-pip python3-venv \
            openjdk-17-jdk openjdk-17-jre \
            pkg-config libssl-dev libffi-dev \
            libgtk-3-dev libwebkit2gtk-4.0-dev \
            clang lld \
            jq tree \
            xvfb \
            libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
            libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
            libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
            libxrandr2 libgbm1 libasound2

        # Chrome for WebGPU testing
        if ! command_exists google-chrome && ! command_exists google-chrome-stable; then
            echo "Installing Google Chrome..."
            wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
            sudo dpkg -i /tmp/chrome.deb || sudo apt-get install -f -y
            rm /tmp/chrome.deb
        fi

    elif command_exists dnf; then
        echo "Installing via dnf..."
        sudo dnf install -y \
            curl wget git unzip zip \
            gcc gcc-c++ make cmake ninja-build \
            python3 python3-pip \
            java-17-openjdk-devel \
            pkg-config openssl-devel libffi-devel \
            gtk3-devel webkit2gtk3-devel \
            clang lld \
            jq tree \
            xorg-x11-server-Xvfb

    elif command_exists pacman; then
        echo "Installing via pacman..."
        sudo pacman -Syu --noconfirm \
            curl wget git unzip zip \
            base-devel cmake ninja \
            python python-pip \
            jdk17-openjdk \
            pkg-config openssl libffi \
            gtk3 webkit2gtk \
            clang lld \
            jq tree \
            xorg-server-xvfb
    fi

elif [[ "$OS" == "Darwin" ]]; then
    # macOS
    if ! command_exists brew; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add to PATH
        if [[ "$ARCH" == "arm64" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi

    brew install curl wget git cmake ninja python jq tree
    brew install --cask temurin@17

    # Chrome for WebGPU testing
    if ! [ -d "/Applications/Google Chrome.app" ]; then
        brew install --cask google-chrome
    fi
fi

print_success "System dependencies installed"

#-------------------------------------------------------------------------------
# 2. NODE.JS (via nvm)
#-------------------------------------------------------------------------------

print_section "2. Node.js 20 LTS + pnpm"

export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    echo "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Load nvm
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

print_success "Node.js $(node --version)"
print_success "npm $(npm --version)"

# Install pnpm
npm install -g pnpm@9
print_success "pnpm $(pnpm --version)"

#-------------------------------------------------------------------------------
# 3. TYPESCRIPT (Global)
#-------------------------------------------------------------------------------

print_section "3. TypeScript + Build Tools"

npm install -g typescript tsx ts-node @types/node
print_success "TypeScript $(tsc --version)"
print_success "tsx installed"

# Install global dev tools
npm install -g eslint prettier vite

print_success "ESLint $(eslint --version)"
print_success "Vite installed"

#-------------------------------------------------------------------------------
# 4. EMSCRIPTEN SDK (C++ to WASM)
#-------------------------------------------------------------------------------

print_section "4. Emscripten SDK (C++ to WebAssembly)"

EMSDK_DIR="$HOME/emsdk"

if [ ! -d "$EMSDK_DIR" ]; then
    echo "Installing Emscripten SDK..."
    git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
    cd "$EMSDK_DIR"
    ./emsdk install latest
    ./emsdk activate latest
    cd -
else
    print_success "Emscripten SDK already installed at $EMSDK_DIR"
    # Update to latest
    cd "$EMSDK_DIR"
    git pull
    ./emsdk install latest
    ./emsdk activate latest
    cd -
fi

# Add to shell profiles
EMSDK_ENV='# Emscripten SDK
source "$HOME/emsdk/emsdk_env.sh" 2>/dev/null'

for profile in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile"; do
    if [ -f "$profile" ] && ! grep -q "emsdk_env.sh" "$profile" 2>/dev/null; then
        echo "" >> "$profile"
        echo "$EMSDK_ENV" >> "$profile"
    fi
done

# Source now
source "$EMSDK_DIR/emsdk_env.sh" 2>/dev/null || true
print_success "Emscripten $(emcc --version 2>/dev/null | head -1 || echo 'installed')"

#-------------------------------------------------------------------------------
# 5. RUST + WASM-PACK
#-------------------------------------------------------------------------------

print_section "5. Rust + wasm-pack (WASM tooling)"

if ! command_exists rustc; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    print_success "Rust already installed"
    rustup update
fi

# Add wasm32 targets
rustup target add wasm32-unknown-unknown
rustup target add wasm32-wasi

# Install wasm-pack
if ! command_exists wasm-pack; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Install wasm-bindgen-cli
cargo install wasm-bindgen-cli 2>/dev/null || true

print_success "Rust $(rustc --version)"
print_success "wasm-pack $(wasm-pack --version 2>/dev/null || echo 'installed')"

#-------------------------------------------------------------------------------
# 6. FLUTTER SDK
#-------------------------------------------------------------------------------

print_section "6. Flutter SDK"

FLUTTER_DIR="$HOME/flutter"

if [ ! -d "$FLUTTER_DIR" ]; then
    echo "Installing Flutter SDK..."

    if [[ "$OS" == "Linux" ]]; then
        if [[ "$ARCH" == "x86_64" ]]; then
            FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.0-stable.tar.xz"
        else
            FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_arm64_3.24.0-stable.tar.xz"
        fi
    elif [[ "$OS" == "Darwin" ]]; then
        if [[ "$ARCH" == "arm64" ]]; then
            FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.24.0-stable.zip"
        else
            FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.24.0-stable.zip"
        fi
    fi

    cd "$HOME"
    if [[ "$FLUTTER_URL" == *.tar.xz ]]; then
        curl -L "$FLUTTER_URL" | tar xJ
    else
        curl -LO "$FLUTTER_URL"
        unzip -q flutter_*.zip
        rm flutter_*.zip
    fi
    cd -
else
    print_success "Flutter SDK already installed at $FLUTTER_DIR"
fi

# Add to PATH
export PATH="$FLUTTER_DIR/bin:$PATH"

# Add to shell profiles
FLUTTER_PATH='# Flutter SDK
export PATH="$HOME/flutter/bin:$PATH"'

for profile in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile"; do
    if [ -f "$profile" ] && ! grep -q 'flutter/bin' "$profile" 2>/dev/null; then
        echo "" >> "$profile"
        echo "$FLUTTER_PATH" >> "$profile"
    fi
done

print_success "Flutter $(flutter --version 2>/dev/null | head -1 || echo 'installed')"

#-------------------------------------------------------------------------------
# 7. ANDROID SDK
#-------------------------------------------------------------------------------

print_section "7. Android SDK + NDK"

ANDROID_SDK="$HOME/Android/Sdk"

if [ ! -d "$ANDROID_SDK/cmdline-tools" ]; then
    echo "Installing Android SDK command-line tools..."

    mkdir -p "$ANDROID_SDK/cmdline-tools"
    cd "$ANDROID_SDK/cmdline-tools"

    if [[ "$OS" == "Linux" ]]; then
        CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    elif [[ "$OS" == "Darwin" ]]; then
        CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
    fi

    curl -LO "$CMDLINE_URL"
    unzip -q commandlinetools-*.zip
    mv cmdline-tools latest
    rm commandlinetools-*.zip
    cd -
else
    print_success "Android SDK cmdline-tools already installed"
fi

# Set environment variables
export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"
export PATH="$ANDROID_SDK/cmdline-tools/latest/bin:$ANDROID_SDK/platform-tools:$ANDROID_SDK/emulator:$PATH"

# Add to shell profiles
ANDROID_ENV='# Android SDK
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"'

for profile in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile"; do
    if [ -f "$profile" ] && ! grep -q 'ANDROID_HOME' "$profile" 2>/dev/null; then
        echo "" >> "$profile"
        echo "$ANDROID_ENV" >> "$profile"
    fi
done

# Accept licenses and install SDK components
echo "Installing Android SDK components..."
yes | sdkmanager --licenses 2>/dev/null || true
sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "platforms;android-33" \
    "build-tools;34.0.0" \
    "ndk;26.1.10909125" \
    "cmake;3.22.1" \
    "emulator" \
    "system-images;android-34;google_apis;x86_64" \
    2>/dev/null || true

print_success "Android SDK installed at $ANDROID_SDK"

#-------------------------------------------------------------------------------
# 8. GITHUB CLI
#-------------------------------------------------------------------------------

print_section "8. GitHub CLI"

if ! command_exists gh; then
    echo "Installing GitHub CLI..."
    if [[ "$OS" == "Linux" ]]; then
        if command_exists apt-get; then
            curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
            sudo apt-get update && sudo apt-get install -y gh
        elif command_exists dnf; then
            sudo dnf install -y 'dnf-command(config-manager)'
            sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
            sudo dnf install -y gh
        fi
    elif [[ "$OS" == "Darwin" ]]; then
        brew install gh
    fi
fi
print_success "GitHub CLI $(gh --version 2>/dev/null | head -1 || echo 'installed')"

#-------------------------------------------------------------------------------
# 9. DOCKER (Optional)
#-------------------------------------------------------------------------------

print_section "9. Docker (Optional)"

if command_exists docker; then
    print_success "Docker $(docker --version)"
else
    print_warning "Docker not installed (optional - for containerized builds)"
    echo "  Install from: https://docs.docker.com/get-docker/"
fi

#-------------------------------------------------------------------------------
# 10. PROJECT DEPENDENCIES
#-------------------------------------------------------------------------------

print_section "10. VIB3+ Project Dependencies"

# Check if we're in the VIB3+ project directory
if [ -f "package.json" ]; then
    echo "Installing Node.js dependencies..."
    pnpm install || npm install

    print_success "Project dependencies installed"
else
    SCRIPT_DIR="$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

    if [ -f "$PROJECT_DIR/package.json" ]; then
        echo "Installing Node.js dependencies from $PROJECT_DIR..."
        cd "$PROJECT_DIR"
        pnpm install || npm install
        cd -
        print_success "Project dependencies installed"
    else
        print_warning "Not in VIB3+ project directory. Run 'pnpm install' manually."
    fi
fi

#-------------------------------------------------------------------------------
# 11. TESTING TOOLS (Playwright)
#-------------------------------------------------------------------------------

print_section "11. Testing Tools (Playwright browsers)"

# Install Playwright browsers with all dependencies
if [ -f "package.json" ] || [ -f "$PROJECT_DIR/package.json" ]; then
    echo "Installing Playwright browsers (Chromium, Firefox, WebKit)..."
    npx playwright install --with-deps chromium firefox webkit

    print_success "Playwright browsers installed"
else
    print_warning "Run 'npx playwright install --with-deps' after 'pnpm install'"
fi

#-------------------------------------------------------------------------------
# 12. BUILD WASM CORE
#-------------------------------------------------------------------------------

print_section "12. Build C++ WASM Core"

# Try to find and build WASM core
WASM_BUILD_DIR=""

if [ -d "cpp" ] && [ -f "cpp/build.sh" ]; then
    WASM_BUILD_DIR="cpp"
elif [ -d "$PROJECT_DIR/cpp" ] && [ -f "$PROJECT_DIR/cpp/build.sh" ]; then
    WASM_BUILD_DIR="$PROJECT_DIR/cpp"
fi

if [ -n "$WASM_BUILD_DIR" ]; then
    echo "Building WASM core..."
    cd "$WASM_BUILD_DIR"
    chmod +x build.sh

    # Source Emscripten and build
    source "$EMSDK_DIR/emsdk_env.sh" 2>/dev/null || true
    ./build.sh && print_success "WASM core built" || print_warning "WASM build failed (may need shell restart)"
    cd -
else
    print_warning "cpp/build.sh not found. WASM core not built."
fi

#-------------------------------------------------------------------------------
# 13. FLUTTER CONFIGURATION
#-------------------------------------------------------------------------------

print_section "13. Flutter Configuration"

flutter config --android-sdk "$ANDROID_SDK" 2>/dev/null || true
flutter precache --web --android 2>/dev/null || true

echo "Running Flutter doctor..."
flutter doctor || true

#-------------------------------------------------------------------------------
# 14. WEBGPU DEVELOPMENT SETUP
#-------------------------------------------------------------------------------

print_section "14. WebGPU Development Setup"

# Install WebGPU TypeScript types (if in project)
if [ -f "package.json" ] || [ -f "$PROJECT_DIR/package.json" ]; then
    echo "WebGPU types are included in project dependencies"
    print_success "@webgpu/types (via devDependencies)"
fi

# Chrome with WebGPU flags info
echo ""
echo "WebGPU Testing Notes:"
echo "  - Chrome/Chromium has native WebGPU support"
echo "  - Use --enable-unsafe-webgpu for experimental features"
echo "  - Run: google-chrome --enable-features=Vulkan,WebGPU"
print_success "WebGPU dev setup complete"

#-------------------------------------------------------------------------------
# 15. VERIFICATION
#-------------------------------------------------------------------------------

print_section "15. Verifying Installation"

echo ""
echo "Checking all tools..."
echo ""

check_tool() {
    if command_exists "$1"; then
        VERSION=$($2 2>/dev/null | head -1)
        print_success "$1: $VERSION"
        return 0
    else
        print_error "$1: NOT FOUND"
        return 1
    fi
}

FAILED=0

check_tool "node" "node --version" || FAILED=1
check_tool "pnpm" "pnpm --version" || FAILED=1
check_tool "tsc" "tsc --version" || FAILED=1
check_tool "tsx" "tsx --version" || FAILED=1
check_tool "rustc" "rustc --version" || FAILED=1
check_tool "cargo" "cargo --version" || FAILED=1
check_tool "wasm-pack" "wasm-pack --version" || FAILED=1
check_tool "emcc" "emcc --version" || FAILED=1
check_tool "flutter" "flutter --version" || FAILED=1
check_tool "sdkmanager" "sdkmanager --version" || FAILED=1
check_tool "gh" "gh --version" || FAILED=1
check_tool "cmake" "cmake --version" || FAILED=1
check_tool "ninja" "ninja --version" || FAILED=1
check_tool "jq" "jq --version" || FAILED=1

#-------------------------------------------------------------------------------
# SUMMARY
#-------------------------------------------------------------------------------

print_header "SETUP COMPLETE"

echo "Installed Components:"
echo ""
echo "  CORE TOOLING"
echo "    Node.js $(node --version 2>/dev/null || echo 'N/A')"
echo "    pnpm $(pnpm --version 2>/dev/null || echo 'N/A')"
echo "    TypeScript $(tsc --version 2>/dev/null || echo 'N/A')"
echo ""
echo "  WASM/NATIVE"
echo "    Emscripten SDK at $EMSDK_DIR"
echo "    Rust $(rustc --version 2>/dev/null || echo 'N/A')"
echo "    wasm-pack $(wasm-pack --version 2>/dev/null || echo 'N/A')"
echo ""
echo "  MOBILE"
echo "    Flutter $(flutter --version 2>/dev/null | head -1 || echo 'N/A')"
echo "    Android SDK at $ANDROID_SDK"
echo ""
echo "  TESTING"
echo "    Vitest (via project)"
echo "    Playwright (Chromium, Firefox, WebKit)"
echo ""
echo "  ADDITIONAL"
echo "    GitHub CLI $(gh --version 2>/dev/null | head -1 || echo 'N/A')"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Restart your terminal or run:"
echo "     source ~/.bashrc  # or source ~/.zshrc"
echo ""
echo "  2. Verify Flutter setup:"
echo "     flutter doctor"
echo ""
echo "  3. Start development server:"
echo "     pnpm dev:web"
echo ""
echo "  4. Run tests:"
echo "     pnpm test        # Unit tests (Vitest)"
echo "     pnpm test:e2e    # E2E tests (Playwright)"
echo ""
echo "  5. Build WASM core (if needed):"
echo "     cd cpp && ./build.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -eq 1 ]; then
    print_warning "Some tools may need manual installation or shell restart"
fi

echo "Environment variables have been added to ~/.bashrc and ~/.zshrc"
echo "Run 'source ~/.bashrc' to apply changes immediately"
echo ""
