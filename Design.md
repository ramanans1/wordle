# iOS App System Design (Wordle)

This document describes the complete system design for the iOS Wordle app in this repository. It is derived from the current SwiftUI code and packaged assets under `ios/Wordle/Wordle`.

**Scope**
This document covers the runtime architecture, UI structure, view composition, game logic, state management, persistence, assets, and user interaction flows. It is intentionally code-accurate and avoids features that are not implemented.

## 1. High-Level Architecture

**App type**
- Native iOS app built with SwiftUI.
- Offline-first. All gameplay runs locally without network access.

**Entry point**
- `WordleApp` (`ios/Wordle/Wordle/WordleApp.swift`) is the SwiftUI `@main` entry.
- The root scene displays `RootView` and forces a dark color scheme.

**Structure**
- Views are defined in a single SwiftUI file: `Views/WordleViews.swift`.
- Game state and logic live in `ViewModels/GameViewModel.swift`.
- Data models are in `Models/GameModels.swift`.
- Utility extensions are in `Utils/Collection+Safe.swift`.
- Word list assets and fonts are in `Resources/` and referenced by Info.plist.

**Design approach**
- MVVM-style separation: `GameViewModel` is the single state owner and logic coordinator, while views render state and call view-model actions.
- No external dependencies.

## 2. Core Concepts and Data Model

**Game status** (`GameStatus`)
- `inProgress`, `won`, `lost`.

**Letter evaluation** (`LetterState`)
- `unused`, `absent`, `present`, `correct` (in ascending priority order).

**Guess** (`Guess`)
- `word`: the player’s submitted guess (lowercase).
- `results`: per-letter `LetterState` values for the guess.

**History entry** (`GameHistoryEntry`)
- `timestamp`: milliseconds since epoch.
- `answer`: the target word used for the game.
- `won`: boolean outcome.
- `guesses`: array of guessed words.
- Computed `dateString` returns `yyyy-MM-dd` from timestamp.

**UI state** (`GameUiState`)
- `isLoading`: true while word lists load.
- `message`: user-facing transient messages.
- `guesses`: list of `Guess` objects.
- `currentInput`: in-progress typed word.
- `status`: `GameStatus`.
- `maxGuesses`: 6.

**Navigation route** (`AppRoute`)
- `home`, `game`, `history`, `stats`, `about`, `howToPlay`.

## 3. Word Lists and Answer Selection

**Word list sources**
- `Resources/allowed-guesses.txt` and `Resources/allowed-answers.txt` are bundled in the app.
- If either file is missing or empty, a small in-code `fallbackWords` list is used.

**Filtering rules**
- Words are lowercased, trimmed, and filtered to exactly 5 letters and alphabetic.
- A fixed `blockedAnswers` set is applied to both guesses and answers to prevent disallowed words.

**Working sets**
- `wordList`: valid guesses (allowed-guesses, filtered).
- `answerList`: valid answers (allowed-answers, filtered).
- `wordSet`: union of guess and answer lists for validation.

**Answer sequence**
- Answers are shuffled once into `answerSequence` using a seeded RNG (`SeededGenerator`).
- The seed is persisted to `UserDefaults` and is stable across launches unless a full reset occurs.
- `answerIndex` is persisted so the app continues through the sequence across sessions.

## 4. Randomness and Determinism

**Seeded generator**
- `SeededGenerator` implements `RandomNumberGenerator` with a deterministic linear congruential generator.
- The seed defaults to `12345` if no saved seed exists.

**Sequence use**
- On startup, answers are shuffled using the seeded generator, then consumed sequentially via `answerIndex`.
- `startNewGame` advances the index and stores it in `UserDefaults`.
- `fullReset` updates the seed based on the current time and reshuffles.

## 5. State Management and Persistence

**State ownership**
- `GameViewModel` is a `@MainActor` `ObservableObject`.
- It exposes `@Published` properties: `state` and `history`.

