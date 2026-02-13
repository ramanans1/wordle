import { Colors, GameModes, GameStatus, LetterState, Routes } from "./constants.js";
import {
  currentYearMonth,
  dateString,
  formattedDateWithOrdinal,
  yearMonthGridDates,
  yearMonthNext,
  yearMonthPrevious,
  yearMonthTitle,
} from "./dateUtils.js";

const uiLocal = {
  focusedMenuId: "play",
  showModePicker: false,
  focusedModeId: "mini",
  showConfirm: false,
  resetMessage: null,
  wheelScroll: {},
  history: {
    displayedMonth: currentYearMonth(),
    selectedDate: new Date(),
    expandedId: null,
    selectedModes: new Set(GameModes.map((mode) => mode.id)),
  },
  stats: {
    selectedMode: null,
  },
  about: {
    focusedId: "a1",
  },
  howTo: {
    focusedId: "h1",
  },
};

let keyHandler = null;

export function renderApp({ app, state, store }) {
  app.innerHTML = renderShell(state);

  bindGlobalActions({ app, state, store });
  initTouchGuards({ app });
  initSwipeNavigation({ app, state, store });

  if (state.route === Routes.home) {
    bindHome({ app, state, store });
  }
  if (state.route === Routes.game) {
    bindGame({ app, state, store });
  }
  if (state.route === Routes.history) {
    bindHistory({ app, state, store });
  }
  if (state.route === Routes.stats) {
    bindStats({ app, state, store });
  }
  if (state.route === Routes.about) {
    initWheel("about-wheel", {
      axis: "y",
      focusFraction: 0.18,
      rowHeight: 52,
      onFocus: (id) => {
        uiLocal.about.focusedId = id;
      },
    });
  }
  if (state.route === Routes.howToPlay) {
    initWheel("howto-wheel", {
      axis: "y",
      focusFraction: 0.18,
      rowHeight: 52,
      onFocus: (id) => {
        uiLocal.howTo.focusedId = id;
      },
    });
  }

  if (uiLocal.showModePicker) {
    initWheel("mode-wheel", {
      axis: "x",
      focusFraction: 0.5,
      rowHeight: 140,
      itemWidth: 170,
      onFocus: (id) => {
        uiLocal.focusedModeId = id;
      },
      onSelect: (id) => {
        const mode = GameModes.find((item) => item.id === id);
        if (mode) {
          uiLocal.showModePicker = false;
          store.setMode(mode.id).then(() => {
            state.route = Routes.game;
            store.notify();
          });
        }
      },
    });
  }

  if (state.route === Routes.home) {
    initWheel("home-wheel", {
      axis: "y",
      focusFraction: 0.5,
      rowHeight: 56,
      initialScroll: uiLocal.wheelScroll["home-wheel"],
      userScrollOnly: true,
      onScroll: (value) => {
        uiLocal.wheelScroll["home-wheel"] = value;
      },
      onFocus: (id) => {
        uiLocal.focusedMenuId = id;
      },
    });
  }
}

function renderShell(state) {
  const canGoHome = state.route !== Routes.home;
  const navArrows = canGoHome
    ? `
      <div class="nav-arrows">
        <button class="nav-arrow left" data-action="go-home" aria-label="Back"></button>
      </div>
    `
    : "";
  const splash = state.splashVisible
    ? `
      <div class="splash">
        <div class="splash-title">My Wordle</div>
      </div>
    `
    : "";

  return `
    <div class="app-root" data-route="${state.route}">
      <section class="screen ${state.route === Routes.home ? "active" : ""}" data-screen="home">
        ${renderHome(state)}
      </section>
      <section class="screen ${state.route === Routes.game ? "active" : ""}" data-screen="game">
        ${renderGame(state)}
      </section>
      <section class="screen ${state.route === Routes.history ? "active" : ""}" data-screen="history">
        ${renderHistory(state)}
      </section>
      <section class="screen ${state.route === Routes.stats ? "active" : ""}" data-screen="stats">
        ${renderStats(state)}
      </section>
      <section class="screen ${state.route === Routes.about ? "active" : ""}" data-screen="about">
        ${renderAbout()}
      </section>
      <section class="screen ${state.route === Routes.howToPlay ? "active" : ""}" data-screen="howTo">
        ${renderHowToPlay()}
      </section>
      ${navArrows}
      ${splash}
    </div>
  `;
}

