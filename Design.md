# iOS App System Design (Wordle)

This document reflects the current SwiftUI implementation under `ios/Wordle/Wordle`. It is intentionally code-accurate and only describes features that exist in the codebase.

**Scope**
This document covers architecture, UI, game logic, state, persistence, assets, and user flows.

## 1. High-Level Architecture

**App type**
- Native iOS app built with SwiftUI.
- Offline-first. No network dependencies.

**Entry point**
- `WordleApp` (`ios/Wordle/Wordle/WordleApp.swift`) is the `@main` entry.
- Root scene renders `RootView` and forces a dark color scheme.

**Structure**
- Views: `ios/Wordle/Wordle/Views/WordleViews.swift`.
- View model: `ios/Wordle/Wordle/ViewModels/GameViewModel.swift`.
- Models: `ios/Wordle/Wordle/Models/GameModels.swift`.
- Utilities: `ios/Wordle/Wordle/Utils/Collection+Safe.swift`.
- Bundled assets: `ios/Wordle/Wordle/Resources`.

**Design approach**
- MVVM-style separation: `GameViewModel` is the single source of truth for gameplay and history.
- No third‑party dependencies.

## 2. Core Concepts and Data Model

**Game status** (`GameStatus`)
- `inProgress`, `won`, `lost`.

**Letter evaluation** (`LetterState`)
- `unused`, `absent`, `present`, `correct` (ascending priority).

**Game mode** (`GameMode`)
- `mini`, `junior`, `classic`, `epic`.
- Display labels: `Pupil`, `Scribe`, `Author`, `Wordsmith`.
- Word lengths: 3, 4, 5, 6.
- Max guesses: 5, 6, 6, 7.
- Word list files:
  - Answers: `allowed-answers-3`, `allowed-answers-4`, `allowed-answers`, `allowed-answers-6`.
  - Guesses: `allowed-guesses-3`, `allowed-guesses-4`, `allowed-guesses`, `allowed-guesses-6`.

**Guess** (`Guess`)
- `word`: submitted guess (lowercase).
- `results`: per-letter `LetterState` values.

**History entry** (`GameHistoryEntry`)
- `timestamp`: milliseconds since epoch.
- `answer`: the target word.
- `won`: boolean outcome.
- `guesses`: list of guessed words.
- `mode`: `GameMode` (defaults to `.classic` when decoding older history).
- `dateString`: `yyyy-MM-dd` derived from timestamp.

**UI state** (`GameUiState`)
- `isLoading`: true while word lists load.
- `message`: transient user-facing messages.
- `guesses`: list of `Guess` objects.
- `currentInput`: active typed string.
- `status`: `GameStatus`.
- `maxGuesses`: mode-specific.
- `wordLength`: mode-specific.

**Navigation route** (`AppRoute`)
- `home`, `game`, `history`, `stats`, `about`, `howToPlay`.

## 3. Word Lists and Answer Selection

**Word list sources**
- Bundled in `Resources/`:
  - `allowed-answers.txt`, `allowed-guesses.txt`.
  - `allowed-answers-3.txt`, `allowed-guesses-3.txt`.
  - `allowed-answers-4.txt`, `allowed-guesses-4.txt`.
  - `allowed-answers-6.txt`, `allowed-guesses-6.txt`.

**Filtering rules**
- Words are trimmed, lowercased, alphabetic only, and length-matched to the active mode.
- A fixed `blockedAnswers` set is removed from both guesses and answers.

**Working sets**
- `wordList`: valid guesses.
- `answerList`: valid answers.
- `wordSet`: union of both for validation.

**Fallback words**
- Mode-specific fallback lists in code for 3/4/5/6 letters.

## 4. Randomness and Determinism

**Seeded generator**
- `SeededGenerator` implements a deterministic LCG random generator.
- Seed defaults to `12345` if no persisted value exists.

**Answer sequence**
- Answers are shuffled once per mode using the seeded generator.
- Each mode keeps its own `answerIndex` in `UserDefaults` (`answer_index_<mode>`).
- Mode switches load the appropriate sequence and index.

## 5. State Management and Persistence

**State ownership**
- `GameViewModel` is a `@MainActor` `ObservableObject`.
- Published properties: `state`, `history`, `currentMode`.

**Persistence keys**
- `history_entries_json`: JSON array of `GameHistoryEntry`.
- `random_seed`: deterministic shuffle seed.
- `current_mode`: last selected `GameMode`.
- `answer_index_<mode>`: per-mode answer index.

**Lifecycle**
- `init` loads persisted state, then loads words for the current mode.

## 6. Game Flow and Logic

**Input handling**
- `onKeyInput(_:)` appends a letter if in progress and input length < `state.wordLength`.
- `onDeleteInput()` removes the last character and clears “Not in the word list.” when present.

**Guess submission**
- `submitGuess()` validates:
  1. Game in progress.
  2. Guess length equals `state.wordLength`.
  3. Guess exists in `wordSet`.
- Scoring uses standard Wordle logic with correct and present evaluation passes.
- Win ends immediately; loss occurs at `state.maxGuesses`.
- On end, a `GameHistoryEntry` is created with `mode` and persisted.

**Scoring rules**
- First pass marks exact matches as `correct` and decrements counts.
- Second pass marks remaining letters as `present` if available.
- Otherwise `absent`.

**New game**
- `startNewGame(clearMessage:)` advances the per-mode answer index.
- Resets guesses/input and optionally clears the message.

