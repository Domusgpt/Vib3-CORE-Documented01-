#!/usr/bin/env bash
#
# VIB3+ GPU Visual Testing Setup
#
# Sets up a GPU-enabled environment for running visual regression tests
# with actual WebGL/WebGPU rendering (not black canvas screenshots).
#
# Supported platforms:
#   - GCP VM with NVIDIA T4/V100/A100 (recommended)
#   - AWS EC2 g4dn.xlarge with NVIDIA T4
#   - Any Linux box with NVIDIA GPU + drivers
#
# Usage:
#   chmod +x scripts/setup-gpu-testing.sh
#   ./scripts/setup-gpu-testing.sh          # Full setup
#   ./scripts/setup-gpu-testing.sh --check  # Verify existing setup
#   ./scripts/setup-gpu-testing.sh --run    # Setup + run tests
#
# After setup, run visual tests with:
#   VIB3_GPU=1 npx playwright test tests/visual-regression.spec.js
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; }

# ---- Check GPU ----
check_gpu() {
    echo ""
    echo "═══════════════════════════════════════════════"
    echo " VIB3+ GPU Visual Testing - Environment Check"
    echo "═══════════════════════════════════════════════"
    echo ""

    local all_ok=true

    # NVIDIA GPU
    if command -v nvidia-smi &>/dev/null; then
        local gpu_name
        gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
        local driver_ver
        driver_ver=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)
        ok "NVIDIA GPU: ${gpu_name} (driver ${driver_ver})"
    else
        fail "nvidia-smi not found. Install NVIDIA drivers."
        all_ok=false
    fi

    # Vulkan
    if command -v vulkaninfo &>/dev/null; then
        local vk_device
        vk_device=$(vulkaninfo --summary 2>/dev/null | grep "deviceName" | head -1 | awk -F= '{print $2}' | xargs)
        ok "Vulkan: ${vk_device:-available}"
    else
        warn "vulkaninfo not found. Install vulkan-tools: sudo apt install vulkan-tools"
        all_ok=false
    fi

    # Node.js
    if command -v node &>/dev/null; then
        ok "Node.js: $(node --version)"
    else
        fail "Node.js not found. Install Node.js 18+."
        all_ok=false
    fi

    # pnpm
    if command -v pnpm &>/dev/null; then
        ok "pnpm: $(pnpm --version)"
    else
        warn "pnpm not found. Install: npm install -g pnpm"
    fi

    # Chrome/Chromium
    local chrome_path=""
    for p in \
        /usr/bin/google-chrome-stable \
        /usr/bin/google-chrome \
        /usr/bin/chromium-browser \
        /usr/bin/chromium \
        "$HOME/.cache/ms-playwright/chromium-*/chrome-linux/chrome"; do
        if [ -x "$p" ] 2>/dev/null; then
            chrome_path="$p"
            break
        fi
    done

    if [ -n "$chrome_path" ]; then
        ok "Chrome: ${chrome_path}"
    else
        warn "Chrome not found. Playwright will install its own."
    fi

    # EGL/GLX libraries
    if ldconfig -p 2>/dev/null | grep -q libEGL; then
        ok "EGL: available"
    else
        warn "libEGL not found. Install: sudo apt install libegl1-mesa"
    fi

    echo ""
    if $all_ok; then
        ok "All checks passed. Ready for GPU visual testing."
    else
        warn "Some checks failed. See above for details."
    fi
    echo ""
}

# ---- Install dependencies ----
install_deps() {
    info "Installing system dependencies..."

    if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq \
            libegl1-mesa \
            libgles2-mesa \
            libvulkan1 \
            vulkan-tools \
            mesa-vulkan-drivers \
            libnss3 \
            libatk-bridge2.0-0 \
            libdrm2 \
            libxkbcommon0 \
            libgbm1 \
            libpango-1.0-0 \
            libcairo2 \
            libasound2 \
            libxdamage1 \
            libxcomposite1 \
            libxrandr2 \
            libcups2 \
            xvfb
        ok "System dependencies installed."
    else
        warn "apt-get not found. Please install the following manually:"
        echo "  libegl1-mesa libvulkan1 vulkan-tools mesa-vulkan-drivers"
        echo "  libnss3 libatk-bridge2.0-0 libgbm1 libpango-1.0-0 libcairo2"
    fi

    # Node dependencies
    info "Installing project dependencies..."
    if command -v pnpm &>/dev/null; then
        pnpm install
    else
        npm install
    fi

    # Playwright
    info "Installing Playwright browsers..."
    npx playwright install chromium --with-deps
    ok "Playwright chromium installed."
}