function renderHome(state) {
  const resetMessage = uiLocal.resetMessage ? `<div class="reset-message">${uiLocal.resetMessage}</div>` : "";
  const confirmBlock = uiLocal.showConfirm
    ? `
      <div class="reset-confirm">
        <div class="caption">This will erase all progress and restart the word sequence.</div>
        <div class="reset-actions">
          <button class="outline-button" data-action="reset-confirm">Yes</button>
          <button class="outline-button muted" data-action="reset-cancel">No, go back</button>
        </div>
      </div>
    `
    : "";

  const resumeModes = new Set(state.showResume ? state.resumeModes ?? [] : []);
  const resumeVisible = Boolean(state.showResume && resumeModes.size > 0);
  const hasResume = resumeVisible;
  const playLabel = hasResume ? "Continue" : "Play!";

  const modeOverlay = uiLocal.showModePicker
    ? `
      <div class="mode-overlay">
        <div class="mode-dismiss" data-action="mode-dismiss" data-zone="top"></div>
        <div class="mode-dismiss" data-action="mode-dismiss" data-zone="bottom"></div>
        <div class="mode-wheel" id="mode-wheel" data-focus="${uiLocal.focusedModeId}">
          <div class="wheel-track horizontal">
            ${GameModes.map((mode) => {
              const isResume = resumeVisible && resumeModes.has(mode.id);
              return renderWheelItem(mode.label, mode.id, {
                tag: isResume ? "Continue" : null,
                subtitle: `${mode.wordLength}-letter word`,
                className: isResume ? "resume" : "",
              });
            }).join("")}
          </div>
        </div>
      </div>
    `
    : "";

  return `
    <div class="home-screen ${uiLocal.showModePicker ? "mode-active" : ""}">
      <div class="home-title">
        <div class="page-title hero">My Wordle</div>
        <div class="subtitle">Designed for Mr. N Sekar</div>
      </div>
      <div class="wheel" id="home-wheel" data-focus="${uiLocal.focusedMenuId}">
        <div class="wheel-track vertical">
          ${renderWheelItem("How to Play", "howto")}
          ${renderWheelItem("About", "about")}
          ${renderWheelItem(playLabel, "play", { className: hasResume ? "resume" : "" })}
          ${renderWheelItem("History", "history")}
          ${renderWheelItem("Statistics", "stats")}
          ${renderWheelItem("Full Reset", "reset")}
        </div>
      </div>
      <div class="home-footer">
        ${confirmBlock}
        ${resetMessage}
      </div>
      ${modeOverlay}
    </div>
  `;
}

function renderGame(state) {
  if (state.ui.isLoading) {
    return `<div class="loading">Loading...</div>`;
  }

  const tileSize = computeTileSize(state.ui);
  const isTabletPortrait = window.innerWidth >= 700 && window.innerHeight > window.innerWidth;
  const isIpadLandscape = window.innerWidth >= 1024 && window.innerWidth <= 1366 && window.innerHeight <= 1024;
  const isLargeKeyboard = window.innerWidth >= 1200 && !isTabletPortrait && !isIpadLandscape;
  const board = renderBoard(state, tileSize);
  const message = state.ui.message
    ? `<div class="message ${state.ui.status}">${state.ui.message}</div>`
    : `<div class="message"></div>`;

  return `
    <div class="game-screen">
      <div class="page-title game">My Wordle</div>
      ${board}
      ${message}
      ${renderKeyboard(state, isLargeKeyboard)}
      <div class="bottom-bar">
        <button class="outline-button" data-action="new-game">New Game</button>
      </div>
    </div>
  `;
}

function renderBoard(state, tileSize) {
  const rows = [];
  for (let row = 0; row < state.ui.maxGuesses; row += 1) {
    const cols = [];
    for (let col = 0; col < state.ui.wordLength; col += 1) {
      const guess = state.ui.guesses[row];
      const letter = guess
        ? guess.word[col]?.toUpperCase() ?? ""
        : row === state.ui.guesses.length
          ? state.ui.currentInput[col]?.toUpperCase() ?? ""
          : "";
      const result = guess?.results[col] ?? LetterState.unused;
      cols.push(`<div class="tile" data-state="${result}" style="width:${tileSize}px;height:${tileSize}px;">${letter}</div>`);
    }
    rows.push(`<div class="board-row">${cols.join("")}</div>`);
  }
  return `<div class="board">${rows.join("")}</div>`;
}

