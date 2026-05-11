# Makoa Wave

[![Release](https://img.shields.io/github/v/release/808cadger/Makoa-wave?include_prereleases&label=release)](https://github.com/808cadger/Makoa-wave/releases)
[![Last commit](https://img.shields.io/github/last-commit/808cadger/Makoa-wave)](https://github.com/808cadger/Makoa-wave/commits)
[![License](https://img.shields.io/github/license/808cadger/Makoa-wave)](https://github.com/808cadger/Makoa-wave/blob/HEAD/LICENSE)
![Platforms](https://img.shields.io/badge/platform-Web%2FPWA%2C%20Android%2C%20Desktop%2C%20API%20service-2563eb)

AI skincare app for face scans, personalized routines, progress tracking, and dermatology-style chat.

## Project Snapshot

| Area | Details |
|------|---------|
| Primary use case | AI skincare app for face scans, personalized routines, progress tracking, and dermatology-style chat. |
| Platforms | Web/PWA, Android, Desktop, API service |
| Core stack | JavaScript, Capacitor, Android, Electron, FastAPI |
| Review first | `index.html`, `server`, `android`, `capacitor.config.json`, `package.json` |

## Download Links

| Platform | Link |
|----------|------|
| iOS / iPhone | [Open the PWA in Safari](https://808cadger.github.io/Makoa-wave/) and choose **Share -> Add to Home Screen** |
| Android | [Download the latest APK from GitHub Releases](https://github.com/808cadger/Makoa-wave/releases/latest) |
| Source | [Download the GitHub source ZIP](https://github.com/808cadger/Makoa-wave/archive/refs/heads/main.zip) |
| Repository | [View on GitHub](https://github.com/808cadger/Makoa-wave) |

## Why This Repo Is Worth Reviewing

- End-to-end skin analysis experience from scan to routine.
- Multi-platform packaging demonstrates mobile and desktop delivery.
- Backend service boundary keeps AI/API work separate from the client.


<!-- INSTALL-START -->
## Install and run

These instructions install and run `Makoa-wave` from a fresh clone.

### Clone
```bash
git clone https://github.com/808cadger/Makoa-wave.git
cd Makoa-wave
```

### Web app
```bash
npm install
npm start
```

### Android build/open
```bash
npm run cap:sync
npm run cap:android
```

### Desktop app
```bash
npm run electron
npm run electron:dist
```

### Python/API service
```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Notes
- Use Node.js 22 or newer for the current package set.
- Android builds require Android Studio, a configured SDK, and Java 21 when Gradle is used.
- Create any required `.env` file from `.env.example` before starting backend services.

### AI/API setup
- If the app has AI features, add the required provider key in the app settings or local `.env` file.
- Browser-only apps store user-provided API keys on the local device unless a backend endpoint is configured.

### License
- Apache License 2.0. See [`LICENSE`](./LICENSE).
<!-- INSTALL-END -->


> AI skin analysis app — scan your face, get a personalized skincare routine, track your progress, and chat with an AI dermatology assistant.

[**PWA →**](https://cadger808.codeberg.page/glowai) · [**Download APK / Desktop →**](https://codeberg.org/cadger808/glowai/releases) · [Codeberg](https://codeberg.org/cadger808/glowai)

---

## Easiest way to get it — Zephyr

**[Zephyr](https://cadger808.codeberg.page/zephyr)** is the open PWA network that distributes every app in this suite. Open Zephyr, tap GlowAI, install. Done.

- No account. No sign-up. No data saved anywhere.
- Zephyr doesn't store your usage, scans, or API key — everything stays on your device.
- The app ships fresh every time via PWA — nothing cached on the distribution side.

---

## Can anyone use this?

**Yes — install in 10 seconds, no account needed.**

1. Open [Zephyr](https://cadger808.codeberg.page/zephyr) → find GlowAI → tap Install
2. Or open [cadger808.codeberg.page/glowai](https://cadger808.codeberg.page/glowai) directly on any device
3. Tap "Add to Home Screen" (or download APK for Android / AppImage for Linux)
4. Open the app → tap ⚙️ Settings → paste your [Anthropic API key](https://console.anthropic.com)

The key is stored only on your device. Nothing leaves without you asking it to.

---

## What it does

| Feature | Description |
|---------|-------------|
| 📸 **Skin scan** | Camera-based scan — Claude Vision identifies skin type, concerns, and conditions |
| 🧴 **Routine builder** | Personalized AM/PM skincare routine based on your analysis |
| 📊 **Progress tracking** | Scored skin metrics tracked over time |
| 💬 **AI advisor** | Ask anything — ingredients, routines, products |
| 🌙 **Daily check-ins** | Quick daily skin logs to monitor changes |
| 🤖 **AI avatar** | Floating dermatology assistant on every screen |
| 📤 **Share / install** | One-tap PWA install + Download APK button in the share widget |
| 🖥️ **Desktop app** | Electron build (AppImage + RPM) for Linux |

---

## Install options

| Method | Steps |
|--------|-------|
| **Zephyr** | [cadger808.codeberg.page/zephyr](https://cadger808.codeberg.page/zephyr) → GlowAI → Install — zero data saved |
| **PWA** | Open link → "Add to Home Screen" — works on Android, iOS, desktop |
| **Android APK** | [Download](https://codeberg.org/cadger808/glowai/releases) → open file on device |
| **ADB install** | `adb install -r app-debug.apk` |
| **Linux desktop** | Download `.AppImage` or `.rpm` from [Releases](https://codeberg.org/cadger808/glowai/releases) |

---

## Dev quick start

```bash
git clone https://codeberg.org/cadger808/glowai.git
cd glowai && npm install

npx serve .                                            # browser dev
npx cap sync android && cd android && ./gradlew assembleDebug  # APK
npm run electron:dist                                  # Electron
```

---

## Tech stack

| Layer | Tech |
|-------|------|
| UI | Vanilla HTML/CSS/JS |
| AI | Claude Sonnet 4.6 (chat) · Claude Opus 4.6 (Vision scan) |
| Mobile | Capacitor → Android APK |
| Desktop | Electron (AppImage / RPM) |
| Distribution | Zephyr PWA network |
| CI | Forgejo Actions (APK + Pages + Electron) |

---

**Developer:** [codeberg.org/cadger808](https://codeberg.org/cadger808)
---

© 2026 cadger808 — All rights reserved.
