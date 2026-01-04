let state = null;

const guessInput = document.getElementById("guess-input");
const submitButton = document.getElementById("submit-guess");
const newGameButton = document.getElementById("new-game");
const boardEl = document.getElementById("board");
const keyboardEl = document.getElementById("keyboard");
const messageEl = document.getElementById("message");

const keyboardRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

async function init() {
  attachEvents();
  await ensureGame();
  guessInput.focus();
}

function attachEvents() {
  submitButton.addEventListener("click", submitGuess);
  newGameButton.addEventListener("click", startNewGame);
  guessInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      submitGuess();
    }
  });
}

async function ensureGame() {
  try {
    const res = await fetch("/api/state");
    if (res.ok) {
      state = await res.json();
      render();
      return;
    }
    if (res.status === 404) {
      await startNewGame();
      return;
    }
    throw new Error("Unable to load game");
  } catch (err) {
    setMessage(err.message || "Failed to reach server", true);
  }
}

async function startNewGame() {
  try {
    const res = await fetch("/api/new-game", { method: "POST" });
    state = await res.json();
    setMessage("New game started. Good luck!");
    render();
    guessInput.value = "";
    guessInput.focus();
  } catch (err) {
    setMessage("Could not start a new game.", true);
  }
}

async function submitGuess() {
  if (!state || state.status !== "in_progress") {
    setMessage("Game over. Start a new game.", true);
    return;
  }

  const guess = guessInput.value.trim();
  if (!guess) {
    setMessage("Enter a five-letter word.", true);
    return;
  }

  try {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Invalid guess.", true);
      return;
    }
    state = data;
    guessInput.value = "";
    render();
  } catch (err) {
    setMessage("Failed to submit guess.", true);
  }
}

function render() {
  if (!state) return;
  boardEl.innerHTML = "";
  keyboardEl.innerHTML = "";

  const rows = state.maxGuesses;
  for (let i = 0; i < rows; i++) {
    const row = document.createElement("div");
    row.className = "board-row";
    const guess = state.guesses[i];
    if (guess) {
      for (let j = 0; j < 5; j++) {
        const tile = document.createElement("div");
        tile.className = `tile ${guess.result[j]}`;
        tile.textContent = guess.word[j].toUpperCase();
        row.appendChild(tile);
      }
    } else {
      for (let j = 0; j < 5; j++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.textContent = "";
        row.appendChild(tile);
      }
    }
    boardEl.appendChild(row);
  }

  renderKeyboard(state.guesses);

  if (state.status === "won") {
    setMessage("You solved it! The word was " + state.answer.toUpperCase());
  } else if (state.status === "lost") {
    setMessage("Out of guesses. The word was " + state.answer.toUpperCase(), true);
  } else {
    setMessage("");
  }
}

function renderKeyboard(guesses) {
  const states = computeLetterStates(guesses);
  keyboardRows.forEach((rowLetters) => {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";
    rowLetters.split("").forEach((letter) => {
      const keyEl = document.createElement("div");
      const state = states[letter] || "unused";
      keyEl.className = `key ${state}`;
      keyEl.textContent = letter.toUpperCase();
      rowEl.appendChild(keyEl);
    });
    keyboardEl.appendChild(rowEl);
  });
}

function computeLetterStates(guesses) {
  const priority = { unused: 0, absent: 1, present: 2, correct: 3 };
  const result = {};

  guesses.forEach((guess) => {
    guess.word.split("").forEach((letter, idx) => {
      const verdict = guess.result[idx];
      const state = verdict === "present" || verdict === "correct" ? "present" : verdict; // treat both as green
      const current = result[letter] || "unused";
      if (priority[state] > priority[current]) {
        result[letter] = state;
      }
    });
  });

  return result;
}

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#f87171" : "var(--accent)";
}

init();