function renderKeyboard(state, isLarge = false) {
  const letterStates = state.letterStates ?? {};
  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  const keys = rows
    .map(
      (row) =>
        `<div class="keyboard-row">${[...row]
          .map((letter) => renderKey(letter, letterStates[letter.toLowerCase()] ?? LetterState.unused))
          .join("")}</div>`
    )
    .join("");
  return `
    <div class="keyboard ${isLarge ? "large" : ""}">
      ${keys}
      <div class="keyboard-row">
        ${renderKey("⌫", LetterState.unused, "wide", "delete")}
        ${renderKey("Submit", LetterState.unused, "extra", "submit")}
      </div>
    </div>
  `;
}

function renderKey(label, state, size = "normal", action = "letter") {
  return `
    <button class="key ${size}" data-action="${action}" data-letter="${label}" data-state="${state}">
      <span class="key-label">${label}</span>
    </button>
  `;
}

function renderHistory(state) {
  const entries = state.history;
  const selectedModes = uiLocal.history.selectedModes;
  const filteredEntries = entries.filter((entry) => selectedModes.has(entry.mode));
  const entriesByDate = filteredEntries.reduce((acc, entry) => {
    const key = entry.dateString ?? dateString(new Date(entry.timestamp));
    acc[key] = acc[key] || [];
    acc[key].push(entry);
    return acc;
  }, {});

  const selectedKey = dateString(uiLocal.history.selectedDate);
  const selectedEntries = entriesByDate[selectedKey] ?? [];
  const formattedDate = formattedDateWithOrdinal(uiLocal.history.selectedDate);

  const grid = yearMonthGridDates(uiLocal.history.displayedMonth)
    .map((date) => {
      if (!date) {
        return `<div class="calendar-cell empty"></div>`;
      }
      const key = dateString(date);
      const hasGames = Boolean(entriesByDate[key]);
      const isSelected = date.toDateString() === uiLocal.history.selectedDate.toDateString();
      return `
        <button class="calendar-cell ${isSelected ? "selected" : ""} ${hasGames ? "has-games" : ""}" data-date="${key}">
          ${date.getDate()}
        </button>
      `;
    })
    .join("");

  const cards = selectedEntries.length
    ? selectedEntries
        .map((entry) => renderHistoryCard(entry, uiLocal.history.expandedId === entry.timestamp))
        .join("")
    : "";

  return `
    <div class="history-screen">
      <div class="page-title section">History</div>
      <div class="calendar-header">
        <button class="nav-button" data-action="prev-month">‹</button>
        <div class="calendar-title">${yearMonthTitle(uiLocal.history.displayedMonth)}</div>
        <button class="nav-button" data-action="next-month">›</button>
      </div>
      <div class="calendar-grid">${grid}</div>
      ${renderModeToggles(Array.from(selectedModes))}
      <div class="history-summary">
        ${selectedEntries.length ? `Games played on ${formattedDate}` : `No games played on ${formattedDate}`}
      </div>
      <div class="history-list">${cards}</div>
    </div>
  `;
}

function renderHistoryCard(entry, expanded) {
  const guesses = expanded
    ? `<div class="history-guesses">${entry.guesses
        .map((guess) => `<span class="guess-pill">${guess.toUpperCase()}</span>`)
        .join("")}</div>`
    : "";
  return `
    <button class="history-card" data-entry="${entry.timestamp}">
      <div class="history-card-row">
        <div class="history-answer">${entry.answer.toUpperCase()}</div>
        <div class="history-result ${entry.won ? "won" : "lost"}">${entry.won ? "Won" : "Lost"}</div>
      </div>
      ${guesses}
    </button>
  `;
}

