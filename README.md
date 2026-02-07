# Python Wordle

Simple Wordle clone served by a lightweight Python HTTP server with a static web UI. Use this to verify gameplay before moving on to Android work.

## Getting started

```bash
cd /Users/ramanan/git/wordle
python server.py
```

Then open http://localhost:8000 in a browser. The UI uses `/api/new-game` to start a session and `/api/guess` to submit guesses. Game state is kept in-memory per browser session via a cookie.

## Notes

- Six attempts to guess the five-letter answer. Colors match the classic Wordle rules: green = correct spot, yellow = present, gray = absent.
- On startup, `server.py` looks for `wordlist/clean_five_letter_words.txt` and uses it if present. A curated Wordle-style list is already included there. Words are filtered to 5-letter alphabetic entries with standard vowels, no simple plurals, and a small banned set; answer selection further narrows to a 3.5k pool that favors common letters and avoids odd doubles/repeats. If the file is missing, it loads from system dictionaries and falls back to a short built-in list.
- No external dependencies are required beyond the Python standard library.

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
