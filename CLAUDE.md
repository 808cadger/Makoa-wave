# CLAUDE.md — GlowAI

## Project identity
GlowAI is a mobile-first AI beauty assistant app — a "pocket esthetician" for skincare guidance, routine suggestions, and premium user experience.

## Primary goals
- Build a calm, elegant, trustworthy, premium-feeling app.
- Keep the experience simple, fast, and mobile-first.
- Make the product easy to maintain and scale.
- Prefer clean architecture over clever shortcuts.

## Product principles
- Prioritize clarity, trust, and visual polish.
- Keep the UI minimal and focused on the next best action.
- Every screen should feel useful, not cluttered.
- Use beauty/wellness language that feels warm, modern, and confident.
- Avoid generic AI-app styling.

## Design direction
- Style: premium, soft, clean, modern, luxurious.
- Tone: calm, helpful, polished, human.
- Prefer subtle gradients, soft shadows, rounded cards, and spacious layouts.
- Use strong visual hierarchy and clear primary CTAs.
- Avoid noisy dashboards, dense text blocks, and harsh colors unless intentionally branded.

## UX rules
- Mobile-first by default.
- Keep onboarding short.
- Make the home screen immediately useful.
- Reduce taps to core actions.
- Use simple forms and clear progress states.
- Always show helpful loading, error, and empty states.

## Architecture rules
- Keep components modular and reusable.
- Separate UI, business logic, and data access.
- Avoid duplicate logic across screens.
- Prefer small focused modules over large files.
- Keep AI prompts and response handling isolated from UI components.
- Design for future expansion without overengineering the MVP.

## Workflow
- Before major changes, inspect the current file structure and identify the smallest safe refactor.
- When improving a feature, preserve existing behavior unless a change is explicitly requested.
- If a task affects architecture, propose a phased plan before editing.
- If something is unclear, ask for clarification before making large assumptions.

## Quality standards
- Write readable, maintainable code.
- Use consistent naming.
- Handle loading, error, and edge states.
- Keep screens and components visually aligned with the GlowAI brand.
- Avoid unnecessary dependencies.

## Suggested file organization
- `app/` or `src/` for application code
- `components/` for reusable UI
- `features/` for app-specific modules
- `lib/` for helpers, AI logic, and utilities
- `styles/` or theme files for design tokens
- `.claude/` for rules, skills, and commands

## What to optimize for
- Premium first impression
- Conversion-friendly UX
- Fast iteration
- Easy refactoring
- Strong brand identity
- Clear AI behavior

## What to avoid
- Overbuilt architecture for MVP
- Generic chat-app patterns
- Cluttered screens
- Duplicate components
- Hidden side effects
- Hardcoded styling scattered everywhere

## If asked to improve design
Focus on:
1. Layout hierarchy.
2. Brand polish.
3. Mobile usability.
4. Trust and clarity.
5. Conversion flow.

## If asked to improve architecture
Focus on:
1. Separation of concerns.
2. Module boundaries.
3. Reusable components.
4. Clean data flow.
5. Maintainability.

## If asked to add features
Prefer:
- minimal viable implementation,
- clean interfaces,
- and a path to scale later.

## Stack
HTML + Capacitor + Electron | Deploy: APK + PWA + Electron AppImage/RPM

## Key Files
- `index.html` — single-page app entry point
- `api-client.js` — Claude API calls (load FIRST before other widgets)
- `app.js` / `scan.js` / `routine.js` / `advisor.js` / `progress.js` / `onboard.js` — feature modules
- `avatar-widget.js` / `share-widget.js` — floating UI widgets
- `electron/main.js` — Electron desktop entry
- `capacitor.config.json` — Capacitor/Android config
- `android/` — Android project (do not edit directly; sync via Capacitor)

## Commands
```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
npm run electron:dist
```