function renderStats(state) {
  const selectedMode = uiLocal.stats.selectedMode;
  const entries = selectedMode
    ? state.history.filter((entry) => entry.mode === selectedMode)
    : [];

  const hasMode = Boolean(selectedMode);

  let statsBlock = `<div class="stats-placeholder">Select a rank to see stats.</div>`;

  if (hasMode) {
    if (!entries.length) {
      statsBlock = `<div class="stats-placeholder">No games yet.</div>`;
    } else {
      const total = entries.length;
      const wins = entries.filter((entry) => entry.won).length;
      const winRate = Math.min(Math.max((wins / total) * 100, 0), 100);
      const mode = GameModes.find((item) => item.id === selectedMode);
      const maxGuesses = mode?.maxGuesses ?? 6;
      const histogram = new Map();
      for (let i = 1; i <= maxGuesses; i += 1) {
        histogram.set(
          i,
          entries.filter((entry) => entry.won && entry.guesses.length === i).length
        );
      }
      const counts = [...histogram.values()];
      const maxCount = Math.max(...counts, 1);
      const minCount = Math.min(...counts);

      const bars = [...histogram.entries()]
        .map(([guess, count]) => {
          const factor = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount);
          const width = Math.max(count / maxCount, 0.05) * 100;
          const height = 18 + Math.round(14 * factor);
          const barColor = interpolateColor("#0B4C2D", "#A7F3D0", factor);
          const textColor = factor > 0.5 ? "#0F172A" : "#FFFFFF";
          return `
            <div class="histogram-row">
              <div class="histogram-label">${guess}</div>
              <div class="histogram-bar" style="--bar-fill:${width}%; --bar-color:${barColor}; --bar-text:${textColor}; --bar-height:${height}px;">
                <span>${count}</span>
              </div>
            </div>
          `;
        })
        .join("");

      statsBlock = `
        <div class="stats-panel">
          <div class="stats-card stats-summary-card">
            <div class="stats-card-title">Summary</div>
            <div class="stats-summary">
              <div class="stats-row">
                <div class="stats-label">Games Played</div>
                <div class="stats-value">${total}</div>
              </div>
              <div class="stats-row">
                <div class="stats-label">Win Percentage</div>
                <div class="stats-value">${winRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <div class="stats-arrow-band" aria-hidden="true"></div>
          <div class="stats-card stats-histogram-card">
            <div class="stats-card-title">Guess Distribution</div>
            <div class="stats-caption">Number of games by guess count</div>
            <div class="histogram">${bars}</div>
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="stats-screen ${selectedMode ? "" : "no-selection"}">
      <div class="page-title section">Statistics</div>
      ${renderModeToggles(selectedMode ? [selectedMode] : [])}
      <div class="stats-body">${statsBlock}</div>
    </div>
  `;
}

function renderAbout() {
  return `
    <div class="about-screen">
      <div class="page-title section">About</div>
      <div class="wheel small" id="about-wheel" data-focus="${uiLocal.about.focusedId}">
        <div class="wheel-track vertical">
          ${renderWheelItem("My Wordle is a word puzzle where you guess the hidden word.", "a1")}
          ${renderWheelItem("Four ranks to grow into: Pupil, Scribe, Author, Wordsmith.", "a2")}
          ${renderWheelItem("Pupil and Scribe are shorter words. Author and Wordsmith are longer.", "a3")}
          ${renderWheelItem("Play offline and let the calendar keep your victories.", "a4")}
        </div>
      </div>
    </div>
  `;
}

function renderHowToPlay() {
  return `
    <div class="about-screen">
      <div class="page-title section">How to Play</div>
      <div class="wheel small" id="howto-wheel" data-focus="${uiLocal.howTo.focusedId}">
        <div class="wheel-track vertical">
          ${renderWheelItem("Choose a rank, then try to guess the secret word.", "h1")}
          ${renderWheelItem("Pupil is 3 letters, Scribe is 4.", "h2")}
          ${renderWheelItem("Author is 5 letters, Wordsmith is 6.", "h3")}
          ${renderWheelItem("Green => right letter, right spot.", "h4")}
          ${renderWheelItem("Yellow => right letter, wrong spot.", "h5")}
          ${renderWheelItem("Gray => not in the word.", "h6")}
          ${renderWheelItem("Good luck!", "h7")}
        </div>
      </div>
    </div>
  `;
}

function renderWheelItem(title, id, options = {}) {
  const { tag, subtitle, className } = options;
  const classes = ["wheel-item"];
  if (className) classes.push(className);
  if (tag) classes.push("has-tag");
  return `
    <button class="${classes.join(" ")}" data-id="${id}">
      ${tag ? `<span class="wheel-tag">${tag}</span>` : ""}
      <span class="wheel-title">${title}</span>
      ${subtitle ? `<span class="wheel-subtitle">${subtitle}</span>` : ""}
    </button>
  `;
}

function renderModeToggles(selectedModes) {
  const selectedSet = new Set(selectedModes);
  return `
    <div class="mode-toggles">
      ${GameModes.map(
        (mode) =>
          `<button class="mode-toggle ${selectedSet.has(mode.id) ? "selected" : ""}" data-mode="${mode.id}">${mode.label}</button>`
      ).join("")}
    </div>
  `;
}

function bindGlobalActions({ app, state, store }) {
  app.querySelectorAll("[data-action=back-home]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.route === Routes.game) {
        uiLocal.focusedMenuId = "play";
      }
      state.route = Routes.home;
      store.notify();
    });
  });

  app.querySelectorAll("[data-action=go-home]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.route === Routes.home) return;
      if (state.route === Routes.game) {
        uiLocal.focusedMenuId = "play";
      }
      state.route = Routes.home;
      store.notify();
    });
  });
}

