"""Tests for the Clueless content pipeline. No network — embeddings are faked."""

from __future__ import annotations

import numpy as np
import pytest

from app.clueless.embeddings import normalize, rank_against
from app.clueless.vocab import VocabConfig, answer_candidates, curate, is_inflected


class TestCurate:
    def test_keeps_frequency_order(self):
        # Order matters: answer selection takes the common head of the list.
        words = ["apple", "banana", "cherry"]
        assert curate(words) == words

    def test_drops_stopwords(self):
        # Function words embed meaninglessly and can never be a good answer.
        assert "the" not in curate(["the", "apple"])

    def test_drops_non_alphabetic(self):
        out = curate(["apple", "don't", "covid-19", "3rd", "hello_world"])
        assert out == ["apple"]

    def test_enforces_length_bounds(self):
        out = curate(["ox", "cat", "a" * 20], VocabConfig(min_length=3, max_length=14))
        assert out == ["cat"]

    def test_deduplicates_preserving_first_position(self):
        assert curate(["apple", "banana", "apple"]) == ["apple", "banana"]

    def test_respects_size_cap(self):
        words = [f"word{i:05d}" for i in range(100)]
        # generated words contain digits, so use real-looking alphabetic ones
        words = ["".join(chr(97 + (i // 26)) + chr(97 + (i % 26)) + "x") for i in range(100)]
        assert len(curate(words, VocabConfig(size=10))) == 10

    def test_is_case_insensitive(self):
        assert curate(["Apple", "APPLE"]) == ["apple"]


class TestAnswerCandidates:
    def test_takes_only_the_common_head(self):
        vocab = [f"{'a' * 4}{i}" for i in range(10)]
        vocab = ["alpha", "bravo", "charlie", "delta", "echo"]
        assert answer_candidates(vocab, head=2) == ["alpha", "bravo"]

    def test_excludes_very_short_words(self):
        # A three-letter answer is guessable by brute force and feels cheap.
        assert answer_candidates(["cat", "house"], head=10, min_length=4) == ["house"]

    def test_excludes_inflected_forms(self):
        # Real cases from the first build: these made the puzzle a tense-guessing
        # exercise because every near neighbour was the same stem.
        vocab = ["give", "gives", "giving", "offer", "offered", "team", "teams"]
        assert answer_candidates(vocab, head=10, min_length=4) == ["give", "offer", "team"]


class TestIsInflected:
    @pytest.fixture
    def vocabulary(self):
        return {"give", "offer", "team", "rate", "low", "quick", "stop", "see", "run"}

    @pytest.mark.parametrize(
        "word",
        ["gives", "giving", "offered", "offers", "teams", "rated", "lower", "lowest",
         "quickly", "stopping", "seeing", "running"],
    )
    def test_detects_inflections(self, word, vocabulary):
        assert is_inflected(word, vocabulary)

    @pytest.mark.parametrize("word", ["house", "planet", "guitar", "winter", "bridge"])
    def test_leaves_base_words_alone(self, word, vocabulary):
        assert not is_inflected(word, vocabulary)

    def test_does_not_strip_into_a_stub(self, word=None, vocabulary=None):
        # "ring" ends in "ing" but the remainder is too short to be a stem.
        assert not is_inflected("ring", {"r", "re"})


class TestNormalize:
    def test_rows_become_unit_length(self):
        m = normalize(np.array([[3.0, 4.0], [1.0, 0.0]], dtype=np.float32))
        assert np.allclose(np.linalg.norm(m, axis=1), 1.0)

    def test_zero_vector_does_not_produce_nan(self):
        # A NaN here would poison every similarity comparison silently.
        m = normalize(np.array([[0.0, 0.0]], dtype=np.float32))
        assert not np.isnan(m).any()


class TestRankAgainst:
    @pytest.fixture
    def matrix(self):
        # 0 and 1 point the same way; 2 is orthogonal; 3 is opposite.
        return normalize(
            np.array(
                [[1.0, 0.0], [0.9, 0.1], [0.0, 1.0], [-1.0, 0.0]],
                dtype=np.float32,
            )
        )

    def test_secret_always_ranks_first(self, matrix):
        for i in range(matrix.shape[0]):
            assert rank_against(i, matrix)[0] == i

    def test_orders_by_closeness(self, matrix):
        order = list(rank_against(0, matrix))
        assert order[0] == 0  # itself
        assert order[1] == 1  # nearly parallel
        assert order[-1] == 3  # opposite

    def test_returns_every_word_exactly_once(self, matrix):
        order = rank_against(0, matrix)
        assert sorted(order.tolist()) == list(range(matrix.shape[0]))

    def test_is_deterministic(self, matrix):
        # Rebuilding content must not reshuffle ranks, or committed puzzle
        # data would churn on every run.
        assert np.array_equal(rank_against(0, matrix), rank_against(0, matrix))
