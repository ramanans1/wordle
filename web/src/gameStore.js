import { BlockedAnswers, DefaultMode, FallbackWordsByMode, GameModes, GameStatus, LetterState } from "./constants.js";
import { storage } from "./storage.js";
import { shuffleWithSeed } from "./rng.js";
import { loadWordLists } from "./wordlists.js";
import { dateString } from "./dateUtils.js";

export function createGameStore(baseUrl) {
  const listeners = new Set();

  const store = {
    state: {
      ui: {
        isLoading: true,
        message: null,
        guesses: [],
        currentInput: "",
        status: GameStatus.inProgress,
        maxGuesses: 6,
        wordLength: 5,
      },
      history: [],
      currentMode: DefaultMode,
      route: "home",
      splashVisible: true,
    },
    wordList: [],
    answerList: [],
    wordSet: new Set(),
    answerSequence: [],
    answer: "",
    answerIndex: 0,
    randomSeed: 12345,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    notify() {
      listeners.forEach((listener) => listener(store.state));
    },

    async init() {
      store.loadPersistedState();
      await store.setMode(store.state.currentMode, { startGame: false });
      store.state.splashVisible = true;
      store.notify();
      setTimeout(() => {
        store.state.splashVisible = false;
        store.notify();
      }, 2000);
    },

    async setMode(modeId, { startGame = true } = {}) {
      const mode = GameModes.find((item) => item.id === modeId) ?? GameModes[0];
      store.state.currentMode = mode.id;
      storage.setMode(mode.id);
      store.state.ui.maxGuesses = mode.maxGuesses;
      store.state.ui.wordLength = mode.wordLength;
      store.answerIndex = storage.getAnswerIndex(mode.id);
      await store.loadWords();
      if (!startGame) {
        store.state.ui.message = null;
      }
      store.notify();
    },

    onKeyInput(letter) {
      if (store.state.ui.status !== GameStatus.inProgress) return;
      if (store.state.ui.currentInput.length >= store.state.ui.wordLength) return;
      store.state.ui.currentInput = (store.state.ui.currentInput + letter.toLowerCase()).slice(
        0,
        store.state.ui.wordLength
      );
      store.notify();
    },

    onDeleteInput() {
      if (store.state.ui.status !== GameStatus.inProgress) return;
      if (!store.state.ui.currentInput.length) return;
      if (store.state.ui.message === "Not in the word list.") {
        store.state.ui.message = null;
      }
      store.state.ui.currentInput = store.state.ui.currentInput.slice(0, -1);
      store.notify();
    },

    submitGuess() {
      const guess = store.state.ui.currentInput.toLowerCase();
      if (store.state.ui.status !== GameStatus.inProgress) {
        store.state.ui.message = "Start a new game.";
        store.notify();
        return;
      }
      if (guess.length !== store.state.ui.wordLength) {
        store.state.ui.message = `Enter a ${store.state.ui.wordLength}-letter word.`;
        store.notify();
        return;
      }
      if (!store.wordSet.has(guess)) {
        store.state.ui.message = "Not in the word list.";
        store.notify();
        return;
      }

      const results = scoreGuess(store.answer, guess, store.state.ui.wordLength);
      const updatedGuesses = [...store.state.ui.guesses, { word: guess, results }];

      let status = GameStatus.inProgress;
      if (guess === store.answer) {
        status = GameStatus.won;
      } else if (updatedGuesses.length >= store.state.ui.maxGuesses) {
        status = GameStatus.lost;
      }

      let message = "";
      if (status === GameStatus.won) {
        message = `You solved it! The word was ${store.answer.toUpperCase()}.`;
      } else if (status === GameStatus.lost) {
        message = `Out of guesses. The word was ${store.answer.toUpperCase()}.`;
      }

      store.state.ui.guesses = updatedGuesses;
      store.state.ui.status = status;
      store.state.ui.currentInput = "";
      store.state.ui.message = message;

      if (status !== GameStatus.inProgress) {
        const entry = createHistoryEntry(store.answer, status === GameStatus.won, updatedGuesses, store.state.currentMode);
        store.state.history = [entry, ...store.state.history];
        storage.setHistory(store.state.history);
      }

      store.notify();
    },

    startNewGame({ clearMessage = false } = {}) {
      const pool = store.answerSequence.length
        ? store.answerSequence
        : FallbackWordsByMode[store.state.currentMode] ?? [];

      if (pool.length) {
        store.answerIndex = store.answerIndex % pool.length;
        store.answer = pool[store.answerIndex];
        store.answerIndex = (store.answerIndex + 1) % pool.length;
        storage.setAnswerIndex(store.state.currentMode, store.answerIndex);
      } else {
        const fallback = FallbackWordsByMode[store.state.currentMode] ?? ["apple"];
        store.answer = fallback[Math.floor(Math.random() * fallback.length)];
      }

      store.state.ui.guesses = [];
      store.state.ui.status = GameStatus.inProgress;
      store.state.ui.currentInput = "";
      store.state.ui.message = clearMessage ? null : "New game started.";
      store.notify();
    },

    fullReset() {
      store.state.history = [];
      storage.setHistory([]);
      store.randomSeed = Date.now();
      storage.setSeed(store.randomSeed);
      store.answerIndex = 0;
      storage.clearAnswerIndices(GameModes.map((mode) => mode.id));
      store.answerSequence = store.shuffledAnswers();
      store.startNewGame({ clearMessage: true });
      store.state.ui.message = "Fully reset!";
      store.notify();
    },

    computeLetterStates() {
      const result = {};
      store.state.ui.guesses.forEach((guess) => {
        [...guess.word].forEach((char, idx) => {
          const current = result[char] ?? LetterState.unused;
          const next = guess.results[idx] ?? LetterState.unused;
          if (next > current) {
            result[char] = next;
          }
        });
      });
      return result;
    },

    loadPersistedState() {
      const storedMode = storage.getMode();
      store.state.currentMode = GameModes.some((mode) => mode.id === storedMode)
        ? storedMode
        : DefaultMode;
      store.answerIndex = storage.getAnswerIndex(store.state.currentMode);
      const persistedSeed = storage.getSeed();
      store.randomSeed = persistedSeed === 0 ? 12345 : persistedSeed;
      const history = storage.getHistory();
      store.state.history = history
        .map((entry) => ({ ...entry, mode: entry.mode ?? "classic" }))
        .sort((a, b) => b.timestamp - a.timestamp);
    },

    async loadWords() {
      store.state.ui.isLoading = true;
      store.notify();
      const lists = await loadWordLists(store.state.currentMode, baseUrl);
      store.wordList = lists.wordList.filter((word) => !BlockedAnswers.has(word));
      store.answerList = lists.answerList.filter((word) => !BlockedAnswers.has(word));
      store.wordSet = lists.wordSet;
      store.answerSequence = store.shuffledAnswers();
      if (store.answerSequence.length) {
        store.answerIndex = store.answerIndex % store.answerSequence.length;
      }
      store.startNewGame({ clearMessage: true });
      store.state.ui.isLoading = false;
      store.notify();
    },

    shuffledAnswers() {
      const fallback = FallbackWordsByMode[store.state.currentMode] ?? [];
      const source = store.answerList.length ? store.answerList : fallback;
      return shuffleWithSeed(source, store.randomSeed);
    },
  };

  return store;
}

function scoreGuess(answer, guess, wordLength) {
  const verdicts = Array.from({ length: wordLength }, () => LetterState.absent);
  const remaining = {};

  [...answer].forEach((char) => {
    remaining[char] = (remaining[char] ?? 0) + 1;
  });

  for (let idx = 0; idx < wordLength; idx += 1) {
    const ans = answer[idx];
    const g = guess[idx];
    if (ans === g) {
      verdicts[idx] = LetterState.correct;
      remaining[g] = (remaining[g] ?? 0) - 1;
    }
  }

  for (let idx = 0; idx < wordLength; idx += 1) {
    if (verdicts[idx] === LetterState.correct) continue;
    const g = guess[idx];
    if ((remaining[g] ?? 0) > 0) {
      verdicts[idx] = LetterState.present;
      remaining[g] = (remaining[g] ?? 0) - 1;
    }
  }

  return verdicts;
}

function createHistoryEntry(answer, won, guesses, mode) {
  const timestamp = Date.now();
  return {
    timestamp,
    answer,
    won,
    guesses: guesses.map((guess) => guess.word),
    mode,
    dateString: dateString(new Date(timestamp)),
  };
}
