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
- Multi‑line, kid‑friendly narrative presented in a vertical wheel (rank progression, pacing, and persistence).
- Includes game description, ranks, and what ranks mean.

**How To Play**
- Step‑by‑step guidance in a vertical wheel (rank choice, input rules, tile meaning, and reminders).
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

# Web App Design (Implemented)

This section documents the shipped vanilla + Vite web app that mirrors the iOS behavior and UI/UX. It is a single‑player, offline‑first, deterministic experience with local persistence and no server dependency.

## A. Overview

**App type**
- Static SPA built with vanilla JS and Vite.
- Offline‑first; no backend.

**Entry**
- `web/index.html` loads `web/src/main.js`.
- `main.js` initializes a `GameStore`, subscribes UI rendering, and manages resize re‑renders.

**Primary files (web)**
- `web/src/constants.js` – game constants, colors, modes, enums.
- `web/src/storage.js` – localStorage persistence wrapper.
- `web/src/rng.js` – seeded LCG and deterministic shuffle.
- `web/src/wordlists.js` – word list loading and filtering.
- `web/src/dateUtils.js` – calendar and date formatting helpers.
- `web/src/gameStore.js` – core state and game logic.
- `web/src/ui.js` – HTML rendering and interactions.
- `web/src/style.css` – full UI styling.
- `web/vite.config.js` – base path configuration for GitHub Pages.

**Static assets**
- Word lists: `web/public/wordlist/*.txt` (same names as iOS resources).
- Fonts: `web/src/assets/fonts/*.ttf` (Merriweather variable fonts).

## B. State Model

**Store state** (`gameStore.js`)
- `state.ui`:
  - `isLoading`: loading status for word lists.
  - `message`: transient game feedback.
  - `guesses`: list of `{ word, results }`.
  - `currentInput`: active input string.
  - `status`: `inProgress`, `won`, `lost`.
  - `maxGuesses`, `wordLength`: per‑mode.
- `state.history`: list of `GameHistoryEntry` objects (newest first).
- `state.currentMode`: one of `mini|junior|classic|epic`.
- `state.route`: `home|game|history|stats|about|howToPlay`.
- `state.splashVisible`: splash overlay for ~2s on launch.
- `state.resumeModes`: list of mode IDs with an in‑progress game persisted.
- `state.showResume`: session flag that enables “Continue” UI after the first keystroke.
- `state.sessionResumeMode`: last mode that received input in the current session.

**UI local state** (`ui.js`)
- Home: focused menu ID, mode picker visibility, focused mode ID, reset confirmation flag and message.
- History: displayed month, selected date, expanded entry ID, selected mode filters.
- Stats: selected mode (single‑select).
- About / How To Play: focused wheel ID.

## C. Persistence

**Keys** (matching iOS)
- `history_entries_json`
- `random_seed`
- `current_mode`
- `answer_index_<mode>`
- `current_game_<mode>` (active game snapshot per mode)

**Behavior**
- History is serialized as JSON in localStorage.
- Seed is persisted; default is `12345` if missing.
- Per‑mode answer index is stored and advanced per game.
- Mode defaults to `mini` if missing or invalid.
- Legacy history entries missing `mode` are defaulted to `classic`.
- Active game snapshots include answer, guesses, current input, status, and mode settings.
- Restore only resumes in‑progress games; completed games do not show resume UI.
- Resume UI is session‑scoped: it appears only after a keystroke in the current session.

## D. Word Lists and Filtering

**Source**
- `web/public/wordlist/` mirrors iOS resource file names.

**Rules**
- Lowercase, trim, alpha only, length‑match per mode.
- `blockedAnswers` are removed from both guesses and answers.
- Fallback words are used per mode when lists are unavailable.

**Loading**
- `loadWordLists()` fetches `wordlist/<name>.txt` via `BASE_URL`.
- The word set is the union of guesses and answers.

## E. Determinism and RNG

**Seeded generator**
- BigInt LCG with the same constants as iOS.
- `shuffleWithSeed()` implements Fisher‑Yates with seeded randomness.
- Answer sequence is shuffled once per mode and advanced with `answer_index_<mode>`.

## F. Game Logic

**Input**
- `onKeyInput(letter)` appends until `wordLength`.
- `onDeleteInput()` removes last character and clears “Not in the word list.” message if present.
- The first keystroke (letter or delete) enables resume UI for the current session.

**Mode configuration (web)**
- Uses `GameModes` from `web/src/constants.js`.
- Pupil (`mini`) allows 7 guesses on the web build.

**Submit**
- Validations:
  1. Game is in progress.
  2. Guess length matches word length.
  3. Guess is in `wordSet`.
- Scoring uses a two‑pass Wordle evaluation:
  1. Exact matches → `correct`.
  2. Remaining letters → `present` if still available, else `absent`.

**End of game**
- Win on exact match; loss on max guesses.
- `GameHistoryEntry` stored immediately on win/loss.
- End message:
  - Win: `You solved it! The word was ...`
  - Loss: `Out of guesses. The word was ...`

**New game**
- Advances answer index (per‑mode) and persists it.
- Resets guesses/input/status; message is “New game started.” unless cleared.

