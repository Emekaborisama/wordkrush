"""
Vocabulary curation for Clueless.

The word list decides how the game feels. Too small and reasonable guesses
bounce off with "not in word list", which reads as the game being broken. Too
large and every puzzle's rank data balloons, since we ship a rank for every
word.

Source is a Google frequency list, so words are already ordered by how common
they are — we keep the head and filter out anything that would make a bad
guess or a bad answer.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

WORD_RE = re.compile(r"^[a-z]+$")

# Function words are semantically empty: embeddings place them nowhere useful,
# so they would produce nonsense ranks and can never be a satisfying answer.
STOPWORDS = {
    "the", "of", "and", "to", "a", "in", "is", "it", "you", "that", "he", "was",
    "for", "on", "are", "as", "with", "his", "they", "i", "at", "be", "this",
    "have", "from", "or", "one", "had", "by", "but", "not", "what", "all",
    "were", "we", "when", "your", "can", "said", "there", "use", "an", "each",
    "which", "she", "do", "how", "their", "if", "will", "up", "other", "about",
    "out", "many", "then", "them", "these", "so", "some", "her", "would",
    "make", "him", "into", "has", "more", "no", "way", "could", "my", "than",
    "been", "who", "its", "did", "get", "may", "am", "is", "as", "our", "us",
    "any", "very", "just", "only", "also", "such", "over", "most", "even",
    "much", "well", "where", "after", "back", "because", "through", "being",
    "before", "here", "why", "those", "same", "own", "while", "during",
}


@dataclass(frozen=True)
class VocabConfig:
    # Head of the frequency list. ~10k keeps per-puzzle rank data manageable
    # while still covering the words people actually reach for.
    size: int = 10_000
    min_length: int = 3
    max_length: int = 14


def curate(raw_words: list[str], config: VocabConfig = VocabConfig()) -> list[str]:
    """
    Filter a frequency-ordered word list down to playable vocabulary.

    Order is preserved: the result stays frequency-ordered, which later lets us
    pick answers from the common head while still accepting rarer guesses.
    """
    seen: set[str] = set()
    out: list[str] = []

    for raw in raw_words:
        word = raw.strip().lower()
        if not word or word in seen:
            continue
        # Letters only: digits, hyphens and apostrophes make guessing ambiguous
        # ("dont" vs "don't") and embed poorly.
        if not WORD_RE.match(word):
            continue
        if not (config.min_length <= len(word) <= config.max_length):
            continue
        if word in STOPWORDS:
            continue
        seen.add(word)
        out.append(word)
        if len(out) >= config.size:
            break

    return out


# Suffixes that usually mark an inflected form rather than a base word.
# Each entry is (suffix, list of candidate stems to test).
_INFLECTIONS: list[tuple[str, list[str]]] = [
    ("ing", ["", "e"]),      # giving -> giv + e, seeing -> see
    ("ed", ["", "e"]),       # offered -> offer, rated -> rate
    ("es", ["", "e"]),       # gives -> give, boxes -> box
    ("s", [""]),             # teams -> team
    ("ly", [""]),            # quickly -> quick
    ("er", ["", "e"]),       # lower -> low
    ("est", ["", "e"]),      # lowest -> low
]


def is_inflected(word: str, vocabulary: set[str]) -> bool:
    """
    True when the word looks like an inflected form of another vocabulary word.

    Inflections make terrible answers: the nearest neighbours are just the other
    tenses of the same stem, so the puzzle collapses into guessing "give / gave
    / giving" instead of exploring meaning. Detected structurally rather than
    with a POS tagger — no extra dependency, and the failure mode is only ever
    a slightly smaller answer pool.
    """
    for suffix, endings in _INFLECTIONS:
        if not word.endswith(suffix):
            continue
        base = word[: -len(suffix)]
        if len(base) < 3:
            continue
        for ending in endings:
            if base + ending in vocabulary:
                return True
        # Doubled consonant: "stopping" -> "stop", "running" -> "run"
        if len(base) >= 4 and base[-1] == base[-2] and base[:-1] in vocabulary:
            return True
    return False


def answer_candidates(
    vocab: list[str],
    head: int = 3_000,
    min_length: int = 4,
    drop_inflections: bool = True,
) -> list[str]:
    """
    Words good enough to be a secret answer.

    Deliberately a narrow slice of the vocabulary: an answer must be a word
    people actually know, or the game is unwinnable and feels unfair. Guesses
    are accepted from the whole vocabulary — only ANSWERS are restricted.
    """
    vocabulary = set(vocab)
    out = []
    for word in vocab[:head]:
        if len(word) < min_length:
            continue
        if drop_inflections and is_inflected(word, vocabulary):
            continue
        out.append(word)
    return out
