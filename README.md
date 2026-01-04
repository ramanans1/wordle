# Python Wordle

Simple Wordle clone served by a lightweight Python HTTP server with a static web UI. Use this to verify gameplay before moving on to Android work.

## Getting started

```bash
cd /Users/ramanan/git/wordle
python server.py
```

Then open http://localhost:8000 in a browser. The UI uses `/api/new-game` to start a session and `/api/guess` to submit guesses. Game state is kept in-memory per browser session via a cookie.

## Notes

- Six attempts to guess the five-letter answer. Colors match the classic Wordle rules: green = correct spot, yellow = present, gray = absent.
- On startup, `server.py` looks for `wordlist/clean_five_letter_words.txt` and uses it if present. A curated Wordle-style list is already included there. Otherwise it loads five-letter alphabetic words from system dictionaries under `/usr/share/dict/*` (e.g., `words`, `web2`), filters out a small banned set of obscene terms, and falls back to a short built-in list if needed.
- No external dependencies are required beyond the Python standard library.