**Full reset**
- Clears history and per-mode indices.
- Reseeds RNG based on current time.
- Reshuffles answers and starts a new game.

**Mode switching**
- `setMode(_:)` updates:
  - `currentMode`
  - `state.maxGuesses`
  - `state.wordLength`
  - per-mode answer index
  - word lists and answer sequence

## 7. UI Design and View Composition

All UI is implemented in `Views/WordleViews.swift`.

### 7.1 Root and Navigation

**RootView**
- Controls navigation via `AppRoute`.
- Maintains `lastMenuFocusId` (default `play`) for the home wheel.
- Shows a timed splash overlay (`SplashView`) for ~2 seconds on launch.

**SplashView**
- Full-screen black background with title text “My Wordle”.

### 7.2 Home Screen

**HomeScreen**
- Title “My Wordle” and subtitle “Designed for Mr. N Sekar”.
- Vertical menu wheel with snapping and perspective effects.
- Menu order: How to Play, About, Play!, History, Statistics.
- On appear, focus is forced to Play!

**Play mode picker**
- Tapping Play shows a horizontal mode wheel overlay.
- The vertical wheel remains visible, blurred and dimmed in the background.
- Tapping the top 30% or bottom 30% dismisses the overlay.
- Selecting a mode starts the game immediately.

**Full reset**
- “Full Reset” reveals confirmation controls.
- “Yes” triggers `fullReset()` and shows a success message.

### 7.3 Game Screen

**WordleScreen**
- Uses fixed layout (no scroll) so board, message, keyboard, and bottom buttons remain visible.
- Tile size computed from screen dimensions to fit the current word length and max guesses.
- Bottom bar is pinned via `safeAreaInset` with “New Game” and “Back”.

**BoardView**
- Renders `maxRows` by `wordLength` tiles.
- Current input is shown on the active row.

**TileView**
- Color by `LetterState`:
  - `correct`: green
  - `present`: yellow
  - `absent`: dark gray
  - `unused`: darker gray

**KeyboardView**
- Three alphabet rows plus delete (`⌫`) and submit buttons.
- Keys colored by best known letter state.

### 7.4 History Screen

**HistoryWrapper**
- Title “History”.
- Content is `HistoryScreen`.
- Back button pinned to bottom via `safeAreaInset`.

**HistoryScreen**
- Calendar month view with day selection.
- Month navigation using “‹” and “›”.
- Mode toggles (multi-select) appear below the calendar and are centered.
- Entry list shows only selected modes for the selected date.
- Centered title message:
  - If entries exist: “Games played on 26th of January”.
  - If none: “No games played on 26th of January”.
- Entries display answer, win/loss, and optional guesses when expanded.

### 7.5 Statistics Screen

**StatsWrapper**
- Title and content are provided by `StatsScreen`.
- Back button pinned to bottom via `safeAreaInset`.

**StatsScreen**
- Mode toggles are single-select and larger font.
- Default state: no mode selected.
  - Title and toggles are centered vertically.
- When a mode is selected:
  - Title and toggles move to the top.
  - Stats and histogram render below, centered in available space.
- Histogram range adapts to selected mode’s max guesses.

### 7.6 About and How To Play

**About**
- Short, kid‑friendly copy presented in a vertical wheel.
- Includes game description, ranks, and what ranks mean.

**How To Play**
- Short, kid‑friendly steps in a vertical wheel.
- Explains ranks and letter counts.
- Color explanations are on separate lines using “=>”.
- Ends with “Good luck!”.

## 8. Menu Wheel Components

**MenuWheelView (vertical)**
- Snapping vertical list with perspective scale, opacity, blur, and rotation.
- Focus aligns to a configurable focus point.

**HorizontalWheelView (mode picker)**
- Snapping horizontal list with similar effects.
- Used for mode selection (Pupil/Scribe/Author/Wordsmith).

## 9. Fonts and Visual Style

**Fonts**
- Merriweather 24pt variants loaded via `UIAppFonts` in `Info.plist`.
- Title, section, body, caption, and tile fonts are custom.

**Colors**
- Black background throughout.
- Green/yellow/gray tiles consistent with Wordle conventions.

## 10. Assets

**App icon**
- Stored in `Resources/Assets.xcassets/AppIcon.appiconset`.
- App icon set includes all required iOS sizes.
- Uses the provided 1024×1024 source, slightly zoomed/cropped for better prominence.

**Splash**
- No custom launch storyboard is used.
- `Info.plist` uses an empty `UILaunchScreen` dictionary.

## 11. User Interaction Summary

**Primary flow**
- Home → Play → Mode picker → Game.

**History flow**
- Home → History → calendar + mode filters → entries.

**Stats flow**
- Home → Statistics → select a mode → view stats and histogram.

**Reset flow**
- Home → Full Reset → confirmation → state cleared and reshuffled.

## 12. File Map

- `ios/Wordle/Wordle/WordleApp.swift` – app entry point.
- `ios/Wordle/Wordle/Views/WordleViews.swift` – all SwiftUI screens and components.
- `ios/Wordle/Wordle/ViewModels/GameViewModel.swift` – gameplay logic and persistence.
- `ios/Wordle/Wordle/Models/GameModels.swift` – game data types and modes.
- `ios/Wordle/Wordle/Resources/Assets.xcassets` – app icon assets.
- `ios/Wordle/Wordle/Resources/*.txt` – word lists.
- `ios/Wordle/Wordle/Info.plist` – fonts, launch configuration.
