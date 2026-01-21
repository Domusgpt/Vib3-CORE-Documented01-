# Environment setup (Firebase, gcloud, Flutter, Android, GH CLI)

This doc provides a **copy/paste** bootstrap script to install and configure:
- Firebase CLI
- Google Cloud SDK (`gcloud`)
- Flutter SDK
- Android SDK (command-line tools)
- GitHub CLI (`gh`)

> ✅ Intended for Linux environments (Ubuntu/Debian).  
> ✅ Replace placeholder values for auth and project configuration.

## Placeholders to fill
- `<YOUR_GH_TOKEN>`: a GitHub personal access token for `gh auth login --with-token`.
- `<YOUR_GCP_PROJECT_ID>`: the Google Cloud project ID to set in `gcloud config set project`.
- `<keystore-password>`: the password for the Android signing keystore.
- `<alias>`: the Android key alias inside the keystore.
- `<alias-password>`: the password for the Android key alias.
- `/path/to/keystore.jks`: the path to your Android signing keystore file.

## One-shot setup script
```bash
#!/usr/bin/env bash
set -euo pipefail

# -----------------------------
# 0) System deps (Linux)
# -----------------------------
sudo apt-get update -y
sudo apt-get install -y \
  curl wget unzip xz-utils zip jq git \
  ca-certificates gnupg lsb-release \
  openjdk-17-jdk

# -----------------------------
# 1) Node.js + Corepack + pnpm
# -----------------------------
# If Node is not installed or you want to pin a version, uncomment:
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt-get install -y nodejs

node -v
corepack enable
corepack prepare pnpm@9.4.0 --activate
pnpm -v

# -----------------------------
# 2) Firebase CLI
# -----------------------------
pnpm add -g firebase-tools@13.12.0
firebase --version

# -----------------------------
# 3) Google Cloud SDK (gcloud)
# -----------------------------
if ! command -v gcloud >/dev/null 2>&1; then
  echo "Installing Google Cloud SDK..."
  curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
    | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
  sudo apt-get update -y && sudo apt-get install -y google-cloud-sdk
fi
gcloud --version

# -----------------------------
# 4) GitHub CLI
# -----------------------------
if ! command -v gh >/dev/null 2>&1; then
  echo "Installing GitHub CLI..."
  type -p curl >/dev/null || sudo apt-get install -y curl
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt-get update -y && sudo apt-get install -y gh
fi
gh --version

# -----------------------------
# 5) Flutter + Android SDK
# -----------------------------
FLUTTER_VERSION="3.22.3"
FLUTTER_DIR="$HOME/flutter"
if [ ! -d "$FLUTTER_DIR" ]; then
  echo "Installing Flutter ${FLUTTER_VERSION}..."
  curl -L "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz" -o /tmp/flutter.tar.xz
  tar -xf /tmp/flutter.tar.xz -C "$HOME"
fi
export PATH="$FLUTTER_DIR/bin:$PATH"
flutter --version

ANDROID_HOME="$HOME/Android/Sdk"
ANDROID_CMDLINE="$ANDROID_HOME/cmdline-tools"
mkdir -p "$ANDROID_CMDLINE"
if [ ! -d "$ANDROID_CMDLINE/latest" ]; then
  echo "Installing Android cmdline-tools..."
  mkdir -p "$ANDROID_CMDLINE/latest"
  curl -L "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o /tmp/cmdline-tools.zip
  unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools
  mv /tmp/cmdline-tools/cmdline-tools/* "$ANDROID_CMDLINE/latest"
fi
export PATH="$ANDROID_CMDLINE/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# -----------------------------
# 6) Project deps
# -----------------------------
pnpm install

# -----------------------------
# 7) Auth placeholders (fill in)
# -----------------------------
# --- GitHub CLI ---
# gh auth login --with-token <<'EOF'
# <YOUR_GH_TOKEN>
# EOF

# --- Firebase ---
# firebase login:ci --no-localhost
# firebase use --add

# --- GCloud ---
# gcloud auth login --no-launch-browser
# gcloud auth application-default login --no-launch-browser
# gcloud config set project <YOUR_GCP_PROJECT_ID>

# --- Android signing (if needed) ---
# export ANDROID_KEYSTORE_PATH="/path/to/keystore.jks"
# export ANDROID_KEYSTORE_PASSWORD="<keystore-password>"
# export ANDROID_KEY_ALIAS="<alias>"
# export ANDROID_KEY_PASSWORD="<alias-password>"

echo "✅ Setup complete"
```
