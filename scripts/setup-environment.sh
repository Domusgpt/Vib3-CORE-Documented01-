#!/bin/bash
#===============================================================================
# VIB3+ Development Environment Setup
#
# Installs: Node.js 20, pnpm, TypeScript, Playwright browsers,
#           Emscripten (WASM), and project dependencies
#
# Usage: chmod +x setup-environment.sh && ./setup-environment.sh
#===============================================================================

set -e

echo "═══════════════════════════════════════════════════════════════════════"
echo "  VIB3+ Development Environment Setup"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# Detect OS
OS="$(uname -s)"
echo "OS: $OS"

#-------------------------------------------------------------------------------
# 1. System packages (minimal required)
#-------------------------------------------------------------------------------
echo ""
echo "─── 1. System Dependencies ───"

if [[ "$OS" == "Linux" ]] && command -v apt-get &>/dev/null; then
    sudo apt-get update
    sudo apt-get install -y \
        curl wget git unzip \
        build-essential cmake \
        python3 python3-pip \
        pkg-config libssl-dev \
        jq xvfb \
        libnss3 libnspr4 libatk1.0-0t64 libatk-bridge2.0-0t64 \
        libcups2t64 libdrm2 libdbus-1-3 libxkbcommon0 \
        libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 \
        libxrandr2 libgbm1 libasound2t64 || true
    echo "✓ System packages installed"
elif [[ "$OS" == "Darwin" ]]; then
    if ! command -v brew &>/dev/null; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install curl wget git cmake python jq || true
    echo "✓ Homebrew packages installed"
fi

#-------------------------------------------------------------------------------
# 2. Node.js via nvm
#-------------------------------------------------------------------------------
echo ""
echo "─── 2. Node.js 20 + pnpm ───"

export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
nvm alias default 20

echo "✓ Node.js $(node --version)"
echo "✓ npm $(npm --version)"

# pnpm
npm install -g pnpm@9
echo "✓ pnpm $(pnpm --version)"

#-------------------------------------------------------------------------------
# 3. TypeScript + global tools
#-------------------------------------------------------------------------------
echo ""
echo "─── 3. TypeScript ───"

npm install -g typescript tsx
echo "✓ TypeScript $(tsc --version)"

#-------------------------------------------------------------------------------
# 4. Emscripten SDK (for WASM)
#-------------------------------------------------------------------------------
echo ""
echo "─── 4. Emscripten SDK ───"

EMSDK_DIR="$HOME/emsdk"

if [ ! -d "$EMSDK_DIR" ]; then
    git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
    cd "$EMSDK_DIR"
    ./emsdk install latest
    ./emsdk activate latest
    cd -

    # Add to shell profile
    echo 'source "$HOME/emsdk/emsdk_env.sh" 2>/dev/null' >> "$HOME/.bashrc"
    echo "✓ Emscripten installed"
else
    echo "✓ Emscripten already at $EMSDK_DIR"
fi

#-------------------------------------------------------------------------------
# 5. Project dependencies
#-------------------------------------------------------------------------------
echo ""
echo "─── 5. Project Dependencies ───"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/package.json" ]; then
    cd "$PROJECT_DIR"
    pnpm install
    echo "✓ Dependencies installed"

    # Playwright browsers
    echo "Installing Playwright browsers..."
    npx playwright install --with-deps chromium || true
    echo "✓ Playwright ready"
    cd -
fi

#-------------------------------------------------------------------------------
# 6. Build WASM core (optional)
#-------------------------------------------------------------------------------
echo ""
echo "─── 6. WASM Core ───"

if [ -f "$PROJECT_DIR/cpp/build.sh" ]; then
    source "$EMSDK_DIR/emsdk_env.sh" 2>/dev/null || true
    cd "$PROJECT_DIR/cpp"
    chmod +x build.sh
    ./build.sh && echo "✓ WASM core built" || echo "⚠ WASM build skipped (run manually)"
    cd -
else
    echo "⚠ No cpp/build.sh found"
fi

#-------------------------------------------------------------------------------
# Summary
#-------------------------------------------------------------------------------
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  SETUP COMPLETE"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  Node.js: $(node --version 2>/dev/null || echo 'N/A')"
echo "  pnpm:    $(pnpm --version 2>/dev/null || echo 'N/A')"
echo "  tsc:     $(tsc --version 2>/dev/null || echo 'N/A')"
echo "  emsdk:   $EMSDK_DIR"
echo ""
echo "  Next steps:"
echo "    source ~/.bashrc"
echo "    pnpm dev:web      # Start dev server"
echo "    pnpm test         # Run tests"
echo ""
