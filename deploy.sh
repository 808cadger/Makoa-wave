#!/usr/bin/env bash
# deploy.sh — Install this app on your Android phone
# Works on: Fedora Linux (ADB) or Android Termux
# Usage: ./deploy.sh

set -e

APP_REPO="$(basename $(git remote get-url origin) .git)"
GITHUB_USER="cadger808"

echo "📱 Deploying $APP_REPO to Android..."

# ── Detect environment ──────────────────────────────────────────
if command -v adb &>/dev/null && adb devices | grep -q "device$"; then
  echo "✅ ADB device detected — installing APK directly"
  LATEST_APK=$(gh release download --repo $GITHUB_USER/$APP_REPO \
    --pattern "*.apk" --dir /tmp/$APP_REPO --clobber 2>&1 && \
    find /tmp/$APP_REPO -name "*.apk" | head -1)
  adb install -r "$LATEST_APK"
  echo "✅ Installed! Open your app drawer to find $APP_REPO"

elif command -v termux-open-url &>/dev/null; then
  echo "📲 Termux detected — opening PWA in browser"
  termux-open-url "https://$GITHUB_USER.github.io/$APP_REPO"
  echo "✅ Tap the 3-dot menu → Add to Home Screen"

else
  echo "📋 No ADB device or Termux found."
  echo ""
  echo "Option 1 — ADB install:"
  echo "  sudo dnf install android-tools"
  echo "  adb install -r \$(gh release download --repo $GITHUB_USER/$APP_REPO --pattern '*.apk' --dir /tmp --clobber && find /tmp -name '*.apk' | head -1)"
  echo ""
  echo "Option 2 — PWA (any phone, open in Brave/Chrome):"
  echo "  https://$GITHUB_USER.github.io/$APP_REPO"
fi