function bindHome({ app, state, store }) {
  const wheel = app.querySelector("#home-wheel");
  wheel?.addEventListener("click", (event) => {
    const item = event.target.closest(".wheel-item");
    if (!item) return;
    const id = item.dataset.id;
    uiLocal.focusedMenuId = id;
    if (id === "play") {
      uiLocal.focusedModeId = state.currentMode ?? GameModes[0].id;
      uiLocal.showModePicker = true;
      store.notify();
      return;
    }
    if (id === "reset") {
      uiLocal.showConfirm = true;
      store.notify();
      return;
    }
    if (id === "history") {
      state.route = Routes.history;
    } else if (id === "stats") {
      state.route = Routes.stats;
    } else if (id === "about") {
      state.route = Routes.about;
    } else if (id === "howto") {
      state.route = Routes.howToPlay;
    }
    store.notify();
  });

  app.querySelectorAll("[data-action=reset-start]").forEach((button) => {
    button.addEventListener("click", () => {
      uiLocal.showConfirm = true;
      store.notify();
    });
  });

  app.querySelectorAll("[data-action=reset-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      uiLocal.showConfirm = false;
      store.notify();
    });
  });

  app.querySelectorAll("[data-action=reset-confirm]").forEach((button) => {
    button.addEventListener("click", () => {
      store.fullReset();
      uiLocal.showConfirm = false;
      uiLocal.resetMessage = "Fully reset!";
      store.notify();
    });
  });

  app.querySelectorAll("[data-action=mode-dismiss]").forEach((zone) => {
    zone.addEventListener("click", () => {
      uiLocal.showModePicker = false;
      uiLocal.focusedMenuId = "play";
      store.notify();
    });
  });
}

function bindGame({ app, state, store }) {
  app.querySelectorAll("[data-action=new-game]").forEach((button) => {
    button.addEventListener("click", () => {
      store.startNewGame({ clearMessage: true });
    });
  });

  initKeyboard({ app, store, state });
}

function initSwipeNavigation({ app, state, store }) {
  const root = app.querySelector(".app-root");
  if (!root) return;
  if (root.dataset.swipeBound === "true") return;
  root.dataset.swipeBound = "true";

  let startX = 0;
  let startY = 0;
  let active = false;
  const edgeThreshold = 28;
  const minDistance = 90;
  const verticalTolerance = 35;

  const shouldIgnore = (target) => {
    return Boolean(target.closest(".wheel") || target.closest(".keyboard") || target.closest(".history-list"));
  };

  root.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    if (shouldIgnore(event.target)) return;
    if (event.touches[0].clientX > edgeThreshold) return;
    active = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  });

  root.addEventListener("touchend", (event) => {
    if (!active) return;
    active = false;
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    if (Math.abs(deltaX) < minDistance) {
      return;
    }
    if (Math.abs(deltaY) > verticalTolerance && Math.abs(deltaX) < Math.abs(deltaY) * 1.1) {
      return;
    }
    if (deltaX > 0 && state.route !== Routes.home) {
      if (state.route === Routes.game) {
        uiLocal.focusedMenuId = "play";
      }
      state.route = Routes.home;
      store.notify();
    }
  });
}