**Persistence**
- `history_entries_json`: JSON-encoded history array stored as a `String` in `UserDefaults`.
- `answer_index`: integer index into the current shuffled answer sequence.
- `random_seed`: integer seed for deterministic shuffling.

**Lifecycle**
- `init` calls `loadPersistedState()` and then `loadWords()`.
- `loadWords()` rebuilds word lists and starts a new game.

## 6. Game Flow and Logic

**Input handling**
- `onKeyInput(_:)` appends a letter if game is in progress and input length < 5.
- `onDeleteInput()` removes the last character and clears the “Not in the word list.” message if present.

**Guess submission**
- `submitGuess()` performs validation:
  1. Must be in progress.
  2. Must be exactly 5 letters.
  3. Must exist in `wordSet`.
- If valid, `scoreGuess(answer:guess:)` computes per-letter states.
- Game ends on a correct guess or after 6 guesses.
- On win or loss, a `GameHistoryEntry` is created and persisted.

**Scoring rules**
- First pass marks exact matches as `correct` and decrements letter counts.
- Second pass marks remaining letters as `present` if available in the remaining counts.
- All others stay `absent`.
- This matches standard Wordle letter-count behavior.

**New game**
- `startNewGame(clearMessage:)` resets guesses and input, selects the next answer, and optionally clears the message.
- If no answers exist, a random fallback word is used.

**Full reset**
- Clears history and user defaults for history.
- Regenerates a time-based seed.
- Resets answer index and reshuffles the sequence.
- Starts a new game and shows a “Fully reset!” message.

## 7. UI Design and View Composition

All UI is built in SwiftUI in `Views/WordleViews.swift`. The design intentionally mirrors the Android version mentioned in `README.md`.

### 7.1 Root and Navigation

**RootView**
- Maintains the active `AppRoute` and a `GameViewModel` as an `@StateObject`.
- Provides a full-screen black background.
- Switches between the main screens: Home, Game, History, Stats, About, How to Play.
- Displays a splash screen overlay for ~2 seconds at launch.
- Persists the last focused home menu item so returning from a menu option restores the wheel position.

**SplashView**
- Full-screen black background with the title “My Wordle” in large, bold custom font.

### 7.2 Home Screen

**HomeScreen**
- Title and subtitle: “My Wordle” and “Designed for Mr. N Sekar”.
- Main action menu uses a vertically scrolling wheel with snapping and perspective effects.
- Menu order is: How to Play, About, Play!, History, Statistics (Play! starts centered).
- Tapping a menu item navigates and also stores the item as the active focus when returning.
- Full reset flow:
  - Tapping “Full Reset” reveals a confirmation section.
  - “Yes” triggers `fullReset()`, then hides confirmation and shows a success message.
  - “No, go back” cancels.

### 7.3 Game Screen

**WordleScreen**
- Shows a circular `ProgressView` while `state.isLoading` is true.
- Main layout is a scrollable vertical stack:
  - Title “My Wordle”.
  - `BoardView` for guesses and current input.
  - Message banner (win/loss/validation feedback).
  - Buttons: `Submit` and `New Game`.
  - On-screen `KeyboardView`.
  - `Back` button.

**BoardView**
- Renders 6 rows x 5 columns.
- Each tile shows the correct color for prior guesses or the typed letter for the current row.
- Tile size adapts to screen dimensions within a min/max range.

**TileView**
- Rounded rectangle with a color based on `LetterState`.
- Text color shifts for readability based on state.

**KeyboardView**
- Three rows: `QWERTYUIOP`, `ASDFGHJKL`, `ZXCVBNM`.
- Each key shows state-aware coloring based on the most informative state for that letter.
- A delete key labeled `⌫` is displayed below the rows.

**KeyView**
- Plain-styled button with a rounded rectangle background and custom font.

### 7.4 History Screen

**HistoryWrapper**
- Title “History”, followed by `HistoryScreen` and a `Back` button.

