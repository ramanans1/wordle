# My Wordle

An offline-first, kid-friendly Wordle-inspired game with four ranks (3–6 letters), designed for short sessions and steady progression. The project includes a polished web app (Vite + vanilla JS) and native iOS/Android builds that share the same curated word lists and gameplay rules.

## Vision (Today)

- **Kid-friendly**: shorter words, clear rank progression, and gentle pacing.
- **Offline-first**: everything runs locally (no backend required).
- **Deterministic**: per‑mode word sequences for consistent daily play and history.
- **Multi-platform**: web, iOS, and Android share the same game logic and word lists.

## Status

- Web app is the primary, most up-to-date experience.
- iOS and Android apps are offline and mirror the core gameplay.
- Word lists are curated and generated via `scripts/generate_kid_friendly_wordlists.py`.

## Quick Start (Web)

```bash
cd web
npm install
npm run dev
```

Then open the local URL shown by Vite.

Build for production:

```bash
cd web
npm run build
npm run preview
```

## iOS (Offline)

```bash
cd ios/Wordle
xcodegen
open Wordle.xcodeproj
```

Requirements:
- Xcode 15+
- XcodeGen

## Android (Offline)

```bash
cd android
./gradlew assembleDebug
```

Then install `app/build/outputs/apk/debug/app-debug.apk` on a device/emulator.

## Word Lists

Word lists are generated with:

```bash
python scripts/generate_kid_friendly_wordlists.py
```

Generated lists live in:
- `wordlist/` (source lists used by some tooling)
- `web/public/wordlist/` (web app)
- `ios/Wordle/Wordle/Resources/` (iOS app)
- `android/app/src/main/assets/` (Android app)

## Project Structure

- `web/` – Vite + vanilla JS web app
- `ios/` – SwiftUI iOS app
- `android/` – Jetpack Compose Android app
- `scripts/` – tooling (word list generation, deploy helpers)
- `Design.md` – system design and current behavior (kept in sync)

## Notes

- Game state is persisted locally (history, last mode, and in‑progress games).
- The web app uses the curated lists and supports 3/4/5/6 letter modes.

If you want to contribute or extend the game, start with `Design.md` and the `web/` app.
