"""Tests for the Clueless content pipeline. No network — embeddings are faked."""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
import pytest

from app.clueless import build as clueless_build
from app.clueless.embeddings import normalize, rank_against, save_cache
from app.clueless.vocab import VocabConfig, answer_candidates, curate, is_inflected

REPO = Path(__file__).resolve().parents[2]
DATA_DIR = REPO / "src" / "data" / "clueless"


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


class TestPuzzleAppend:
    def test_near_semantic_answers_are_rejected(self):
        words = ["alpha", "alias", "bravo"]
        matrix = normalize(
            np.array(
                [[1.0, 0.0], [0.99, 0.01], [0.0, 1.0]],
                dtype=np.float32,
            )
        )

        with pytest.raises(ValueError, match="too semantically close"):
            clueless_build.assert_semantically_distinct(
                "alias",
                {"alpha"},
                {word: index for index, word in enumerate(words)},
                matrix,
            )

    def test_append_uses_cache_without_calling_embedding_service(self, tmp_path, monkeypatch):
        words = ["alpha", "bravo", "charlie", "delta"]
        matrix = normalize(
            np.array(
                [[1.0, 0.0], [0.0, 1.0], [-1.0, 0.0], [0.0, -1.0]],
                dtype=np.float32,
            )
        )
        cache = tmp_path / "cache" / "vocabulary"
        output_dir = tmp_path / "puzzles"
        output_dir.mkdir()
        save_cache(cache, words, matrix)
        (output_dir / "vocab.json").write_text(json.dumps(words))
        (output_dir / "0001.json").write_text(
            json.dumps(
                {
                    "number": 1,
                    "secret": "alpha",
                    "vocabSize": len(words),
                    "rankedCount": len(words),
                    "ranked": words,
                }
            )
        )
        monkeypatch.setattr(clueless_build, "CACHE", cache)
        monkeypatch.setattr(clueless_build, "OUT_DIR", output_dir)
        monkeypatch.setattr(
            clueless_build,
            "embed_words",
            lambda _: pytest.fail("append must not call the embedding service"),
        )

        output = clueless_build.append_puzzle("bravo")

        payload = json.loads(output.read_text())
        assert output.name == "0002.json"
        assert payload["number"] == 2
        assert payload["secret"] == "bravo"
        assert payload["ranked"][0] == "bravo"


class TestBundledCluelessCatalog:
    def test_bundled_answers_and_ranks_are_valid(self):
        vocabulary = json.loads((DATA_DIR / "vocab.json").read_text())
        candidates = set(answer_candidates(vocabulary))
        puzzle_paths = sorted(
            (path for path in DATA_DIR.glob("*.json") if path.stem.isdigit()),
            key=lambda path: int(path.stem),
        )
        puzzles = [json.loads(path.read_text()) for path in puzzle_paths]

        assert [puzzle["number"] for puzzle in puzzles] == list(range(1, len(puzzles) + 1))
        assert len({puzzle["secret"] for puzzle in puzzles}) == len(puzzles)
        manifest = json.loads((DATA_DIR / "manifest.json").read_text())
        assert manifest["puzzles"] == [
            {"number": puzzle["number"], "rankedCount": puzzle["rankedCount"]}
            for puzzle in puzzles
        ]
        for puzzle in puzzles:
            assert puzzle["secret"] in candidates
            assert puzzle["ranked"][0] == puzzle["secret"]
            assert puzzle["rankedCount"] == len(puzzle["ranked"])
            assert len(set(puzzle["ranked"])) == len(puzzle["ranked"])
            assert set(puzzle["ranked"]).issubset(vocabulary)

    def test_static_imports_and_path_catalogs_stay_aligned(self):
        index_source = (DATA_DIR / "index.ts").read_text()
        imports = re.findall(r"import p(\d+) from './(\d{4})\.json';", index_source)
        imported_numbers = [int(filename) for number, filename in imports if int(number) == int(filename)]
        file_numbers = sorted(int(path.stem) for path in DATA_DIR.glob("*.json") if path.stem.isdigit())
        assert imported_numbers == file_numbers

        levels_source = (DATA_DIR / "levels.ts").read_text()
        catalog_source = levels_source.split("export const CLUELESS_SOLO_LEVELS", maxsplit=1)[1]
        solo_puzzle_numbers = [int(value) for value in re.findall(r"puzzleNumber: (\d+)", catalog_source)]
        hint_policies = re.findall(r"hintPolicy: '([^']+)'", catalog_source)
        assert solo_puzzle_numbers == list(range(31, 31 + len(solo_puzzle_numbers)))
        assert hint_policies[:3] == ["opening", "guess_threshold", "none"]
        assert set(range(1, 31)).isdisjoint(solo_puzzle_numbers)
