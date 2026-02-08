import json
import random
import sys
import uuid
from collections import Counter
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List, Optional, Set
import urllib.parse


ROOT = Path(__file__).parent.resolve()
STATIC_DIR = ROOT / "static"
WORDLIST_DIR = ROOT / "wordlist"

FALLBACK_WORDS = [
    "apple",
    "baker",
    "cabin",
    "delta",
    "eagle",
    "fancy",
    "giant",
    "habit",
    "ideal",
    "joker",
    "kayak",
    "lemon",
    "magic",
    "nacho",
    "ocean",
    "paint",
    "queen",
    "rally",
    "salad",
    "tango",
    "ultra",
    "vivid",
    "whale",
    "xenon",
    "yacht",
    "zesty",
    "adobe",
    "brave",
    "cider",
    "dairy",
    "earth",
    "flame",
    "grape",
    "honor",
    "input",
    "jelly",
    "kings",
    "linen",
    "mimic",
    "noble",
    "otter",
    "prism",
    "quilt",
    "rider",
    "spice",
    "tempo",
    "udder",
    "vigor",
    "waltz",
    "xylem",
    "young",
    "zebra",
]

VOWELS = set("aeiou")
RARE_DOUBLES = ("zz", "xx", "qq", "yy", "jj", "ww")
LETTER_FREQUENCY = {
    "e": 12.0,
    "t": 9.1,
    "a": 8.1,
    "o": 7.7,
    "i": 7.3,
    "n": 7.0,
    "s": 6.3,
    "r": 6.0,
    "h": 5.9,
    "l": 4.0,
    "d": 3.8,
    "c": 2.7,
    "u": 2.7,
    "m": 2.5,
    "w": 2.4,
    "f": 2.2,
    "g": 2.0,
    "y": 2.0,
    "p": 1.8,
    "b": 1.5,
    "v": 1.1,
    "k": 0.7,
    "j": 0.1,
    "x": 0.1,
    "q": 0.1,
    "z": 0.1,
}
ANSWER_POOL_SIZE = 3500
SUPPORTED_WORD_LENGTHS = (3, 4, 5, 6)


def has_standard_vowel(word: str) -> bool:
    return any(ch in VOWELS for ch in word)


def is_allowed_word(word: str, word_length: int) -> bool:
    if len(word) != word_length or not word.isalpha() or not has_standard_vowel(word):
        return False
    if word_length >= 5 and word.endswith("s") and not word.endswith("ss"):
        return False
    return True


def score_word(word: str) -> float:
    uniques = set(word)
    duplicate_penalty = (len(word) - len(uniques)) * 2.0
    return sum(LETTER_FREQUENCY.get(ch, 0.0) for ch in uniques) - duplicate_penalty


def load_words_for_length(word_length: int) -> Dict[str, List[str]]:
    """Load guess/answer lists for a specific word length.

    Prefers checked-in generated files and falls back to dictionary-based 5-letter words.
    """
    banned_words: Set[str] = {
        # Common obscene/profane/derogatory terms to keep out of gameplay.
        "abuse",
        "anus",
        "bitch",
        "boobs",
        "clits",
        "cocks",
        "cunts",
        "dicks",
        "dildo",
        "farts",
        "fuck",
        "fucks",
        "farts",
        "godam",
        "whore",
        "sluts",
        "slut",
        "titty",
        "twats",
        "pussy",
        "penis",
        "poops",
        "vulva",
    }

    def load_file(path: Path, label: str) -> Set[str]:
        words: Set[str] = set()
        try:
            with path.open("r", encoding="utf-8", errors="ignore") as handle:
                for line in handle:
                    word = line.strip().lower()
                    if is_allowed_word(word, word_length):
                        words.add(word)
        except OSError:
            return set()
        if words:
            print(f"Loaded {len(words)} {word_length}-letter words from {label}.")
        return words

    guess_file = WORDLIST_DIR / f"allowed-guesses-{word_length}.txt"
    answer_file = WORDLIST_DIR / f"allowed-answers-{word_length}.txt"

    # Preserve existing 5-letter list behavior; only generated lists are for 3/4/6.
    if word_length == 5:
        guess_file = WORDLIST_DIR / "allowed-guesses.txt"
        answer_file = WORDLIST_DIR / "allowed-answers.txt"

    guesses = load_file(guess_file, guess_file.name) if guess_file.exists() else set()
    answers = load_file(answer_file, answer_file.name) if answer_file.exists() else set()
    guesses -= banned_words
    answers -= banned_words

    if guesses and answers:
        if word_length == 5:
            # Legacy 5-letter lists intentionally keep a stricter answer list
            # plus a broader guess list; answers are not guaranteed to be in guesses.
            guesses = guesses.union(answers)
        else:
            answers = answers.intersection(guesses)
        print(
            f"Using generated word lists for {word_length}-letter games "
            f"({len(answers)} answers, {len(guesses)} guesses)."
        )
        return {"guesses": sorted(guesses), "answers": sorted(answers)}

    word_files = [
        Path("/usr/share/dict/words"),
        Path("/usr/share/dict/web2"),  # macOS supplemental word list
        Path("/usr/share/dict/web2a"),
        Path("/usr/share/dict/connectives"),
        Path("/usr/share/dict/propernames"),
    ]
    candidates: Set[str] = set()
    for path in word_files:
        if not path.exists():
            continue
        candidates.update(load_file(path, path.name))

    if candidates and word_length == 5:
        filtered = sorted(c for c in candidates if c not in banned_words)
        print(f"Using filtered system dictionaries: {len(filtered)} words (excluding banned terms).")
        scored_answers = [
            word
            for word in filtered
            if has_standard_vowel(word)
            and not any(dbl in word for dbl in RARE_DOUBLES)
            and len(set(word)) >= 4
        ]
        if not scored_answers:
            scored_answers = filtered
        else:
            scored_answers = sorted(scored_answers, key=score_word, reverse=True)[:ANSWER_POOL_SIZE]
        return {"guesses": filtered, "answers": scored_answers}

    if word_length == 5:
        print("Using fallback word list (system dictionaries not available).")
        return {"guesses": FALLBACK_WORDS, "answers": FALLBACK_WORDS}

    raise RuntimeError(f"No word lists found for {word_length}-letter mode.")


