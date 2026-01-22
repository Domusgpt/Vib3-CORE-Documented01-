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
- `<keystore-password>`: the password for the Android signing keystore (release builds only).
- `<alias>`: the Android key alias inside the keystore (release builds only).
- `<alias-password>`: the password for the Android key alias (release builds only).
- `/path/to/keystore.jks`: the path to your Android signing keystore file (release builds only).

### Where do the Android keystore values come from?
You only need a keystore when you’re **signing a release build** for distribution (Play Store, internal testing, etc.). For local development and emulator/device testing, you **do not** need these values—debug builds are signed automatically.

If you *do* need a release keystore later, you create it yourself (or your team provides one). The values come from the keystore you generate with `keytool`:
```bash
keytool -genkeypair \
  -alias <alias> \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore /path/to/keystore.jks
```
During that prompt, you choose:
- the **keystore password** (`<keystore-password>`)
- the **key alias** (`<alias>`)
- the **alias password** (`<alias-password>`) (can be the same as the keystore password)

### Emulator vs. cloud testing
- **Android Emulator (local):** best for day-to-day development and smoke testing.
- **Cloud testing (Firebase Test Lab, etc.):** best for automated device coverage in CI.

This guide includes only the SDK/tooling prerequisites; the sections below outline optional emulator and Test Lab setup.

### Optional: Android emulator setup
If you want a local emulator for development:
```bash
sdkmanager "system-images;android-34;google_apis;x86_64" "emulator"
avdmanager create avd -n vib3-pixel -k "system-images;android-34;google_apis;x86_64"
emulator -avd vib3-pixel
```

### Optional: Firebase Test Lab (cloud testing)
Enable Test Lab in your GCP project and run a sample instrumentation test:
```bash
gcloud services enable testing.googleapis.com
gcloud firebase test android run \
  --type instrumentation \
  --app path/to/app.apk \
  --test path/to/androidTest.apk \
  --device model=Pixel2,version=30,locale=en,orientation=portrait
```

## Project configuration example
If your project ID is already created, you can set it like this:
```bash
gcloud config set project gen-lang-client-0544919502
```

For full project provisioning (APIs, Firebase initialization, and CI service accounts), see
[`DOCS/PROJECT_SETUP.md`](DOCS/PROJECT_SETUP.md).

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
