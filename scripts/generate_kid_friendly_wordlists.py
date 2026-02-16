#!/usr/bin/env python3
"""Generate kid-friendly Wordle word lists for lengths 3/4/5/6.

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
import shutil
import argparse
import csv
import io
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "wordlist"
WORD_LENGTHS = (3, 4, 5, 6)
WEB_WORDLIST_DIR = ROOT / "web" / "public" / "wordlist"
IOS_WORDLIST_DIR = ROOT / "ios" / "Wordle" / "Wordle" / "Resources"
SYNC_TARGETS = (WEB_WORDLIST_DIR, IOS_WORDLIST_DIR)

SOURCES = {
    "dwyl": "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
    "enable1": "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt",
    "freq": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt",
    "profanity_ldnoobw": "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en",
    "profanity_zacanger": "https://raw.githubusercontent.com/zacanger/profane-words/master/words.json",
    "names_first": "https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt",
    "names_all": "https://raw.githubusercontent.com/dominictarr/random-name/master/names.txt",
    "cloudbytes_csv": "https://raw.githubusercontent.com/CloudBytes-Academy/English-Dictionary-Open-Source/main/csv/dictionary.csv",
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

# Answer-only filters for short, kid-friendly words.
ANSWER_INTERJECTIONS = {
    "agh", "ahh", "ahem", "ahhh", "argh", "blah", "boo", "beep", "erm", "mmm", "nah", "ohh", "ohhh", "oooh",
    "psst", "shh", "shhh", "ugh", "uhh", "umm", "unh", "wow", "yah", "yay", "yep", "yea",
}

ANSWER_NONLEXICAL = {
    "aii", "iii",
}

ANSWER_ABBREVIATIONS = {
    "asap", "ceo", "etc", "iot", "mrs", "sec", "seo", "pro", "sub", "cctv",
}

ANSWER_FOREIGN = {
    "aye", "bon", "eun", "oui", "que", "raj", "jai", "jin", "tae", "rio", "san",
    "bien", "ciao", "casa", "bhai", "feng",
}

ANSWER_COLLOQUIAL = {
    "aye", "nah", "yah", "yea", "yep", "dawg", "dude", "dope", "dork", "bout",
}

ANSWER_FRAGMENTS = {
    "isn", "til", "wha", "tha", "aren", "cant", "dont", "didn", "doin", "areyou", "couldn", "wouldn",
}

ANSWER_NAMES = {
    "jax", "lex", "rio", "raj", "jin", "jai", "tae",
}

ANSWER_AMBIGUOUS = {
    "pub", "bra", "bro", "spa",
}

ANSWER_SENSITIVE = {
    # bodily functions / insults / violence / substances
    "bomb", "bums", "cult", "dead", "doom", "dumb", "dung", "fart", "feds", "guns", "hate", "kill", "poop", "puke",
    "abused", "addict", "badass", "battle", "bloods", "bloody", "bodies", "corpse", "damned", "drunks", "killer",
    "morons", "murder", "poison", "pooped", "stupid", "terror", "weapon",
}

ANSWER_MANUAL_BLOCK = {
    # 3-letter manual removals
    "ain", "die", "doc", "doo", "med", "non", "pee", "sin", "yen",
    # 4-letter manual removals
    "afar", "aahs", "ammo", "arab", "blog", "both", "choi", "cuba", "daft", "data", "demo", "disc", "disk", "dorm",
    "duct", "envy", "epic", "euro", "exam", "feet", "folk", "foul", "fury", "gang", "geez", "goin", "gosh", "guru",
    "had", "n", "hasn", "hari", "heil", "hell", "hiya", "hyah", "hyun", "iife", "iike", "info", "into", "iove",
    "iraq", "iowa", "jail", "jerk", "junk", "kang", "kitt", "lapd", "limo", "lire", "mein", "memo", "mold", "mutt",
    "mwah", "nder", "nope", "nypd", "oath", "ohio", "omen", "oppa", "oral", "perp", "peru", "phew", "posh", "prep",
    "prom", "punk", "quiz", "quid", "raja", "raju", "reno", "riot", "scam", "scum", "shan", "shot", "sire", "slay",
    "some", "stab", "thug", "thud", "thus", "ting", "tong", "toto", "turd", "unit", "upon", "user", "vain", "vent",
    "vega", "vibe", "void", "was", "whew", "whoo", "wimp", "with", "woof", "xiao", "yang", "yeah", "yeon", "ying",
    "yoon", "yuck", "yuki", "yuan", "zhao", "zoey",
    # 6-letter manual removals
    "abduct", "accuse", "aditya", "afghan", "alaska", "albany", "alvaro", "amazon", "ambush", "annika", "arabia",
    "arabic", "arctic", "armani", "armory", "armpit", "arouse", "arkady", "attack", "attila", "auggie", "avenge",
    "bandit", "banish", "barack", "barbed", "bashir", "baltic", "beirut", "bengal", "betcha", "bieber", "biggie",
    "bikini", "blimey", "bodily", "bojack", "bombay", "bombed", "bomber", "borgia", "bosnia", "boston", "brando",
    "brazil", "bullet", "cahill", "callen", "callin", "canton", "carnal", "cartel", "cayman", "chandi", "chandu",
    "chanel", "charly", "chopin", "christ", "climax", "cognac", "combat", "corset", "cortez", "crotch", "crusoe",
    "cursed", "daimon", "dakota", "dancin", "dagger", "danube", "darlin", "deadly", "deepak", "defeat", "denzel",
    "detain", "dharma", "diablo", "diaper", "disarm", "disney", "dosage", "dooley", "donner", "drivin", "duress",
    "dunbar", "eiffel", "eureka", "europe", "fallin", "farnon", "farted", "fawlty", "feelin", "felony", "filthy",
    "figaro", "forbid", "forged", "forman", "forthe", "foryou", "franco", "fresno", "fuhrer", "gandhi", "ganesh",
    "gaulle", "geisha", "ghetto", "gettin", "google", "gotcha", "gotham", "grammy", "greece", "guinea", "guilty",
    "gunman", "gunmen", "gunned", "hahaha", "hangin", "harass", "harlot", "hatred", "havana", "hawaii", "hearst",
    "hefner", "hernia", "hikaru", "hitman", "hitomi", "holdin", "holdup", "hooray", "hurrah", "hurray", "hottie",
    "iittle", "indian", "injure", "injury", "inmate", "invade", "jailed", "jailer", "jagger", "jawohl", "jekyll",
    "jewish", "jonesy", "joseon", "julien", "jumong", "kaylie", "keaton", "keepin", "keisha", "kepler",
    "kerala", "kidnap", "kiddin", "killed", "killin", "kimchi", "kimono", "kisser", "kickin", "kraang", "krusty",
    "kosovo", "kuwait", "leavin", "lethal", "liquor", "lisbon", "lookie", "lookin", "lookit", "louvre", "luthor",
    "madrid", "maggot", "makoto", "malibu", "manila", "mannix", "manure", "marple", "martyr", "messin", "mexico",
    "morbid", "mormon", "morgue", "mornin", "mortar", "mosque", "mossad", "mstoll", "mulder", "mumbai", "munich",
    "musket", "muzzle", "naruto", "nassau", "neelix", "newark", "nikhil", "noriko", "nothin", "norway", "occult",
    "oregon", "ortega", "oughta", "pacino", "pawnee", "peeing", "peking", "pelvic", "perish", "persia", "petrov",
    "phaser", "picard", "pilate", "pimple", "pirate", "pistol", "plague", "playin", "poirot", "popeye", "prague",
    "pratap", "prenup", "prison", "probst", "psycho", "puerto", "punish", "punjab", "puking", "pusher", "puttin",
    "quebec", "racism", "racist", "rajesh", "ramesh", "ramiro", "rashid", "raylan", "reno", "renoir", "revoir",
    "righto", "righty", "ritual", "robbed", "robber", "rockin", "romero", "rommel", "rommie", "roxton", "runnin",
    "rupaul", "saigon", "sachin", "saddam", "sakura", "salaam", "sameer", "sasaki", "saturn", "scotch", "scooby",
    "senora", "sensei", "serbia", "sergey", "sewage", "shakin", "sheikh", "sicily", "singin", "sinbad", "sittin",
    "slayer", "sleazy", "smoked", "smoker", "smokey", "smokin", "sniper", "snitch", "soviet", "spleen",
    "stalin", "stayin", "stewie", "stolen", "strike", "struck", "suarez", "summat", "sultan", "sunbae", "sutter",
    "suzuki", "sweden", "syrian", "takeda", "takumi", "taelon", "tahiti", "taipei", "taiwan", "talkin", "tampon",
    "tehran", "tellin", "threat", "thrash", "tigger", "tinkle", "tintin", "tissue", "toledo", "toilet",
    "topher", "toyota", "trauma", "tucson", "tycoon", "tyrant", "uganda", "undead", "unholy", "verona", "vienna",
    "viktor", "vikram", "victim", "vishal", "vishnu", "voight", "vulcan", "vulgar", "warsaw", "waitin",
    "weirdo", "weller", "whisky", "whoosh", "woulda", "workin", "xander", "yakuza", "yamada", "yamato", "yippee",
    "zodiac", "zombie", "zordon", "zurich",
    "booger", "breast", "coulda", "hijack", "hobson", "moreau", "ofyour",
}

ANSWER_BLOCK = (
    ANSWER_INTERJECTIONS
    | ANSWER_NONLEXICAL
    | ANSWER_ABBREVIATIONS
    | ANSWER_FOREIGN
    | ANSWER_COLLOQUIAL
    | ANSWER_FRAGMENTS
    | ANSWER_NAMES
    | ANSWER_AMBIGUOUS
    | ANSWER_SENSITIVE
    | ANSWER_MANUAL_BLOCK
)

# Words that end with "s" but are not plural forms.
NON_PLURAL_S = {
    "as", "is", "was", "his", "its", "this", "thus", "us", "yes", "gas", "bus",
}
SAFE_RE = re.compile(r"^[a-z]+$")


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


def parse_csv_words(blob: str, word_column: str = "word") -> set[str]:
    words: set[str] = set()
    reader = csv.DictReader(io.StringIO(blob))
    for row in reader:
        word = (row.get(word_column) or "").strip().lower()
        if SAFE_RE.fullmatch(word):
            words.add(word)
    return words


def is_kid_safe_candidate(word: str, blocked: set[str], names: set[str], *, exclude_names: bool = True) -> bool:
    if word in blocked:
        return False
    if exclude_names and word in names:
        return False
    if word in ARCHAIC or word in ABBREVIATIONS or word in INTERJECTIONS:
        return False
    if word.endswith("eth") or word.endswith("est"):
        return False
    return True


def is_kid_friendly_answer(word: str) -> bool:
    if word in ANSWER_BLOCK:
        return False
    # Reject non-lexical patterns commonly seen in short interjections.
    if not re.search(r"[aeiouy]", word):
        return False
    if re.search(r"(.)\\1\\1", word):
        return False
    # Remove plural/3rd-person forms ending in "s" for kid-friendly answers.
    if word.endswith("s") and not word.endswith("ss") and word not in NON_PLURAL_S:
        return False
    return True


def load_url(url: str) -> str | None:
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            return response.read().decode("utf-8", errors="ignore")
    except Exception as exc:  # noqa: BLE001
        print(f"warn: could not fetch {url} ({exc})")
        return None


def parse_word_file(path: Path) -> set[str]:
    try:
        return parse_word_lines(path.read_text(encoding="utf-8", errors="ignore"))
    except FileNotFoundError:
        return set()


def allowed_file_name(prefix: str, length: int) -> str:
    return f"{prefix}.txt" if length == 5 else f"{prefix}-{length}.txt"


def load_remote_word_sources() -> tuple[set[str], set[str], dict[str, int], set[str], set[str]]:
    print("Loading remote sources...")
    dwyl_blob = load_url(SOURCES["dwyl"])
    enable1_blob = load_url(SOURCES["enable1"])
    freq_blob = load_url(SOURCES["freq"])
    prof_blob = load_url(SOURCES["profanity_ldnoobw"])
    prof_json_blob = load_url(SOURCES["profanity_zacanger"])
    names_first_blob = load_url(SOURCES["names_first"])
    names_all_blob = load_url(SOURCES["names_all"])

    dwyl = parse_word_lines(dwyl_blob or "")
    enable1 = parse_word_lines(enable1_blob or "")
    freq_rank = parse_freq(freq_blob or "")

    profanity = parse_word_lines(prof_blob or "")
    if prof_json_blob:
        profanity |= parse_json_words(prof_json_blob)

    names = parse_word_lines(names_first_blob or "")
    names |= parse_word_lines(names_all_blob or "")

    return dwyl, enable1, freq_rank, profanity, names


def load_local_sources(lengths: tuple[int, ...]) -> set[str]:
    print("Loading local sources...")
    local_sources: set[str] = set()
    local_paths = (
        Path("/usr/share/dict/words"),
        Path("/usr/share/dict/web2"),
        Path("/usr/share/dict/web2a"),
        OUT_DIR / "clean_five_letter_words.txt",
    )
    for path in local_paths:
        local_sources |= parse_word_file(path)

    if OUT_DIR.exists():
        for txt_path in OUT_DIR.glob("*.txt"):
            local_sources |= parse_word_file(txt_path)

    return {w for w in local_sources if len(w) in lengths}


def generate_guesses(
    all_candidates: set[str],
    lengths: tuple[int, ...],
    blocked: set[str],
    names: set[str],
) -> dict[int, set[str]]:
    guess_map: dict[int, set[str]] = {}
    for length in lengths:
        guesses = {
            word
            for word in all_candidates
            if len(word) == length and is_kid_safe_candidate(word, blocked, names, exclude_names=False)
        }
        guess_map[length] = guesses
    return guess_map


def load_head_words(path: Path) -> set[str]:
    rel_path = path.relative_to(ROOT).as_posix()
    try:
        blob = subprocess.check_output(
            ["git", "show", f"HEAD:{rel_path}"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return parse_word_lines(blob)
    except Exception:  # noqa: BLE001
        return parse_word_file(path)


def load_head_guesses(lengths: tuple[int, ...]) -> dict[int, set[str]]:
    guesses_by_length: dict[int, set[str]] = {}
    for length in lengths:
        path = OUT_DIR / allowed_file_name("allowed-guesses", length)
        guesses_by_length[length] = {w for w in load_head_words(path) if len(w) == length}
    return guesses_by_length


def load_existing_answers(length: int) -> set[str]:
    path = OUT_DIR / allowed_file_name("allowed-answers", length)
    return parse_word_file(path)


def regenerate_answers(
    guesses: set[str],
    freq_rank: dict[str, int],
    length: int,
) -> set[str]:
    answer_rank_threshold = {3: 8000, 4: 12000, 5: 18000, 6: 22000}
    threshold = answer_rank_threshold[length]
    answers = {
        word
        for word in guesses
        if word in freq_rank and freq_rank[word] <= threshold and is_kid_friendly_answer(word)
    }
    return answers & guesses


def write_word_file(path: Path, words: set[str]) -> None:
    path.write_text("\n".join(sorted(words)) + "\n", encoding="utf-8")


def sync_outputs(lengths: tuple[int, ...]) -> None:
    for target_dir in SYNC_TARGETS:
        target_dir.mkdir(parents=True, exist_ok=True)
        for length in lengths:
            guess_name = allowed_file_name("allowed-guesses", length)
            answer_name = allowed_file_name("allowed-answers", length)
            shutil.copy2(OUT_DIR / guess_name, target_dir / guess_name)
            shutil.copy2(OUT_DIR / answer_name, target_dir / answer_name)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate and sync kid-friendly Wordle word lists.")
    parser.add_argument(
        "--lengths",
        default="3,4,5,6",
        help="Comma-separated word lengths to process (default: 3,4,5,6).",
    )
    parser.add_argument(
        "--regenerate-answers",
        action="store_true",
        help="Regenerate answer lists (default: keep existing answers).",
    )
    parser.add_argument(
        "--no-sync",
        action="store_true",
        help="Do not sync outputs to web/iOS directories.",
    )
    parser.add_argument(
        "--merge-head-cloudbytes",
        action="store_true",
        help="Use HEAD allowed-guesses as baseline and add missing words from CloudBytes CSV by length.",
    )
    args = parser.parse_args()

    lengths = tuple(sorted({int(part.strip()) for part in args.lengths.split(",") if part.strip()}))
    if not lengths:
        raise ValueError("No lengths provided.")
    if any(length not in WORD_LENGTHS for length in lengths):
        raise ValueError(f"Supported lengths are: {WORD_LENGTHS}")
    if args.merge_head_cloudbytes and args.regenerate_answers:
        raise ValueError("--merge-head-cloudbytes cannot be combined with --regenerate-answers.")

    OUT_DIR.mkdir(exist_ok=True)

    freq_rank: dict[str, int] = {}
    if args.merge_head_cloudbytes:
        print("Merging HEAD allowed-guesses with CloudBytes CSV...")
        head_guesses = load_head_guesses(lengths)
        csv_blob = load_url(SOURCES["cloudbytes_csv"])
        if not csv_blob:
            raise RuntimeError("Failed to download CloudBytes CSV dictionary.")
        csv_words = parse_csv_words(csv_blob)
        guesses_by_length = {}
        for length in lengths:
            csv_for_length = {w for w in csv_words if len(w) == length}
            guesses_by_length[length] = head_guesses[length] | csv_for_length
    else:
        dwyl, enable1, freq_rank, remote_profanity, remote_names = load_remote_word_sources()
        local_words = load_local_sources(lengths)

        profanity = remote_profanity | CUSTOM_BLOCK
        names = remote_names | parse_word_file(Path("/usr/share/dict/propernames"))

        all_candidates = dwyl | enable1 | set(freq_rank.keys()) | local_words
        guesses_by_length = generate_guesses(all_candidates, lengths, profanity, names)

    for length in lengths:
        guesses = guesses_by_length[length]
        if args.regenerate_answers:
            answers = regenerate_answers(guesses, freq_rank, length)
        else:
            answers = load_existing_answers(length)

        # Keep legacy answers stable while guaranteeing answer validity.
        guesses |= answers

        guess_path = OUT_DIR / allowed_file_name("allowed-guesses", length)
        answer_path = OUT_DIR / allowed_file_name("allowed-answers", length)
        write_word_file(guess_path, guesses)
        write_word_file(answer_path, answers)
        print(f"{length}-letter -> guesses: {len(guesses):6d}, answers: {len(answers):6d}")

    if not args.no_sync:
        sync_outputs(lengths)
        print(f"Synced generated files to: {WEB_WORDLIST_DIR} and {IOS_WORDLIST_DIR}")


if __name__ == "__main__":
    main()