WORD_BANK: Dict[int, Dict[str, List[str]]] = {length: load_words_for_length(length) for length in SUPPORTED_WORD_LENGTHS}


class GameState:
    def __init__(self, answer: str, allowed_guesses: Set[str], word_length: int, max_guesses: int = 6) -> None:
        self.id = str(uuid.uuid4())
        self.answer = answer
        self.allowed_guesses = allowed_guesses
        self.word_length = word_length
        self.max_guesses = max_guesses
        self.guesses: List[Dict[str, object]] = []
        self.status = "in_progress"

    def to_response(self) -> Dict[str, object]:
        response = {
            "id": self.id,
            "status": self.status,
            "maxGuesses": self.max_guesses,
            "wordLength": self.word_length,
            "guesses": self.guesses,
        }
        if self.status != "in_progress":
            response["answer"] = self.answer
        return response

    def apply_guess(self, guess: str) -> Dict[str, object]:
        guess = guess.lower().strip()
        if self.status != "in_progress":
            raise ValueError("Game is already finished. Start a new game.")
        if len(guess) != self.word_length or not guess.isalpha():
            raise ValueError(f"Guesses must be exactly {self.word_length} letters.")
        if guess not in self.allowed_guesses:
            raise ValueError("Guess must be a valid word from the list.")

        result = self._score_guess(guess)
        self.guesses.append({"word": guess, "result": result})

        if guess == self.answer:
            self.status = "won"
        elif len(self.guesses) >= self.max_guesses:
            self.status = "lost"

        return self.to_response()

    def _score_guess(self, guess: str) -> List[str]:
        verdicts = ["absent"] * self.word_length
        remaining = Counter(self.answer)

        # First pass: mark correct positions.
        for idx, letter in enumerate(guess):
            if self.answer[idx] == letter:
                verdicts[idx] = "correct"
                remaining[letter] -= 1

        # Second pass: mark letters present elsewhere.
        for idx, letter in enumerate(guess):
            if verdicts[idx] == "correct":
                continue
            if remaining[letter] > 0:
                verdicts[idx] = "present"
                remaining[letter] -= 1

        return verdicts


GAMES: Dict[str, GameState] = {}


def pick_word(word_length: int) -> str:
    return random.choice(WORD_BANK[word_length]["answers"])


class WordleHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/state":
            self._handle_state()
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/new-game":
            self._handle_new_game()
            return
        if parsed.path == "/api/guess":
            self._handle_guess()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def _handle_state(self) -> None:
        game = self._get_game_from_cookie()
        if not game:
            self.send_error(HTTPStatus.NOT_FOUND, "No active game")
            return
        self._write_json(game.to_response())

    def _handle_new_game(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON body")
            return

        requested_length = payload.get("wordLength", 5)
        try:
            word_length = int(requested_length)
        except (TypeError, ValueError):
            self.send_error(HTTPStatus.BAD_REQUEST, "wordLength must be an integer")
            return
        if word_length not in SUPPORTED_WORD_LENGTHS:
            self.send_error(HTTPStatus.BAD_REQUEST, "Unsupported word length")
            return

        bank = WORD_BANK[word_length]
        game = GameState(
            answer=pick_word(word_length),
            allowed_guesses=set(bank["guesses"]),
            word_length=word_length,
        )
        GAMES[game.id] = game
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Set-Cookie", f"gameId={game.id}; Path=/")
        self.end_headers()
        self.wfile.write(json.dumps(game.to_response()).encode("utf-8"))

    def _handle_guess(self) -> None:
        game = self._get_game_from_cookie()
        if not game:
            self.send_error(HTTPStatus.NOT_FOUND, "No active game. Start a new one first.")
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON body")
            return

        guess = payload.get("guess", "")
        try:
            response = game.apply_guess(str(guess))
        except ValueError as exc:
            self._write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        self._write_json(response)

    def _get_game_from_cookie(self) -> Optional[GameState]:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return None
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        raw_id = cookie.get("gameId")
        if not raw_id:
            return None
        return GAMES.get(raw_id.value)

    def _write_json(self, payload: Dict[str, object], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args) -> None:
        sys.stdout.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))


def run(port: int = 8000) -> None:
    server_address = ("", port)
    httpd = ThreadingHTTPServer(server_address, WordleHandler)
    print(f"Wordle server running at http://localhost:{port}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    run()