function initTouchGuards({ app }) {
  const root = app.querySelector(".app-root");
  if (!root) return;
  if (root.dataset.touchGuardBound === "true") return;
  root.dataset.touchGuardBound = "true";

  let lastTouchEnd = 0;
  root.addEventListener(
    "touchend",
    (event) => {
      if (event.touches.length > 0) return;
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

function bindHistory({ app, state, store }) {
  app.querySelectorAll("[data-action=prev-month]").forEach((button) => {
    button.addEventListener("click", () => {
      uiLocal.history.displayedMonth = yearMonthPrevious(uiLocal.history.displayedMonth);
      uiLocal.history.selectedDate = new Date(uiLocal.history.displayedMonth.year, uiLocal.history.displayedMonth.month - 1, 1);
      store.notify();
    });
  });

  app.querySelectorAll("[data-action=next-month]").forEach((button) => {
    button.addEventListener("click", () => {
      uiLocal.history.displayedMonth = yearMonthNext(uiLocal.history.displayedMonth);
      uiLocal.history.selectedDate = new Date(uiLocal.history.displayedMonth.year, uiLocal.history.displayedMonth.month - 1, 1);
      store.notify();
    });
  });

  app.querySelectorAll(".calendar-cell[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const [year, month, day] = button.dataset.date.split("-").map(Number);
      uiLocal.history.selectedDate = new Date(year, month - 1, day);
      store.notify();
    });
  });

  app.querySelectorAll(".history-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.entry);
      uiLocal.history.expandedId = uiLocal.history.expandedId === id ? null : id;
      store.notify();
    });
  });

  app.querySelectorAll(".mode-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      if (uiLocal.history.selectedModes.has(mode)) {
        uiLocal.history.selectedModes.delete(mode);
      } else {
        uiLocal.history.selectedModes.add(mode);
      }
      store.notify();
    });
  });
}

function bindStats({ app, state, store }) {
  app.querySelectorAll(".mode-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      uiLocal.stats.selectedMode = uiLocal.stats.selectedMode === mode ? null : mode;
      store.notify();
    });
  });
}

function initKeyboard({ app, store, state }) {
  const keyboard = app.querySelector(".keyboard");
  if (!keyboard) return;

  keyboard.querySelectorAll(".key").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const letter = button.dataset.letter;
      if (action === "delete") {
        store.onDeleteInput();
      } else if (action === "submit") {
        store.submitGuess();
      } else if (action === "letter") {
        store.onKeyInput(letter.toLowerCase());
      }
    });
  });

  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
  }

  keyHandler = (event) => {
    if (state.route !== Routes.game) return;
    const key = event.key;
    if (/^[a-zA-Z]$/.test(key)) {
      store.onKeyInput(key.toLowerCase());
    } else if (key === "Backspace") {
      store.onDeleteInput();
    } else if (key === "Enter") {
      store.submitGuess();
    }
  };

  window.addEventListener("keydown", keyHandler);
}

