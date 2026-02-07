# Python Wordle

Simple Wordle clone served by a lightweight Python HTTP server with a static web UI.

## Getting started

```bash
cd /workspace/wordle
python server.py
```

Then open http://localhost:8000 in a browser. The UI uses `/api/new-game` to start a session and `/api/guess` to submit guesses. Game state is kept in-memory per browser session via a cookie.

## Notes

- Supports **3, 4, 5, and 6-letter** game modes (selected in the UI before starting a new game).
- Six attempts per game. Colors match the classic Wordle rules: green = correct spot, yellow = present, gray = absent.
- On startup, `server.py` loads generated lists for 3/4/6 from `wordlist/allowed-guesses-<N>.txt` and `wordlist/allowed-answers-<N>.txt`.
- 5-letter mode keeps the existing list behavior and continues to use legacy files (`allowed-guesses.txt` / `allowed-answers.txt`) when available.
- No external dependencies are required beyond the Python standard library.

## Word list generation (kid-friendly)

Generated lists are produced by `scripts/generate_kid_friendly_wordlists.py`.

Data sources used:
- `dwyl/english-words` (dictionary corpus)
- `dolph/dictionary` `enable1.txt` (Scrabble-style legal words)
- `hermitdave/FrequencyWords` (`en_50k`) for modern usage ranking
- Profanity sources:
  - `LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words`
  - `zacanger/profane-words`

Filtering summary:
- Keep lowercase alphabetic words only.
- Build union candidates from dictionary + frequency sources.
- Remove profanity/adult terms and some substance/relationship terms using merged blocklists plus custom additions.
- Remove selected archaic forms (`thou`, `hath`, etc.), common abbreviations/acronyms (e.g., `fbi`, `dna`), interjections (`aah`, `hmm`, etc.), and simple archaic suffix patterns (`-eth`, `-est`).
- Remove personal names using public first-name/surname lists, then create broader **guesses** and stricter **answers** by frequency thresholds.
- Guarantee `answers ⊆ guesses` for each generated word length (3/4/6).

Regenerate:

```bash
python scripts/generate_kid_friendly_wordlists.py
```

## Android app (offline)

- Project files live under `android/` and use Jetpack Compose with no network dependency. The same curated word list is packaged as an app asset.
- To run:
  1. Open `android/` in Android Studio (Giraffe or newer). When prompted, let it download the matching Gradle and Android plugins.
  2. Connect an Android device with USB debugging enabled (or start an emulator).
  3. Select the `app` run configuration and press **Run**. The game works entirely offline.
- To build from the command line: `cd android && ./gradlew assembleDebug` then install `app/build/outputs/apk/debug/app-debug.apk` on your device via `adb install -r app-debug.apk`.

## iOS app (offline)

- iOS project sources live under `ios/Wordle/Wordle` and mirror the Android app's features and styling (home, game, history calendar, statistics, reset flow, splash, and local word-list gameplay).
- The iOS app bundles `allowed-answers.txt` and `allowed-guesses.txt` in `ios/Wordle/Wordle/Resources` for fully offline gameplay.
- To run in Xcode:
  1. Install Xcode 15+.
  2. Install [XcodeGen](https://github.com/yonaskolb/XcodeGen) if not already installed.
  3. Generate the project: `cd ios/Wordle && xcodegen`.
  4. Open `Wordle.xcodeproj`, choose an iOS simulator/device, and run.