**Full reset**
- Clears history and per‑mode indices.
- Reseeds using current time and reshuffles answers.
- Starts a new game and shows “Fully reset!”.

## G. UI/UX (Implemented)

**Global layout**
- Full‑screen viewport (no page scrolling).
- Screen panels are swapped by route; only one is visible at a time.
- Bottom bars are in‑flow and always visible without scrolling.
- Safe‑area insets are respected to avoid browser chrome overlap.
- Spacing uses viewport‑scaled clamps for phone/tablet balance.
- iPad‑specific layout tweaks reduce keyboard/tile size in short landscape and lift bottom controls.

**Splash**
- Full‑screen “My Wordle” overlay shown for ~2 seconds on startup.

**Home**
- Title and subtitle top‑aligned.
- Vertical menu wheel: How to Play, About, Play!/Continue, History, Statistics.
- “Play!” opens a horizontal mode picker overlay.
- After the first keystroke in a session, the Play label switches to “Continue.”
- Full Reset is a menu item in the wheel; confirmation UI and success message appear below.
- When mode picker is open, the vertical wheel is softly blurred and dimmed.

**Mode picker**
- Horizontal wheel with Pupil/Scribe/Author/Wordsmith.
- Tap top/bottom 30% of overlay to dismiss.
- Selecting a mode immediately starts a game and navigates to Game screen.
- Opens focused on the current mode.
- Horizontal wheel uses CSS scroll‑snap with `proximity` for native momentum.
- The last session‑active mode shows a “Continue” tag and subtle glow.
- Each mode shows its word length as a subtitle (e.g., “3‑letter word”).

**Game**
- Fixed layout: title → board → message → keyboard → bottom bar.
- Tile sizing adapts to viewport and mode.
- Bottom bar: “New Game” only (back via swipe/arrow).

**Keyboard**
- Three letter rows plus Delete and Submit.
- Key colors reflect highest known `LetterState`.
- Physical keyboard support: letters, Backspace, Enter.

**History**
- Calendar month view with previous/next.
- Days are color‑coded:
  - Selected day: blue.
  - Days with games: green.
  - Empty days: gray.
- Mode toggles are multi‑select (filter).
- Entry cards expand to show guesses.
- Back navigation via swipe and arrow cue only.

**Stats**
- Mode toggles are single‑select.
- No selection: centered title and toggles.
- With selection: stats summary and histogram render in separate cards.
- Histogram bars use a green gradient and per‑mode max guesses.
- Bar width and height scale to relative counts; no fixed track fill.
- Back navigation via swipe and arrow cue only.

**About / How To Play**
- Vertical wheel with expanded copy blocks (multi‑line guidance).
- Extra top/bottom wheel padding to reduce clipping on scroll.
- Back navigation via swipe and arrow cue only.

**Wheel behavior**
- Scrollable containers with perspective scaling, opacity, blur, and rotation.
- Snap‑to‑nearest after scroll with a 150ms delay.
- Supports trackpad/mouse wheel scrolling and pointer drag.
- Click/tap selects and snaps to the focused item.
- Touch devices use a longer snap delay to reduce bounce.
- Scroll position for the home wheel is restored on return.
- Horizontal wheel snap is handled by CSS scroll‑snap (JS snap disabled for axis `x`).
- Resume items use a highlight glow plus a soft halo aligned to the wheel’s aesthetic.

**Swipe navigation**
- Swipe right on any subpage returns to Home.
- Visual arrow cue appears only on subpages (left edge only).
- Swipe‑to‑home is edge‑gated and requires a longer horizontal gesture to reduce accidental exits.

**Touch guard**
- Double‑tap zoom is suppressed via `touch-action: manipulation` and a touchend guard, while pinch‑to‑zoom remains available.

## H. Input and Accessibility

**Supported input**
- Pointer and touch for wheels and buttons.
- Keyboard input on Game screen.

**Notes**
- No explicit ARIA labels yet.
- No reduced‑motion mode yet.

## I. Build and Deployment

**Toolchain**
- Vite, vanilla JS.

**Scripts** (`web/package.json`)
- `dev`: Vite dev server.
- `build`: production bundle to `web/dist`.
- `preview`: local server for `web/dist`.

**GitHub Pages**
- Base path controlled by `BASE_PATH` env var (`vite.config.js`).
- Example: `BASE_PATH="/wordle/" npm run build`.
- Static assets use relative/BASE_URL paths.
- `scripts/deploy-gh-pages.sh` builds and deploys via a temporary `gh-pages` worktree.
- GitHub Actions workflow auto‑deploys on push to `main`.
- `.nojekyll` is included to prevent asset mangling.

**Icons and previews**
- `web/public/icons/icon.png` used for favicon and social previews.
- Open Graph and Twitter meta tags include absolute URLs for the icon.

**Ignored artifacts**
- `web/node_modules/` and `web/dist/` are ignored in `.gitignore`.

## J. Known Gaps / Non‑Goals

- No PWA/service worker.
- No cross‑device sync.
- No analytics or network dependencies.
- No reduced‑motion adaptations yet.
