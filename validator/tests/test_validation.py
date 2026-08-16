"""
Tests run with a fake judge — no network, no API key, no spend.
That is the point of the Judge protocol.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import (
    Agreement,
    Confidence,
    PairJudgement,
    PairQuery,
    ValidateRequest,
    Verdict,
)
from app.validation import (
    compare,
    flip,
    validate_batch,
    validate_pair,
    verdict_from_values,
)


class FakeJudge:
    """Returns scripted verdicts keyed by (term_a, term_b)."""

    def __init__(self, script: dict[tuple[str, str], PairJudgement]):
        self.script = script
        self.calls: list[tuple[str, str]] = []

    async def judge(self, term_a: str, term_b: str) -> PairJudgement:
        self.calls.append((term_a, term_b))
        return self.script[(term_a, term_b)]


def j(verdict: Verdict, confidence: Confidence = Confidence.HIGH) -> PairJudgement:
    return PairJudgement(verdict=verdict, confidence=confidence, reasoning="test")


# --- schema constraints -------------------------------------------------


def test_schema_rejects_extra_fields():
    """The LLM cannot smuggle extra keys past the schema."""
    with pytest.raises(ValidationError):
        PairJudgement(verdict=Verdict.A_HIGHER, confidence=Confidence.HIGH, reasoning="x", chatter="hi")


def test_schema_rejects_long_reasoning():
    with pytest.raises(ValidationError):
        PairJudgement(verdict=Verdict.A_HIGHER, confidence=Confidence.HIGH, reasoning="x" * 201)


def test_schema_rejects_invalid_verdict():
    with pytest.raises(ValidationError):
        PairJudgement(verdict="maybe", confidence=Confidence.HIGH, reasoning="x")


def test_query_rejects_identical_terms():
    with pytest.raises(ValidationError):
        PairQuery(term_a="pizza", term_b="Pizza ")


def test_request_rejects_non_positive_values():
    with pytest.raises(ValidationError):
        ValidateRequest(term_a="a", term_b="b", value_a=0, value_b=5)


# --- pure logic ---------------------------------------------------------


def test_flip_is_an_involution():
    for v in Verdict:
        assert flip(flip(v)) == v


def test_verdict_from_values_uses_fairness_threshold():
    assert verdict_from_values(3_000_000, 1_000_000) is Verdict.A_HIGHER
    assert verdict_from_values(1_000_000, 3_000_000) is Verdict.B_HIGHER
    # within 15% -> too close to call, matching the game's pairing guard
    assert verdict_from_values(1_000_000, 1_100_000) is Verdict.TOO_CLOSE


def test_verdict_from_values_rejects_bad_input():
    with pytest.raises(ValueError):
        verdict_from_values(0, 10)


def test_compare_agrees():
    agreement, flagged, _ = compare(Verdict.A_HIGHER, Confidence.HIGH, Verdict.A_HIGHER)
    assert agreement is Agreement.AGREES
    assert flagged is False


def test_compare_flags_confident_contradiction():
    agreement, flagged, reason = compare(Verdict.A_HIGHER, Confidence.HIGH, Verdict.B_HIGHER)
    assert agreement is Agreement.DISAGREES
    assert flagged is True
    assert reason is not None


def test_compare_does_not_flag_low_confidence_disagreement():
    """Low-confidence noise must not fill the human review queue."""
    agreement, flagged, _ = compare(Verdict.A_HIGHER, Confidence.LOW, Verdict.B_HIGHER)
    assert agreement is Agreement.LLM_UNSURE
    assert flagged is False


def test_compare_ignores_pairs_the_game_would_never_show():
    agreement, flagged, _ = compare(Verdict.A_HIGHER, Confidence.HIGH, Verdict.TOO_CLOSE)
    assert agreement is Agreement.LLM_UNSURE
    assert flagged is False


# --- orchestration ------------------------------------------------------


async def test_consistent_pair_passes():
    judge = FakeJudge(
        {
            ("pizza", "sushi"): j(Verdict.A_HIGHER),
            ("sushi", "pizza"): j(Verdict.B_HIGHER),  # mirror = consistent
        }
    )
    result = await validate_pair(ValidateRequest(term_a="pizza", term_b="sushi"), judge)
    assert result.verdict is Verdict.A_HIGHER
    assert result.samples == 2
    assert result.flagged is False


async def test_position_bias_is_caught():
    """Model says 'the first one' both times -> contradiction -> discarded."""
    judge = FakeJudge(
        {
            ("pizza", "sushi"): j(Verdict.A_HIGHER),
            ("sushi", "pizza"): j(Verdict.A_HIGHER),  # also 'first one' -> contradiction
        }
    )
    result = await validate_pair(ValidateRequest(term_a="pizza", term_b="sushi"), judge)
    assert result.agreement is Agreement.INCONSISTENT
    assert result.flagged is True
    assert result.verdict is Verdict.TOO_CLOSE


async def test_consistency_check_takes_weaker_confidence():
    judge = FakeJudge(
        {
            ("a", "b"): j(Verdict.A_HIGHER, Confidence.HIGH),
            ("b", "a"): j(Verdict.B_HIGHER, Confidence.LOW),
        }
    )
    result = await validate_pair(ValidateRequest(term_a="a", term_b="b"), judge)
    assert result.confidence is Confidence.LOW


async def test_single_call_when_consistency_disabled():
    judge = FakeJudge({("a", "b"): j(Verdict.A_HIGHER)})
    result = await validate_pair(
        ValidateRequest(term_a="a", term_b="b", check_consistency=False), judge
    )
    assert result.samples == 1
    assert len(judge.calls) == 1


async def test_llm_contradicting_data_is_flagged():
    judge = FakeJudge(
        {
            ("pizza", "sushi"): j(Verdict.A_HIGHER),
            ("sushi", "pizza"): j(Verdict.B_HIGHER),
        }
    )
    # Our data claims sushi > pizza, LLM confidently says otherwise.
    result = await validate_pair(
        ValidateRequest(term_a="pizza", term_b="sushi", value_a=1_000, value_b=5_000), judge
    )
    assert result.data_verdict is Verdict.B_HIGHER
    assert result.agreement is Agreement.DISAGREES
    assert result.flagged is True


async def test_batch_validates_all_pairs():
    judge = FakeJudge(
        {
            ("a", "b"): j(Verdict.A_HIGHER),
            ("b", "a"): j(Verdict.B_HIGHER),
            ("c", "d"): j(Verdict.B_HIGHER),
            ("d", "c"): j(Verdict.A_HIGHER),
        }
    )
    results = await validate_batch(
        [ValidateRequest(term_a="a", term_b="b"), ValidateRequest(term_a="c", term_b="d")], judge
    )
    assert len(results) == 2
    assert all(not r.flagged for r in results)
