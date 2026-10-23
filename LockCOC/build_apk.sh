#!/usr/bin/env bash
# Đóng APK LockCOC ngay trong Codespaces:  bash build_apk.sh [https://dia-chi-server]
set -euo pipefail
cd "$(dirname "$0")"
APP_URL="${1:-}"
if [ -z "$APP_URL" ] && [ -n "${CODESPACE_NAME:-}" ]; then
APP_URL="https://lockcoc-faketriss.vercel.app"
fi
[ -n "$APP_URL" ] || { echo "Thiếu địa chỉ server. Dùng: bash build_apk.sh https://ten-mien-cua-ban"; exit 1; }
case "$APP_URL" in https://*) ;; *) echo "Địa chỉ phải bắt đầu bằng https://"; exit 1;; esac
echo "==> Server của APK: $APP_URL"

# 1) JDK 17
if ! javac -version 2>&1 | grep -qE ' (17|21)\.'; then
  echo "==> Cài JDK 17"; sudo apt-get update -y && sudo apt-get install -y openjdk-17-jdk-headless unzip
fi
JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")"; export JAVA_HOME

# 2) Android SDK
export ANDROID_HOME="$HOME/android-sdk"
if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "==> Tải Android command-line tools"
  mkdir -p "$ANDROID_HOME/cmdline-tools" && cd /tmp
  curl -fsSL -o cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q -o cmdtools.zip -d "$ANDROID_HOME/cmdline-tools" && rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"; cd - >/dev/null
fi
SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
yes | "$SDKM" --licenses >/dev/null || true
"$SDKM" "platforms;android-34" "build-tools;34.0.0"

# 3) Gradle 8.7
GRADLE_HOME="$HOME/gradle-8.7"
if [ ! -x "$GRADLE_HOME/bin/gradle" ]; then
  echo "==> Tải Gradle 8.7"
  curl -fsSL -o /tmp/gradle.zip https://services.gradle.org/distributions/gradle-8.7-bin.zip
  unzip -q -o /tmp/gradle.zip -d "$HOME"
fi

# 4) Build
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
"$GRADLE_HOME/bin/gradle" -p android --no-daemon assembleDebug -PAPP_URL="$APP_URL"
cp android/app/build/outputs/apk/debug/app-debug.apk ./LockCOC.apk

# 5) Mở cổng 5000 công khai để điện thoại truy cập được (app vẫn có mã khoá)
if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null; then
  gh codespace ports visibility 5000:public -c "$CODESPACE_NAME" || echo "(Tự đặt cổng 5000 sang Public trong tab Ports nếu cần)"
fi
echo; echo "XONG: $(pwd)/LockCOC.apk  -> chuột phải file trong Explorer > Download"