# ---- Run tests ----
run_tests() {
    info "Running GPU visual regression tests..."
    echo ""

    # Verify GPU one more time
    if ! nvidia-smi &>/dev/null; then
        fail "No GPU detected. Tests will run without GPU (black canvas mode)."
        warn "To get real rendered screenshots, run on a machine with an NVIDIA GPU."
        echo ""
        npx playwright test tests/visual-regression.spec.js
    else
        VIB3_GPU=1 npx playwright test tests/visual-regression.spec.js
    fi

    echo ""
    ok "Tests complete. Results in test-results/visual/"
    info "Screenshots: test-results/visual/*.png"
    info "Reports:     test-results/visual/*.json"
    info "Baselines:   tests/visual-baselines/*.png"
}

# ---- GCP VM provisioning helper ----
provision_gcp() {
    info "GCP GPU VM provisioning commands:"
    echo ""
    echo "  # Create GPU VM (NVIDIA T4, ~\$0.35/hr)"
    echo "  gcloud compute instances create vib3-gpu-test \\"
    echo "    --zone=us-central1-a \\"
    echo "    --machine-type=n1-standard-4 \\"
    echo "    --accelerator=type=nvidia-tesla-t4,count=1 \\"
    echo "    --boot-disk-size=50GB \\"
    echo "    --image-family=ubuntu-2204-lts \\"
    echo "    --image-project=ubuntu-os-cloud \\"
    echo "    --maintenance-policy=TERMINATE"
    echo ""
    echo "  # SSH and setup"
    echo "  gcloud compute ssh vib3-gpu-test -- 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs'"
    echo "  gcloud compute ssh vib3-gpu-test -- 'sudo apt-get install -y nvidia-driver-525 nvidia-utils-525'"
    echo "  gcloud compute ssh vib3-gpu-test -- 'sudo reboot'"
    echo "  # After reboot:"
    echo "  gcloud compute ssh vib3-gpu-test -- 'git clone <repo> && cd <repo> && ./scripts/setup-gpu-testing.sh --run'"
    echo ""
    echo "  # Cleanup"
    echo "  gcloud compute instances delete vib3-gpu-test --zone=us-central1-a"
}

# ---- AWS EC2 provisioning helper ----
provision_aws() {
    info "AWS EC2 GPU instance commands:"
    echo ""
    echo "  # Create GPU instance (NVIDIA T4, ~\$0.53/hr)"
    echo "  aws ec2 run-instances \\"
    echo "    --instance-type g4dn.xlarge \\"
    echo "    --image-id ami-0c7217cdde317cfec \\"
    echo "    --key-name your-key \\"
    echo "    --security-group-ids sg-xxx \\"
    echo "    --block-device-mappings '[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":50}}]'"
    echo ""
    echo "  # The Deep Learning AMI comes with NVIDIA drivers pre-installed"
}

# ---- GitHub Actions self-hosted runner setup ----
setup_actions_runner() {
    info "To set up a self-hosted GitHub Actions runner with GPU:"
    echo ""
    echo "  1. Go to: https://github.com/<org>/<repo>/settings/actions/runners/new"
    echo "  2. Follow the download and configure steps on your GPU VM"
    echo "  3. Add label 'gpu' to the runner"
    echo "  4. Start the runner: ./run.sh"
    echo ""
    echo "  The gpu-visual-tests.yml workflow will automatically use this runner."
}

# ---- Main ----
case "${1:-}" in
    --check)
        check_gpu
        ;;
    --run)
        check_gpu
        install_deps
        run_tests
        ;;
    --provision-gcp)
        provision_gcp
        ;;
    --provision-aws)
        provision_aws
        ;;
    --setup-runner)
        setup_actions_runner
        ;;
    --help|-h)
        echo "VIB3+ GPU Visual Testing Setup"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (none)            Full setup (install deps + check)"
        echo "  --check           Verify GPU environment"
        echo "  --run             Setup + run visual tests"
        echo "  --provision-gcp   Show GCP VM creation commands"
        echo "  --provision-aws   Show AWS EC2 creation commands"
        echo "  --setup-runner    Show GitHub Actions runner setup"
        echo "  --help            This message"
        ;;
    *)
        check_gpu
        install_deps
        ok "Setup complete. Run tests with:"
        echo ""
        echo "  VIB3_GPU=1 npx playwright test tests/visual-regression.spec.js"
        echo ""
        ;;
esac
