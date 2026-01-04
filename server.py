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
WORDLIST_FILE = ROOT / "wordlist" / "clean_five_letter_words.txt"

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


def has_standard_vowel(word: str) -> bool:
    return any(ch in VOWELS for ch in word)


def is_allowed_word(word: str) -> bool:
    if len(word) != 5 or not word.isalpha() or not has_standard_vowel(word):
        return False
    if word.endswith("s") and not word.endswith("ss"):
        return False
    return True


def score_word(word: str) -> float:
    uniques = set(word)
    duplicate_penalty = (len(word) - len(uniques)) * 2.0
    return sum(LETTER_FREQUENCY.get(ch, 0.0) for ch in uniques) - duplicate_penalty


def load_five_letter_words() -> List[str]:
    """Load 5-letter alphabetic words, preferring a curated list if present.

    Falls back to filtered system dictionaries, then to a short in-repo list.
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
                    if is_allowed_word(word):
                        words.add(word)
        except OSError:
            return set()
        if words:
            print(f"Loaded {len(words)} five-letter words from {label}.")
        return words

    if WORDLIST_FILE.exists():
        curated = load_file(WORDLIST_FILE, WORDLIST_FILE.name)
        if curated:
            curated = curated - banned_words
            print(f"Using curated list at {WORDLIST_FILE} (filtered for vowels/banned terms: {len(curated)} words).")
            return sorted(curated)

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

    if candidates:
        filtered = sorted(c for c in candidates if c not in banned_words)
        print(f"Using filtered system dictionaries: {len(filtered)} words (excluding banned terms).")
        return filtered

    print("Using fallback word list (system dictionaries not available).")
    return FALLBACK_WORDS


WORD_LIST: List[str] = load_five_letter_words()
WORD_SET: Set[str] = set(WORD_LIST)
ANSWER_LIST: List[str] = [
    word
    for word in WORD_LIST
    if has_standard_vowel(word)
    and not any(dbl in word for dbl in RARE_DOUBLES)
    and len(set(word)) >= 4
]
if not ANSWER_LIST:
    ANSWER_LIST = WORD_LIST
else:
    ANSWER_LIST = sorted(ANSWER_LIST, key=score_word, reverse=True)[:ANSWER_POOL_SIZE]


class GameState:
    def __init__(self, answer: str, max_guesses: int = 6) -> None:
        self.id = str(uuid.uuid4())
        self.answer = answer
        self.max_guesses = max_guesses
        self.guesses: List[Dict[str, object]] = []
        self.status = "in_progress"

    def to_response(self) -> Dict[str, object]:
        response = {
            "id": self.id,
            "status": self.status,
            "maxGuesses": self.max_guesses,
            "guesses": self.guesses,
        }
        if self.status != "in_progress":
            response["answer"] = self.answer
        return response

    def apply_guess(self, guess: str) -> Dict[str, object]:
        guess = guess.lower().strip()
        if self.status != "in_progress":
            raise ValueError("Game is already finished. Start a new game.")
        if len(guess) != 5 or not guess.isalpha():
            raise ValueError("Guesses must be exactly five letters.")
        if guess not in WORD_SET:
            raise ValueError("Guess must be a valid word from the list.")

        result = self._score_guess(guess)
        self.guesses.append({"word": guess, "result": result})

        if guess == self.answer:
            self.status = "won"
        elif len(self.guesses) >= self.max_guesses:
            self.status = "lost"

        return self.to_response()

    def _score_guess(self, guess: str) -> List[str]:
        verdicts = ["absent"] * 5
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


def pick_word() -> str:
    return random.choice(ANSWER_LIST)


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
        game = GameState(pick_word())
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
