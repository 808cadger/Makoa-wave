# CLAUDE.md — GlowAI

AI skin analysis app.
Stack: HTML + Capacitor + Electron | Deploy: APK + PWA + Electron AppImage/RPM

## Repo Identity
- Codeberg: https://codeberg.org/cadger808/glowai
- PWA: https://cadger808.codeberg.page/glowai
- Releases: https://codeberg.org/cadger808/glowai/releases

## Key Files
- `index.html` — single-page app entry point
- `api-client.js` — Claude API calls (load FIRST before other widgets)
- `app.js` / `scan.js` / `routine.js` / `advisor.js` / `progress.js` / `onboarding.js` — feature modules
- `avatar-widget.js` / `share-widget.js` — floating UI widgets
- `electron/main.js` — Electron desktop entry
- `capacitor.config.json` — Capacitor/Android config
- `android/` — Android project (do not edit directly; sync via Capacitor)
- `.github/workflows/build-apk.yml` — APK CI
- `.github/workflows/deploy-pages.yml` — PWA CI
- `.gitea/workflows/build-electron.yml` — Electron CI

## Commands
```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
npm run electron:dist
```

## Assumption-Driven Coding

When generating or editing code:
1. Add a comment for each non-trivial assumption using `// #ASSUMPTION: ...` (or language equivalent).
2. Ask: "What test or edge case would break this assumption?"
3. Add minimal defensive checks or `// TODO: validate ...` comments where needed.
4. Before finishing, do a mental review pass on all `#ASSUMPTION` lines.

## SRE & DevOps (2026 Standards)
- **SLOs**: 99.9% availability, <200ms P95 latency, 0.1% error budget monthly.
- **SLIs**: Track uptime, latency, error rate via Prometheus/Grafana.
- **Deploy**: Zero-downtime (blue-green, canary); IaC-first (Pulumi/Terraform).
- **MCP Integration**: Use MCP for secure cloud access (AWS, Vercel).
- **Monitoring**: Golden signals + AI anomaly detection in every app.
- **Chatbot**: Embed agentic chatbot in every app (UI + API + safe prompts).

### Auto-Debug Engine (Always On)
- **Before every change**: Run tests/lint, show output, fix failures first.
- **After code**: Self-review: "Does this pass SRE checks? Edge cases? Security?"
- **Loop**: If error found → fix → retest → confirm clean → proceed.
- **Tools**: Enable Playwright MCP for UI tests; background terminal for logs.
- **Commands**: /doctor for health check; /memory to log fixes learned.
- **Never skip**: No deploy without "Debug complete: [tests passed]".

## Goal
Ship production-ready agentic AI apps with embedded chatbots, SRE-grade reliability, and Fiverr-ready polish. Every deploy <30min.
