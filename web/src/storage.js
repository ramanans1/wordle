const historyKey = "history_entries_json";
const randomSeedKey = "random_seed";
const modeKey = "current_mode";
const currentGameKeyPrefix = "current_game_";

const storage = {
  getHistory() {
    const raw = localStorage.getItem(historyKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (error) {
      return [];
    }
  },
  setHistory(history) {
    localStorage.setItem(historyKey, JSON.stringify(history));
  },
  getMode() {
    return localStorage.getItem(modeKey);
  },
  setMode(mode) {
    localStorage.setItem(modeKey, mode);
  },
  getSeed() {
    const raw = localStorage.getItem(randomSeedKey);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  },
  setSeed(seed) {
    localStorage.setItem(randomSeedKey, String(seed));
  },
  getCurrentGame(mode) {
    const raw = localStorage.getItem(currentGameKey(mode));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  },
  setCurrentGame(mode, game) {
    localStorage.setItem(currentGameKey(mode), JSON.stringify(game));
  },
  clearCurrentGame(mode) {
    localStorage.removeItem(currentGameKey(mode));
  },
  getAnswerIndex(mode) {
    const raw = localStorage.getItem(answerIndexKey(mode));
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  },
  setAnswerIndex(mode, index) {
    localStorage.setItem(answerIndexKey(mode), String(index));
  },
  clearAll() {
    localStorage.removeItem(historyKey);
    localStorage.removeItem(randomSeedKey);
    localStorage.removeItem(modeKey);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(currentGameKeyPrefix)) {
        localStorage.removeItem(key);
      }
    });
  },
  clearAnswerIndices(modes) {
    modes.forEach((mode) => {
      localStorage.removeItem(answerIndexKey(mode));
    });
  },
};

function answerIndexKey(mode) {
  return `answer_index_${mode}`;
}

function currentGameKey(mode) {
  return `${currentGameKeyPrefix}${mode}`;
}

export { storage };