function initWheel(
  id,
  {
    axis,
    focusFraction,
    rowHeight,
    itemWidth,
    onFocus,
    onSelect,
    initialScroll,
    onScroll,
    userScrollOnly = false,
  } = {}
) {
  const container = document.getElementById(id);
  if (!container) return;

  const track = container.querySelector(".wheel-track");
  const items = Array.from(container.querySelectorAll(".wheel-item"));
  const focusId = container.dataset.focus;

  const updateStyles = () => {
    const containerRect = container.getBoundingClientRect();
    if (track) {
      if (axis === "x") {
        const focusX = containerRect.width * focusFraction;
        const leading = Math.max(focusX - (itemWidth ?? 170) / 2, 0);
        const trailing = Math.max(containerRect.width - focusX - (itemWidth ?? 170) / 2, 0);
        track.style.paddingLeft = `${leading}px`;
        track.style.paddingRight = `${trailing}px`;
      } else {
        const focusY = containerRect.height * focusFraction;
        const topPad = Math.max(focusY - rowHeight / 2, 0);
        const bottomPad = Math.max(containerRect.height - focusY - rowHeight / 2, 0);
        track.style.paddingTop = `${topPad}px`;
        track.style.paddingBottom = `${bottomPad}px`;
      }
    }
    const focusPoint = axis === "x"
      ? containerRect.left + containerRect.width * focusFraction
      : containerRect.top + containerRect.height * focusFraction;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const midpoint = axis === "x" ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      const distance = Math.abs(midpoint - focusPoint);
      const maxDistance = Math.max((axis === "x" ? containerRect.width : containerRect.height) * focusFraction + rowHeight, rowHeight * 3);
      const factor = Math.min(distance / Math.max(maxDistance, 1), 1);
      const scale = 1 - 0.24 * factor;
      const opacity = 1 - 0.6 * factor;
      const blur = 3 * factor;
      const rotation = ((midpoint - focusPoint) / Math.max(maxDistance, 1)) * (axis === "x" ? -18 : 18);

      item.style.transform = axis === "x"
        ? `scale(${scale}) rotateY(${rotation}deg)`
        : `scale(${scale}) rotateX(${rotation}deg)`;
      item.style.opacity = opacity;
      item.style.filter = `blur(${blur}px)`;
    });
  };

  const scrollToId = (idToScroll, smooth = false) => {
    const target = items.find((item) => item.dataset.id === idToScroll);
    if (!target) return;
    if (axis === "x") {
      const offset = target.offsetLeft + target.offsetWidth / 2 - container.clientWidth * focusFraction;
      container.scrollTo({ left: offset, behavior: smooth ? "smooth" : "auto" });
    } else {
      const offset = target.offsetTop + target.offsetHeight / 2 - container.clientHeight * focusFraction;
      container.scrollTo({ top: offset, behavior: smooth ? "smooth" : "auto" });
    }
  };

  const syncScroll = () => {
    if (onScroll && (!userScrollOnly || (!suppressScroll && !programmatic))) {
      onScroll(axis === "x" ? container.scrollLeft : container.scrollTop);
    }
  };

  const snapEnabled = axis !== "x";
  let snapTimer = null;
  let lastScrollPos = axis === "x" ? container.scrollLeft : container.scrollTop;
  let suppressScroll = true;
  let programmatic = false;

  const setProgrammatic = (fn) => {
    programmatic = true;
    fn();
    requestAnimationFrame(() => {
      programmatic = false;
    });
  };

  const getNearestId = () => {
    const focusPoint = axis === "x"
      ? container.scrollLeft + container.clientWidth * focusFraction
      : container.scrollTop + container.clientHeight * focusFraction;

    let nearest = null;
    let nearestDistance = Infinity;

    items.forEach((item) => {
      const midpoint = axis === "x"
        ? item.offsetLeft + item.offsetWidth / 2
        : item.offsetTop + item.offsetHeight / 2;
      const distance = Math.abs(midpoint - focusPoint);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = item;
      }
    });

    return nearest ? nearest.dataset.id : null;
  };

  const snapToNearest = () => {
    const idToFocus = getNearestId();
    if (!idToFocus) return;
    container.dataset.focus = idToFocus;
    onFocus?.(idToFocus);
    scrollToId(idToFocus, true);
  };

  const scheduleSnap = () => {
    if (!snapEnabled) {
      return;
    }
    if (snapTimer) {
      clearTimeout(snapTimer);
    }
    const delay = axis === "x" ? (isTouchDevice() ? 300 : 200) : (isTouchDevice() ? 260 : 150);
    snapTimer = setTimeout(() => {
      const currentPos = axis === "x" ? container.scrollLeft : container.scrollTop;
      if (Math.abs(currentPos - lastScrollPos) < 1) {
        snapToNearest();
      }
      lastScrollPos = currentPos;
    }, delay);
  };

  container.addEventListener("scroll", () => {
    updateStyles();
    if (!programmatic) {
      const idToFocus = getNearestId();
      if (idToFocus) {
        container.dataset.focus = idToFocus;
        onFocus?.(idToFocus);
      }
    }
    lastScrollPos = axis === "x" ? container.scrollLeft : container.scrollTop;
    scheduleSnap();
    if (onScroll && (!userScrollOnly || (!suppressScroll && !programmatic))) {
      onScroll(axis === "x" ? container.scrollLeft : container.scrollTop);
    }
  });

  container.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      suppressScroll = false;
      if (axis === "x") {
        container.scrollLeft += event.deltaY || event.deltaX;
      } else {
        container.scrollTop += event.deltaY || event.deltaX;
      }
    },
    { passive: false }
  );

  let pointerDown = false;
  let startPos = 0;
  let startScroll = 0;
  let dragged = false;
  let startTarget = null;

  const endDrag = () => {
    if (!pointerDown) return;
    pointerDown = false;
    container.classList.remove("dragging");
    if (dragged) {
      container.dataset.dragging = "true";
      setTimeout(() => {
        container.dataset.dragging = "false";
      }, 0);
    }
    dragged = false;
    startTarget = null;
  };

  container.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") return;
    if (event.button !== 0) return;
    suppressScroll = false;
    pointerDown = true;
    dragged = false;
    container.classList.add("dragging");
    startPos = axis === "x" ? event.clientX : event.clientY;
    startScroll = axis === "x" ? container.scrollLeft : container.scrollTop;
    startTarget = event.target.closest(".wheel-item");
  });

  container.addEventListener("pointermove", (event) => {
    if (!pointerDown) return;
    const currentPos = axis === "x" ? event.clientX : event.clientY;
    const delta = currentPos - startPos;
    if (Math.abs(delta) > 4) {
      dragged = true;
    }
    if (axis === "x") {
      container.scrollLeft = startScroll - delta;
    } else {
      container.scrollTop = startScroll - delta;
    }
  });

  container.addEventListener("pointerup", (event) => {
    if (pointerDown && !dragged) {
      const target = event.target.closest(".wheel-item") || startTarget;
      if (target) {
        const idToFocus = target.dataset.id;
        container.dataset.focus = idToFocus;
        onFocus?.(idToFocus);
        onSelect?.(idToFocus);
        scrollToId(idToFocus, true);
      }
    }
    endDrag();
  });
  container.addEventListener("pointercancel", endDrag);

  container.addEventListener("touchstart", () => {
    suppressScroll = false;
  });

  items.forEach((item) => {
    if (axis === "x") {
      item.style.minWidth = `${itemWidth ?? 170}px`;
      item.style.height = "100%";
    } else {
      item.style.minHeight = `${rowHeight}px`;
    }
    item.addEventListener("click", () => {
      if (container.dataset.dragging === "true") {
        return;
      }
      const idToFocus = item.dataset.id;
      container.dataset.focus = idToFocus;
      onFocus?.(idToFocus);
      onSelect?.(idToFocus);
      scrollToId(idToFocus, true);
      setTimeout(syncScroll, 0);
    });
  });

  const resizeObserver = new ResizeObserver(() => {
    updateStyles();
    scrollToId(container.dataset.focus || focusId, false);
  });

  resizeObserver.observe(container);

  updateStyles();
  if (typeof initialScroll === "number") {
    setProgrammatic(() => {
      if (axis === "x") {
        container.scrollLeft = initialScroll;
      } else {
        container.scrollTop = initialScroll;
      }
    });
  } else {
    setProgrammatic(() => {
      scrollToId(focusId, false);
    });
  }
  updateStyles();
  syncScroll();

  setTimeout(() => {
    suppressScroll = false;
  }, 200);
}

