export const Colors = {
  correct: "#22C55E",
  present: "#F59E0B",
  absent: "#1F2937",
  unused: "#111827",
  danger: "#EF4444",
  highlight: "#38BDF8",
  ink: "#0F172A",
  white: "#FFFFFF",
  gray: "#9CA3AF",
};

export const GameModes = [
  {
    id: "mini",
    label: "Pupil",
    wordLength: 3,
    maxGuesses: 5,
    answerFile: "allowed-answers-3",
    guessFile: "allowed-guesses-3",
  },
  {
    id: "junior",
    label: "Scribe",
    wordLength: 4,
    maxGuesses: 6,
    answerFile: "allowed-answers-4",
    guessFile: "allowed-guesses-4",
  },
  {
    id: "classic",
    label: "Author",
    wordLength: 5,
    maxGuesses: 6,
    answerFile: "allowed-answers",
    guessFile: "allowed-guesses",
  },
  {
    id: "epic",
    label: "Wordsmith",
    wordLength: 6,
    maxGuesses: 7,
    answerFile: "allowed-answers-6",
    guessFile: "allowed-guesses-6",
  },
];

export const DefaultMode = "mini";

export const BlockedAnswers = new Set([
  "abuse","abort","adult","arson","bigot","blood","bosom","booze","boozy","bribe",
  "butch","crime","death","detox","drink","drunk","dummy","felon","fraud","gipsy",
  "heist","idiot","kinky","knife","loser","lynch","moron","rifle","smoke","smoky","thief",
  "toxic","toxin","venom","vomit",
]);

export const FallbackWordsByMode = {
  mini: ["cat", "dog", "sun", "hat", "bag", "cup", "toy", "pig", "ice", "jam"],
  junior: ["play", "rain", "cake", "book", "kite", "fish", "snow", "milk", "gold", "star"],
  classic: ["apple", "baker", "cabin", "delta", "eagle", "fancy", "giant", "habit", "ideal", "joker", "lemon", "magic"],
  epic: ["planet", "bright", "forest", "castle", "silver", "charge", "stream", "wander", "rocket", "little"],
};

export const LetterState = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

export const GameStatus = {
  inProgress: "inProgress",
  won: "won",
  lost: "lost",
};

export const Routes = {
  home: "home",
  game: "game",
  history: "history",
  stats: "stats",
  about: "about",
  howToPlay: "howToPlay",
};
