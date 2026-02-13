const historyKey = "history_entries_json";
const randomSeedKey = "random_seed";
const modeKey = "current_mode";

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

export { storage };