**HistoryScreen**
- A calendar-like month view for navigating dates.
- Uses `YearMonth` to compute monthly grids and titles.
- Days with games are highlighted.
- Selecting a date lists the games played on that date.

**HistoryCard**
- Shows the answer word and win/loss status.
- Tap to expand and show the list of guesses.
- Uses a simple vertical “flexible” view to render the guesses list.

### 7.5 Statistics Screen

**StatsWrapper**
- Title “Statistics”, followed by `StatsScreen` and a `Back` button.

**StatsScreen**
- If no history exists, shows “No games yet.”
- Otherwise shows:
  - Games played count.
  - Win percentage (one decimal).
  - Guess distribution for 1 to 6 guesses.
- The distribution is rendered as bars whose color interpolates between two greens based on counts.

### 7.6 About Screen

**AboutWrapper**
- Displays whimsical, brief copy as a vertical wheel.
- The wheel focus point is near the top, so the most in-focus sentence sits at the top.
- Includes a Back button separated from the copy block for visual breathing room.

### 7.7 How to Play Screen

**HowToPlayWrapper**
- Shows concise, humorous instructions as a vertical wheel of sentences.
- The wheel focus point is near the top, allowing users to scroll down for more lines and back up.
- Includes a Back button separated from the copy block.

## 8. Styling and Theme

**Global look**
- Dark theme with black background.
- Bright accent colors and bold typography.

**Colors**
- Correct: green (`#22C55E`).
- Present: amber (`#F59E0B`).
- Absent: dark gray (`#1F2937`).
- Unused: near-black (`#111827`).
- Additional reds for losses and muted grays for secondary text.

**Fonts**
- Custom Merriweather family in multiple weights and sizes.
- Defined in `Info.plist` and used via `.custom()` font builders.

**Buttons**
- `InvertibleOutlineButton` is text-only with no rectangular outlines and a subtle pressed opacity.

## 9. User Interaction Details

**Input**
- Players use on-screen keyboard only; no system keyboard is attached.
- Key taps append letters; `⌫` deletes.
- `Submit` attempts a guess.

**Messaging**
- Validation messages show for missing length or invalid word list entries.
- Win/loss messages include the correct answer.
- `New Game` clears the message and starts a new round.

**Navigation**
- All navigation is in-app via button presses that swap the `AppRoute` in `RootView`.
- There is no navigation stack or deep linking.

## 10. Utility and Support Code

**Safe indexing**
- `Collection+Safe` adds `subscript(safe:)` for out-of-bounds-safe access.
- Used by the board to avoid index crashes.

**String indexing**
- A private `String` extension in `WordleViews.swift` provides safe character access by index.

**Color interpolation**
- A private `Color.interpolate` helper generates smooth bar colors in statistics.

## 11. Offline-Only Behavior

**No network**
- All assets, word lists, and logic are bundled.
- There are no API calls, analytics, or remote configuration.

## 12. Build and Runtime Constraints

**Supported orientation**
- Portrait only, as specified in `Info.plist`.

**Scene**
- Single-scene app (`UIApplicationSupportsMultipleScenes` is false).

## 13. Feature Checklist (As Implemented)

- Home screen with a wheel menu (How to Play, About, Play!, History, Statistics).
- Splash screen on launch.
- Wordle gameplay with 6 guesses and 5-letter words.
- On-screen keyboard with letter-state coloring.
- Win/loss messaging.
- New game flow.
- Full reset flow with confirmation.
- History calendar and expandable game cards.
- Statistics with win rate and guess distribution.
- About screen with wheel-scrolling copy.
- How to Play screen with wheel-scrolling instructions.
- Persistent history and deterministic answer sequence.
- Offline word lists and custom fonts.

## 14. Known Non-Features (Not Implemented)

These features are intentionally not present in the current codebase.
- No hint system.
- No daily puzzle tied to the calendar date.
- No sharing results.
- No animations beyond the splash fade.
- No login or cloud sync.
- No accessibility configuration beyond default SwiftUI behavior.
