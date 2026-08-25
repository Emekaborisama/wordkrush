"""
Build Clueless puzzle data.

    uv run --project validator python -m app.clueless.build --words <file> --puzzles 30
    uv run --project validator python -m app.clueless.build --append-secret <word>

Pipeline: curate vocabulary -> embed once (cached) -> rank every word against
each secret answer -> write bundled JSON the app reads offline.

Output goes to src/data/clueless/ and is committed like any other content.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[3]

from app.clueless.embeddings import embed_words, load_cache, rank_against, save_cache  # noqa: E402
from app.clueless.vocab import VocabConfig, answer_candidates, curate  # noqa: E402

CACHE = REPO / "validator" / ".cache" / "clueless-vocab"
OUT_DIR = REPO / "src" / "data" / "clueless"

# How many ranked neighbours to ship per puzzle. The full vocabulary would be
# ~10k entries per puzzle; in play, anything past a few thousand is equally
# "cold", so we ship the near end and treat everything else as beyond-the-list.
TOP_N = 5_000
# Exact duplicates are too little protection for semantic guessing: a future
# vault whose answer is nearly synonymous with an earlier answer gives away the
# trail. This leaves room for related real-world topics while blocking aliases.
MAX_SECRET_COSINE_SIMILARITY = 0.70


def build(words_file: Path, puzzle_count: int, vocab_size: int) -> None:
    raw = words_file.read_text().split()
    vocab = curate(raw, VocabConfig(size=vocab_size))
    print(f"vocabulary: {len(vocab)} words (from {len(raw)} raw)")

    cached = load_cache(CACHE)
    if cached and cached[0] == vocab:
        words, matrix = cached
        print(f"embeddings: loaded from cache ({matrix.shape[0]}x{matrix.shape[1]})")
    else:
        print("embeddings: computing (one-off; puzzles after this are free)")
        # Only the full vocabulary build needs a service credential. Appending
        # one reviewed level is entirely cache-backed and never loads `.env`.
        load_dotenv(REPO / ".env")
        matrix = embed_words(vocab)
        save_cache(CACHE, vocab, matrix)
        words = vocab
        print(f"embeddings: cached ({matrix.shape[0]}x{matrix.shape[1]})")

    index_of = {w: i for i, w in enumerate(words)}
    candidates = answer_candidates(words)
    print(f"answer pool: {len(candidates)} words")

    # Deterministic answer choice so rebuilding produces identical puzzles.
    rng = np.random.default_rng(20260817)
    chosen = list(rng.permutation(candidates)[:puzzle_count])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    for number, secret in enumerate(chosen, start=1):
        order = rank_against(index_of[secret], matrix)
        ranked = [words[i] for i in order[:TOP_N]]
        assert ranked[0] == secret, f"secret {secret} should rank 1, got {ranked[0]}"

        payload = {
            "number": number,
            "secret": secret,
            "vocabSize": len(words),
            "rankedCount": len(ranked),
            # Index in this array + 1 = the rank shown to the player.
            "ranked": ranked,
        }
        (OUT_DIR / f"{number:04d}.json").write_text(json.dumps(payload, separators=(",", ":")))
        manifest.append({"number": number, "rankedCount": len(ranked)})
        preview = ", ".join(ranked[1:6])
        print(f"  #{number:>3} {secret:<14} nearest: {preview}")

    # The vocabulary ships once, separately from the per-puzzle ranks. Without
    # it the game cannot distinguish "that is not a word" from "valid word, but
    # further away than the ranks we shipped" — two very different messages to
    # show a player.
    (OUT_DIR / "vocab.json").write_text(json.dumps(words, separators=(",", ":")))

    (OUT_DIR / "manifest.json").write_text(
        json.dumps({"puzzles": manifest, "vocabSize": len(words), "topN": TOP_N}, indent=2) + "\n"
    )
    total = sum((OUT_DIR / f"{p['number']:04d}.json").stat().st_size for p in manifest)
    print(f"\nwrote {len(manifest)} puzzles -> src/data/clueless/  ({total / 1_048_576:.1f} MB)")


def existing_puzzle_paths() -> list[Path]:
    return sorted(
        (path for path in OUT_DIR.glob("*.json") if path.stem.isdigit()),
        key=lambda path: int(path.stem),
    )


def write_manifest() -> None:
    puzzles = []
    for path in existing_puzzle_paths():
        payload = json.loads(path.read_text())
        puzzles.append({"number": payload["number"], "rankedCount": payload["rankedCount"]})
    vocabulary = json.loads((OUT_DIR / "vocab.json").read_text())
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(
            {"puzzles": puzzles, "vocabSize": len(vocabulary), "topN": TOP_N},
            indent=2,
        )
        + "\n"
    )


def assert_semantically_distinct(
    secret: str,
    existing_secrets: set[str],
    index_of: dict[str, int],
    matrix: np.ndarray,
) -> None:
    known = [candidate for candidate in existing_secrets if candidate in index_of]
    if not known:
        return
    secret_vector = matrix[index_of[secret]]
    similarity_by_secret = {
        candidate: float(matrix[index_of[candidate]] @ secret_vector)
        for candidate in known
    }
    nearest, similarity = max(similarity_by_secret.items(), key=lambda item: item[1])
    if similarity >= MAX_SECRET_COSINE_SIMILARITY:
        raise ValueError(
            f"answer {secret!r} is too semantically close to existing answer {nearest!r} "
            f"({similarity:.3f} >= {MAX_SECRET_COSINE_SIMILARITY:.2f})"
        )


def append_puzzle(secret: str) -> Path:
    """
    Add one reviewed answer using the cached, shipped vocabulary embeddings.

    This intentionally never calls `embed_words`: daily authoring must remain
    deterministic, fast, and offline once the vocabulary cache exists.
    """
    cached = load_cache(CACHE)
    if not cached:
        raise ValueError(
            f"vocabulary embedding cache missing at {CACHE}; run the full build once before appending"
        )
    words, matrix = cached
    normalized_secret = secret.strip().lower()
    if normalized_secret not in answer_candidates(words):
        raise ValueError(
            f"answer {normalized_secret!r} is not an eligible candidate in the cached vocabulary"
        )

    vocab_path = OUT_DIR / "vocab.json"
    if not vocab_path.exists():
        raise ValueError(f"shipped vocabulary missing at {vocab_path}; refusing to create an unplayable puzzle")
    shipped_vocabulary = json.loads(vocab_path.read_text())
    if shipped_vocabulary != words:
        raise ValueError("cached vocabulary does not match the bundled vocabulary; rebuild before appending")

    existing = existing_puzzle_paths()
    existing_numbers = [int(path.stem) for path in existing]
    if existing_numbers != list(range(1, len(existing_numbers) + 1)):
        raise ValueError("existing puzzle numbers must be consecutive before appending")

    existing_secrets = {json.loads(path.read_text())["secret"] for path in existing}
    if normalized_secret in existing_secrets:
        raise ValueError(f"answer {normalized_secret!r} is already bundled")

    index_of = {word: index for index, word in enumerate(words)}
    assert_semantically_distinct(normalized_secret, existing_secrets, index_of, matrix)
    secret_index = index_of[normalized_secret]
    order = rank_against(secret_index, matrix)
    ranked = [words[index] for index in order[:TOP_N]]
    assert ranked[0] == normalized_secret, (
        f"secret {normalized_secret} should rank 1, got {ranked[0]}"
    )

    number = len(existing) + 1
    output = OUT_DIR / f"{number:04d}.json"
    payload = {
        "number": number,
        "secret": normalized_secret,
        "vocabSize": len(words),
        "rankedCount": len(ranked),
        "ranked": ranked,
    }
    output.write_text(json.dumps(payload, separators=(",", ":")))
    write_manifest()
    preview = ", ".join(ranked[1:6])
    print(f"appended #{number:>3} {normalized_secret:<14} nearest: {preview}")
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--words", type=Path, help="frequency-ordered word list")
    parser.add_argument("--puzzles", type=int, default=30)
    parser.add_argument("--vocab-size", type=int, default=10_000)
    parser.add_argument(
        "--append-secret",
        help="append one eligible answer using the existing cached embeddings; never calls an API",
    )
    args = parser.parse_args()
    if args.append_secret:
        if args.words:
            parser.error("--append-secret cannot be combined with --words")
        try:
            append_puzzle(args.append_secret)
        except ValueError as error:
            print(error, file=sys.stderr)
            return 2
        return 0

    if not args.words or not args.words.exists():
        print(f"word list not found: {args.words}", file=sys.stderr)
        return 2
    build(args.words, args.puzzles, args.vocab_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
