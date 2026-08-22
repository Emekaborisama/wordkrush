"""
Build Clueless puzzle data.

    uv run --project validator python -m app.clueless.build --words <file> --puzzles 30

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
load_dotenv(REPO / ".env")

from app.clueless.embeddings import embed_words, load_cache, rank_against, save_cache  # noqa: E402
from app.clueless.vocab import VocabConfig, answer_candidates, curate  # noqa: E402

CACHE = REPO / "validator" / ".cache" / "clueless-vocab"
OUT_DIR = REPO / "src" / "data" / "clueless"

# How many ranked neighbours to ship per puzzle. The full vocabulary would be
# ~10k entries per puzzle; in play, anything past a few thousand is equally
# "cold", so we ship the near end and treat everything else as beyond-the-list.
TOP_N = 5_000


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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--words", type=Path, required=True, help="frequency-ordered word list")
    parser.add_argument("--puzzles", type=int, default=30)
    parser.add_argument("--vocab-size", type=int, default=10_000)
    args = parser.parse_args()

    if not args.words.exists():
        print(f"word list not found: {args.words}", file=sys.stderr)
        return 2
    build(args.words, args.puzzles, args.vocab_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
