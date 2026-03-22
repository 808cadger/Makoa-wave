# GlowAI

> AI skin analysis app — scan your face, get a personalized skincare routine, track your progress, and chat with an AI dermatology assistant.

[**PWA →**](https://cadger808.codeberg.page/glowai) · [**Download APK / Desktop →**](https://codeberg.org/cadger808/glowai/releases) · [Codeberg](https://codeberg.org/cadger808/glowai)

---

## Can anyone use this?

**Yes — install in 10 seconds, no account needed.**

1. Open [cadger808.codeberg.page/glowai](https://cadger808.codeberg.page/glowai) on any device
2. Tap "Add to Home Screen" (or download the APK for Android / AppImage for Linux)
3. Open the app → tap ⚙️ Settings → paste your [Anthropic API key](https://console.anthropic.com)

That's it. The key is stored only on your device.

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
| CI | Forgejo Actions (APK + Pages + Electron) |

---

**Developer:** [codeberg.org/cadger808](https://codeberg.org/cadger808)