function computeTileSize(state) {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const horizontalPadding = 16;
  const tileSpacing = 8;
  const compact = screenHeight < 750;
  const shortLandscape = screenHeight < 650 && screenWidth > screenHeight;
  const titleHeight = compact ? 40 : 44;
  const messageHeight = compact ? 40 : 48;
  const keyboardRow = compact ? 38 : 44;
  const keyboardGap = compact ? 4 : 6;
  const keyboardHeight = 3 * keyboardRow + 3 * keyboardGap + keyboardRow;
  const bottomBarHeight = compact ? 54 : 60;
  const interSpacing = 12 * 3;
  const boardHeightBudget =
    screenHeight - (titleHeight + messageHeight + keyboardHeight + bottomBarHeight + interSpacing + 12 + 20);
  const wordLength = Math.max(state.wordLength, 1);
  const maxRows = Math.max(state.maxGuesses, 1);
  const widthAvailable = screenWidth - horizontalPadding * 2;
  const widthSpacing = tileSpacing * Math.max(wordLength - 1, 0);
  const heightSpacing = tileSpacing * Math.max(maxRows - 1, 0);
  const widthSize = (widthAvailable - widthSpacing) / wordLength;
  const heightSize = (boardHeightBudget - heightSpacing) / maxRows;
  const isTabletPortrait = screenWidth >= 700 && screenHeight > screenWidth;
  const maxTile = isTabletPortrait ? 82 : (shortLandscape ? 58 : 68);
  const minTile = isTabletPortrait ? 36 : (shortLandscape ? 28 : 32);
  return Math.min(maxTile, Math.max(minTile, Math.min(widthSize, heightSize)));
}

function isTouchDevice() {
  return typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0;
}

function interpolateColor(from, to, factor) {
  const clamp = (value) => Math.min(Math.max(value, 0), 1);
  const f = clamp(factor);
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  if (!fromRgb || !toRgb) return from;
  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * f);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * f);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const value = Number.parseInt(cleaned, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}
