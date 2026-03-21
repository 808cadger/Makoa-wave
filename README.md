# GlowAI

> AI-powered skin analysis app — scan your face, get a personalized skincare routine, track your progress, and chat with an AI dermatology assistant.

---

## What it does

| Feature | Description |
|---------|-------------|
| 📸 **Skin analysis** | Camera-based scan powered by Claude's vision — identifies skin type, concerns, and conditions |
| 🧴 **Routine builder** | Personalized morning and evening skincare routine based on your analysis |
| 📊 **Progress tracking** | Track your skin over time with scored metrics |
| 💬 **AI chat** | Ask anything about skincare — ingredients, routines, products |
| 🎯 **Smart recommendations** | Product and ingredient suggestions tailored to your skin |
| 🌙 **Daily check-ins** | Quick daily skin logs to monitor changes |

---

## Tech stack

```
www/          Vanilla JS + HTML/CSS (Capacitor web app)
android/      Capacitor Android wrapper
Claude API    claude-opus-4-6 vision + text (Anthropic)
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Android Studio](https://developer.android.com/studio) (for Android builds)
- An [Anthropic API key](https://console.anthropic.com)

### Run in browser

```bash
npm install
npx cap sync
# Open www/index.html in your browser
# Enter your Anthropic API key in the app settings
```

### Build for Android

```bash
npm install
npx cap sync android
npx cap open android
# Build & run from Android Studio
```

---

## API key setup

GlowAI asks for your Anthropic API key on first launch and stores it locally in `localStorage` — it is **never sent anywhere except directly to Anthropic's API**.

Get a key at [console.anthropic.com](https://console.anthropic.com).

---

## Architecture

```
www/
  index.html     ← Full app (single-file, vanilla JS)
                   • Camera capture + base64 encoding
                   • Claude vision API calls (direct from client)
                   • Skin analysis, routine generation, chat
                   • localStorage persistence

android/
  app/           ← Capacitor Android shell
  capacitor.build.gradle
```

---

## Privacy

- All analysis is done via direct API calls from your device to Anthropic
- No backend server, no data collection
- Photos are processed in-memory and never stored on any server
- Your API key stays on your device

---

Built with [Claude claude-opus-4-6](https://anthropic.com) · Capacitor · Vanilla JS

