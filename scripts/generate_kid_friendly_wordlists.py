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
            if w in freq_rank
            and freq_rank[w] <= answer_rank_threshold[length]
            and is_kid_friendly_answer(w)
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
