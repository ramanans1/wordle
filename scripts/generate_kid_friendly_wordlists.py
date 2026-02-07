#!/usr/bin/env python3
"""Generate kid-friendly Wordle word lists for lengths 3/4/6.

Sources (public GitHub raw files):
- dwyl english words
- enable1 dictionary (Scrabble-style)
- FrequencyWords english 50k
- LDNOOBW profanity list
- zacanger profane-words list
- dominictarr random-name lists (to remove proper names)
"""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "wordlist"

SOURCES = {
    "dwyl": "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
    "enable1": "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt",
    "freq": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt",
    "profanity_ldnoobw": "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en",
    "profanity_zacanger": "https://raw.githubusercontent.com/zacanger/profane-words/master/words.json",
    "names_first": "https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt",
    "names_all": "https://raw.githubusercontent.com/dominictarr/random-name/master/names.txt",
}

CUSTOM_BLOCK = {
    "sex", "sexy", "sext", "porno", "porn", "xxx", "nude", "nudes", "naked", "boob", "boobs", "penis", "vulva", "anus", "dildo",
    "fetish", "bdsm", "strip", "stripper", "whore", "slut", "sluts", "cunt", "cunts", "fuck", "fucks", "fucked", "fucking",
    "shit", "shits", "shitty", "bitch", "bitches", "bastard", "bastards", "dick", "dicks", "pussy", "twat", "twats", "wank", "wanks",
    # non kid-friendly topics / substances
    "gay", "gin", "rum", "beer", "booze", "vodka", "drunk", "drugs", "drug", "smoke", "cigar", "vape", "hookah",
}

# Common abbreviations/acronyms that may appear as lowercase tokens.
ABBREVIATIONS = {
    "fbi", "cia", "nsa", "dna", "rna", "usa", "uk", "eu", "un", "nato", "nasa", "gps", "cpu", "gpu", "api", "html",
    "http", "https", "sql", "tcp", "udp", "dvd", "cd", "tv", "sms", "mri", "ct", "faq", "diy",
}

INTERJECTIONS = {
    "aah", "aaah", "aaaah", "hah", "haha", "hee", "heh", "hmm", "huh", "hon", "hoo", "oh", "ooh", "uh", "um", "hah",
    "aha", "aw", "aww", "eh", "hm", "hmmm", "ha", "hee", "ho", "yo", "yow", "whoa", "woah",
}

ARCHAIC = {"thee", "thou", "thy", "hath", "doth", "shalt", "whilst", "unto", "ye", "art", "hast", "ere"}
SAFE_RE = re.compile(r"^[a-z]+$")


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read().decode("utf-8", errors="ignore")


def parse_word_lines(blob: str) -> set[str]:
    words: set[str] = set()
    for raw in blob.splitlines():
        word = raw.strip().lower()
        if SAFE_RE.fullmatch(word):
            words.add(word)
    return words


def parse_freq(blob: str) -> dict[str, int]:
    rank_by_word: dict[str, int] = {}
    rank = 0
    for raw in blob.splitlines():
        parts = raw.split()
        if not parts:
            continue
        word = parts[0].lower()
        if not SAFE_RE.fullmatch(word):
            continue
        rank += 1
        rank_by_word.setdefault(word, rank)
    return rank_by_word


def parse_json_words(blob: str) -> set[str]:
    payload = json.loads(blob)
    result = set()
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, str):
                word = item.strip().lower()
                if SAFE_RE.fullmatch(word):
                    result.add(word)
    return result


def is_kid_safe_candidate(word: str, blocked: set[str], names: set[str]) -> bool:
    if word in blocked or word in names:
        return False
    if word in ARCHAIC or word in ABBREVIATIONS or word in INTERJECTIONS:
        return False
    if word.endswith("eth") or word.endswith("est"):
        return False
    return True


def main() -> None:
    print("Downloading source lists...")
    dwyl = parse_word_lines(fetch(SOURCES["dwyl"]))
    enable1 = parse_word_lines(fetch(SOURCES["enable1"]))
    freq_rank = parse_freq(fetch(SOURCES["freq"]))
    profanity = parse_word_lines(fetch(SOURCES["profanity_ldnoobw"]))
    profanity |= parse_json_words(fetch(SOURCES["profanity_zacanger"]))
    profanity |= CUSTOM_BLOCK
    names = parse_word_lines(fetch(SOURCES["names_first"]))
    names |= parse_word_lines(fetch(SOURCES["names_all"]))

    all_candidates = dwyl | enable1 | set(freq_rank.keys())

    # Lower rank == more common.
    guess_rank_threshold = {3: 30000, 4: 40000, 6: 50000}
    answer_rank_threshold = {3: 8000, 4: 12000, 6: 22000}

    OUT_DIR.mkdir(exist_ok=True)

    for length in (3, 4, 6):
        base = [w for w in all_candidates if len(w) == length and is_kid_safe_candidate(w, profanity, names)]

        guesses = {
            w
            for w in base
            if (w in freq_rank and freq_rank[w] <= guess_rank_threshold[length]) or (w in dwyl and w in enable1)
        }

        answers = {
            w
            for w in guesses
            if w in freq_rank and freq_rank[w] <= answer_rank_threshold[length]
        }

        # safety: answers must be subset of guesses.
        answers &= guesses

        guess_path = OUT_DIR / f"allowed-guesses-{length}.txt"
        answer_path = OUT_DIR / f"allowed-answers-{length}.txt"
        guess_path.write_text("\n".join(sorted(guesses)) + "\n", encoding="utf-8")
        answer_path.write_text("\n".join(sorted(answers)) + "\n", encoding="utf-8")

        print(f"{length}-letter -> guesses: {len(guesses):5d}, answers: {len(answers):5d}")


if __name__ == "__main__":
    main()
