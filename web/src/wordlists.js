import { BlockedAnswers, FallbackWordsByMode, GameModes } from "./constants.js";

export async function loadWordLists(modeId, baseUrl) {
  const mode = GameModes.find((item) => item.id === modeId);
  if (!mode) {
    return emptyLists(modeId);
  }

  const [guesses, answers] = await Promise.all([
    loadFile(mode.guessFile, mode.wordLength, baseUrl),
    loadFile(mode.answerFile, mode.wordLength, baseUrl),
  ]);

  const fallback = FallbackWordsByMode[modeId] ?? [];
  const wordList = (guesses.length ? guesses : fallback).filter((word) => !BlockedAnswers.has(word));
  const answerList = (answers.length ? answers : fallback).filter((word) => !BlockedAnswers.has(word));
  const wordSet = new Set([...wordList, ...answerList]);
  return { wordList, answerList, wordSet };
}

async function loadFile(name, length, baseUrl) {
  const url = `${baseUrl}wordlist/${name}.txt`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const text = await response.text();
    return text
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length === length && /^[a-z]+$/.test(word));
  } catch (error) {
    return [];
  }
}

function emptyLists(modeId) {
  const fallback = FallbackWordsByMode[modeId] ?? [];
  const wordSet = new Set(fallback);
  return { wordList: fallback, answerList: fallback, wordSet };
}
