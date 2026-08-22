"""
Embedding + ranking for Clueless.

The whole point: ranks are computed OFFLINE and shipped as data, so the game
needs no model and no network at runtime. This is the same content-factory
split the rest of the project uses (docs/STACK.md D-007).

Cost note: the vocabulary is embedded ONCE and cached. Every puzzle after that
is pure local vector maths, so adding puzzles is free.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from openai import OpenAI

MODEL = "text-embedding-3-small"
# OpenAI accepts large batches; 512 keeps requests comfortably under limits
# while making a 10k vocabulary about 20 calls.
BATCH = 512


def embed_words(words: list[str], client: OpenAI | None = None) -> np.ndarray:
    """Embed words, returning an L2-normalised matrix of shape (len(words), dim)."""
    client = client or OpenAI()
    vectors: list[list[float]] = []

    for start in range(0, len(words), BATCH):
        chunk = words[start : start + BATCH]
        response = client.embeddings.create(model=MODEL, input=chunk)
        # The API guarantees order, but assert it rather than trust it: a silent
        # misalignment here would corrupt every rank in every puzzle.
        assert len(response.data) == len(chunk), "embedding count mismatch"
        for i, item in enumerate(response.data):
            assert item.index == i, "embedding order mismatch"
            vectors.append(item.embedding)
        print(f"  embedded {min(start + BATCH, len(words))}/{len(words)}")

    matrix = np.asarray(vectors, dtype=np.float32)
    return normalize(matrix)


def normalize(matrix: np.ndarray) -> np.ndarray:
    """L2-normalise rows so cosine similarity is a plain dot product."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    # Guard against a zero vector producing NaN and poisoning every comparison.
    norms[norms == 0] = 1.0
    return matrix / norms


def rank_against(secret_index: int, matrix: np.ndarray) -> np.ndarray:
    """
    Rank every vocabulary word by closeness to the word at `secret_index`.

    Returns indices ordered nearest-first. The secret word is always rank 1,
    because nothing is closer to a word than itself.
    """
    similarities = matrix @ matrix[secret_index]
    # Descending sort. argsort is ascending, so negate rather than reverse —
    # reversing would flip the tie order and make ranks unstable between runs.
    return np.argsort(-similarities, kind="stable")


def save_cache(path: Path, words: list[str], matrix: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    np.save(path.with_suffix(".npy"), matrix)
    path.with_suffix(".json").write_text(json.dumps(words))


def load_cache(path: Path) -> tuple[list[str], np.ndarray] | None:
    npy, meta = path.with_suffix(".npy"), path.with_suffix(".json")
    if not npy.exists() or not meta.exists():
        return None
    words = json.loads(meta.read_text())
    matrix = np.load(npy)
    if len(words) != matrix.shape[0]:
        # A partial write would silently misalign words and vectors.
        return None
    return words, matrix
